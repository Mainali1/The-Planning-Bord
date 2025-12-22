mod db;
mod models;

use std::sync::Mutex;
use tauri::{State, Manager};
use models::{Product, Employee, Payment, DashboardStats, Task, Attendance, ReportSummary, ChartDataPoint, Complaint, Tool, Role, Permission, FeatureToggle, ToolAssignment};

struct AppState {
    db: Mutex<rusqlite::Connection>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

// --- Product Commands ---

#[tauri::command]
fn get_products(state: State<AppState>, search: Option<String>, page: Option<i32>, page_size: Option<i32>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    let search_term = search.unwrap_or_default();
    let limit = page_size.unwrap_or(50);
    let offset = (page.unwrap_or(1) - 1) * limit;
    let search_pattern = format!("%{}%", search_term);

    // Count total
    let mut count_stmt = conn.prepare("SELECT COUNT(*) FROM products WHERE name LIKE ?1 OR sku LIKE ?1 OR category LIKE ?1").map_err(|e| e.to_string())?;
    let total: i32 = count_stmt.query_row([&search_pattern], |row| row.get(0)).unwrap_or(0);

    // Get items
    let mut stmt = conn.prepare("SELECT id, name, description, category, sku, current_quantity, minimum_quantity, reorder_quantity, unit_price, supplier_name, is_active FROM products WHERE name LIKE ?1 OR sku LIKE ?1 OR category LIKE ?1 LIMIT ?2 OFFSET ?3").map_err(|e| e.to_string())?;
    
    let products_iter = stmt.query_map(rusqlite::params![&search_pattern, limit, offset], |row| {
        Ok(Product {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            description: row.get(2)?,
            category: row.get(3)?,
            sku: row.get(4)?,
            current_quantity: row.get(5)?,
            minimum_quantity: row.get(6)?,
            reorder_quantity: row.get(7)?,
            unit_price: row.get(8)?,
            supplier_name: row.get(9)?,
            is_active: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut products = Vec::new();
    for product in products_iter {
        products.push(product.map_err(|e| e.to_string())?);
    }

    Ok(serde_json::json!({
        "items": products,
        "total": total,
        "page": page.unwrap_or(1),
        "page_size": limit
    }))
}

#[tauri::command]
fn add_product(state: State<AppState>, product: Product) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    conn.execute(
        "INSERT INTO products (name, description, category, sku, current_quantity, minimum_quantity, reorder_quantity, unit_price, supplier_name, is_active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        (
            &product.name,
            &product.description,
            &product.category,
            &product.sku,
            &product.current_quantity,
            &product.minimum_quantity,
            &product.reorder_quantity,
            &product.unit_price,
            &product.supplier_name,
            &product.is_active,
        ),
    ).map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_product(state: State<AppState>, product: Product) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    if let Some(id) = product.id {
        conn.execute(
            "UPDATE products SET name = ?1, description = ?2, category = ?3, sku = ?4, current_quantity = ?5, minimum_quantity = ?6, reorder_quantity = ?7, unit_price = ?8, supplier_name = ?9, is_active = ?10 WHERE id = ?11",
            (
                &product.name,
                &product.description,
                &product.category,
                &product.sku,
                &product.current_quantity,
                &product.minimum_quantity,
                &product.reorder_quantity,
                &product.unit_price,
                &product.supplier_name,
                &product.is_active,
                id
            ),
        ).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Product ID is required for update".to_string())
    }
}

#[tauri::command]
fn delete_product(state: State<AppState>, id: i32) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    conn.execute("DELETE FROM products WHERE id = ?1", [id]).map_err(|e| e.to_string())?;
    Ok(())
}

// --- Employee Commands ---

#[tauri::command]
fn get_employees(state: State<AppState>) -> Result<Vec<Employee>, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let mut stmt = conn.prepare("SELECT id, employee_id, first_name, last_name, email, phone, role, department, position, salary, status FROM employees").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([], |row| {
        Ok(Employee {
            id: Some(row.get(0)?),
            employee_id: row.get(1)?,
            first_name: row.get(2)?,
            last_name: row.get(3)?,
            email: row.get(4)?,
            phone: row.get(5)?,
            role: row.get(6)?,
            department: row.get(7)?,
            position: row.get(8)?,
            salary: row.get(9)?,
            status: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut employees = Vec::new();
    for emp in iter {
        employees.push(emp.map_err(|e| e.to_string())?);
    }

    Ok(employees)
}

#[tauri::command]
fn add_employee(state: State<AppState>, employee: Employee) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    conn.execute(
        "INSERT INTO employees (employee_id, first_name, last_name, email, phone, role, department, position, salary, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        (
            &employee.employee_id,
            &employee.first_name,
            &employee.last_name,
            &employee.email,
            &employee.phone,
            &employee.role,
            &employee.department,
            &employee.position,
            &employee.salary,
            &employee.status,
        ),
    ).map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_employee(state: State<AppState>, employee: Employee) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    if let Some(id) = employee.id {
        conn.execute(
            "UPDATE employees SET employee_id = ?1, first_name = ?2, last_name = ?3, email = ?4, phone = ?5, role = ?6, department = ?7, position = ?8, salary = ?9, status = ?10 WHERE id = ?11",
            (
                &employee.employee_id,
                &employee.first_name,
                &employee.last_name,
                &employee.email,
                &employee.phone,
                &employee.role,
                &employee.department,
                &employee.position,
                &employee.salary,
                &employee.status,
                id
            ),
        ).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Employee ID is required for update".to_string())
    }
}

#[tauri::command]
fn delete_employee(state: State<AppState>, id: i32) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    conn.execute("DELETE FROM employees WHERE id = ?1", [id]).map_err(|e| e.to_string())?;
    Ok(())
}

// --- Payment Commands ---

#[tauri::command]
fn get_payments(state: State<AppState>) -> Result<Vec<Payment>, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let mut stmt = conn.prepare("SELECT id, payment_type, amount, currency, description, status, payment_method, payment_date, due_date, reference_number, employee_id, supplier_name FROM payments").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([], |row| {
        Ok(Payment {
            id: Some(row.get(0)?),
            payment_type: row.get(1)?,
            amount: row.get(2)?,
            currency: row.get(3)?,
            description: row.get(4)?,
            status: row.get(5)?,
            payment_method: row.get(6)?,
            payment_date: row.get(7)?,
            due_date: row.get(8)?,
            reference_number: row.get(9)?,
            employee_id: row.get(10)?,
            supplier_name: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut payments = Vec::new();
    for payment in iter {
        payments.push(payment.map_err(|e| e.to_string())?);
    }

    Ok(payments)
}

#[tauri::command]
fn add_payment(state: State<AppState>, payment: Payment) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    conn.execute(
        "INSERT INTO payments (payment_type, amount, currency, description, status, payment_method, payment_date, due_date, reference_number, employee_id, supplier_name)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        (
            &payment.payment_type,
            &payment.amount,
            &payment.currency,
            &payment.description,
            &payment.status,
            &payment.payment_method,
            &payment.payment_date,
            &payment.due_date,
            &payment.reference_number,
            &payment.employee_id,
            &payment.supplier_name,
        ),
    ).map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_payment(state: State<AppState>, payment: Payment) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    if let Some(id) = payment.id {
        conn.execute(
            "UPDATE payments SET payment_type = ?1, amount = ?2, currency = ?3, description = ?4, status = ?5, payment_method = ?6, payment_date = ?7, due_date = ?8, reference_number = ?9, employee_id = ?10, supplier_name = ?11 WHERE id = ?12",
            (
                &payment.payment_type,
                &payment.amount,
                &payment.currency,
                &payment.description,
                &payment.status,
                &payment.payment_method,
                &payment.payment_date,
                &payment.due_date,
                &payment.reference_number,
                &payment.employee_id,
                &payment.supplier_name,
                id
            ),
        ).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Payment ID is required for update".to_string())
    }
}

#[tauri::command]
fn delete_payment(state: State<AppState>, id: i32) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    conn.execute("DELETE FROM payments WHERE id = ?1", [id]).map_err(|e| e.to_string())?;
    Ok(())
}

// --- Task Commands ---

#[tauri::command]
fn get_tasks(state: State<AppState>) -> Result<Vec<Task>, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let mut stmt = conn.prepare("SELECT id, employee_id, title, description, due_date, status, priority, assigned_date, completed_date FROM tasks").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([], |row| {
        Ok(Task {
            id: Some(row.get(0)?),
            employee_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            due_date: row.get(4)?,
            status: row.get(5)?,
            priority: row.get(6)?,
            assigned_date: row.get(7)?,
            completed_date: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut tasks = Vec::new();
    for task in iter {
        tasks.push(task.map_err(|e| e.to_string())?);
    }

    Ok(tasks)
}

#[tauri::command]
fn add_task(state: State<AppState>, task: Task) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    conn.execute(
        "INSERT INTO tasks (employee_id, title, description, due_date, status, priority, assigned_date, completed_date)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (
            &task.employee_id,
            &task.title,
            &task.description,
            &task.due_date,
            &task.status,
            &task.priority,
            &task.assigned_date,
            &task.completed_date,
        ),
    ).map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_task(state: State<AppState>, task: Task) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    if let Some(id) = task.id {
        conn.execute(
            "UPDATE tasks SET employee_id = ?1, title = ?2, description = ?3, due_date = ?4, status = ?5, priority = ?6, assigned_date = ?7, completed_date = ?8 WHERE id = ?9",
            (
                &task.employee_id,
                &task.title,
                &task.description,
                &task.due_date,
                &task.status,
                &task.priority,
                &task.assigned_date,
                &task.completed_date,
                id
            ),
        ).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Task ID is required for update".to_string())
    }
}

#[tauri::command]
fn delete_task(state: State<AppState>, id: i32) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    conn.execute("DELETE FROM tasks WHERE id = ?1", [id]).map_err(|e| e.to_string())?;
    Ok(())
}

// --- Attendance Commands ---

#[tauri::command]
fn get_attendances(state: State<AppState>) -> Result<Vec<Attendance>, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let mut stmt = conn.prepare("SELECT id, employee_id, check_in, check_out, status, notes, location FROM attendance").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([], |row| {
        Ok(Attendance {
            id: Some(row.get(0)?),
            employee_id: row.get(1)?,
            check_in: row.get(2)?,
            check_out: row.get(3)?,
            status: row.get(4)?,
            notes: row.get(5)?,
            location: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut attendances = Vec::new();
    for att in iter {
        attendances.push(att.map_err(|e| e.to_string())?);
    }

    Ok(attendances)
}

#[tauri::command]
fn clock_in(state: State<AppState>, attendance: Attendance) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    conn.execute(
        "INSERT INTO attendance (employee_id, check_in, status, notes, location)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        (
            &attendance.employee_id,
            &attendance.check_in,
            &attendance.status,
            &attendance.notes,
            &attendance.location,
        ),
    ).map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn clock_out(state: State<AppState>, attendance: Attendance) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    if let Some(id) = attendance.id {
        conn.execute(
            "UPDATE attendance SET check_out = ?1, status = ?2, notes = ?3 WHERE id = ?4",
            (
                &attendance.check_out,
                &attendance.status,
                &attendance.notes,
                id
            ),
        ).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Attendance ID is required for clock out".to_string())
    }
}

// --- Dashboard Commands ---

#[tauri::command]
fn get_dashboard_stats(state: State<AppState>) -> Result<DashboardStats, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    let total_products: i32 = conn.query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0)).unwrap_or(0);
    let low_stock_items: i32 = conn.query_row("SELECT COUNT(*) FROM products WHERE current_quantity <= minimum_quantity", [], |row| row.get(0)).unwrap_or(0);
    let total_employees: i32 = conn.query_row("SELECT COUNT(*) FROM employees WHERE status = 'active'", [], |row| row.get(0)).unwrap_or(0);
    let total_payments_pending: i32 = conn.query_row("SELECT COUNT(*) FROM payments WHERE status = 'pending'", [], |row| row.get(0)).unwrap_or(0);
    
    // Mock revenue for now as we don't have a sales table yet, or derive from payments (incoming)
    // Assuming payments can be 'income' or 'expense', but schema just says 'payment_type'.
    // Let's just return 0.0 or a sum of 'income' payments if any.
    let total_revenue: f64 = 0.0; 

    Ok(DashboardStats {
        total_products,
        low_stock_items,
        total_employees,
        total_payments_pending,
        total_revenue,
    })
}


// --- Reports Commands ---

#[tauri::command]
fn get_report_summary(state: State<AppState>) -> Result<ReportSummary, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;

    // Inventory Value
    let inventory_value: f64 = conn.query_row(
        "SELECT SUM(current_quantity * unit_price) FROM products",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    // Revenue (Income)
    let total_revenue: f64 = conn.query_row(
        "SELECT SUM(amount) FROM payments WHERE payment_type = 'income' AND status = 'completed'",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    // Expenses (Expense + Payroll)
    let total_expenses: f64 = conn.query_row(
        "SELECT SUM(amount) FROM payments WHERE (payment_type = 'expense' OR payment_type = 'payroll') AND status = 'completed'",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let net_profit = total_revenue - total_expenses;

    // Counts
    let pending_tasks: i32 = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE status != 'completed'",
        [],
        |row| row.get(0)
    ).unwrap_or(0);

    let active_employees: i32 = conn.query_row(
        "SELECT COUNT(*) FROM employees WHERE status = 'active'",
        [],
        |row| row.get(0)
    ).unwrap_or(0);

    Ok(ReportSummary {
        total_revenue,
        total_expenses,
        net_profit,
        inventory_value,
        pending_tasks,
        active_employees,
    })
}

#[tauri::command]
fn get_monthly_cashflow(state: State<AppState>) -> Result<Vec<ChartDataPoint>, String> {
    // This is a simplified version. In a real app, we'd use SQL date functions more robustly.
    // For SQLite, strftime('%Y-%m', payment_date) works if dates are YYYY-MM-DD.
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;

    let mut stmt = conn.prepare(
        "SELECT strftime('%Y-%m', payment_date) as month, SUM(amount) 
         FROM payments 
         WHERE status = 'completed' AND payment_type = 'income'
         GROUP BY month 
         ORDER BY month DESC 
         LIMIT 6"
    ).map_err(|e| e.to_string())?;

    let iter = stmt.query_map([], |row| {
        Ok(ChartDataPoint {
            label: row.get::<_, String>(0).unwrap_or_default(),
            value: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for point in iter {
        data.push(point.map_err(|e| e.to_string())?);
    }
    // Reverse to show oldest to newest
    data.reverse();
    Ok(data)
}

// --- Complaint Commands ---

#[tauri::command]
fn get_complaints(state: State<AppState>) -> Result<Vec<Complaint>, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let mut stmt = conn.prepare("SELECT id, content, created_at, status, admin_notes, resolution, resolved_at, resolved_by FROM complaints ORDER BY created_at DESC").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([], |row| {
        Ok(Complaint {
            id: Some(row.get(0)?),
            content: row.get(1)?,
            created_at: row.get(2)?,
            status: row.get(3)?,
            admin_notes: row.get(4)?,
            resolution: row.get(5)?,
            resolved_at: row.get(6)?,
            resolved_by: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut complaints = Vec::new();
    for c in iter {
        complaints.push(c.map_err(|e| e.to_string())?);
    }

    Ok(complaints)
}

#[tauri::command]
fn submit_complaint(state: State<AppState>, content: String) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    // We'll let created_at be handled by DB default or insert explicit current time if needed.
    // Here we just insert content.
    let created_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT INTO complaints (content, created_at, status) VALUES (?1, ?2, 'pending')",
        (&content, &created_at),
    ).map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn resolve_complaint(state: State<AppState>, id: i32, status: String, resolution: String, resolved_by: String, admin_notes: Option<String>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let resolved_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    conn.execute(
        "UPDATE complaints SET status = ?1, resolution = ?2, resolved_by = ?3, resolved_at = ?4, admin_notes = ?5 WHERE id = ?6",
        (&status, &resolution, &resolved_by, &resolved_at, &admin_notes, id),
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_complaint(state: State<AppState>, id: i32) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    conn.execute("DELETE FROM complaints WHERE id = ?1", (id,)).map_err(|e| e.to_string())?;
    Ok(())
}

// --- Tool Commands ---

#[tauri::command]
fn get_tools(state: State<AppState>) -> Result<Vec<Tool>, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let mut stmt = conn.prepare("SELECT id, name, type_name, status, assigned_to_employee_id, purchase_date, condition FROM tools").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([], |row| {
        Ok(Tool {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            type_name: row.get(2)?,
            status: row.get(3)?,
            assigned_to_employee_id: row.get(4)?,
            purchase_date: row.get(5)?,
            condition: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut tools = Vec::new();
    for t in iter {
        tools.push(t.map_err(|e| e.to_string())?);
    }
    Ok(tools)
}

#[tauri::command]
fn add_tool(state: State<AppState>, tool: Tool) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    conn.execute(
        "INSERT INTO tools (name, type_name, status, assigned_to_employee_id, purchase_date, condition) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (
            &tool.name,
            &tool.type_name,
            &tool.status,
            &tool.assigned_to_employee_id,
            &tool.purchase_date,
            &tool.condition,
        ),
    ).map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_tool(state: State<AppState>, tool: Tool) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    if let Some(id) = tool.id {
        conn.execute(
            "UPDATE tools SET name = ?1, type_name = ?2, status = ?3, assigned_to_employee_id = ?4, purchase_date = ?5, condition = ?6 WHERE id = ?7",
            (
                &tool.name,
                &tool.type_name,
                &tool.status,
                &tool.assigned_to_employee_id,
                &tool.purchase_date,
                &tool.condition,
                id
            ),
        ).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Tool ID is required for update".to_string())
    }
}

#[tauri::command]
fn delete_tool(state: State<AppState>, id: i32) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    conn.execute("DELETE FROM tools WHERE id = ?1", (id,)).map_err(|e| e.to_string())?;
    Ok(())
}

// --- Advanced Tool Commands ---

#[tauri::command]
fn assign_tool(state: State<AppState>, tool_id: i32, employee_id: i32, condition: String, notes: Option<String>) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // Update tool status
    tx.execute("UPDATE tools SET status = 'assigned', assigned_to_employee_id = ?1, condition = ?2 WHERE id = ?3", (&employee_id, &condition, &tool_id)).map_err(|e| e.to_string())?;
    
    // Log assignment
    tx.execute(
        "INSERT INTO tool_assignments (tool_id, employee_id, condition_on_assignment, notes) VALUES (?1, ?2, ?3, ?4)",
        (&tool_id, &employee_id, &condition, &notes)
    ).map_err(|e| e.to_string())?;
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn return_tool(state: State<AppState>, tool_id: i32, condition: String, notes: Option<String>) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // Find active assignment to update returned_at
    tx.execute(
        "UPDATE tool_assignments SET returned_at = CURRENT_TIMESTAMP, condition_on_return = ?1, notes = coalesce(notes, '') || '\nReturn Note: ' || coalesce(?2, '') WHERE tool_id = ?3 AND returned_at IS NULL",
        (&condition, &notes, &tool_id)
    ).map_err(|e| e.to_string())?;
    
    // Update tool status
    tx.execute("UPDATE tools SET status = 'available', assigned_to_employee_id = NULL, condition = ?1 WHERE id = ?2", (&condition, &tool_id)).map_err(|e| e.to_string())?;
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_tool_history(state: State<AppState>, tool_id: i32) -> Result<Vec<ToolAssignment>, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let mut stmt = conn.prepare("SELECT id, employee_id, tool_id, assigned_at, returned_at, condition_on_assignment, condition_on_return, notes FROM tool_assignments WHERE tool_id = ?1 ORDER BY assigned_at DESC").map_err(|e| e.to_string())?;
    let history = stmt.query_map([tool_id], |row| {
        Ok(ToolAssignment {
            id: Some(row.get(0)?),
            employee_id: row.get(1)?,
            tool_id: row.get(2)?,
            assigned_at: row.get(3)?,
            returned_at: row.get(4)?,
            condition_on_assignment: row.get(5)?,
            condition_on_return: row.get(6)?,
            notes: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for h in history { result.push(h.map_err(|e| e.to_string())?); }
    Ok(result)
}

// --- RBAC & Feature Toggle Commands ---

#[tauri::command]
fn get_roles(state: State<AppState>) -> Result<Vec<Role>, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let mut stmt = conn.prepare("SELECT id, name, description, is_custom FROM roles").map_err(|e| e.to_string())?;
    let roles = stmt.query_map([], |row| {
        Ok(Role {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            description: row.get(2)?,
            is_custom: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for r in roles { result.push(r.map_err(|e| e.to_string())?); }
    Ok(result)
}

#[tauri::command]
fn add_role(state: State<AppState>, name: String, description: Option<String>) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    conn.execute("INSERT INTO roles (name, description, is_custom) VALUES (?1, ?2, TRUE)", (&name, &description)).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn get_permissions(state: State<AppState>) -> Result<Vec<Permission>, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let mut stmt = conn.prepare("SELECT id, code, description FROM permissions").map_err(|e| e.to_string())?;
    let perms = stmt.query_map([], |row| {
        Ok(Permission {
            id: row.get(0)?,
            code: row.get(1)?,
            description: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for p in perms { result.push(p.map_err(|e| e.to_string())?); }
    Ok(result)
}

#[tauri::command]
fn get_role_permissions(state: State<AppState>, role_id: i32) -> Result<Vec<i32>, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let mut stmt = conn.prepare("SELECT permission_id FROM role_permissions WHERE role_id = ?1").map_err(|e| e.to_string())?;
    let perms = stmt.query_map([role_id], |row| row.get(0)).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for p in perms { result.push(p.map_err(|e| e.to_string())?); }
    Ok(result)
}

#[tauri::command]
fn update_role_permissions(state: State<AppState>, role_id: i32, permission_ids: Vec<i32>) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    tx.execute("DELETE FROM role_permissions WHERE role_id = ?1", [role_id]).map_err(|e| e.to_string())?;
    
    let mut stmt = tx.prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?1, ?2)").map_err(|e| e.to_string())?;
    for pid in permission_ids {
        stmt.execute([role_id, pid]).map_err(|e| e.to_string())?;
    }
    drop(stmt);
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_feature_toggles(state: State<AppState>) -> Result<Vec<FeatureToggle>, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    let mut stmt = conn.prepare("SELECT key, is_enabled FROM feature_toggles").map_err(|e| e.to_string())?;
    let toggles = stmt.query_map([], |row| {
        Ok(FeatureToggle {
            key: row.get(0)?,
            is_enabled: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for t in toggles { result.push(t.map_err(|e| e.to_string())?); }
    Ok(result)
}

#[tauri::command]
fn set_feature_toggle(state: State<AppState>, key: String, is_enabled: bool) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    conn.execute("INSERT OR REPLACE INTO feature_toggles (key, is_enabled) VALUES (?1, ?2)", (&key, is_enabled)).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_setup_status(state: State<AppState>) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    // We check if setup_completed is true in setup_config
    let mut stmt = conn.prepare("SELECT setup_completed FROM setup_config LIMIT 1").map_err(|e| e.to_string())?;
    let status: Result<bool, _> = stmt.query_row([], |row| row.get(0));
    Ok(status.unwrap_or(false))
}

#[tauri::command]
fn complete_setup(state: State<AppState>, company_name: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|_| "Failed to lock db".to_string())?;
    // Provide default values for NOT NULL columns (license_key, company_email)
    conn.execute(
        "INSERT OR REPLACE INTO setup_config (id, company_name, license_key, company_email, setup_completed, setup_completed_at) VALUES (1, ?1, 'COMMUNITY-EDITION', 'admin@local', TRUE, CURRENT_TIMESTAMP)",
        (&company_name,)
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle();
            let app_data_dir = app_handle.path().app_local_data_dir().expect("failed to get app data dir");
            
            if !app_data_dir.exists() {
                std::fs::create_dir_all(&app_data_dir).expect("failed to create app data dir");
            }
            
            let db_path = app_data_dir.join("planningbord.db");
            let db_conn = db::init_db(db_path.to_str().unwrap()).expect("Failed to init DB");
            
            app.manage(AppState { db: Mutex::new(db_conn) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet, ping,
            get_products, add_product, update_product, delete_product,
            get_employees, add_employee, update_employee, delete_employee,
            get_payments, add_payment, update_payment, delete_payment,
            get_tasks, add_task, update_task, delete_task,
            get_attendances, clock_in, clock_out,
            get_dashboard_stats,
            get_report_summary, get_monthly_cashflow,
            get_complaints, submit_complaint, resolve_complaint, delete_complaint,
            get_tools, add_tool, update_tool, delete_tool,
            assign_tool, return_tool, get_tool_history,
            get_roles, add_role, get_permissions, get_role_permissions, update_role_permissions,
            get_feature_toggles, set_feature_toggle,
            get_setup_status, complete_setup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
