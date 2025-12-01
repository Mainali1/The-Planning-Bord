const request = require('supertest');
const app = require('../../src/app');

describe('Inventory Routes', () => {
  let authToken;

  beforeEach(() => {
    authToken = global.generateTestToken();
  });

  describe('GET /api/inventory/products', () => {
    it('should get all products with authentication', async () => {
      const response = await global.testRequest('get', '/api/inventory/products', null, authToken);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const response = await global.testRequest('get', '/api/inventory/products');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Access token required');
    });

    it('should filter products by search term', async () => {
      const response = await global.testRequest('get', '/api/inventory/products?search=laptop', null, authToken);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/inventory/products', () => {
    it('should create a new product', async () => {
      const newProduct = {
        name: 'Test Product',
        category_id: 1,
        supplier_id: 1,
        current_quantity: 100,
        min_quantity: 20,
        unit_price: 99.99
      };

      const response = await global.testRequest('post', '/api/inventory/products', newProduct, authToken);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('product_id');
      expect(response.body).toHaveProperty('name', newProduct.name);
    });

    it('should return validation error for missing required fields', async () => {
      const invalidProduct = {
        name: 'Test Product'
        // Missing required fields
      };

      const response = await global.testRequest('post', '/api/inventory/products', invalidProduct, authToken);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/inventory/low-stock', () => {
    it('should get low stock products', async () => {
      const response = await global.testRequest('get', '/api/inventory/low-stock', null, authToken);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/inventory/update', () => {
    it('should update inventory quantity', async () => {
      const inventoryUpdate = {
        product_id: 1,
        quantity_change: -5,
        reason: 'Sale',
        notes: 'Customer purchase'
      };

      const response = await global.testRequest('post', '/api/inventory/update', inventoryUpdate, authToken);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Inventory updated successfully');
    });
  });
});