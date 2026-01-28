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

    public class BomHeader
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("product_id")]
        public int ProductId { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; } = true;

        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        [JsonPropertyName("updated_at")]
        public string? UpdatedAt { get; set; }
    }

    public class BomLine
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("bom_id")]
        public int? BomId { get; set; }

        [JsonPropertyName("component_product_id")]
        public int ComponentProductId { get; set; }

        [JsonPropertyName("quantity")]
        public double Quantity { get; set; }

        [JsonPropertyName("unit")]
        public string Unit { get; set; } = "pcs";

        [JsonPropertyName("wastage_percentage")]
        public double WastagePercentage { get; set; }

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }
    }

    public class InventoryBatch
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("product_id")]
        public int ProductId { get; set; }

        [JsonPropertyName("batch_number")]
        public string BatchNumber { get; set; } = string.Empty;

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [JsonPropertyName("manufacturing_date")]
        public string? ManufacturingDate { get; set; }

        [JsonPropertyName("expiration_date")]
        public string? ExpirationDate { get; set; }

        [JsonPropertyName("received_date")]
        public string? ReceivedDate { get; set; }

        [JsonPropertyName("supplier_info")]
        public string? SupplierInfo { get; set; }

        [JsonPropertyName("supplier_id")]
        public int? SupplierId { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "active";

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }
    }

    public class VelocityReport
    {
        [JsonPropertyName("product_id")]
        public int ProductId { get; set; }

        [JsonPropertyName("product_name")]
        public string ProductName { get; set; } = string.Empty;

        [JsonPropertyName("sku")]
        public string? Sku { get; set; }

        [JsonPropertyName("current_quantity")]
        public int CurrentQuantity { get; set; }

        [JsonPropertyName("total_sold_last_30_days")]
        public double TotalSoldLast30Days { get; set; }

        [JsonPropertyName("avg_daily_sales")]
        public double AvgDailySales { get; set; }

        [JsonPropertyName("estimated_days_stock")]
        public double EstimatedDaysStock { get; set; }

        [JsonPropertyName("recommended_reorder_qty")]
        public double RecommendedReorderQty { get; set; }
    }

    public class Sale
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("product_id")]
        public int ProductId { get; set; }

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [JsonPropertyName("total_price")]
        public double TotalPrice { get; set; }

        [JsonPropertyName("sale_date")]
        public string? SaleDate { get; set; }

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }

        [JsonPropertyName("user_id")]
        public int? UserId { get; set; }

        [JsonPropertyName("product_name")]
        public string? ProductName { get; set; }
    }
}
