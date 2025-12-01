const axios = require('axios');
const crypto = require('crypto');
const { promisify } = require('util');
const redis = require('redis');

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60; // 60 seconds
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per window
const RATE_LIMIT_RETRY_AFTER = 5; // 5 seconds

// Token refresh configuration
const TOKEN_REFRESH_THRESHOLD = 300; // 5 minutes before expiry
const TOKEN_EXPIRY_BUFFER = 60; // 1 minute buffer

class SecureMicrosoftService {
  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID;
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    this.redirectUri = process.env.MICROSOFT_REDIRECT_URI;
    this.scopes = process.env.MICROSOFT_SCOPES || 'user.read,mail.read,calendars.read';
    
    // Initialize Redis client for secure token storage
    this.redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: 1 // Use separate database for tokens
    });
    
    this.redisGet = promisify(this.redisClient.get).bind(this.redisClient);
    this.redisSet = promisify(this.redisClient.setex).bind(this.redisClient);
    this.redisDel = promisify(this.redisClient.del).bind(this.redisClient);
    
    // Rate limiting storage
    this.rateLimitStore = new Map();
  }

  /**
   * Generate PKCE challenge for OAuth flow
   */
  generatePKCEChallenge() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256'
    };
  }

  /**
   * Generate secure state parameter
   */
  generateState() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get Microsoft OAuth authorization URL with PKCE and state
   */
  getAuthorizationUrl(userId) {
    const pkce = this.generatePKCEChallenge();
    const state = this.generateState();
    
    // Store PKCE verifier and state in Redis with 10-minute expiry
    const authData = {
      codeVerifier: pkce.codeVerifier,
      state,
      userId,
      timestamp: Date.now()
    };
    
    this.redisSet(`auth:${state}`, JSON.stringify(authData), 600);
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: pkce.codeChallengeMethod,
      state,
      response_mode: 'query'
    });
    
    return {
      url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`,
      state
    };
  }

  /**
   * Handle OAuth callback with PKCE verification
   */
  async handleCallback(code, state) {
    try {
      // Retrieve auth data from Redis
      const authDataStr = await this.redisGet(`auth:${state}`);
      if (!authDataStr) {
        throw new Error('Invalid or expired state parameter');
      }
      
      const authData = JSON.parse(authDataStr);
      
      // Clean up auth data
      await this.redisDel(`auth:${state}`);
      
      // Exchange code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(code, authData.codeVerifier);
      
      // Store tokens securely
      await this.secureStoreTokens(authData.userId, tokenResponse);
      
      return {
        success: true,
        userId: authData.userId,
        accessToken: tokenResponse.access_token
      };
    } catch (error) {
      console.error('Microsoft OAuth callback error:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for tokens with PKCE
   */
  async exchangeCodeForTokens(code, codeVerifier) {
    try {
      const response = await axios.post(
        process.env.MICROSOFT_TOKEN_ENDPOINT,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange code for tokens');
    }
  }

  /**
   * Securely store tokens in Redis with encryption
   */
  async secureStoreTokens(userId, tokenData) {
    const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
    }
    
    const encryptedData = this.encryptTokens(tokenData, encryptionKey);
    const expiry = tokenData.expires_in || 3600; // Default 1 hour
    
    // Store with 10% buffer before actual expiry
    const safeExpiry = Math.floor(expiry * 0.9);
    
    await this.redisSet(`tokens:${userId}`, encryptedData, safeExpiry);
    
    // Store refresh token separately with longer expiry
    if (tokenData.refresh_token) {
      const refreshExpiry = 90 * 24 * 60 * 60; // 90 days
      await this.redisSet(`refresh:${userId}`, tokenData.refresh_token, refreshExpiry);
    }
  }

  /**
   * Encrypt sensitive token data
   */
  encryptTokens(data, key) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    });
  }

  /**
   * Decrypt sensitive token data
   */
  decryptTokens(encryptedData, key) {
    const algorithm = 'aes-256-gcm';
    const data = JSON.parse(encryptedData);
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Get access token with automatic refresh
   */
  async getAccessToken(userId) {
    try {
      // Check rate limiting
      await this.checkRateLimit(userId);
      
      // Retrieve tokens from secure storage
      const encryptedTokens = await this.redisGet(`tokens:${userId}`);
      if (!encryptedTokens) {
        throw new Error('No tokens found for user');
      }
      
      const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
      const tokenData = this.decryptTokens(encryptedTokens, encryptionKey);
      
      // Check if token needs refresh
      if (this.shouldRefreshToken(tokenData)) {
        return await this.refreshAccessToken(userId);
      }
      
      return tokenData.access_token;
    } catch (error) {
      console.error('Get access token error:', error);
      throw error;
    }
  }

  /**
   * Check if token needs refresh
   */
  shouldRefreshToken(tokenData) {
    const now = Math.floor(Date.now() / 1000);
    const expiry = tokenData.expires_at || (now + tokenData.expires_in);
    
    return (expiry - now) < TOKEN_REFRESH_THRESHOLD;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(userId) {
    try {
      const refreshToken = await this.redisGet(`refresh:${userId}`);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await axios.post(
        process.env.MICROSOFT_TOKEN_ENDPOINT,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: this.scopes
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );
      
      const newTokenData = response.data;
      newTokenData.expires_at = Math.floor(Date.now() / 1000) + newTokenData.expires_in;
      
      // Store new tokens
      await this.secureStoreTokens(userId, newTokenData);
      
      return newTokenData.access_token;
    } catch (error) {
      console.error('Token refresh error:', error.response?.data || error.message);
      
      // If refresh fails, remove stored tokens
      await this.redisDel(`tokens:${userId}`);
      await this.redisDel(`refresh:${userId}`);
      
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Rate limiting with exponential backoff
   */
  async checkRateLimit(userId) {
    const key = `rate_limit:${userId}`;
    const now = Date.now();
    const windowStart = Math.floor(now / (RATE_LIMIT_WINDOW * 1000));
    
    const rateLimitData = this.rateLimitStore.get(`${key}:${windowStart}`) || {
      count: 0,
      lastRequest: 0,
      backoffUntil: 0
    };
    
    // Check if we're in backoff period
    if (now < rateLimitData.backoffUntil) {
      const retryAfter = Math.ceil((rateLimitData.backoffUntil - now) / 1000);
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    }
    
    // Check if we've exceeded the rate limit
    if (rateLimitData.count >= RATE_LIMIT_MAX_REQUESTS) {
      // Set backoff period
      const backoffUntil = now + (RATE_LIMIT_RETRY_AFTER * 1000);
      rateLimitData.backoffUntil = backoffUntil;
      this.rateLimitStore.set(`${key}:${windowStart}`, rateLimitData);
      
      throw new Error(`Rate limit exceeded. Retry after ${RATE_LIMIT_RETRY_AFTER} seconds`);
    }
    
    // Increment counter
    rateLimitData.count++;
    rateLimitData.lastRequest = now;
    this.rateLimitStore.set(`${key}:${windowStart}`, rateLimitData);
    
    // Clean up old rate limit data
    this.cleanupRateLimitData(key, windowStart);
  }

  /**
   * Clean up old rate limit data
   */
  cleanupRateLimitData(key, currentWindow) {
    const windowsToKeep = 2; // Keep current and previous window
    
    for (const [storeKey] of this.rateLimitStore) {
      if (storeKey.startsWith(key)) {
        const window = parseInt(storeKey.split(':').pop());
        if (window < currentWindow - windowsToKeep) {
          this.rateLimitStore.delete(storeKey);
        }
      }
    }
  }

  /**
   * Make authenticated API request with rate limiting and retry logic
   */
  async makeApiRequest(userId, endpoint, options = {}) {
    const accessToken = await this.getAccessToken(userId);
    
    const config = {
      method: 'GET',
      baseURL: 'https://graph.microsoft.com/v1.0',
      url: endpoint,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      ...options
    };
    
    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response?.status === 429) {
        // Handle Microsoft Graph API rate limiting
        const retryAfter = error.response.headers['retry-after'] || 60;
        console.warn(`Microsoft Graph API rate limited. Retry after ${retryAfter} seconds`);
        
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.makeApiRequest(userId, endpoint, options);
      }
      
      throw error;
    }
  }

  /**
   * Revoke tokens and clean up storage
   */
  async revokeTokens(userId) {
    try {
      // Get access token for revocation request
      const accessToken = await this.getAccessToken(userId);
      
      // Revoke tokens with Microsoft
      await axios.post(
        'https://graph.microsoft.com/v1.0/me/revokeSignInSessions',
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
    } catch (error) {
      console.error('Token revocation error:', error);
    } finally {
      // Clean up local storage regardless of revocation result
      await this.redisDel(`tokens:${userId}`);
      await this.redisDel(`refresh:${userId}`);
    }
  }

  /**
   * Get user profile with minimal scopes
   */
  async getUserProfile(userId) {
    return await this.makeApiRequest(userId, '/me', {
      params: {
        $select: 'id,displayName,mail,userPrincipalName,givenName,surname'
      }
    });
  }

  /**
   * Get user emails with pagination and filtering
   */
  async getUserEmails(userId, options = {}) {
    const params = new URLSearchParams({
      $top: options.limit || 10,
      $orderby: 'receivedDateTime desc',
      $select: 'id,subject,from,receivedDateTime,isRead',
      ...options.filters
    });
    
    return await this.makeApiRequest(userId, `/me/messages?${params.toString()}`);
  }

  /**
   * Get user calendar events
   */
  async getCalendarEvents(userId, options = {}) {
    const params = new URLSearchParams({
      $top: options.limit || 10,
      $orderby: 'start/dateTime',
      $select: 'id,subject,start,end,location,organizer',
      ...options.filters
    });
    
    return await this.makeApiRequest(userId, `/me/events?${params.toString()}`);
  }
}

module.exports = SecureMicrosoftService;