const request = require('supertest');
const app = require('../../src/app');

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        email: 'newuser@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
        role: 'user'
      };

      const response = await global.testRequest('post', '/api/auth/register', newUser);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User created successfully');
    });

    it('should return validation error for invalid email', async () => {
      const invalidUser = {
        email: 'invalid-email',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe'
      };

      const response = await global.testRequest('post', '/api/auth/register', invalidUser);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return validation error for short password', async () => {
      const invalidUser = {
        email: 'user@example.com',
        password: '123',
        first_name: 'John',
        last_name: 'Doe'
      };

      const response = await global.testRequest('post', '/api/auth/register', invalidUser);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await global.testRequest('post', '/api/auth/login', loginData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', loginData.email);
    });

    it('should return error for invalid credentials', async () => {
      const invalidLogin = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await global.testRequest('post', '/api/auth/login', invalidLogin);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should return error for non-existent user', async () => {
      const nonExistentUser = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await global.testRequest('post', '/api/auth/login', nonExistentUser);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should verify valid token', async () => {
      const token = global.generateTestToken();

      const response = await global.testRequest('get', '/api/auth/verify', null, token);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
    });

    it('should reject invalid token', async () => {
      const invalidToken = 'invalid-token';

      const response = await global.testRequest('get', '/api/auth/verify', null, invalidToken);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });

    it('should reject missing token', async () => {
      const response = await global.testRequest('get', '/api/auth/verify');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'No token provided');
    });
  });
});