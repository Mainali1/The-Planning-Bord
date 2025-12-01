const { setupTestDatabase, cleanupTestDatabase } = require('./migrate');

/**
 * Test fixtures for automated testing
 */
class TestFixtures {
  constructor() {
    this.dbManager = null;
  }

  /**
   * Setup test environment with fixtures
   */
  async setup() {
    console.log('🧪 Setting up test fixtures...');
    
    try {
      // Create test database
      await setupTestDatabase();
      
      console.log('✅ Test fixtures setup completed');
      return true;
    } catch (error) {
      console.error('❌ Test fixtures setup failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    console.log('🧹 Cleaning up test fixtures...');
    
    try {
      // Cleanup test database
      await cleanupTestDatabase();
      
      console.log('✅ Test fixtures cleanup completed');
      return true;
    } catch (error) {
      console.error('❌ Test fixtures cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Create specific test scenarios
   */
  async createScenario(scenario) {
    const scenarios = {
      'low-stock': this.createLowStockScenario.bind(this),
      'new-employee': this.createNewEmployeeScenario.bind(this),
      'attendance-tracking': this.createAttendanceTrackingScenario.bind(this),
      'task-assignment': this.createTaskAssignmentScenario.bind(this)
    };

    if (scenarios[scenario]) {
      return await scenarios[scenario]();
    } else {
      throw new Error(`Unknown scenario: ${scenario}`);
    }
  }

  /**
   * Create low stock scenario
   */
  async createLowStockScenario() {
    const knex = require('knex');
    const config = require('./knexfile');
    const db = knex(config.test);

    try {
      // Create products with low stock
      await db('products').insert([
        {
          name: 'Low Stock Item 1',
          description: 'Item with very low stock',
          category_id: 1,
          supplier_id: 1,
          current_quantity: 2,
          min_quantity: 10,
          unit_price: 25.99
        },
        {
          name: 'Low Stock Item 2',
          description: 'Another item with low stock',
          category_id: 1,
          supplier_id: 1,
          current_quantity: 5,
          min_quantity: 15,
          unit_price: 49.99
        }
      ]);

      console.log('✅ Low stock scenario created');
      return true;
    } catch (error) {
      console.error('❌ Low stock scenario creation failed:', error);
      throw error;
    } finally {
      await db.destroy();
    }
  }

  /**
   * Create new employee scenario
   */
  async createNewEmployeeScenario() {
    const knex = require('knex');
    const config = require('./knexfile');
    const db = knex(config.test);

    try {
      // Create new employee
      const [employeeId] = await db('employees').insert({
        first_name: 'New',
        last_name: 'Employee',
        email: 'new.employee@example.com',
        role: 'Developer',
        department: 'IT',
        phone: '+1234567890',
        date_joined: new Date().toISOString().split('T')[0]
      });

      console.log(`✅ New employee scenario created with ID: ${employeeId}`);
      return employeeId;
    } catch (error) {
      console.error('❌ New employee scenario creation failed:', error);
      throw error;
    } finally {
      await db.destroy();
    }
  }

  /**
   * Create attendance tracking scenario
   */
  async createAttendanceTrackingScenario() {
    const knex = require('knex');
    const config = require('./knexfile');
    const db = knex(config.test);

    try {
      // Create employee and attendance records
      const [employeeId] = await db('employees').insert({
        first_name: 'Attendance',
        last_name: 'Test',
        email: 'attendance.test@example.com',
        role: 'Manager',
        department: 'Operations',
        phone: '+1234567890',
        date_joined: '2024-01-01'
      });

      // Create attendance records for the past week
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        await db('attendance').insert({
          employee_id: employeeId,
          date: date.toISOString().split('T')[0],
          status: i % 3 === 0 ? 'absent' : 'present',
          check_in_time: i % 3 === 0 ? null : '09:00:00',
          check_out_time: i % 3 === 0 ? null : '17:00:00',
          reason: i % 3 === 0 ? 'Sick leave' : 'Working from office'
        });
      }

      console.log(`✅ Attendance tracking scenario created for employee ID: ${employeeId}`);
      return employeeId;
    } catch (error) {
      console.error('❌ Attendance tracking scenario creation failed:', error);
      throw error;
    } finally {
      await db.destroy();
    }
  }

  /**
   * Create task assignment scenario
   */
  async createTaskAssignmentScenario() {
    const knex = require('knex');
    const config = require('./knexfile');
    const db = knex(config.test);

    try {
      // Create employee
      const [employeeId] = await db('employees').insert({
        first_name: 'Task',
        last_name: 'Assignee',
        email: 'task.assignee@example.com',
        role: 'Developer',
        department: 'IT',
        phone: '+1234567890',
        date_joined: '2024-01-01'
      });

      // Create multiple tasks
      await db('tasks').insert([
        {
          employee_id: employeeId,
          task_title: 'Complete API Documentation',
          task_description: 'Document all API endpoints',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending',
          priority: 'high'
        },
        {
          employee_id: employeeId,
          task_title: 'Review Code',
          task_description: 'Review pull requests',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'in_progress',
          priority: 'medium'
        },
        {
          employee_id: employeeId,
          task_title: 'Update Dependencies',
          task_description: 'Update npm packages',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'completed',
          priority: 'low'
        }
      ]);

      console.log(`✅ Task assignment scenario created for employee ID: ${employeeId}`);
      return employeeId;
    } catch (error) {
      console.error('❌ Task assignment scenario creation failed:', error);
      throw error;
    } finally {
      await db.destroy();
    }
  }
}

module.exports = TestFixtures;

// CLI interface
if (require.main === module) {
  const fixtures = new TestFixtures();
  const command = process.argv[2];
  const scenario = process.argv[3];

  switch (command) {
    case 'setup':
      fixtures.setup().then(() => process.exit(0));
      break;
    case 'cleanup':
      fixtures.cleanup().then(() => process.exit(0));
      break;
    case 'scenario':
      if (!scenario) {
        console.error('❌ Scenario name required');
        process.exit(1);
      }
      fixtures.createScenario(scenario).then(() => process.exit(0));
      break;
    default:
      console.log(`
Usage: node testFixtures.js <command> [scenario]

Commands:
  setup              - Setup test environment with fixtures
  cleanup            - Clean up test environment
  scenario <name>    - Create specific test scenario

Available scenarios:
  low-stock          - Create products with low stock
  new-employee       - Create new employee
  attendance-tracking - Create attendance tracking data
  task-assignment    - Create task assignment scenario

Examples:
  node testFixtures.js setup
  node testFixtures.js scenario low-stock
      `);
      process.exit(0);
  }
}