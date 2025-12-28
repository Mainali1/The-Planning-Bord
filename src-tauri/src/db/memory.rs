use std::sync::RwLock;
use crate::models::*;
use super::Database;

pub struct InMemoryDatabase {
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
    feature_toggles: RwLock<Vec<FeatureToggle>>,
    audit_logs: RwLock<Vec<AuditLog>>,
    dashboard_configs: RwLock<Vec<DashboardConfig>>,
    projects: RwLock<Vec<Project>>,
    project_tasks: RwLock<Vec<ProjectTask>>,
    project_assignments: RwLock<Vec<ProjectAssignment>>,
    accounts: RwLock<Vec<Account>>,
    invoices: RwLock<Vec<Invoice>>,
    integrations: RwLock<Vec<Integration>>,
}

impl InMemoryDatabase {
    pub fn new() -> Self {
        Self {
            products: RwLock::new(Vec::new()),
            employees: RwLock::new(Vec::new()),
            payments: RwLock::new(Vec::new()),
            tasks: RwLock::new(Vec::new()),
            attendances: RwLock::new(Vec::new()),
            complaints: RwLock::new(Vec::new()),
            tools: RwLock::new(Vec::new()),
            tool_assignments: RwLock::new(Vec::new()),
            roles: RwLock::new(Vec::new()),
            permissions: RwLock::new(Vec::new()),
            feature_toggles: RwLock::new(Vec::new()),
            audit_logs: RwLock::new(Vec::new()),
            dashboard_configs: RwLock::new(Vec::new()),
            projects: RwLock::new(Vec::new()),
            project_tasks: RwLock::new(Vec::new()),
            project_assignments: RwLock::new(Vec::new()),
            accounts: RwLock::new(Vec::new()),
            invoices: RwLock::new(Vec::new()),
            integrations: RwLock::new(Vec::new()),
        }
    }
}

impl Database for InMemoryDatabase {
    fn get_setup_status(&self) -> Result<bool, String> { Ok(true) }
    fn get_type(&self) -> String { "memory".to_string() }
    fn complete_setup(&self, _c: String, _e: String, _p: String) -> Result<(), String> { Ok(()) }
    fn set_company_name(&self, _n: String) -> Result<(), String> { Ok(()) }

    fn get_products(&self, _s: Option<String>, _p: Option<i32>, _ps: Option<i32>) -> Result<serde_json::Value, String> {
        let products = self.products.read().unwrap();
        Ok(serde_json::json!({ "items": *products, "total": products.len() }))
    }
    fn add_product(&self, mut p: Product) -> Result<i64, String> {
        let mut products = self.products.write().unwrap();
        let id = (products.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        p.id = Some(id);
        products.push(p);
        Ok(id as i64)
    }
    fn update_product(&self, p: Product) -> Result<(), String> {
        let mut products = self.products.write().unwrap();
        if let Some(pos) = products.iter().position(|x| x.id == p.id) {
            products[pos] = p;
            Ok(())
        } else {
            Err("Product not found".into())
        }
    }
    fn delete_product(&self, id: i32) -> Result<(), String> {
        let mut products = self.products.write().unwrap();
        products.retain(|x| x.id != Some(id));
        Ok(())
    }

    fn get_employees(&self) -> Result<Vec<Employee>, String> {
        Ok(self.employees.read().unwrap().clone())
    }
    fn add_employee(&self, mut e: Employee) -> Result<i64, String> {
        let mut employees = self.employees.write().unwrap();
        let id = (employees.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        e.id = Some(id);
        employees.push(e);
        Ok(id as i64)
    }
    fn update_employee(&self, e: Employee) -> Result<(), String> {
        let mut employees = self.employees.write().unwrap();
        if let Some(pos) = employees.iter().position(|x| x.id == e.id) {
            employees[pos] = e;
            Ok(())
        } else {
            Err("Employee not found".into())
        }
    }
    fn delete_employee(&self, id: i32) -> Result<(), String> {
        let mut employees = self.employees.write().unwrap();
        employees.retain(|x| x.id != Some(id));
        Ok(())
    }

    fn get_payments(&self) -> Result<Vec<Payment>, String> { Ok(self.payments.read().unwrap().clone()) }
    fn add_payment(&self, mut p: Payment) -> Result<i64, String> {
        let mut payments = self.payments.write().unwrap();
        let id = (payments.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        p.id = Some(id);
        payments.push(p);
        Ok(id as i64)
    }
    fn update_payment(&self, p: Payment) -> Result<(), String> {
        let mut payments = self.payments.write().unwrap();
        if let Some(pos) = payments.iter().position(|x| x.id == p.id) {
            payments[pos] = p;
            Ok(())
        } else {
            Err("Payment not found".into())
        }
    }
    fn delete_payment(&self, id: i32) -> Result<(), String> {
        let mut payments = self.payments.write().unwrap();
        payments.retain(|x| x.id != Some(id));
        Ok(())
    }

    fn get_tasks(&self) -> Result<Vec<Task>, String> { Ok(self.tasks.read().unwrap().clone()) }
    fn add_task(&self, mut t: Task) -> Result<i64, String> {
        let mut tasks = self.tasks.write().unwrap();
        let id = (tasks.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        t.id = Some(id);
        tasks.push(t);
        Ok(id as i64)
    }
    fn update_task(&self, t: Task) -> Result<(), String> {
        let mut tasks = self.tasks.write().unwrap();
        if let Some(pos) = tasks.iter().position(|x| x.id == t.id) {
            tasks[pos] = t;
            Ok(())
        } else {
            Err("Task not found".into())
        }
    }
    fn delete_task(&self, id: i32) -> Result<(), String> {
        let mut tasks = self.tasks.write().unwrap();
        tasks.retain(|x| x.id != Some(id));
        Ok(())
    }

    fn get_attendances(&self) -> Result<Vec<Attendance>, String> { Ok(self.attendances.read().unwrap().clone()) }
    fn clock_in(&self, mut a: Attendance) -> Result<i64, String> {
        let mut attendances = self.attendances.write().unwrap();
        let id = (attendances.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        a.id = Some(id);
        attendances.push(a);
        Ok(id as i64)
    }
    fn clock_out(&self, a: Attendance) -> Result<(), String> {
        let mut attendances = self.attendances.write().unwrap();
        if let Some(pos) = attendances.iter().position(|x| x.id == a.id) {
            attendances[pos] = a;
            Ok(())
        } else {
            Err("Attendance not found".into())
        }
    }

    fn get_dashboard_stats(&self) -> Result<DashboardStats, String> {
        Ok(DashboardStats {
            total_products: self.products.read().unwrap().len() as i32,
            low_stock_items: 0,
            total_employees: self.employees.read().unwrap().len() as i32,
            total_payments_pending: 0,
            total_revenue: 0.0,
        })
    }
    fn get_report_summary(&self) -> Result<ReportSummary, String> {
        Ok(ReportSummary {
            total_revenue: 0.0,
            total_expenses: 0.0,
            net_profit: 0.0,
            inventory_value: 0.0,
            pending_tasks: 0,
            active_employees: self.employees.read().unwrap().len() as i32,
        })
    }
    fn get_monthly_cashflow(&self) -> Result<Vec<ChartDataPoint>, String> { Ok(Vec::new()) }

    fn get_complaints(&self) -> Result<Vec<Complaint>, String> { Ok(self.complaints.read().unwrap().clone()) }
    fn submit_complaint(&self, mut c: Complaint) -> Result<i64, String> {
        let mut complaints = self.complaints.write().unwrap();
        let id = (complaints.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        c.id = Some(id);
        complaints.push(c);
        Ok(id as i64)
    }
    fn resolve_complaint(&self, id: i32, status: String, resolution: String, resolved_by: String, admin_notes: Option<String>) -> Result<(), String> {
        let mut complaints = self.complaints.write().unwrap();
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
    fn delete_complaint(&self, id: i32) -> Result<(), String> {
        let mut complaints = self.complaints.write().unwrap();
        complaints.retain(|x| x.id != Some(id));
        Ok(())
    }

    fn get_tools(&self) -> Result<Vec<Tool>, String> { Ok(self.tools.read().unwrap().clone()) }
    fn add_tool(&self, mut t: Tool) -> Result<i64, String> {
        let mut tools = self.tools.write().unwrap();
        let id = (tools.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        t.id = Some(id);
        tools.push(t);
        Ok(id as i64)
    }
    fn update_tool(&self, t: Tool) -> Result<(), String> {
        let mut tools = self.tools.write().unwrap();
        if let Some(pos) = tools.iter().position(|x| x.id == t.id) {
            tools[pos] = t;
            Ok(())
        } else {
            Err("Tool not found".into())
        }
    }
    fn delete_tool(&self, id: i32) -> Result<(), String> {
        let mut tools = self.tools.write().unwrap();
        tools.retain(|x| x.id != Some(id));
        Ok(())
    }
    fn assign_tool(&self, mut a: ToolAssignment) -> Result<i64, String> {
        let mut assignments = self.tool_assignments.write().unwrap();
        let id = (assignments.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        a.id = Some(id);
        
        let tool_id = a.tool_id;
        let employee_id = a.employee_id;
        
        assignments.push(a);
        
        let mut tools = self.tools.write().unwrap();
        if let Some(t) = tools.iter_mut().find(|x| x.id == tool_id) {
            t.status = "assigned".to_string();
            t.assigned_to_employee_id = employee_id;
        }
        Ok(id as i64)
    }
    fn return_tool(&self, id: i32, return_condition: String) -> Result<(), String> {
        let mut tools = self.tools.write().unwrap();
        if let Some(t) = tools.iter_mut().find(|x| x.id == Some(id)) {
            t.status = "available".to_string();
            t.assigned_to_employee_id = None;
            t.condition = Some(return_condition);
        }
        Ok(())
    }
    fn get_tool_history(&self, tool_id: i32) -> Result<Vec<ToolAssignment>, String> {
        Ok(self.tool_assignments.read().unwrap().iter().filter(|x| x.tool_id == Some(tool_id)).cloned().collect())
    }

    fn get_roles(&self) -> Result<Vec<Role>, String> { Ok(self.roles.read().unwrap().clone()) }
    fn add_role(&self, mut r: Role) -> Result<i64, String> {
        let mut roles = self.roles.write().unwrap();
        let id = (roles.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        r.id = Some(id);
        roles.push(r);
        Ok(id as i64)
    }
    fn get_permissions(&self) -> Result<Vec<Permission>, String> { Ok(self.permissions.read().unwrap().clone()) }
    fn get_role_permissions(&self, _rid: i32) -> Result<Vec<Permission>, String> { Ok(Vec::new()) }
    fn update_role_permissions(&self, _rid: i32, _pids: Vec<i32>) -> Result<(), String> { Ok(()) }

    fn get_feature_toggles(&self) -> Result<Vec<FeatureToggle>, String> { Ok(self.feature_toggles.read().unwrap().clone()) }
    fn set_feature_toggle(&self, key: String, is_enabled: bool) -> Result<(), String> {
        let mut toggles = self.feature_toggles.write().unwrap();
        if let Some(t) = toggles.iter_mut().find(|x| x.key == key) {
            t.is_enabled = is_enabled;
        } else {
            toggles.push(FeatureToggle { key, is_enabled });
        }
        Ok(())
    }

    fn get_audit_logs(&self) -> Result<Vec<AuditLog>, String> { Ok(self.audit_logs.read().unwrap().clone()) }
    fn log_activity(&self, user_id: Option<i32>, action: String, entity: Option<String>, entity_id: Option<i32>, details: Option<String>) -> Result<(), String> {
        let mut logs = self.audit_logs.write().unwrap();
        let id = (logs.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        logs.push(AuditLog {
            id: Some(id),
            user_id,
            action,
            entity: entity.unwrap_or_default(),
            entity_id,
            details,
            created_at: Some(chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()),
        });
        Ok(())
    }

    fn get_dashboard_configs(&self) -> Result<Vec<DashboardConfig>, String> { Ok(self.dashboard_configs.read().unwrap().clone()) }
    fn save_dashboard_config(&self, mut c: DashboardConfig) -> Result<(), String> {
        let mut configs = self.dashboard_configs.write().unwrap();
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

    fn get_projects(&self) -> Result<Vec<Project>, String> { Ok(self.projects.read().unwrap().clone()) }
    fn add_project(&self, mut p: Project) -> Result<i64, String> {
        let mut projects = self.projects.write().unwrap();
        let id = (projects.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        p.id = Some(id);
        projects.push(p);
        Ok(id as i64)
    }
    fn update_project(&self, p: Project) -> Result<(), String> {
        let mut projects = self.projects.write().unwrap();
        if let Some(pos) = projects.iter().position(|x| x.id == p.id) {
            projects[pos] = p;
            Ok(())
        } else {
            Err("Project not found".into())
        }
    }
    fn delete_project(&self, id: i32) -> Result<(), String> {
        let mut projects = self.projects.write().unwrap();
        projects.retain(|x| x.id != Some(id));
        Ok(())
    }
    fn get_project_tasks(&self, project_id: i32) -> Result<Vec<ProjectTask>, String> {
        Ok(self.project_tasks.read().unwrap().iter().filter(|x| x.project_id == Some(project_id)).cloned().collect())
    }
    fn add_project_task(&self, mut t: ProjectTask) -> Result<i64, String> {
        let mut tasks = self.project_tasks.write().unwrap();
        let id = (tasks.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        t.id = Some(id);
        tasks.push(t);
        Ok(id as i64)
    }
    fn update_project_task(&self, t: ProjectTask) -> Result<(), String> {
        let mut tasks = self.project_tasks.write().unwrap();
        if let Some(pos) = tasks.iter().position(|x| x.id == t.id) {
            tasks[pos] = t;
            Ok(())
        } else {
            Err("Task not found".into())
        }
    }
    fn delete_project_task(&self, id: i32) -> Result<(), String> {
        let mut tasks = self.project_tasks.write().unwrap();
        tasks.retain(|x| x.id != Some(id));
        Ok(())
    }
    fn assign_project_employee(&self, project_id: i32, employee_id: i32, role: String) -> Result<(), String> {
        let mut assignments = self.project_assignments.write().unwrap();
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
    fn get_project_assignments(&self, project_id: i32) -> Result<Vec<ProjectAssignment>, String> {
        Ok(self.project_assignments.read().unwrap().iter().filter(|x| x.project_id == project_id).cloned().collect())
    }
    fn get_all_project_assignments(&self) -> Result<Vec<ProjectAssignment>, String> {
        Ok(self.project_assignments.read().unwrap().clone())
    }
    fn remove_project_assignment(&self, project_id: i32, employee_id: i32) -> Result<(), String> {
        let mut assignments = self.project_assignments.write().unwrap();
        assignments.retain(|x| !(x.project_id == project_id && x.employee_id == employee_id));
        Ok(())
    }

    fn get_accounts(&self) -> Result<Vec<Account>, String> { Ok(self.accounts.read().unwrap().clone()) }
    fn add_account(&self, mut a: Account) -> Result<i64, String> {
        let mut accounts = self.accounts.write().unwrap();
        let id = (accounts.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        a.id = Some(id);
        accounts.push(a);
        Ok(id as i64)
    }
    fn get_invoices(&self) -> Result<Vec<Invoice>, String> { Ok(self.invoices.read().unwrap().clone()) }
    fn create_invoice(&self, mut i: Invoice) -> Result<i64, String> {
        let mut invoices = self.invoices.write().unwrap();
        let id = (invoices.iter().map(|x| x.id.unwrap_or(0)).max().unwrap_or(0) + 1) as i32;
        i.id = Some(id);
        invoices.push(i);
        Ok(id as i64)
    }

    fn get_integrations(&self) -> Result<Vec<Integration>, String> { Ok(self.integrations.read().unwrap().clone()) }
    fn toggle_integration(&self, id: i32, is_connected: bool) -> Result<(), String> {
        let mut integrations = self.integrations.write().unwrap();
        if let Some(i) = integrations.iter_mut().find(|x| x.id == Some(id)) {
            i.is_connected = is_connected;
        }
        Ok(())
    }
    fn configure_integration(&self, id: i32, api_key: Option<String>, config_json: Option<String>) -> Result<(), String> {
        let mut integrations = self.integrations.write().unwrap();
        if let Some(i) = integrations.iter_mut().find(|x| x.id == Some(id)) {
            i.api_key = api_key;
            i.config_json = config_json;
        }
        Ok(())
    }
    fn seed_demo_data(&self) -> Result<(), String> { Ok(()) }
}
