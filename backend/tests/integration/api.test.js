const request = require('supertest');
const app = require('../../src/app');

describe('Integration Tests', () => {
  let authToken;
  let createdProductId;
  let createdEmployeeId;

  beforeAll(async () => {
    // Create a test user and get auth token
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    const loginResponse = await global.testRequest('post', '/api/auth/login', loginData);
    authToken = loginResponse.body.token;
  });

  describe('End-to-End Inventory Management', () => {
    it('should complete full inventory lifecycle', async () => {
      // 1. Create a new product
      const newProduct = {
        name: 'Integration Test Product',
        category_id: 1,
        supplier_id: 1,
        current_quantity: 50,
        min_quantity: 10,
        unit_price: 25.99
      };

      const createResponse = await global.testRequest('post', '/api/inventory/products', newProduct, authToken);
      expect(createResponse.status).toBe(201);
      createdProductId = createResponse.body.product_id;

      // 2. Update inventory (simulate sale)
      const updateData = {
        product_id: createdProductId,
        quantity_change: -5,
        reason: 'Sale',
        notes: 'Integration test sale'
      };

      const updateResponse = await global.testRequest('post', '/api/inventory/update', updateData, authToken);
      expect(updateResponse.status).toBe(200);

      // 3. Get updated product
      const getResponse = await global.testRequest('get', `/api/inventory/products`, null, authToken);
      expect(getResponse.status).toBe(200);
      
      const updatedProduct = getResponse.body.find(p => p.product_id === createdProductId);
      expect(updatedProduct).toBeDefined();
      expect(updatedProduct.current_quantity).toBe(45); // 50 - 5
    });
  });

  describe('End-to-End Employee Management', () => {
    it('should complete full employee lifecycle', async () => {
      // 1. Create a new employee
      const newEmployee = {
        first_name: 'Integration',
        last_name: 'Employee',
        email: 'integration.employee@example.com',
        role: 'Developer',
        department: 'IT',
        date_joined: '2024-01-15'
      };

      const createResponse = await global.testRequest('post', '/api/employees', newEmployee, authToken);
      expect(createResponse.status).toBe(201);
      createdEmployeeId = createResponse.body.employee_id;

      // 2. Mark attendance
      const attendanceData = {
        status: 'present',
        reason: 'Integration test attendance'
      };

      const attendanceResponse = await global.testRequest('post', `/api/employees/${createdEmployeeId}/attendance`, attendanceData, authToken);
      expect(attendanceResponse.status).toBe(201);

      // 3. Assign task
      const taskData = {
        employee_id: createdEmployeeId,
        task_title: 'Integration Test Task',
        task_description: 'Complete integration testing',
        due_date: '2024-01-20'
      };

      const taskResponse = await global.testRequest('post', '/api/employees/tasks', taskData, authToken);
      expect(taskResponse.status).toBe(201);

      // 4. Get employee with tasks and attendance
      const getResponse = await global.testRequest('get', '/api/employees', null, authToken);
      expect(getResponse.status).toBe(200);
      
      const employee = getResponse.body.find(e => e.employee_id === createdEmployeeId);
      expect(employee).toBeDefined();
      expect(employee.first_name).toBe('Integration');
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should handle complete authentication flow', async () => {
      // 1. Register new user
      const newUser = {
        email: 'integration.auth@example.com',
        password: 'password123',
        first_name: 'Auth',
        last_name: 'Integration',
        role: 'user'
      };

      const registerResponse = await global.testRequest('post', '/api/auth/register', newUser);
      expect(registerResponse.status).toBe(201);

      // 2. Login with new user
      const loginData = {
        email: 'integration.auth@example.com',
        password: 'password123'
      };

      const loginResponse = await global.testRequest('post', '/api/auth/login', loginData);
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');

      const newToken = loginResponse.body.token;

      // 3. Verify token
      const verifyResponse = await global.testRequest('get', '/api/auth/verify', null, newToken);
      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body).toHaveProperty('valid', true);

      // 4. Access protected route with new token
      const protectedResponse = await global.testRequest('get', '/api/inventory/products', null, newToken);
      expect(protectedResponse.status).toBe(200);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle various error scenarios gracefully', async () => {
      // 1. Invalid authentication
      const invalidAuthResponse = await global.testRequest('get', '/api/inventory/products', null, 'invalid-token');
      expect(invalidAuthResponse.status).toBe(403);
      expect(invalidAuthResponse.body).toHaveProperty('message');

      // 2. Missing required fields
      const invalidProduct = {
        name: 'Test Product'
        // Missing required fields
      };

      const invalidProductResponse = await global.testRequest('post', '/api/inventory/products', invalidProduct, authToken);
      expect(invalidProductResponse.status).toBe(400);
      expect(invalidProductResponse.body).toHaveProperty('errors');

      // 3. Invalid route
      const invalidRouteResponse = await global.testRequest('get', '/api/invalid-route', null, authToken);
      expect(invalidRouteResponse.status).toBe(404);
    });
  });
});