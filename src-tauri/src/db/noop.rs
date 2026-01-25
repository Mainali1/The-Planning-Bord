use super::Database;
use crate::models::*;
use async_trait::async_trait;

pub struct NoOpDatabase;

#[async_trait]
impl Database for NoOpDatabase {
    // Products
    async fn get_products(&self, _search: Option<String>, _page: Option<i32>, _page_size: Option<i32>) -> Result<serde_json::Value, String> { Err("DB not configured".into()) }
    async fn add_product(&self, _product: Product) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn update_product(&self, _product: Product) -> Result<(), String> { Err("DB not configured".into()) }
    async fn delete_product(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }

    // Employees
    async fn get_employees(&self) -> Result<Vec<Employee>, String> { Err("DB not configured".into()) }
    async fn get_employee_by_email(&self, _email: String) -> Result<Option<Employee>, String> { Err("DB not configured".into()) }
    async fn add_employee(&self, _employee: Employee) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn update_employee(&self, _employee: Employee) -> Result<(), String> { Err("DB not configured".into()) }
    async fn delete_employee(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }

    // Payments
    async fn get_payments(&self) -> Result<Vec<Payment>, String> { Err("DB not configured".into()) }
    async fn add_payment(&self, _payment: Payment) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn update_payment(&self, _payment: Payment) -> Result<(), String> { Err("DB not configured".into()) }
    async fn delete_payment(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }

    // Tasks (Generic)
    async fn get_tasks(&self) -> Result<Vec<Task>, String> { Err("DB not configured".into()) }
    async fn get_tasks_by_employee(&self, _employee_id: i32) -> Result<Vec<Task>, String> { Err("DB not configured".into()) }
    async fn add_task(&self, _task: Task) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn update_task(&self, _task: Task) -> Result<(), String> { Err("DB not configured".into()) }
    async fn delete_task(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }

    // Attendance
    async fn get_attendances(&self) -> Result<Vec<Attendance>, String> { Err("DB not configured".into()) }
    async fn clock_in(&self, _attendance: Attendance) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn clock_out(&self, _attendance: Attendance) -> Result<(), String> { Err("DB not configured".into()) }

    // Dashboard & Reports
    async fn get_dashboard_stats(&self) -> Result<DashboardStats, String> { Err("DB not configured".into()) }
    async fn get_report_summary(&self) -> Result<ReportSummary, String> { Err("DB not configured".into()) }
    async fn get_monthly_cashflow(&self) -> Result<Vec<ChartDataPoint>, String> { Err("DB not configured".into()) }

    // Complaints
    async fn get_complaints(&self) -> Result<Vec<Complaint>, String> { Err("DB not configured".into()) }
    async fn submit_complaint(&self, _complaint: Complaint) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn resolve_complaint(&self, _id: i32, _status: String, _resolution: String, _resolved_by: String, _admin_notes: Option<String>) -> Result<(), String> { Err("DB not configured".into()) }
    async fn delete_complaint(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }

    // Tools
    async fn get_tools(&self) -> Result<Vec<Tool>, String> { Err("DB not configured".into()) }
    async fn add_tool(&self, _tool: Tool) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn update_tool(&self, _tool: Tool) -> Result<(), String> { Err("DB not configured".into()) }
    async fn delete_tool(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }
    async fn assign_tool(&self, _assignment: ToolAssignment) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn return_tool(&self, _id: i32, _return_condition: String) -> Result<(), String> { Err("DB not configured".into()) }

    // Roles & Permissions
    async fn get_roles(&self) -> Result<Vec<Role>, String> { Err("DB not configured".into()) }
    async fn add_role(&self, _role: Role) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn get_permissions(&self) -> Result<Vec<Permission>, String> { Err("DB not configured".into()) }
    async fn get_role_permissions(&self, _role_id: i32) -> Result<Vec<Permission>, String> { Err("DB not configured".into()) }
    async fn update_role_permissions(&self, _role_id: i32, _permission_ids: Vec<i32>) -> Result<(), String> { Err("DB not configured".into()) }

    // Feature Toggles
    async fn get_feature_toggles(&self) -> Result<Vec<FeatureToggle>, String> { Err("DB not configured".into()) }
    async fn set_feature_toggle(&self, _name: String, _is_enabled: bool) -> Result<(), String> { Err("DB not configured".into()) }

    // Setup
    async fn get_setup_status(&self) -> Result<bool, String> { Ok(false) } // Return false so Wizard starts
    fn get_type(&self) -> String { "noop".to_string() }
    async fn complete_setup(&self, _company_name: String, _admin_name: String, _admin_email: String, _admin_password: String, _admin_username: String) -> Result<(), String> { Err("DB not configured".into()) }
    async fn set_company_name(&self, _company_name: String) -> Result<(), String> { Err("DB not configured".into()) }
    async fn get_company_name(&self) -> Result<Option<String>, String> { Err("DB not configured".into()) }

    // Users & Auth
    async fn check_username_exists(&self, _username: String) -> Result<bool, String> { Err("DB not configured".into()) }
    async fn get_user_by_username(&self, _username: String) -> Result<Option<User>, String> { Err("DB not configured".into()) }
    async fn create_user(&self, _user: User) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn update_user(&self, _user: User) -> Result<(), String> { Err("DB not configured".into()) }
    async fn update_user_last_login(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }
    async fn create_session(&self, _token: String, _user_id: i32, _exp: i64) -> Result<(), String> { Err("DB not configured".into()) }
    async fn get_session_user(&self, _token: String) -> Result<Option<User>, String> { Err("DB not configured".into()) }
    async fn revoke_session(&self, _token: String) -> Result<(), String> { Err("DB not configured".into()) }
    async fn cleanup_sessions(&self) -> Result<(), String> { Err("DB not configured".into()) }

    // Invites
    async fn create_invite(&self, _i: Invite) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn get_invite(&self, _t: String) -> Result<Option<Invite>, String> { Err("DB not configured".into()) }
    async fn mark_invite_used(&self, _t: String) -> Result<(), String> { Err("DB not configured".into()) }
    async fn get_invites(&self) -> Result<Vec<Invite>, String> { Err("DB not configured".into()) }
    async fn toggle_invite_status(&self, _id: i32, _is_active: bool) -> Result<(), String> { Err("DB not configured".into()) }

    // Audit Logs
    async fn get_audit_logs(&self, _page: Option<i32>, _page_size: Option<i32>, _user_id: Option<i32>, _action: Option<String>, _category: Option<String>, _date_from: Option<String>, _date_to: Option<String>) -> Result<Vec<AuditLog>, String> { Err("DB not configured".into()) }
    async fn log_activity(&self, _user_id: Option<i32>, _action: String, _category: String, _entity: Option<String>, _entity_id: Option<i32>, _details: Option<String>, _ip_address: Option<String>, _user_agent: Option<String>) -> Result<(), String> { Err("DB not configured".into()) }

    // Dashboard Config
    async fn get_dashboard_configs(&self) -> Result<Vec<DashboardConfig>, String> { Err("DB not configured".into()) }
    async fn save_dashboard_config(&self, _config: DashboardConfig) -> Result<(), String> { Err("DB not configured".into()) }

    // Tool History
    async fn get_tool_history(&self, _tool_id: i32) -> Result<Vec<ToolAssignment>, String> { Err("DB not configured".into()) }
    
    // Projects
    async fn get_projects(&self) -> Result<Vec<Project>, String> { Err("DB not configured".into()) }
    async fn add_project(&self, _project: Project) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn update_project(&self, _project: Project) -> Result<(), String> { Err("DB not configured".into()) }
    async fn delete_project(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }
    async fn get_project_tasks(&self, _project_id: i32) -> Result<Vec<ProjectTask>, String> { Err("DB not configured".into()) }
    async fn add_project_task(&self, _task: ProjectTask) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn update_project_task(&self, _task: ProjectTask) -> Result<(), String> { Err("DB not configured".into()) }
    async fn delete_project_task(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }
    async fn assign_project_employee(&self, _project_id: i32, _employee_id: i32, _role: String) -> Result<(), String> { Err("DB not configured".into()) }
    async fn get_project_assignments(&self, _project_id: i32) -> Result<Vec<ProjectAssignment>, String> { Err("DB not configured".into()) }
    async fn get_all_project_assignments(&self) -> Result<Vec<ProjectAssignment>, String> { Err("DB not configured".into()) }
    async fn remove_project_assignment(&self, _project_id: i32, _employee_id: i32) -> Result<(), String> { Err("DB not configured".into()) }
    
    // Integrations
    async fn get_integrations(&self) -> Result<Vec<Integration>, String> { Err("DB not configured".into()) }
    async fn toggle_integration(&self, _id: i32, _is_connected: bool) -> Result<(), String> { Err("DB not configured".into()) }
    async fn configure_integration(&self, _id: i32, _api_key: Option<String>, _config_json: Option<String>) -> Result<(), String> { Err("DB not configured".into()) }

    // Finance (Accounts & Invoices)
    async fn get_accounts(&self) -> Result<Vec<Account>, String> { Err("DB not configured".into()) }
    async fn add_account(&self, _account: Account) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn get_invoices(&self) -> Result<Vec<Invoice>, String> { Err("DB not configured".into()) }
    async fn create_invoice(&self, _invoice: Invoice) -> Result<i64, String> { Err("DB not configured".into()) }
    
    // Demo Data
    async fn seed_demo_data(&self) -> Result<(), String> { Err("DB not configured".into()) }

    // Supply Chain (BOM, Batches, Velocity)
    async fn get_product_bom(&self, _product_id: i32) -> Result<(Option<BomHeader>, Vec<BomLine>), String> { Err("DB not configured".into()) }
    async fn save_bom(&self, _header: BomHeader, _lines: Vec<BomLine>) -> Result<(), String> { Err("DB not configured".into()) }
    async fn get_batches(&self, _product_id: i32) -> Result<Vec<InventoryBatch>, String> { Err("DB not configured".into()) }
    async fn add_batch(&self, _batch: InventoryBatch) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn update_batch(&self, _batch: InventoryBatch) -> Result<(), String> { Err("DB not configured".into()) }
    async fn get_velocity_report(&self) -> Result<Vec<VelocityReport>, String> { Err("DB not configured".into()) }

    // Suppliers
    async fn get_suppliers(&self) -> Result<Vec<Supplier>, String> { Err("DB not configured".into()) }
    async fn add_supplier(&self, _supplier: Supplier) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn update_supplier(&self, _supplier: Supplier) -> Result<(), String> { Err("DB not configured".into()) }
    async fn delete_supplier(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }
    
    // Supplier Orders
    async fn get_supplier_orders(&self) -> Result<Vec<SupplierOrder>, String> { Err("DB not configured".into()) }
    async fn add_supplier_order(&self, _order: SupplierOrder) -> Result<i64, String> { Err("DB not configured".into()) }
    async fn update_supplier_order(&self, _order: SupplierOrder) -> Result<(), String> { Err("DB not configured".into()) }
    async fn delete_supplier_order(&self, _id: i32) -> Result<(), String> { Err("DB not configured".into()) }
}
