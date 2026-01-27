#![cfg(test)]
use std::sync::RwLock;
use crate::models::*;
use super::Database;
use async_trait::async_trait;

pub struct InMemoryDatabase {
    users: RwLock<Vec<User>>,
    sessions: RwLock<Vec<(String, i32, i64)>>,
    products: RwLock<Vec<Product>>,
    employees: RwLock<Vec<Employee>>,
    payments: RwLock<Vec<Payment>>,
    tasks: RwLock<Vec<Task>>,
    attendances: RwLock<Vec<Attendance>>,
    complaints: RwLock<Vec<Complaint>>,
    tools: RwLock<Vec<Tool>>,
    tool_assignments: RwLock<Vec<ToolAssignment>>,
    roles: RwLock<Vec<Role>>,
    permissions: RwLock<Vec<Permission>>,
    role_permissions: RwLock<Vec<(i32, i32)>>, // role_id, permission_id
    feature_toggles: RwLock<Vec<FeatureToggle>>,
    audit_logs: RwLock<Vec<AuditLog>>,
    dashboard_configs: RwLock<Vec<DashboardConfig>>,
    projects: RwLock<Vec<Project>>,
    project_tasks: RwLock<Vec<ProjectTask>>,
    project_assignments: RwLock<Vec<ProjectAssignment>>,
    accounts: RwLock<Vec<Account>>,
    invoices: RwLock<Vec<Invoice>>,
    integrations: RwLock<Vec<Integration>>,
    invites: RwLock<Vec<Invite>>,
    suppliers: RwLock<Vec<Supplier>>,
    supplier_orders: RwLock<Vec<SupplierOrder>>,
}

impl InMemoryDatabase {
    pub fn new() -> Self {
        let mut roles = Vec::new();
        roles.push(Role { id: Some(1), name: "CEO".to_string(), description: Some("Chief Executive Officer".to_string()), is_custom: false });
        roles.push(Role { id: Some(2), name: "Manager".to_string(), description: Some("Managerial Role".to_string()), is_custom: false });
        roles.push(Role { id: Some(3), name: "Employee".to_string(), description: Some("Standard Employee".to_string()), is_custom: false });
        roles.push(Role { id: Some(4), name: "Technical".to_string(), description: Some("System Admin / Technical Support".to_string()), is_custom: false });

        let mut permissions = Vec::new();
        let perms_data = vec![
            (1, "MANAGE_INVENTORY", "Can add/edit/delete products"),
            (2, "VIEW_INVENTORY", "Can view products"),
            (3, "MANAGE_EMPLOYEES", "Can add/edit/delete employees"),
            (4, "ASSIGN_TOOLS", "Can assign tools to employees"),
            (5, "MANAGE_COMPLAINTS", "Can view and resolve complaints"),
            (6, "MANAGE_SETTINGS", "Can change system settings"),
            (7, "MANAGE_ROLES", "Can create and modify roles"),
            (8, "MANAGE_TOOLS", "Can create, update, and delete tools"),
            (9, "MANAGE_PROJECTS", "Can create, update, and delete projects"),
            (10, "VIEW_BACKEND_ERRORS", "Can view detailed backend error notifications"),
        ];
        for (id, code, desc) in perms_data {
            permissions.push(Permission { id, code: code.to_string(), description: Some(desc.to_string()) });
        }

        let mut role_permissions = Vec::new();
        // Assign VIEW_BACKEND_ERRORS (10) to Technical (4) and CEO (1)
        role_permissions.push((4, 10));
        role_permissions.push((1, 10));

        Self {
            users: RwLock::new(Vec::new()),
            sessions: RwLock::new(Vec::new()),
            invites: RwLock::new(Vec::new()),
            products: RwLock::new(Vec::new()),
            employees: RwLock::new(Vec::new()),
            payments: RwLock::new(Vec::new()),
            tasks: RwLock::new(Vec::new()),
            attendances: RwLock::new(Vec::new()),
            complaints: RwLock::new(Vec::new()),
            tools: RwLock::new(Vec::new()),
            tool_assignments: RwLock::new(Vec::new()),
            roles: RwLock::new(roles),
            permissions: RwLock::new(permissions),
            role_permissions: RwLock::new(role_permissions),
            feature_toggles: RwLock::new(Vec::new()),
            audit_logs: RwLock::new(Vec::new()),
            dashboard_configs: RwLock::new(Vec::new()),
            projects: RwLock::new(Vec::new()),
            project_tasks: RwLock::new(Vec::new()),
            project_assignments: RwLock::new(Vec::new()),
            accounts: RwLock::new(Vec::new()),
            invoices: RwLock::new(Vec::new()),
            integrations: RwLock::new(Vec::new()),
            suppliers: RwLock::new(Vec::new()),
            supplier_orders: RwLock::new(Vec::new()),
        }
    }
}

#[async_trait]
impl Database for InMemoryDatabase {
    async fn get_setup_status(&self) -> Result<bool, String> { Ok(false) }
    fn get_type(&self) -> String { "memory".to_string() }
    async fn complete_setup(&self, _c: String, _n: String, _e: String, _p: String, _u: String) -> Result<(), String> { Ok(()) }
    async fn set_company_name(&self, _n: String) -> Result<(), String> { Ok(()) }
    async fn get_company_name(&self) -> Result<Option<String>, String> { Ok(Some("The Planning Bord".to_string())) }

    // Users & Auth
    async fn check_username_exists(&self, username: String) -> Result<bool, String> {
        let users = self.users.read().map_err(|_| "Failed to acquire lock".to_string())?;
        Ok(users.iter().any(|u| u.username == username))
    }
    async fn get_user_by_username(&self, username: String) -> Result<Option<User>, String> {
        let users = self.users.read().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(user) = users.iter().find(|u| u.username == username) {
            let mut user_clone = user.clone();
            
            // Populate permissions
            let roles = self.roles.read().map_err(|_| "Failed to acquire lock".to_string())?;
            if let Some(role) = roles.iter().find(|r| r.name == user_clone.role) {
                if let Some(role_id) = role.id {
                    let role_perms = self.role_permissions.read().map_err(|_| "Failed to acquire lock".to_string())?;
                    let perms = self.permissions.read().map_err(|_| "Failed to acquire lock".to_string())?;
                    
                    let perm_codes: Vec<String> = role_perms.iter()
                        .filter(|(rid, _)| *rid == role_id)
                        .filter_map(|(_, pid)| {
                            perms.iter().find(|p| p.id == *pid).map(|p| p.code.clone())
                        })
                        .collect();
                    
                    if !perm_codes.is_empty() {
                        user_clone.permissions = Some(perm_codes);
                    }
                }
            }
            
            Ok(Some(user_clone))
        } else {
            Ok(None)
        }
    }
    async fn create_user(&self, mut user: User) -> Result<i64, String> {
        let mut users = self.users.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (users.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        user.id = Some(id);
        users.push(user);
        Ok(id as i64)
    }
    async fn update_user(&self, user: User) -> Result<(), String> {
        let mut users = self.users.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let user_id = user.id.ok_or("User ID is required for update")?;
        if let Some(existing) = users.iter_mut().find(|u| u.id == Some(user_id)) {
            *existing = user;
            Ok(())
        } else {
            Err("User not found".to_string())
        }
    }
    async fn update_user_last_login(&self, user_id: i32) -> Result<(), String> {
        let mut users = self.users.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(user) = users.iter_mut().find(|u| u.id == Some(user_id)) {
            user.last_login = Some(chrono::Local::now().to_string());
        }
        Ok(())
    }
    async fn create_session(&self, token: String, user_id: i32, exp: i64) -> Result<(), String> {
        let mut sessions = self.sessions.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(pos) = sessions.iter().position(|(t, _, _)| *t == token) {
            sessions[pos] = (token, user_id, exp);
        } else {
            sessions.push((token, user_id, exp));
        }
        Ok(())
    }
    async fn get_session_user(&self, token: String) -> Result<Option<User>, String> {
        let sessions = self.sessions.read().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some((_, uid, exp)) = sessions.iter().find(|(t, _, _)| *t == token) {
            if *exp <= chrono::Utc::now().timestamp() {
                return Ok(None);
            }
            let users = self.users.read().map_err(|_| "Failed to acquire lock".to_string())?;
            if let Some(user) = users.iter().find(|u| u.id == Some(*uid)) {
                let mut user_clone = user.clone();
                
                // Populate permissions
                let roles = self.roles.read().map_err(|_| "Failed to acquire lock".to_string())?;
                if let Some(role) = roles.iter().find(|r| r.name == user_clone.role) {
                    if let Some(role_id) = role.id {
                        let role_perms = self.role_permissions.read().map_err(|_| "Failed to acquire lock".to_string())?;
                        let perms = self.permissions.read().map_err(|_| "Failed to acquire lock".to_string())?;
                        
                        let perm_codes: Vec<String> = role_perms.iter()
                            .filter(|(rid, _)| *rid == role_id)
                            .filter_map(|(_, pid)| {
                                perms.iter().find(|p| p.id == *pid).map(|p| p.code.clone())
                            })
                            .collect();
                        
                        if !perm_codes.is_empty() {
                            user_clone.permissions = Some(perm_codes);
                        }
                    }
                }
                Ok(Some(user_clone))
            } else {
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }
    async fn revoke_session(&self, token: String) -> Result<(), String> {
        let mut sessions = self.sessions.write().map_err(|_| "Failed to acquire lock".to_string())?;
        sessions.retain(|(t, _, _)| *t != token);
        Ok(())
    }
    async fn cleanup_sessions(&self) -> Result<(), String> {
        let mut sessions = self.sessions.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let now = chrono::Utc::now().timestamp();
        sessions.retain(|(_, _, exp)| *exp > now);
        Ok(())
    }

    // Invites
    async fn create_invite(&self, mut invite: Invite) -> Result<i64, String> {
        let mut invites = self.invites.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (invites.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        invite.id = Some(id);
        invites.push(invite);
        Ok(id as i64)
    }

    async fn get_invite(&self, token: String) -> Result<Option<Invite>, String> {
        let invites = self.invites.read().map_err(|_| "Failed to acquire lock".to_string())?;
        Ok(invites.iter().find(|i| i.token == token).cloned())
    }

    async fn mark_invite_used(&self, token: String) -> Result<(), String> {
        let mut invites = self.invites.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(invite) = invites.iter_mut().find(|i| i.token == token) {
            invite.is_used = true;
            Ok(())
        } else {
            Err("Invite not found".into())
        }
    }

    async fn get_invites(&self) -> Result<Vec<Invite>, String> {
        Ok(self.invites.read().map_err(|_| "Failed to acquire lock".to_string())?.clone())
    }

    async fn toggle_invite_status(&self, id: i32, is_active: bool) -> Result<(), String> {
        let mut invites = self.invites.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(invite) = invites.iter_mut().find(|i| i.id == Some(id)) {
            invite.is_active = is_active;
            Ok(())
        } else {
            Err("Invite not found".into())
        }
    }

    async fn get_products(&self, _s: Option<String>, _p: Option<i32>, _ps: Option<i32>) -> Result<serde_json::Value, String> {
        let products = self.products.read().map_err(|_| "Failed to acquire lock".to_string())?;
        Ok(serde_json::json!({ "items": *products, "total": products.len() }))
    }
    async fn add_product(&self, mut p: Product) -> Result<i64, String> {
        let mut products = self.products.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (products.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        p.id = Some(id);
        products.push(p);
        Ok(id as i64)
    }
    async fn update_product(&self, p: Product) -> Result<(), String> {
        let mut products = self.products.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(pos) = products.iter().position(|x| x.id == p.id) {
            products[pos] = p;
            Ok(())
        } else {
            Err("Product not found".into())
        }
    }
    async fn delete_product(&self, id: i32) -> Result<(), String> {
        let mut products = self.products.write().map_err(|_| "Failed to acquire lock".to_string())?;
        products.retain(|x| x.id != Some(id));
        Ok(())
    }

    async fn get_employees(&self) -> Result<Vec<Employee>, String> {
        Ok(self.employees.read().map_err(|_| "Failed to acquire lock".to_string())?.clone())
    }
    async fn get_employee_by_email(&self, email: String) -> Result<Option<Employee>, String> {
        let employees = self.employees.read().map_err(|_| "Failed to acquire lock".to_string())?;
        Ok(employees.iter().find(|e| e.email.as_deref() == Some(&email)).cloned())
    }
    async fn add_employee(&self, mut e: Employee) -> Result<i64, String> {
        let mut employees = self.employees.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (employees.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        e.id = Some(id);
        employees.push(e);
        Ok(id as i64)
    }
    async fn update_employee(&self, e: Employee) -> Result<(), String> {
        let mut employees = self.employees.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(pos) = employees.iter().position(|x| x.id == e.id) {
            employees[pos] = e;
            Ok(())
        } else {
            Err("Employee not found".into())
        }
    }
    async fn delete_employee(&self, id: i32) -> Result<(), String> {
        let mut employees = self.employees.write().map_err(|_| "Failed to acquire lock".to_string())?;
        employees.retain(|x| x.id != Some(id));
        Ok(())
    }

    async fn get_payments(&self) -> Result<Vec<Payment>, String> { Ok(self.payments.read().map_err(|_| "Failed to acquire lock".to_string())?.clone()) }
    async fn add_payment(&self, mut p: Payment) -> Result<i64, String> {
        let mut payments = self.payments.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (payments.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        p.id = Some(id);
        payments.push(p);
        Ok(id as i64)
    }
    async fn update_payment(&self, p: Payment) -> Result<(), String> {
        let mut payments = self.payments.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(pos) = payments.iter().position(|x| x.id == p.id) {
            payments[pos] = p;
            Ok(())
        } else {
            Err("Payment not found".into())
        }
    }
    async fn delete_payment(&self, id: i32) -> Result<(), String> {
        let mut payments = self.payments.write().map_err(|_| "Failed to acquire lock".to_string())?;
        payments.retain(|x| x.id != Some(id));
        Ok(())
    }

    async fn get_tasks(&self) -> Result<Vec<Task>, String> { Ok(self.tasks.read().map_err(|_| "Failed to acquire lock".to_string())?.clone()) }
    async fn get_tasks_by_employee(&self, employee_id: i32) -> Result<Vec<Task>, String> {
        let tasks = self.tasks.read().map_err(|_| "Failed to acquire lock".to_string())?;
        Ok(tasks.iter().filter(|t| t.employee_id == Some(employee_id)).cloned().collect())
    }
    async fn add_task(&self, mut t: Task) -> Result<i64, String> {
        let mut tasks = self.tasks.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (tasks.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        t.id = Some(id);
        tasks.push(t);
        Ok(id as i64)
    }
    async fn update_task(&self, t: Task) -> Result<(), String> {
        let mut tasks = self.tasks.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(pos) = tasks.iter().position(|x| x.id == t.id) {
            tasks[pos] = t;
            Ok(())
        } else {
            Err("Task not found".into())
        }
    }
    async fn delete_task(&self, id: i32) -> Result<(), String> {
        let mut tasks = self.tasks.write().map_err(|_| "Failed to acquire lock".to_string())?;
        tasks.retain(|x| x.id != Some(id));
        Ok(())
    }

    async fn get_attendances(&self) -> Result<Vec<Attendance>, String> { Ok(self.attendances.read().map_err(|_| "Failed to acquire lock".to_string())?.clone()) }
    async fn clock_in(&self, mut a: Attendance) -> Result<i64, String> {
        let mut attendances = self.attendances.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (attendances.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        a.id = Some(id);
        attendances.push(a);
        Ok(id as i64)
    }
    async fn clock_out(&self, a: Attendance) -> Result<(), String> {
        let mut attendances = self.attendances.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(pos) = attendances.iter().position(|x| x.id == a.id && x.employee_id == a.employee_id) {
            attendances[pos] = a;
            Ok(())
        } else {
            Err("Attendance not found or permission denied".into())
        }
    }

    async fn get_dashboard_stats(&self) -> Result<DashboardStats, String> {
        Ok(DashboardStats {
            total_products: self.products.read().map_err(|_| "Failed to acquire lock".to_string())?.len() as i32,
            low_stock_items: 0,
            total_employees: self.employees.read().map_err(|_| "Failed to acquire lock".to_string())?.len() as i32,
            total_payments_pending: 0,
            total_revenue: 0.0,
        })
    }
    async fn get_report_summary(&self) -> Result<ReportSummary, String> {
        Ok(ReportSummary {
            total_revenue: 0.0,
            total_expenses: 0.0,
            net_profit: 0.0,
            inventory_value: 0.0,
            pending_tasks: 0,
            active_employees: self.employees.read().map_err(|_| "Failed to acquire lock".to_string())?.len() as i32,
        })
    }
    async fn get_monthly_cashflow(&self) -> Result<Vec<ChartDataPoint>, String> { Ok(Vec::new()) }

    async fn get_complaints(&self) -> Result<Vec<Complaint>, String> { Ok(self.complaints.read().map_err(|_| "Failed to acquire lock".to_string())?.clone()) }
    async fn submit_complaint(&self, mut c: Complaint) -> Result<i64, String> {
        let mut complaints = self.complaints.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (complaints.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        c.id = Some(id);
        complaints.push(c);
        Ok(id as i64)
    }
    async fn resolve_complaint(&self, id: i32, status: String, resolution: String, resolved_by: String, admin_notes: Option<String>) -> Result<(), String> {
        let mut complaints = self.complaints.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(c) = complaints.iter_mut().find(|x| x.id == Some(id)) {
            c.status = status;
            c.resolution = Some(resolution);
            c.resolved_by = Some(resolved_by);
            c.admin_notes = admin_notes;
            Ok(())
        } else {
            Err("Complaint not found".into())
        }
    }
    async fn delete_complaint(&self, id: i32) -> Result<(), String> {
        let mut complaints = self.complaints.write().map_err(|_| "Failed to acquire lock".to_string())?;
        complaints.retain(|x| x.id != Some(id));
        Ok(())
    }

    async fn get_tools(&self) -> Result<Vec<Tool>, String> { Ok(self.tools.read().map_err(|_| "Failed to acquire lock".to_string())?.clone()) }
    async fn add_tool(&self, mut t: Tool) -> Result<i64, String> {
        let mut tools = self.tools.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (tools.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        t.id = Some(id);
        tools.push(t);
        Ok(id as i64)
    }
    async fn update_tool(&self, t: Tool) -> Result<(), String> {
        let mut tools = self.tools.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(pos) = tools.iter().position(|x| x.id == t.id) {
            tools[pos] = t;
            Ok(())
        } else {
            Err("Tool not found".into())
        }
    }
    async fn delete_tool(&self, id: i32) -> Result<(), String> {
        let mut tools = self.tools.write().map_err(|_| "Failed to acquire lock".to_string())?;
        tools.retain(|x| x.id != Some(id));
        Ok(())
    }
    async fn assign_tool(&self, mut a: ToolAssignment) -> Result<i64, String> {
        let mut assignments = self.tool_assignments.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (assignments.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        a.id = Some(id);
        
        let tool_id = a.tool_id;
        let employee_id = a.employee_id;
        
        assignments.push(a);
        
        let mut tools = self.tools.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(t) = tools.iter_mut().find(|x| x.id == tool_id) {
            t.status = "assigned".to_string();
            t.assigned_to_employee_id = employee_id;
        }
        Ok(id as i64)
    }
    async fn return_tool(&self, id: i32, return_condition: String) -> Result<(), String> {
        let mut tools = self.tools.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(t) = tools.iter_mut().find(|x| x.id == Some(id)) {
            t.status = "available".to_string();
            t.assigned_to_employee_id = None;
            t.condition = Some(return_condition);
        }
        Ok(())
    }
    async fn get_tool_history(&self, tool_id: i32) -> Result<Vec<ToolAssignment>, String> {
        Ok(self.tool_assignments.read().map_err(|_| "Failed to acquire lock".to_string())?.iter().filter(|x| x.tool_id == Some(tool_id)).cloned().collect())
    }

    async fn get_roles(&self) -> Result<Vec<Role>, String> { Ok(self.roles.read().map_err(|_| "Failed to acquire lock".to_string())?.clone()) }
    async fn add_role(&self, mut r: Role) -> Result<i64, String> {
        let mut roles = self.roles.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (roles.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        r.id = Some(id);
        roles.push(r);
        Ok(id as i64)
    }
    async fn get_permissions(&self) -> Result<Vec<Permission>, String> { Ok(self.permissions.read().map_err(|_| "Failed to acquire lock".to_string())?.clone()) }
    async fn get_role_permissions(&self, _rid: i32) -> Result<Vec<Permission>, String> { Ok(Vec::new()) }
    async fn update_role_permissions(&self, _rid: i32, _pids: Vec<i32>) -> Result<(), String> { Ok(()) }

    async fn get_feature_toggles(&self) -> Result<Vec<FeatureToggle>, String> { Ok(self.feature_toggles.read().map_err(|_| "Failed to acquire lock".to_string())?.clone()) }
    async fn set_feature_toggle(&self, key: String, is_enabled: bool) -> Result<(), String> {
        let mut toggles = self.feature_toggles.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(t) = toggles.iter_mut().find(|x| x.key == key) {
            t.is_enabled = is_enabled;
        } else {
            toggles.push(FeatureToggle { key, is_enabled });
        }
        Ok(())
    }

    async fn get_audit_logs(&self, page: Option<i32>, page_size: Option<i32>, user_id: Option<i32>, action: Option<String>, category: Option<String>, _date_from: Option<String>, _date_to: Option<String>) -> Result<Vec<AuditLog>, String> {
        let logs = self.audit_logs.read().map_err(|_| "Failed to acquire lock".to_string())?;
        let users = self.users.read().map_err(|_| "Failed to acquire lock".to_string())?;
        
        let mut filtered: Vec<AuditLog> = logs.iter().map(|l| {
            let mut log = l.clone();
            // Lookup user name
            if let Some(uid) = log.user_id {
                if let Some(user) = users.iter().find(|u| u.id == Some(uid)) {
                    log.user_name = user.full_name.clone().or(Some(user.username.clone()));
                }
            }
            log
        }).filter(|l| {
            if let Some(uid) = user_id { if l.user_id != Some(uid) { return false; } }
            if let Some(act) = &action { if !act.is_empty() && l.action != *act { return false; } }
            if let Some(cat) = &category { if !cat.is_empty() && l.category.as_ref() != Some(cat) { return false; } }
            true
        }).collect();
        
        // Sort descending by created_at (assuming ISO string)
        filtered.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        if let (Some(p), Some(ps)) = (page, page_size) {
            let start = ((p - 1) * ps) as usize;
            if start >= filtered.len() {
                Ok(Vec::new())
            } else {
                let end = (start + ps as usize).min(filtered.len());
                Ok(filtered[start..end].to_vec())
            }
        } else {
            Ok(filtered.into_iter().take(100).collect())
        }
    }
    async fn log_activity(&self, user_id: Option<i32>, action: String, category: String, entity: Option<String>, entity_id: Option<i32>, details: Option<String>, ip_address: Option<String>, user_agent: Option<String>) -> Result<(), String> {
        let mut logs = self.audit_logs.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (logs.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        logs.push(AuditLog {
            id: Some(id),
            user_id,
            user_name: None, // Populated on read
            action,
            category: Some(category),
            entity: entity.unwrap_or_default(),
            entity_id,
            details,
            ip_address,
            user_agent,
            created_at: Some(chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()),
        });
        Ok(())
    }

    async fn get_dashboard_configs(&self) -> Result<Vec<DashboardConfig>, String> { Ok(self.dashboard_configs.read().map_err(|_| "Failed to acquire lock".to_string())?.clone()) }
    async fn save_dashboard_config(&self, mut c: DashboardConfig) -> Result<(), String> {
        let mut configs = self.dashboard_configs.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if c.id.is_none() {
             let id = (configs.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
             c.id = Some(id);
             configs.push(c);
        } else {
             if let Some(pos) = configs.iter().position(|x| x.id == c.id) {
                 configs[pos] = c;
             }
        }
        Ok(())
    }

    async fn get_projects(&self) -> Result<Vec<Project>, String> { Ok(self.projects.read().map_err(|_| "Failed to acquire lock".to_string())?.clone()) }
    async fn add_project(&self, mut p: Project) -> Result<i64, String> {
        let mut projects = self.projects.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (projects.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        p.id = Some(id);
        projects.push(p);
        Ok(id as i64)
    }
    async fn update_project(&self, p: Project) -> Result<(), String> {
        let mut projects = self.projects.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(pos) = projects.iter().position(|x| x.id == p.id) {
            projects[pos] = p;
            Ok(())
        } else {
            Err("Project not found".into())
        }
    }
    async fn delete_project(&self, id: i32) -> Result<(), String> {
        let mut projects = self.projects.write().map_err(|_| "Failed to acquire lock".to_string())?;
        projects.retain(|x| x.id != Some(id));
        Ok(())
    }
    async fn get_project_tasks(&self, project_id: i32) -> Result<Vec<ProjectTask>, String> {
        Ok(self.project_tasks.read().map_err(|_| "Failed to acquire lock".to_string())?.iter().filter(|x| x.project_id == Some(project_id)).cloned().collect())
    }
    async fn add_project_task(&self, mut t: ProjectTask) -> Result<i64, String> {
        let mut tasks = self.project_tasks.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (tasks.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        t.id = Some(id);
        tasks.push(t);
        Ok(id as i64)
    }
    async fn update_project_task(&self, t: ProjectTask) -> Result<(), String> {
        let mut tasks = self.project_tasks.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(pos) = tasks.iter().position(|x| x.id == t.id) {
            tasks[pos] = t;
            Ok(())
        } else {
            Err("Task not found".into())
        }
    }
    async fn delete_project_task(&self, id: i32) -> Result<(), String> {
        let mut tasks = self.project_tasks.write().map_err(|_| "Failed to acquire lock".to_string())?;
        tasks.retain(|x| x.id != Some(id));
        Ok(())
    }
    async fn assign_project_employee(&self, project_id: i32, employee_id: i32, role: String) -> Result<(), String> {
        let mut assignments = self.project_assignments.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let new_id = (assignments.len() + 1) as i32;
        assignments.push(ProjectAssignment {
            id: Some(new_id),
            project_id,
            employee_id,
            role: Some(role),
            assigned_at: Some(chrono::Local::now().format("%Y-%m-%d").to_string()),
        });
        Ok(())
    }
    async fn get_project_assignments(&self, project_id: i32) -> Result<Vec<ProjectAssignment>, String> {
        Ok(self.project_assignments.read().map_err(|_| "Failed to acquire lock".to_string())?.iter().filter(|x| x.project_id == project_id).cloned().collect())
    }
    async fn get_all_project_assignments(&self) -> Result<Vec<ProjectAssignment>, String> {
        Ok(self.project_assignments.read().map_err(|_| "Failed to acquire lock".to_string())?.clone())
    }
    async fn remove_project_assignment(&self, project_id: i32, employee_id: i32) -> Result<(), String> {
        let mut assignments = self.project_assignments.write().map_err(|_| "Failed to acquire lock".to_string())?;
        assignments.retain(|x| !(x.project_id == project_id && x.employee_id == employee_id));
        Ok(())
    }

    async fn get_accounts(&self) -> Result<Vec<Account>, String> { Ok(self.accounts.read().map_err(|_| "Failed to acquire lock".to_string())?.clone()) }
    async fn add_account(&self, mut a: Account) -> Result<i64, String> {
        let mut accounts = self.accounts.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (accounts.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        a.id = Some(id);
        accounts.push(a);
        Ok(id as i64)
    }
    async fn get_invoices(&self) -> Result<Vec<Invoice>, String> { Ok(self.invoices.read().map_err(|_| "Failed to acquire lock".to_string())?.clone()) }
    async fn create_invoice(&self, mut i: Invoice) -> Result<i64, String> {
        let mut invoices = self.invoices.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (invoices.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        i.id = Some(id);
        invoices.push(i);
        Ok(id as i64)
    }

    async fn get_integrations(&self) -> Result<Vec<Integration>, String> { Ok(self.integrations.read().map_err(|_| "Failed to acquire lock".to_string())?.clone()) }
    async fn toggle_integration(&self, id: i32, is_connected: bool) -> Result<(), String> {
        let mut integrations = self.integrations.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(i) = integrations.iter_mut().find(|x| x.id == Some(id)) {
            i.is_connected = is_connected;
        }
        Ok(())
    }
    async fn configure_integration(&self, id: i32, api_key: Option<String>, config_json: Option<String>) -> Result<(), String> {
        let mut integrations = self.integrations.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(i) = integrations.iter_mut().find(|x| x.id == Some(id)) {
            i.api_key = api_key;
            i.config_json = config_json;
        }
        Ok(())
    }
  // Demo Data
    async fn seed_demo_data(&self) -> Result<(), String> { Ok(()) }

    // System
    async fn reset_database(&self) -> Result<(), String> {
        *self.users.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.sessions.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.invites.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.products.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.employees.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.payments.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.tasks.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.attendances.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.complaints.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.tools.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.tool_assignments.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.roles.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.permissions.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.feature_toggles.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.audit_logs.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.dashboard_configs.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.projects.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.project_tasks.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.project_assignments.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.accounts.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.invoices.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.integrations.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.suppliers.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        *self.supplier_orders.write().map_err(|_| "Failed to acquire lock".to_string())? = Vec::new();
        Ok(())
    }

    // Supply Chain (BOM, Batches, Velocity)
    async fn get_product_bom(&self, _product_id: i32) -> Result<(Option<BomHeader>, Vec<BomLine>), String> { Err("Not implemented for InMemory DB".into()) }
    async fn save_bom(&self, _header: BomHeader, _lines: Vec<BomLine>) -> Result<(), String> { Err("Not implemented for InMemory DB".into()) }
    async fn get_batches(&self, _product_id: i32) -> Result<Vec<InventoryBatch>, String> { Err("Not implemented for InMemory DB".into()) }
    async fn add_batch(&self, _batch: InventoryBatch) -> Result<i64, String> { Err("Not implemented for InMemory DB".into()) }
    async fn update_batch(&self, _batch: InventoryBatch) -> Result<(), String> { Err("Not implemented for InMemory DB".into()) }
    async fn get_velocity_report(&self) -> Result<Vec<VelocityReport>, String> { Err("Not implemented for InMemory DB".into()) }

    // Suppliers
    async fn get_suppliers(&self) -> Result<Vec<Supplier>, String> {
        Ok(self.suppliers.read().map_err(|_| "Failed to acquire lock".to_string())?.clone())
    }
    async fn add_supplier(&self, mut supplier: Supplier) -> Result<i64, String> {
        let mut suppliers = self.suppliers.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (suppliers.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        supplier.id = Some(id);
        suppliers.push(supplier);
        Ok(id as i64)
    }
    async fn update_supplier(&self, supplier: Supplier) -> Result<(), String> {
        let mut suppliers = self.suppliers.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(pos) = suppliers.iter().position(|x| x.id == supplier.id) {
            suppliers[pos] = supplier;
            Ok(())
        } else {
            Err("Supplier not found".into())
        }
    }
    async fn delete_supplier(&self, id: i32) -> Result<(), String> {
        let mut suppliers = self.suppliers.write().map_err(|_| "Failed to acquire lock".to_string())?;
        suppliers.retain(|x| x.id != Some(id));
        Ok(())
    }

    // Supplier Orders
    async fn get_supplier_orders(&self) -> Result<Vec<SupplierOrder>, String> {
        Ok(self.supplier_orders.read().map_err(|_| "Failed to acquire lock".to_string())?.clone())
    }
    async fn add_supplier_order(&self, mut order: SupplierOrder) -> Result<i64, String> {
        let mut orders = self.supplier_orders.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let id = (orders.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        order.id = Some(id);
        orders.push(order);
        Ok(id as i64)
    }
    async fn update_supplier_order(&self, order: SupplierOrder) -> Result<(), String> {
        let mut orders = self.supplier_orders.write().map_err(|_| "Failed to acquire lock".to_string())?;
        if let Some(pos) = orders.iter().position(|x| x.id == order.id) {
            orders[pos] = order;
            Ok(())
        } else {
            Err("Supplier Order not found".into())
        }
    }
    async fn delete_supplier_order(&self, id: i32) -> Result<(), String> {
        let mut orders = self.supplier_orders.write().map_err(|_| "Failed to acquire lock".to_string())?;
        let len_before = orders.len();
        orders.retain(|x| x.id != Some(id));
        if orders.len() == len_before {
            return Err("Supplier Order not found".to_string());
        }
        Ok(())
    }
}
