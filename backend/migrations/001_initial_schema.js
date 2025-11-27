exports.up = function(knex) {
  return knex.schema
    .createTable('users', function(table) {
      table.increments('user_id').primary();
      table.string('email', 255).unique().notNullable();
      table.string('password', 255).notNullable();
      table.string('first_name', 255).notNullable();
      table.string('last_name', 255).notNullable();
      table.string('role', 50).defaultTo('user');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    .createTable('categories', function(table) {
      table.increments('category_id').primary();
      table.string('name', 255).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    
    .createTable('suppliers', function(table) {
      table.increments('supplier_id').primary();
      table.string('name', 255).notNullable();
      table.string('email', 255).notNullable();
      table.string('phone', 50);
      table.text('address');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    
    .createTable('products', function(table) {
      table.increments('product_id').primary();
      table.string('name', 255).notNullable();
      table.integer('category_id').unsigned().references('category_id').inTable('categories');
      table.integer('supplier_id').unsigned().references('supplier_id').inTable('suppliers');
      table.integer('current_quantity').notNullable().defaultTo(0);
      table.integer('min_quantity').notNullable().defaultTo(1);
      table.integer('auto_order_quantity').notNullable().defaultTo(1);
      table.decimal('unit_price', 10, 2);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    .createTable('inventory_logs', function(table) {
      table.increments('log_id').primary();
      table.integer('product_id').unsigned().references('product_id').inTable('products');
      table.enum('change_type', ['sale', 'add', 'restock', 'return']).notNullable();
      table.integer('quantity_changed').notNullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());
      table.text('notes');
    })
    
    .createTable('auto_restock_events', function(table) {
      table.increments('event_id').primary();
      table.integer('product_id').unsigned().references('product_id').inTable('products');
      table.integer('triggered_quantity').notNullable();
      table.enum('email_status', ['pending', 'sent', 'failed']).defaultTo('pending');
      table.timestamp('sent_timestamp');
    })
    
    .createTable('employees', function(table) {
      table.increments('employee_id').primary();
      table.string('first_name', 255).notNullable();
      table.string('last_name', 255).notNullable();
      table.string('role', 255).notNullable();
      table.string('department', 255).notNullable();
      table.string('email', 255).unique().notNullable();
      table.string('phone', 50);
      table.date('date_joined').notNullable();
      table.enum('status', ['active', 'on_leave', 'terminated']).defaultTo('active');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    
    .createTable('attendance', function(table) {
      table.increments('attendance_id').primary();
      table.integer('employee_id').unsigned().references('employee_id').inTable('employees');
      table.date('date').notNullable();
      table.enum('status', ['present', 'absent', 'late']).notNullable();
      table.text('reason');
      table.timestamp('timestamp').defaultTo(knex.fn.now());
    })
    
    .createTable('employee_tools', function(table) {
      table.increments('tool_id').primary();
      table.integer('employee_id').unsigned().references('employee_id').inTable('employees');
      table.string('tool_name', 255).notNullable();
      table.string('condition', 255).notNullable();
      table.date('assigned_date').notNullable();
      table.date('return_date');
    })
    
    .createTable('complaints', function(table) {
      table.increments('complaint_id').primary();
      table.integer('employee_id').unsigned().references('employee_id').inTable('employees').nullable();
      table.text('complaint_text').notNullable();
      table.date('date_submitted').notNullable();
      table.boolean('is_anonymous').defaultTo(false);
    })
    
    .createTable('employee_tasks', function(table) {
      table.increments('task_id').primary();
      table.integer('employee_id').unsigned().references('employee_id').inTable('employees');
      table.string('task_title', 255).notNullable();
      table.text('task_description').notNullable();
      table.date('due_date').notNullable();
      table.enum('status', ['pending', 'in_progress', 'completed']).defaultTo('pending');
      table.timestamp('assigned_timestamp').defaultTo(knex.fn.now());
    })
    
    .createTable('payments', function(table) {
      table.increments('payment_id').primary();
      table.enum('type', ['supplier', 'salary', 'other']).notNullable();
      table.integer('employee_id').unsigned().references('employee_id').inTable('employees').nullable();
      table.integer('supplier_id').unsigned().references('supplier_id').inTable('suppliers').nullable();
      table.decimal('amount', 10, 2).notNullable();
      table.date('date').notNullable();
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    
    .createTable('salaries', function(table) {
      table.increments('salary_id').primary();
      table.integer('employee_id').unsigned().references('employee_id').inTable('employees');
      table.decimal('amount', 10, 2).notNullable();
      table.enum('payment_cycle', ['monthly', 'weekly']).notNullable();
      table.date('last_paid_date');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('salaries')
    .dropTableIfExists('payments')
    .dropTableIfExists('employee_tasks')
    .dropTableIfExists('complaints')
    .dropTableIfExists('employee_tools')
    .dropTableIfExists('attendance')
    .dropTableIfExists('employees')
    .dropTableIfExists('auto_restock_events')
    .dropTableIfExists('inventory_logs')
    .dropTableIfExists('products')
    .dropTableIfExists('suppliers')
    .dropTableIfExists('categories')
    .dropTableIfExists('users');
};