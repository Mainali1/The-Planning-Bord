use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
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
    pub supplier_name: Option<String>,
    pub is_active: bool,
}

#[derive(Serialize, Deserialize, Debug)]
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
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Payment {
    pub id: Option<i32>,
    pub payment_type: String,
    pub amount: f64,
    pub currency: String,
    pub description: Option<String>,
    pub status: String,
    pub payment_method: String,
    pub payment_date: Option<String>, // ISO string for simplicity in frontend
    pub due_date: Option<String>,
    pub reference_number: Option<String>,
    pub employee_id: Option<i32>,
    pub supplier_name: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DashboardStats {
    pub total_products: i32,
    pub low_stock_items: i32,
    pub total_employees: i32,
    pub total_payments_pending: i32,
    pub total_revenue: f64, // Mock revenue or derived
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Task {
    pub id: Option<i32>,
    pub employee_id: Option<i32>,
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<String>,
    pub status: String,
    pub priority: String,
    pub assigned_date: Option<String>,
    pub completed_date: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Attendance {
    pub id: Option<i32>,
    pub employee_id: Option<i32>,
    pub check_in: String,
    pub check_out: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub location: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ReportSummary {
    pub total_revenue: f64,
    pub total_expenses: f64,
    pub net_profit: f64,
    pub inventory_value: f64,
    pub pending_tasks: i32,
    pub active_employees: i32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ChartDataPoint {
    pub label: String,
    pub value: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Complaint {
    pub id: Option<i32>,
    pub content: String,
    pub created_at: Option<String>,
    pub status: String,
    pub admin_notes: Option<String>,
    pub resolution: Option<String>,
    pub resolved_at: Option<String>,
    pub resolved_by: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Tool {
    pub id: Option<i32>,
    pub name: String,
    pub type_name: String,
    pub status: String,
    pub assigned_to_employee_id: Option<i32>,
    pub purchase_date: Option<String>,
    pub condition: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
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

#[derive(Serialize, Deserialize, Debug)]
pub struct Role {
    pub id: Option<i32>,
    pub name: String,
    pub description: Option<String>,
    pub is_custom: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Permission {
    pub id: i32,
    pub code: String,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FeatureToggle {
    pub key: String,
    pub is_enabled: bool,
}
