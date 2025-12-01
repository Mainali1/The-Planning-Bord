const request = require('supertest');
const app = require('../src/app');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'planning_bord_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

// Global test setup
beforeAll(async () => {
  // Setup test database connection
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup test database
  console.log('Cleaning up test environment...');
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Global test utilities
global.testRequest = (method, path, data = null, token = null) => {
  const req = request(app)[method](path);
  
  if (token) {
    req.set('Authorization', `Bearer ${token}`);
  }
  
  if (data) {
    req.send(data);
  }
  
  return req;
};

global.generateTestToken = (payload = {}) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign({
    id: 1,
    email: 'test@example.com',
    role: 'user',
    ...payload
  }, process.env.JWT_SECRET, { expiresIn: '1h' });
};