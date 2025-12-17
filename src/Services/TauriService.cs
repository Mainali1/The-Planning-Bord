using Microsoft.JSInterop;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ThePlanningBord.Services
{
    public interface ITauriService
    {
        Task<string> GreetAsync(string name);
        
        // Inventory
        Task<List<Product>> GetProductsAsync();
        Task<long> AddProductAsync(Product product);
        Task UpdateProductAsync(Product product);
        Task DeleteProductAsync(int id);

        // Employees
        Task<List<Employee>> GetEmployeesAsync();
        Task<long> AddEmployeeAsync(Employee employee);
        Task UpdateEmployeeAsync(Employee employee);
        Task DeleteEmployeeAsync(int id);

        // Finance
        Task<List<Payment>> GetPaymentsAsync();
        Task<long> AddPaymentAsync(Payment payment);
        Task UpdatePaymentAsync(Payment payment);
        Task DeletePaymentAsync(int id);

        // Dashboard
        Task<DashboardStats> GetDashboardStatsAsync();

        // Reports
        Task<ReportSummary> GetReportSummaryAsync();
        Task<List<ChartDataPoint>> GetMonthlyCashflowAsync();
        
        // Complaints
        Task<List<Complaint>> GetComplaintsAsync();
        Task<long> SubmitComplaintAsync(string content);
        Task ResolveComplaintAsync(int id, string status, string? adminNotes);
        Task DeleteComplaintAsync(int id);

        // Tasks
        Task<List<TaskModel>> GetTasksAsync();
        Task<long> AddTaskAsync(TaskModel task);
        Task UpdateTaskAsync(TaskModel task);
        Task DeleteTaskAsync(int id);

        // Attendance
        Task<List<AttendanceModel>> GetAttendancesAsync();
        Task<long> ClockInAsync(AttendanceModel attendance);
        Task ClockOutAsync(AttendanceModel attendance);

        // Tools
        Task<List<Tool>> GetToolsAsync();
        Task<long> AddToolAsync(Tool tool);
        Task UpdateToolAsync(Tool tool);
        Task DeleteToolAsync(int id);
    }

    public class TauriService : ITauriService
    {
        private readonly IJSRuntime _jsRuntime;

        public TauriService(IJSRuntime jsRuntime)
        {
            _jsRuntime = jsRuntime;
        }

        public async Task<string> GreetAsync(string name)
        {
            return await _jsRuntime.InvokeAsync<string>("__TAURI__.core.invoke", "greet", new { name });
        }

        // --- Inventory ---
        public async Task<List<Product>> GetProductsAsync()
        {
            return await _jsRuntime.InvokeAsync<List<Product>>("__TAURI__.core.invoke", "get_products", new { });
        }

        public async Task<long> AddProductAsync(Product product)
        {
            return await _jsRuntime.InvokeAsync<long>("__TAURI__.core.invoke", "add_product", new { product });
        }

        public async Task UpdateProductAsync(Product product)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "update_product", new { product });
        }

        public async Task DeleteProductAsync(int id)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "delete_product", new { id });
        }

        // --- Employees ---
        public async Task<List<Employee>> GetEmployeesAsync()
        {
            return await _jsRuntime.InvokeAsync<List<Employee>>("__TAURI__.core.invoke", "get_employees", new { });
        }

        public async Task<long> AddEmployeeAsync(Employee employee)
        {
            return await _jsRuntime.InvokeAsync<long>("__TAURI__.core.invoke", "add_employee", new { employee });
        }

        public async Task UpdateEmployeeAsync(Employee employee)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "update_employee", new { employee });
        }

        public async Task DeleteEmployeeAsync(int id)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "delete_employee", new { id });
        }

        // --- Finance ---
        public async Task<List<Payment>> GetPaymentsAsync()
        {
            return await _jsRuntime.InvokeAsync<List<Payment>>("__TAURI__.core.invoke", "get_payments", new { });
        }

        public async Task<long> AddPaymentAsync(Payment payment)
        {
            return await _jsRuntime.InvokeAsync<long>("__TAURI__.core.invoke", "add_payment", new { payment });
        }

        public async Task UpdatePaymentAsync(Payment payment)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "update_payment", new { payment });
        }

        public async Task DeletePaymentAsync(int id)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "delete_payment", new { id });
        }

        // --- Dashboard ---
        public async Task<DashboardStats> GetDashboardStatsAsync()
        {
            return await _jsRuntime.InvokeAsync<DashboardStats>("__TAURI__.core.invoke", "get_dashboard_stats", new { });
        }

        // --- Tasks ---
        public async Task<List<TaskModel>> GetTasksAsync()
        {
            return await _jsRuntime.InvokeAsync<List<TaskModel>>("__TAURI__.core.invoke", "get_tasks", new { });
        }

        public async Task<long> AddTaskAsync(TaskModel task)
        {
            return await _jsRuntime.InvokeAsync<long>("__TAURI__.core.invoke", "add_task", new { task });
        }

        public async Task UpdateTaskAsync(TaskModel task)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "update_task", new { task });
        }

        public async Task DeleteTaskAsync(int id)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "delete_task", new { id });
        }

        // --- Attendance ---
        public async Task<List<AttendanceModel>> GetAttendancesAsync()
        {
            return await _jsRuntime.InvokeAsync<List<AttendanceModel>>("__TAURI__.core.invoke", "get_attendances", new { });
        }

        public async Task<long> ClockInAsync(AttendanceModel attendance)
        {
            return await _jsRuntime.InvokeAsync<long>("__TAURI__.core.invoke", "clock_in", new { attendance });
        }

        public async Task ClockOutAsync(AttendanceModel attendance)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "clock_out", new { attendance });
        }

        // --- Reports ---
        public async Task<ReportSummary> GetReportSummaryAsync()
        {
            return await _jsRuntime.InvokeAsync<ReportSummary>("__TAURI__.core.invoke", "get_report_summary", new { });
        }

        public async Task<List<ChartDataPoint>> GetMonthlyCashflowAsync()
        {
            return await _jsRuntime.InvokeAsync<List<ChartDataPoint>>("__TAURI__.core.invoke", "get_monthly_cashflow", new { });
        }

        // --- Complaints ---
        public async Task<List<Complaint>> GetComplaintsAsync()
        {
            return await _jsRuntime.InvokeAsync<List<Complaint>>("__TAURI__.core.invoke", "get_complaints", new { });
        }

        public async Task<long> SubmitComplaintAsync(string content)
        {
            return await _jsRuntime.InvokeAsync<long>("__TAURI__.core.invoke", "submit_complaint", new { content });
        }

        public async Task ResolveComplaintAsync(int id, string status, string? adminNotes)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "resolve_complaint", new { id, status, adminNotes });
        }

        public async Task DeleteComplaintAsync(int id)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "delete_complaint", new { id });
        }

        // --- Tools ---
        public async Task<List<Tool>> GetToolsAsync()
        {
            return await _jsRuntime.InvokeAsync<List<Tool>>("__TAURI__.core.invoke", "get_tools", new { });
        }

        public async Task<long> AddToolAsync(Tool tool)
        {
            return await _jsRuntime.InvokeAsync<long>("__TAURI__.core.invoke", "add_tool", new { tool });
        }

        public async Task UpdateToolAsync(Tool tool)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "update_tool", new { tool });
        }

        public async Task DeleteToolAsync(int id)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "delete_tool", new { id });
        }
    }

    public class Product
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("category")]
        public string Category { get; set; } = "other";

        [JsonPropertyName("sku")]
        public string? Sku { get; set; }

        [JsonPropertyName("current_quantity")]
        public int CurrentQuantity { get; set; }

        [JsonPropertyName("minimum_quantity")]
        public int MinimumQuantity { get; set; }

        [JsonPropertyName("reorder_quantity")]
        public int ReorderQuantity { get; set; }

        [JsonPropertyName("unit_price")]
        public double UnitPrice { get; set; }

        [JsonPropertyName("supplier_name")]
        public string? SupplierName { get; set; }

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; } = true;
    }

    public class Employee
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("employee_id")]
        public string? EmployeeId { get; set; }

        [JsonPropertyName("first_name")]
        public string FirstName { get; set; } = string.Empty;

        [JsonPropertyName("last_name")]
        public string LastName { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("phone")]
        public string? Phone { get; set; }

        [JsonPropertyName("role")]
        public string Role { get; set; } = "employee";

        [JsonPropertyName("department")]
        public string? Department { get; set; }

        [JsonPropertyName("position")]
        public string? Position { get; set; }

        [JsonPropertyName("salary")]
        public double? Salary { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "active";
    }

    public class Payment
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("payment_type")]
        public string PaymentType { get; set; } = "expense";

        [JsonPropertyName("amount")]
        public double Amount { get; set; }

        [JsonPropertyName("currency")]
        public string Currency { get; set; } = "USD";

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "pending";

        [JsonPropertyName("payment_method")]
        public string PaymentMethod { get; set; } = "bank_transfer";

        [JsonPropertyName("payment_date")]
        public string? PaymentDate { get; set; }

        [JsonPropertyName("due_date")]
        public string? DueDate { get; set; }

        [JsonPropertyName("reference_number")]
        public string? ReferenceNumber { get; set; }

        [JsonPropertyName("employee_id")]
        public int? EmployeeId { get; set; }

        [JsonPropertyName("supplier_name")]
        public string? SupplierName { get; set; }
    }

    public class DashboardStats
    {
        [JsonPropertyName("total_products")]
        public int TotalProducts { get; set; }

        [JsonPropertyName("low_stock_items")]
        public int LowStockItems { get; set; }

        [JsonPropertyName("total_employees")]
        public int TotalEmployees { get; set; }

        [JsonPropertyName("total_payments_pending")]
        public int TotalPaymentsPending { get; set; }

        [JsonPropertyName("total_revenue")]
        public double TotalRevenue { get; set; }
    }

    public class TaskModel
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("employee_id")]
        public int? EmployeeId { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("due_date")]
        public DateTime? DueDate { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "pending";

        [JsonPropertyName("priority")]
        public string Priority { get; set; } = "medium";

        [JsonPropertyName("assigned_date")]
        public DateTime? AssignedDate { get; set; }

        [JsonPropertyName("completed_date")]
        public DateTime? CompletedDate { get; set; }
    }

    public class AttendanceModel
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("employee_id")]
        public int? EmployeeId { get; set; }

        [JsonPropertyName("check_in")]
        public string CheckIn { get; set; } = string.Empty;

        [JsonPropertyName("check_out")]
        public string? CheckOut { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "present";

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }

        [JsonPropertyName("location")]
        public string? Location { get; set; }
    }

    public class ReportSummary
    {
        [JsonPropertyName("total_revenue")]
        public double TotalRevenue { get; set; }

        [JsonPropertyName("total_expenses")]
        public double TotalExpenses { get; set; }

        [JsonPropertyName("net_profit")]
        public double NetProfit { get; set; }

        [JsonPropertyName("inventory_value")]
        public double InventoryValue { get; set; }

        [JsonPropertyName("pending_tasks")]
        public int PendingTasks { get; set; }

        [JsonPropertyName("active_employees")]
        public int ActiveEmployees { get; set; }
    }

    public class ChartDataPoint
    {
        [JsonPropertyName("label")]
        public string Label { get; set; } = string.Empty;

        [JsonPropertyName("value")]
        public double Value { get; set; }
    }

    public class Complaint
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;

        [JsonPropertyName("created_at")]
        public string CreatedAt { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "pending";

        [JsonPropertyName("admin_notes")]
        public string? AdminNotes { get; set; }
    }

    public class Tool
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("type_name")]
        public string TypeName { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "available";

        [JsonPropertyName("assigned_to_employee_id")]
        public int? AssignedToEmployeeId { get; set; }

        [JsonPropertyName("purchase_date")]
        public DateTime? PurchaseDate { get; set; }

        [JsonPropertyName("condition")]
        public string? Condition { get; set; }
    }
}
