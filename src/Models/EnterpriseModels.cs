using System.Text.Json.Serialization;

namespace ThePlanningBord.Models
{
    public class AuditLog
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("user_id")]
        public int? UserId { get; set; }

        [JsonPropertyName("user_name")]
        public string? UserName { get; set; }

        [JsonPropertyName("action")]
        public string Action { get; set; } = string.Empty;

        [JsonPropertyName("entity")]
        public string Entity { get; set; } = string.Empty;

        [JsonPropertyName("entity_id")]
        public int? EntityId { get; set; }

        [JsonPropertyName("details")]
        public string? Details { get; set; }

        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("ip_address")]
        public string? IpAddress { get; set; }

        [JsonPropertyName("user_agent")]
        public string? UserAgent { get; set; }
    }

    public class DashboardConfig
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("user_id")]
        public int? UserId { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("layout_json")]
        public string? LayoutJson { get; set; }

        [JsonPropertyName("is_default")]
        public bool IsDefault { get; set; }
    }

    public class Project
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("start_date")]
        public string? StartDate { get; set; }

        [JsonPropertyName("end_date")]
        public string? EndDate { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "planning";

        [JsonPropertyName("manager_id")]
        public int? ManagerId { get; set; }

        [JsonPropertyName("client_id")]
        public int? ClientId { get; set; }
    }

    public class ProjectProfitability
    {
        [JsonPropertyName("project_id")]
        public int ProjectId { get; set; }

        [JsonPropertyName("project_name")]
        public string ProjectName { get; set; } = string.Empty;

        [JsonPropertyName("client_name")]
        public string ClientName { get; set; } = string.Empty;

        [JsonPropertyName("total_revenue")]
        public double TotalRevenue { get; set; }

        [JsonPropertyName("total_labor_cost")]
        public double TotalLaborCost { get; set; }

        [JsonPropertyName("total_material_cost")]
        public double TotalMaterialCost { get; set; }

        [JsonPropertyName("total_expense_cost")]
        public double TotalExpenseCost { get; set; }

        [JsonPropertyName("gross_margin")]
        public double GrossMargin { get; set; }

        [JsonPropertyName("profit_margin_percent")]
        public double ProfitMarginPercent { get; set; }
    }

    public class ProjectTask
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("project_id")]
        public int? ProjectId { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("assigned_to")]
        public int? AssignedTo { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "todo";

        [JsonPropertyName("priority")]
        public string Priority { get; set; } = "medium";

        [JsonPropertyName("start_date")]
        public string? StartDate { get; set; }

        [JsonPropertyName("due_date")]
        public string? DueDate { get; set; }

        [JsonPropertyName("parent_task_id")]
        public int? ParentTaskId { get; set; }

        [JsonPropertyName("dependencies_json")]
        public string? DependenciesJson { get; set; }
    }

    public class ProjectPhase
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("project_id")]
        public int ProjectId { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("start_date")]
        public string StartDate { get; set; } = string.Empty;

        [JsonIgnore]
        public DateTime StartDateValue
        {
            get => DateTime.TryParse(StartDate, out var dt) ? dt : DateTime.Today;
            set => StartDate = value.ToString("yyyy-MM-dd");
        }

        [JsonPropertyName("end_date")]
        public string EndDate { get; set; } = string.Empty;

        [JsonIgnore]
        public DateTime EndDateValue
        {
            get => DateTime.TryParse(EndDate, out var dt) ? dt : DateTime.Today;
            set => EndDate = value.ToString("yyyy-MM-dd");
        }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "planned";

        [JsonPropertyName("color")]
        public string? Color { get; set; }

        [JsonPropertyName("sort_order")]
        public int SortOrder { get; set; }
    }

    public class ProjectMilestone
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("project_id")]
        public int ProjectId { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("date")]
        public string Date { get; set; } = string.Empty;

        [JsonIgnore]
        public DateTime DateValue
        {
            get => DateTime.TryParse(Date, out var dt) ? dt : DateTime.Today;
            set => Date = value.ToString("yyyy-MM-dd");
        }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "pending";

        [JsonPropertyName("is_critical")]
        public bool IsCritical { get; set; }
    }

    public class ProjectTimeline
    {
        [JsonPropertyName("project_id")]
        public int ProjectId { get; set; }

        [JsonPropertyName("project_name")]
        public string ProjectName { get; set; } = string.Empty;

        [JsonPropertyName("phases")]
        public List<ProjectPhase> Phases { get; set; } = new();

        [JsonPropertyName("milestones")]
        public List<ProjectMilestone> Milestones { get; set; } = new();
    }

    public class ProjectAssignment
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("project_id")]
        public int ProjectId { get; set; }

        [JsonPropertyName("employee_id")]
        public int EmployeeId { get; set; }

        [JsonPropertyName("role")]
        public string Role { get; set; } = "member";

        [JsonPropertyName("assigned_at")]
        public string? AssignedAt { get; set; }
    }

    public class Account
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("code")]
        public string Code { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("type_name")]
        public string TypeName { get; set; } = string.Empty;

        [JsonPropertyName("currency")]
        public string Currency { get; set; } = "USD";

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; }
    }

    public class Invoice
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("customer_name")]
        public string CustomerName { get; set; } = string.Empty;

        [JsonPropertyName("customer_email")]
        public string? CustomerEmail { get; set; }

        [JsonPropertyName("invoice_date")]
        public string InvoiceDate { get; set; } = string.Empty;

        [JsonPropertyName("due_date")]
        public string? DueDate { get; set; }

        [JsonPropertyName("total_amount")]
        public double TotalAmount { get; set; }

        [JsonPropertyName("tax_rate")]
        public double TaxRate { get; set; }

        [JsonPropertyName("tax_amount")]
        public double TaxAmount { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "draft";

        [JsonPropertyName("currency")]
        public string Currency { get; set; } = "USD";

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }
    }

}
