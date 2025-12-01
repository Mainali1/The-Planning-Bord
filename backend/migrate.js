const DatabaseManager = require('../src/utils/databaseManager');

/**
 * Migration script for automated database setup
 */
async function runMigrations() {
  const dbManager = new DatabaseManager();
  
  try {
    console.log('🚀 Starting database migration process...');
    
    // Initialize database
    await dbManager.initialize();
    
    // Get migration status
    const status = await dbManager.getMigrationStatus();
    console.log(`📊 Migration status: ${status.completed} completed, ${status.pending} pending`);
    
    // Health check
    const health = await dbManager.healthCheck();
    console.log(`💚 Database health: ${health.status}`);
    
    console.log('✅ Database migration process completed successfully');
    
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  } finally {
    await dbManager.close();
  }
}

/**
 * Rollback migrations
 */
async function rollbackMigrations(steps = 1) {
  const dbManager = new DatabaseManager();
  
  try {
    console.log(`🔄 Rolling back ${steps} migration(s)...`);
    await dbManager.rollbackMigrations(steps);
    console.log('✅ Rollback completed successfully');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    await dbManager.close();
  }
}

/**
 * Setup test database
 */
async function setupTestDatabase() {
  const dbManager = new DatabaseManager();
  
  try {
    console.log('🧪 Setting up test database...');
    await dbManager.createTestDatabase();
    console.log('✅ Test database setup completed');
    
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    process.exit(1);
  } finally {
    await dbManager.close();
  }
}

/**
 * Cleanup test database
 */
async function cleanupTestDatabase() {
  const dbManager = new DatabaseManager();
  
  try {
    console.log('🧹 Cleaning up test database...');
    await dbManager.cleanupTestData();
    console.log('✅ Test database cleanup completed');
    
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
    process.exit(1);
  } finally {
    await dbManager.close();
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const steps = parseInt(process.argv[3]) || 1;
  
  switch (command) {
    case 'migrate':
      runMigrations();
      break;
    case 'rollback':
      rollbackMigrations(steps);
      break;
    case 'test:setup':
      setupTestDatabase();
      break;
    case 'test:cleanup':
      cleanupTestDatabase();
      break;
    default:
      console.log(`
Usage: node migrate.js <command>

Commands:
  migrate        - Run all pending migrations
  rollback [n]   - Rollback n migrations (default: 1)
  test:setup     - Setup test database with fixtures
  test:cleanup   - Clean up test data

Examples:
  node migrate.js migrate
  node migrate.js rollback 2
  node migrate.js test:setup
      `);
      process.exit(0);
  }
}

module.exports = {
  runMigrations,
  rollbackMigrations,
  setupTestDatabase,
  cleanupTestDatabase
};