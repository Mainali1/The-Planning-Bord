const request = require('supertest');
const app = require('../../src/app');

describe('Employee Routes', () => {
  let authToken;

  beforeEach(() => {
    authToken = global.generateTestToken();
  });

  describe('GET /api/employees', () => {
    it('should get all employees with authentication', async () => {
      const response = await global.testRequest('get', '/api/employees', null, authToken);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const response = await global.testRequest('get', '/api/employees');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Access token required');
    });
  });

  describe('POST /api/employees', () => {
    it('should create a new employee', async () => {
      const newEmployee = {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        role: 'Manager',
        department: 'Sales',
        date_joined: '2024-01-15'
      };

      const response = await global.testRequest('post', '/api/employees', newEmployee, authToken);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('employee_id');
      expect(response.body).toHaveProperty('email', newEmployee.email);
    });

    it('should return validation error for invalid email', async () => {
      const invalidEmployee = {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'invalid-email',
        role: 'Manager',
        department: 'Sales',
        date_joined: '2024-01-15'
      };

      const response = await global.testRequest('post', '/api/employees', invalidEmployee, authToken);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/employees/:id/attendance', () => {
    it('should get employee attendance', async () => {
      const response = await global.testRequest('get', '/api/employees/1/attendance', null, authToken);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/employees/:id/attendance', () => {
    it('should mark employee attendance', async () => {
      const attendanceData = {
        status: 'present',
        reason: 'Working from office'
      };

      const response = await global.testRequest('post', '/api/employees/1/attendance', attendanceData, authToken);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Attendance marked successfully');
    });
  });

  describe('POST /api/employees/tasks', () => {
    it('should assign task to employee', async () => {
      const taskData = {
        employee_id: 1,
        task_title: 'Complete inventory',
        task_description: 'Count all products',
        due_date: '2024-01-20'
      };

      const response = await global.testRequest('post', '/api/employees/tasks', taskData, authToken);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('task_id');
      expect(response.body).toHaveProperty('task_title', taskData.task_title);
    });
  });
});