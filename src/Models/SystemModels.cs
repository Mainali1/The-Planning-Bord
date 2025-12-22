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

        [JsonPropertyName("connected_at")]
        public string? ConnectedAt { get; set; }

        // Helper for UI
        public string Icon => Name switch
        {
            "QuickBooks" => "📗",
            "Xero" => "📘",
            "Salesforce" => "☁️",
            "HubSpot" => "🟠",
            "Slack" => "💬",
            "Teams" => "👥",
            "Google Calendar" => "📅",
            "Outlook" => "📧",
            _ => "🔌"
        };
        
        public string Description => Name switch
        {
            "QuickBooks" => "Sync invoices and expenses automatically.",
            "Xero" => "Seamless accounting integration.",
            "Salesforce" => "Sync leads and customer data.",
            "HubSpot" => "Marketing and CRM automation.",
            "Slack" => "Get notifications and updates in channels.",
            "Teams" => "Collaborate on projects within Teams.",
            "Google Calendar" => "Sync tasks and meetings.",
            "Outlook" => "Email and calendar synchronization.",
            _ => "Connect external tool."
        };
    }
}
