// Simple authentication utility for handling JWT tokens

const TOKEN_KEY = 'planningbord_token';

export const authUtils = {
  // Get token from localStorage
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Set token in localStorage
  setToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  // Remove token from localStorage
  removeToken: () => {
    localStorage.removeItem(TOKEN_KEY);
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  // Get auth headers for API requests
  getAuthHeaders: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return {};
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  },

  // Parse JWT token to get user info
  getUserInfo: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }
    
    try {
      // JWT tokens have three parts separated by dots
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  },

  // Check if token is expired
  isTokenExpired: () => {
    const userInfo = authUtils.getUserInfo();
    if (!userInfo || !userInfo.exp) {
      return true;
    }
    
    const currentTime = Date.now() / 1000; // Convert to seconds
    return userInfo.exp < currentTime;
  }
};

export default authUtils;