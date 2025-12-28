using System.Text.Json.Serialization;

namespace ThePlanningBord.Models
{
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
        public string? PurchaseDate { get; set; }

        [JsonPropertyName("condition")]
        public string? Condition { get; set; }
    }

    public class ToolAssignment
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("employee_id")]
        public int? EmployeeId { get; set; }

        [JsonPropertyName("tool_id")]
        public int? ToolId { get; set; }

        [JsonPropertyName("assigned_at")]
        public string? AssignedAt { get; set; }

        [JsonPropertyName("returned_at")]
        public string? ReturnedAt { get; set; }

        [JsonPropertyName("condition_on_assignment")]
        public string? ConditionOnAssignment { get; set; }

        [JsonPropertyName("condition_on_return")]
        public string? ConditionOnReturn { get; set; }

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }
    }
}
