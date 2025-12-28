use super::Database;
use crate::models::*;

pub struct NoOpDatabase;

impl Database for NoOpDatabase {
    // Products
    fn get_products(&self, _search: Option<String>, _page: Option<i32>, _page_size: Option<i32>) -> Result<serde_json::Value, String> { Err("DB not configured".into()) }
    fn add_product(&self, _product: Product) -> Result<i64, String> { Err("DB not configured".into()) }
    fn update_product(&self, _product: Product) -> Result<(), String> { Err("DB not configured".into()) }
    fn delete_product(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }

    // Employees
    fn get_employees(&self) -> Result<Vec<Employee>, String> { Err("DB not configured".into()) }
    fn add_employee(&self, _employee: Employee) -> Result<i64, String> { Err("DB not configured".into()) }
    fn update_employee(&self, _employee: Employee) -> Result<(), String> { Err("DB not configured".into()) }
    fn delete_employee(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }

    // Payments
    fn get_payments(&self) -> Result<Vec<Payment>, String> { Err("DB not configured".into()) }
    fn add_payment(&self, _payment: Payment) -> Result<i64, String> { Err("DB not configured".into()) }
    fn update_payment(&self, _payment: Payment) -> Result<(), String> { Err("DB not configured".into()) }
    fn delete_payment(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }

    // Tasks (Generic)
    fn get_tasks(&self) -> Result<Vec<Task>, String> { Err("DB not configured".into()) }
    fn add_task(&self, _task: Task) -> Result<i64, String> { Err("DB not configured".into()) }
    fn update_task(&self, _task: Task) -> Result<(), String> { Err("DB not configured".into()) }
    fn delete_task(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }

    // Attendance
    fn get_attendances(&self) -> Result<Vec<Attendance>, String> { Err("DB not configured".into()) }
    fn clock_in(&self, _attendance: Attendance) -> Result<i64, String> { Err("DB not configured".into()) }
    fn clock_out(&self, _attendance: Attendance) -> Result<(), String> { Err("DB not configured".into()) }

    // Dashboard & Reports
    fn get_dashboard_stats(&self) -> Result<DashboardStats, String> { Err("DB not configured".into()) }
    fn get_report_summary(&self) -> Result<ReportSummary, String> { Err("DB not configured".into()) }
    fn get_monthly_cashflow(&self) -> Result<Vec<ChartDataPoint>, String> { Err("DB not configured".into()) }

    // Complaints
    fn get_complaints(&self) -> Result<Vec<Complaint>, String> { Err("DB not configured".into()) }
    fn submit_complaint(&self, _complaint: Complaint) -> Result<i64, String> { Err("DB not configured".into()) }
    fn resolve_complaint(&self, _id: i32, _status: String, _resolution: String, _resolved_by: String, _admin_notes: Option<String>) -> Result<(), String> { Err("DB not configured".into()) }
    fn delete_complaint(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }

    // Tools
    fn get_tools(&self) -> Result<Vec<Tool>, String> { Err("DB not configured".into()) }
    fn add_tool(&self, _tool: Tool) -> Result<i64, String> { Err("DB not configured".into()) }
    fn update_tool(&self, _tool: Tool) -> Result<(), String> { Err("DB not configured".into()) }
    fn delete_tool(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }
    fn assign_tool(&self, _assignment: ToolAssignment) -> Result<i64, String> { Err("DB not configured".into()) }
    fn return_tool(&self, _id: i32, _return_condition: String) -> Result<(), String> { Err("DB not configured".into()) }

    // Roles & Permissions
    fn get_roles(&self) -> Result<Vec<Role>, String> { Err("DB not configured".into()) }
    fn add_role(&self, _role: Role) -> Result<i64, String> { Err("DB not configured".into()) }
    fn get_permissions(&self) -> Result<Vec<Permission>, String> { Err("DB not configured".into()) }
    fn get_role_permissions(&self, _role_id: i32) -> Result<Vec<Permission>, String> { Err("DB not configured".into()) }
    fn update_role_permissions(&self, _role_id: i32, _permission_ids: Vec<i32>) -> Result<(), String> { Err("DB not configured".into()) }

    // Feature Toggles
    fn get_feature_toggles(&self) -> Result<Vec<FeatureToggle>, String> { Err("DB not configured".into()) }
    fn set_feature_toggle(&self, _name: String, _is_enabled: bool) -> Result<(), String> { Err("DB not configured".into()) }

    // Setup
    fn get_setup_status(&self) -> Result<bool, String> { Ok(false) } // Return false so Wizard starts
    fn get_type(&self) -> String { "noop".to_string() }
    fn complete_setup(&self, _company_name: String, _admin_email: String, _admin_password: String) -> Result<(), String> { Err("DB not configured".into()) }
    fn set_company_name(&self, _company_name: String) -> Result<(), String> { Err("DB not configured".into()) }

    // Audit Logs
    fn get_audit_logs(&self) -> Result<Vec<AuditLog>, String> { Err("DB not configured".into()) }
    fn log_activity(&self, _user_id: Option<i32>, _action: String, _entity: Option<String>, _entity_id: Option<i32>, _details: Option<String>) -> Result<(), String> { Err("DB not configured".into()) }

    // Dashboard Config
    fn get_dashboard_configs(&self) -> Result<Vec<DashboardConfig>, String> { Err("DB not configured".into()) }
    fn save_dashboard_config(&self, _config: DashboardConfig) -> Result<(), String> { Err("DB not configured".into()) }

    // Tool History
    fn get_tool_history(&self, _tool_id: i32) -> Result<Vec<ToolAssignment>, String> { Err("DB not configured".into()) }
    
    // Projects
    fn get_projects(&self) -> Result<Vec<Project>, String> { Err("DB not configured".into()) }
    fn add_project(&self, _project: Project) -> Result<i64, String> { Err("DB not configured".into()) }
    fn update_project(&self, _project: Project) -> Result<(), String> { Err("DB not configured".into()) }
    fn delete_project(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }
    fn get_project_tasks(&self, _project_id: i32) -> Result<Vec<ProjectTask>, String> { Err("DB not configured".into()) }
    fn add_project_task(&self, _task: ProjectTask) -> Result<i64, String> { Err("DB not configured".into()) }
    fn update_project_task(&self, _task: ProjectTask) -> Result<(), String> { Err("DB not configured".into()) }
    fn delete_project_task(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }
    fn assign_project_employee(&self, _project_id: i32, _employee_id: i32, _role: String) -> Result<(), String> { Err("DB not configured".into()) }
    fn get_project_assignments(&self, _project_id: i32) -> Result<Vec<ProjectAssignment>, String> { Err("DB not configured".into()) }
    fn get_all_project_assignments(&self) -> Result<Vec<ProjectAssignment>, String> { Err("DB not configured".into()) }
    fn remove_project_assignment(&self, _project_id: i32, _employee_id: i32) -> Result<(), String> { Err("DB not configured".into()) }
    
    // Integrations
    fn get_integrations(&self) -> Result<Vec<Integration>, String> { Err("DB not configured".into()) }
    fn toggle_integration(&self, _id: i32, _is_connected: bool) -> Result<(), String> { Err("DB not configured".into()) }
    fn configure_integration(&self, _id: i32, _api_key: Option<String>, _config_json: Option<String>) -> Result<(), String> { Err("DB not configured".into()) }

    // Finance (Accounts & Invoices)
    fn get_accounts(&self) -> Result<Vec<Account>, String> { Err("DB not configured".into()) }
    fn add_account(&self, _account: Account) -> Result<i64, String> { Err("DB not configured".into()) }
    fn get_invoices(&self) -> Result<Vec<Invoice>, String> { Err("DB not configured".into()) }
    fn create_invoice(&self, _invoice: Invoice) -> Result<i64, String> { Err("DB not configured".into()) }
    
    // Demo Data
    fn seed_demo_data(&self) -> Result<(), String> { Err("DB not configured".into()) }
}
