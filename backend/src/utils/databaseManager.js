const knex = require('knex');
const config = require('../knexfile');

class DatabaseManager {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.db = knex(config[this.environment]);
  }

  /**
   * Initialize database with migrations and seeds
   */
  async initialize() {
    try {
      console.log('🔄 Running database migrations...');
      await this.runMigrations();
      
      if (this.environment === 'development' || this.environment === 'test') {
        console.log('🌱 Seeding database...');
        await this.runSeeds();
      }
      
      console.log('✅ Database initialization complete');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    try {
      const pendingMigrations = await this.db.migrate.list();
      
      if (pendingMigrations[0].length > 0) {
        console.log(`📋 Found ${pendingMigrations[0].length} pending migrations`);
        await this.db.migrate.latest();
        console.log('✅ Migrations completed successfully');
      } else {
        console.log('✅ Database is up to date');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Rollback migrations
   */
  async rollbackMigrations(steps = 1) {
    try {
      console.log(`🔄 Rolling back ${steps} migration(s)...`);
      await this.db.migrate.rollback(null, steps);
      console.log('✅ Rollback completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Run database seeds
   */
  async runSeeds() {
    try {
      await this.db.seed.run();
      console.log('✅ Seeds completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Seed failed:', error);
      throw error;
    }
  }

  /**
   * Create test database for CI/CD
   */
  async createTestDatabase() {
    if (this.environment !== 'test') {
      throw new Error('Test database creation only allowed in test environment');
    }

    try {
      console.log('🧪 Setting up test database...');
      
      // Drop and recreate test database schema
      await this.db.raw('DROP SCHEMA IF EXISTS public CASCADE');
      await this.db.raw('CREATE SCHEMA public');
      
      // Run migrations on clean schema
      await this.runMigrations();
      
      // Insert test data
      await this.insertTestData();
      
      console.log('✅ Test database setup complete');
    } catch (error) {
      console.error('❌ Test database setup failed:', error);
      throw error;
    }
  }

  /**
   * Insert comprehensive test data
   */
  async insertTestData() {
    const testData = {
      categories: [
        { name: 'Electronics', description: 'Electronic devices and accessories' },
        { name: 'Office Supplies', description: 'Office stationery and supplies' },
        { name: 'Furniture', description: 'Office furniture' }
      ],
      suppliers: [
        { name: 'TechCorp', contact_person: 'John Doe', email: 'john@techcorp.com', phone: '+1234567890' },
        { name: 'OfficeMax', contact_person: 'Jane Smith', email: 'jane@officemax.com', phone: '+1234567891' }
      ],
      products: [
        {
          name: 'Laptop',
          description: 'High-performance laptop',
          category_id: 1,
          supplier_id: 1,
          current_quantity: 50,
          min_quantity: 10,
          unit_price: 999.99
        },
        {
          name: 'Office Chair',
          description: 'Ergonomic office chair',
          category_id: 3,
          supplier_id: 2,
          current_quantity: 25,
          min_quantity: 5,
          unit_price: 199.99
        }
      ],
      employees: [
        {
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          role: 'Manager',
          department: 'Operations',
          phone: '+1234567890',
          date_joined: '2024-01-01'
        }
      ],
      users: [
        {
          email: 'admin@example.com',
          password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/..G', // password123
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin'
        }
      ]
    };

    // Insert categories
    for (const category of testData.categories) {
      await this.db('categories').insert(category);
    }

    // Insert suppliers
    for (const supplier of testData.suppliers) {
      await this.db('suppliers').insert(supplier);
    }

    // Insert products
    for (const product of testData.products) {
      await this.db('products').insert(product);
    }

    // Insert employees
    for (const employee of testData.employees) {
      await this.db('employees').insert(employee);
    }

    // Insert users
    for (const user of testData.users) {
      await this.db('users').insert(user);
    }
  }

  /**
   * Clean up test data
   */
  async cleanupTestData() {
    try {
      console.log('🧹 Cleaning up test data...');
      
      // Delete test data in reverse order (respect foreign keys)
      await this.db('inventory_updates').del();
      await this.db('attendance').del();
      await this.db('tasks').del();
      await this.db('products').del();
      await this.db('employees').del();
      await this.db('suppliers').del();
      await this.db('categories').del();
      await this.db('users').del();
      
      console.log('✅ Test data cleanup complete');
    } catch (error) {
      console.error('❌ Test data cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus() {
    try {
      const completed = await this.db('knex_migrations').select('*');
      const pending = await this.db.migrate.list();
      
      return {
        completed: completed.length,
        pending: pending[0].length,
        latest: completed.length > 0 ? completed[completed.length - 1].name : null
      };
    } catch (error) {
      console.error('❌ Failed to get migration status:', error);
      return { completed: 0, pending: 0, latest: null };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.db.raw('SELECT 1');
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }

  /**
   * Close database connection
   */
  async close() {
    try {
      await this.db.destroy();
      console.log('📪 Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
  }
}

module.exports = DatabaseManager;