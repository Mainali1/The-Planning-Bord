use serde::{Deserialize, Serialize};

// --- User & Auth ---

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct User {
    pub id: Option<i32>,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub role: String,
    pub is_active: bool,
    pub last_login: Option<String>,
    pub permissions: Option<Vec<String>>,
    pub hashed_password: String, // Added for backend internal use
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LoginResponse {
    pub user: User,
    pub token: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InviteClaims {
    pub sub: String,
    pub role: String,
    pub name: String,
    pub exp: Option<usize>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Invite {
    pub id: Option<i32>,
    pub token: String,
    pub role: String,
    pub name: String,
    pub email: String,
    pub expiration: Option<String>,
    pub is_used: bool,
    pub is_active: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Role {
    pub id: Option<i32>,
    pub name: String,
    pub description: Option<String>,
    pub is_custom: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Permission {
    pub id: i32,
    pub code: String,
    pub description: Option<String>,
}

// --- Inventory ---

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Product {
    pub id: Option<i32>,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub sku: Option<String>,
    pub current_quantity: i32,
    pub minimum_quantity: i32,
    pub reorder_quantity: i32,
    pub unit_price: f64,
    pub cost_price: Option<f64>, // Added for ERP (COGS)
    pub item_type: String, // 'goods', 'ingredients', 'assets'
    pub supplier_name: Option<String>,
    pub is_active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SalesOrder {
    pub id: Option<i32>,
    pub client_id: Option<i32>,
    pub project_id: Option<i32>, // Added for Project Profitability
    pub status: String, // 'Draft', 'Confirmed', 'Shipped', 'Invoiced', 'Cancelled'
    pub order_date: Option<String>,
    pub expected_shipment_date: Option<String>,
    pub total_amount: f64,
    pub notes: Option<String>,
    pub created_by_user_id: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub lines: Option<Vec<SalesOrderLine>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SalesOrderLine {
    pub id: Option<i32>,
    pub so_id: Option<i32>,
    pub product_id: Option<i32>,
    pub service_id: Option<i32>,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_price: f64,
    pub notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Tool {
    pub id: Option<i32>,
    pub product_id: Option<i32>, // Link to Inventory Product (Asset)
    pub name: String,
    pub type_name: String,
    pub status: String,
    pub assigned_to_employee_id: Option<i32>,
    pub purchase_date: Option<String>,
    pub condition: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ToolAssignment {
    pub id: Option<i32>,
    pub employee_id: Option<i32>,
    pub tool_id: Option<i32>,
    pub assigned_at: Option<String>,
    pub returned_at: Option<String>,
    pub condition_on_assignment: Option<String>,
    pub condition_on_return: Option<String>,
    pub notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BomHeader {
    pub id: Option<i32>,
    pub product_id: i32,
    pub name: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BomLine {
    pub id: Option<i32>,
    pub bom_id: Option<i32>,
    pub component_product_id: i32,
    pub quantity: f64,
    pub unit: String,
    pub wastage_percentage: f64,
    pub notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BomData {
    pub header: Option<BomHeader>,
    pub lines: Vec<BomLine>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InventoryBatch {
    pub id: Option<i32>,
    pub product_id: i32,
    pub batch_number: String,
    pub quantity: i32,
    pub manufacturing_date: Option<String>,
    pub expiration_date: Option<String>,
    pub received_date: Option<String>,
    pub supplier_info: Option<String>,
    pub supplier_id: Option<i32>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct VelocityReport {
    pub product_id: i32,
    pub product_name: String,
    pub sku: Option<String>,
    pub current_quantity: i32,
    pub total_sold_last_30_days: f64,
    pub avg_daily_sales: f64,
    pub estimated_days_stock: f64,
    pub recommended_reorder_qty: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Sale {
    pub id: Option<i32>,
    pub product_id: i32,
    pub quantity: i32,
    pub total_price: f64,
    pub sale_date: Option<String>,
    pub notes: Option<String>,
    pub user_id: Option<i32>,
    pub product_name: Option<String>,
}

// --- Supply Chain ---

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Supplier {
    pub id: Option<i32>,
    pub name: String,
    pub email: Option<String>,
    pub order_email: Option<String>,
    pub phone: Option<String>,
    pub contact_person: Option<String>,
    pub address: Option<String>,
    pub is_active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SupplierOrder {
    pub id: Option<i32>,
    pub supplier_id: i32,
    pub created_by_user_id: Option<i32>,
    pub order_date: Option<String>,
    pub status: String,
    pub total_amount: f64,
    pub notes: Option<String>,
    pub items_json: Option<String>,
    pub updated_at: Option<String>,
}

// --- ERP Standardization ---

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GlAccount {
    pub id: Option<i32>,
    pub code: String,
    pub name: String,
    pub account_type: String, // 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
    pub balance: f64,
    pub is_active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GlEntry {
    pub id: Option<i32>,
    pub transaction_date: Option<String>,
    pub description: Option<String>,
    pub reference_type: Option<String>, // 'Invoice', 'Payment', 'Bill', 'Manual'
    pub reference_id: Option<i32>,
    pub posted_by: Option<i32>,
    pub created_at: Option<String>,
    pub lines: Option<Vec<GlEntryLine>>, // For creating entry with lines
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GlEntryLine {
    pub id: Option<i32>,
    pub entry_id: Option<i32>,
    pub account_id: i32,
    pub debit: f64,
    pub credit: f64,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PurchaseOrder {
    pub id: Option<i32>,
    pub supplier_id: Option<i32>,
    pub status: String, // 'Draft', 'Sent', 'Partial', 'Received', 'Closed', 'Cancelled'
    pub order_date: Option<String>,
    pub expected_delivery_date: Option<String>,
    pub total_amount: f64,
    pub notes: Option<String>,
    pub created_by_user_id: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub lines: Option<Vec<PurchaseOrderLine>>, // For creating PO with lines
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PurchaseOrderLine {
    pub id: Option<i32>,
    pub po_id: Option<i32>,
    pub product_id: Option<i32>,
    pub quantity_ordered: f64,
    pub quantity_received: f64,
    pub unit_price: f64,
    pub total_price: f64,
    pub notes: Option<String>,
}

// --- Finance & Business ---

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Payment {
    pub id: Option<i32>,
    pub payment_type: String,
    pub amount: f64,
    pub currency: String,
    pub description: Option<String>,
    pub status: String,
    pub payment_method: String,
    pub payment_date: Option<String>,
    pub due_date: Option<String>,
    pub reference_number: Option<String>,
    pub employee_id: Option<i32>,
    pub project_id: Option<i32>, // Added for Project Profitability
    pub supplier_name: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProjectProfitability {
    pub project_id: i32,
    pub project_name: String,
    pub client_name: String,
    pub total_revenue: f64,
    pub total_labor_cost: f64,
    pub total_material_cost: f64,
    pub total_expense_cost: f64,
    pub gross_margin: f64,
    pub profit_margin_percent: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Invoice {
    pub id: Option<i32>,
    pub customer_name: String,
    pub customer_email: Option<String>,
    pub invoice_date: String,
    pub due_date: Option<String>,
    pub total_amount: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub status: String,
    pub currency: String,
    pub notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Account {
    pub id: Option<i32>,
    pub code: String,
    pub name: String,
    pub type_name: String,
    pub currency: String,
    pub is_active: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BusinessConfiguration {
    pub id: Option<i32>,
    pub business_type: String,
    pub company_name: Option<String>,
    pub industry: Option<String>,
    pub tax_rate: Option<f64>,
    pub is_active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub created_by_user_id: Option<i32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Service {
    pub id: Option<i32>,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub unit_price: f64,
    pub billing_type: String,
    pub estimated_hours: Option<f64>,
    pub is_active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Client {
    pub id: Option<i32>,
    pub company_name: String,
    pub contact_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub industry: Option<String>,
    pub status: String,
    pub payment_terms: Option<String>,
    pub credit_limit: Option<f64>,
    pub tax_id: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TimeEntry {
    pub id: Option<i32>,
    pub employee_id: Option<i32>,
    pub client_id: Option<i32>,
    pub project_id: Option<i32>,
    pub service_id: Option<i32>,
    pub product_id: Option<i32>,
    pub description: String,
    pub start_time: String, // Changed to String to match typical JSON serialization
    pub end_time: Option<String>,
    pub duration_hours: f64,
    pub is_billable: bool,
    pub hourly_rate: f64,
    pub billable_amount: Option<f64>,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ServiceContract {
    pub id: Option<i32>,
    pub client_id: i32,
    pub contract_number: String,
    pub title: String,
    pub contract_type: String,
    pub start_date: String,
    pub end_date: Option<String>,
    pub total_value: f64,
    pub billing_frequency: String,
    pub terms: Option<String>,
    pub status: String,
    pub is_active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Quote {
    pub id: Option<i32>,
    pub client_id: i32,
    pub quote_number: String,
    pub title: String,
    pub subtotal: f64,
    pub tax_amount: f64,
    pub total_amount: f64,
    pub valid_until: String,
    pub notes: Option<String>,
    pub status: String,
    pub is_active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct QuoteItem {
    pub id: Option<i32>,
    pub quote_id: i32,
    pub service_id: Option<i32>,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_price: f64,
    pub sort_order: i32,
}

// --- HR & Tasks ---

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Employee {
    pub id: Option<i32>,
    pub employee_id: Option<String>,
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub role: String,
    pub department: Option<String>,
    pub position: Option<String>,
    pub salary: Option<f64>,
    pub hourly_cost: Option<f64>, // Added for Project Profitability
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Attendance {
    pub id: Option<i32>,
    pub employee_id: Option<i32>,
    pub check_in: String,
    pub check_out: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub location: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Task {
    pub id: Option<i32>,
    pub employee_id: Option<i32>,
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<String>, // String for Date
    pub status: String,
    pub priority: String,
    pub assigned_date: Option<String>,
    pub completed_date: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Complaint {
    pub id: Option<i32>,
    pub title: String,
    pub description: String,
    pub submitted_by_employee_id: Option<i32>,
    pub status: String,
    pub submitted_at: Option<String>,
    pub resolved_at: Option<String>,
    pub resolution: Option<String>,
    pub resolved_by_user_id: Option<i32>,
    pub admin_notes: Option<String>,
    pub is_anonymous: bool,
}

// --- System & Dashboard ---

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AuditLog {
    pub id: Option<i32>,
    pub user_id: Option<i32>,
    pub user_name: Option<String>,
    pub action: String,
    pub entity: String,
    pub entity_id: Option<i32>,
    pub details: Option<String>,
    pub created_at: Option<String>,
    pub category: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FeatureToggle {
    pub key: String,
    pub is_enabled: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DashboardStats {
    pub total_products: i32,
    pub low_stock_items: i32,
    pub total_employees: i32,
    pub total_payments_pending: i32,
    pub total_revenue: f64,
    pub total_sales: i32,
    pub net_profit: f64,
    pub total_services: i32,
    pub total_clients: i32,
    pub billable_hours: f64,
    pub billable_utilization: f64,
    pub average_project_margin: f64,
    pub resource_availability_rate: f64,
    pub contracts_expiring_soon: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ReportSummary {
    pub total_revenue: f64,
    pub total_sales_count: i32,
    pub total_expenses: f64,
    pub net_profit: f64,
    pub inventory_value: f64,
    pub pending_tasks: i32,
    pub active_employees: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ChartDataPoint {
    pub label: String,
    pub value: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Integration {
    pub id: Option<i32>,
    pub name: String,
    pub is_connected: bool,
    pub connected_at: Option<String>,
    pub api_key: Option<String>,
    pub config_json: Option<String>,
    pub icon: String,
    pub description: String,
    pub provider: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DbConfig {
    pub db_type: String, // 'Local' or 'Cloud'
    pub connection_string: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DashboardConfig {
    pub id: Option<i32>,
    pub user_id: Option<i32>,
    pub name: String,
    pub layout_json: Option<String>,
    pub is_default: bool,
}

// --- Projects ---

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Project {
    pub id: Option<i32>,
    pub name: String,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: String,
    pub manager_id: Option<i32>,
    pub client_id: Option<i32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProjectTask {
    pub id: Option<i32>,
    pub project_id: Option<i32>,
    pub name: String,
    pub description: Option<String>,
    pub assigned_to: Option<i32>,
    pub status: String,
    pub priority: String,
    pub start_date: Option<String>,
    pub due_date: Option<String>,
    pub parent_task_id: Option<i32>,
    pub dependencies_json: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProjectAssignment {
    pub id: Option<i32>,
    pub project_id: i32,
    pub employee_id: i32,
    pub role: String,
    pub assigned_at: Option<String>,
}
