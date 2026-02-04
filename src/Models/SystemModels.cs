using System.Text.Json.Serialization;

namespace ThePlanningBord.Models
{
    public class Role
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("is_custom")]
        public bool IsCustom { get; set; }
    }

    public class Permission
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("code")]
        public string Code { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }

    public class FeatureToggle
    {
        [JsonPropertyName("key")]
        public string Key { get; set; } = string.Empty;

        [JsonPropertyName("is_enabled")]
        public bool IsEnabled { get; set; }
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

        [JsonPropertyName("total_sales")]
    public int TotalSales { get; set; }
    [JsonPropertyName("net_profit")]
    public double NetProfit { get; set; }

    [JsonPropertyName("total_services")]
    public int TotalServices { get; set; }

    [JsonPropertyName("total_clients")]
    public int TotalClients { get; set; }

    [JsonPropertyName("billable_hours")]
    public double BillableHours { get; set; }

    [JsonPropertyName("billable_utilization")]
    public double BillableUtilization { get; set; }

    [JsonPropertyName("average_project_margin")]
    public double AverageProjectMargin { get; set; }

    [JsonPropertyName("resource_availability_rate")]
    public double ResourceAvailabilityRate { get; set; }

    [JsonPropertyName("contracts_expiring_soon")]
    public int ContractsExpiringSoon { get; set; }
}

    public class ReportSummary
    {
        [JsonPropertyName("total_revenue")]
        public double TotalRevenue { get; set; }

        [JsonPropertyName("total_sales_count")]
        public int TotalSalesCount { get; set; }

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

    public class Integration
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("is_connected")]
        public bool IsConnected { get; set; }

        [JsonPropertyName("api_key")]
        public string? ApiKey { get; set; }

        [JsonPropertyName("config_json")]
        public string? ConfigJson { get; set; }

        [JsonPropertyName("icon")]
        public string Icon { get; set; } = "🔌";

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("provider")]
        public string Provider { get; set; } = string.Empty;
    }
    
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum DbType
    {
        Local,
        Cloud
    }

    public class DbConfig
    {
        [JsonPropertyName("db_type")]
        public DbType DbType { get; set; }

        [JsonPropertyName("connection_string")]
        public string ConnectionString { get; set; } = string.Empty;
    }
}
