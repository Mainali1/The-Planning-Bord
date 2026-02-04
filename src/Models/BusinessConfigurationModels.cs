using System.Text.Json.Serialization;

namespace ThePlanningBord.Models
{
    public class BusinessConfiguration
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("business_type")]
        public string BusinessType { get; set; } = "product-only"; // 'product-only', 'service-only', 'both'

        [JsonPropertyName("company_name")]
        public string? CompanyName { get; set; }

        [JsonPropertyName("industry")]
        public string? Industry { get; set; }

        [JsonPropertyName("tax_rate")]
        public double? TaxRate { get; set; }

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; } = true;

        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        [JsonPropertyName("updated_at")]
        public string? UpdatedAt { get; set; }

        [JsonPropertyName("created_by_user_id")]
        public int? CreatedByUserId { get; set; }
    }

    public class Service
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("category")]
        public string Category { get; set; } = string.Empty;

        [JsonPropertyName("unit_price")]
        public double UnitPrice { get; set; } = 0.0;

        [JsonPropertyName("billing_type")]
        public string BillingType { get; set; } = "hourly"; // 'hourly', 'fixed', 'retainer'

        [JsonPropertyName("estimated_hours")]
        public double? EstimatedHours { get; set; }

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; } = true;
    }

    public class Client
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("company_name")]
        public string CompanyName { get; set; } = string.Empty;

        [JsonPropertyName("contact_name")]
        public string ContactName { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string? Phone { get; set; }

        [JsonPropertyName("address")]
        public string? Address { get; set; }

        [JsonPropertyName("industry")]
        public string? Industry { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "lead"; // 'lead', 'prospect', 'active', 'inactive'

        [JsonPropertyName("payment_terms")]
        public string? PaymentTerms { get; set; }

        [JsonPropertyName("credit_limit")]
        public double? CreditLimit { get; set; }

        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        [JsonPropertyName("updated_at")]
        public string? UpdatedAt { get; set; }
    }

    public class TimeEntry
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("employee_id")]
        public int EmployeeId { get; set; }

        [JsonPropertyName("client_id")]
        public int? ClientId { get; set; }

        [JsonPropertyName("project_id")]
        public int? ProjectId { get; set; }

        [JsonPropertyName("service_id")]
        public int? ServiceId { get; set; }

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("start_time")]
        public DateTime StartTime { get; set; }

        [JsonPropertyName("end_time")]
        public DateTime? EndTime { get; set; }

        [JsonPropertyName("duration_hours")]
        public double DurationHours { get; set; }

        [JsonPropertyName("is_billable")]
        public bool IsBillable { get; set; } = true;

        [JsonPropertyName("hourly_rate")]
        public double HourlyRate { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "draft"; // 'draft', 'submitted', 'approved', 'invoiced'

        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        [JsonPropertyName("updated_at")]
        public string? UpdatedAt { get; set; }
    }

    public class ServiceContract
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("client_id")]
        public int ClientId { get; set; }

        [JsonPropertyName("contract_number")]
        public string ContractNumber { get; set; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("contract_type")]
        public string ContractType { get; set; } = "retainer"; // 'retainer', 'project', 'recurring'

        [JsonPropertyName("start_date")]
        public DateTime StartDate { get; set; }

        [JsonPropertyName("end_date")]
        public DateTime? EndDate { get; set; }

        [JsonPropertyName("total_value")]
        public double TotalValue { get; set; }

        [JsonPropertyName("billing_frequency")]
        public string BillingFrequency { get; set; } = "monthly"; // 'monthly', 'quarterly', 'milestone'

        [JsonPropertyName("status")]
        public string Status { get; set; } = "draft"; // 'draft', 'active', 'completed', 'cancelled'

        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        [JsonPropertyName("updated_at")]
        public string? UpdatedAt { get; set; }
    }

    public class Quote
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("client_id")]
        public int ClientId { get; set; }

        [JsonPropertyName("quote_number")]
        public string QuoteNumber { get; set; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("subtotal")]
        public double Subtotal { get; set; }

        [JsonPropertyName("tax_amount")]
        public double TaxAmount { get; set; }

        [JsonPropertyName("total_amount")]
        public double TotalAmount { get; set; }

        [JsonPropertyName("valid_until")]
        public DateTime ValidUntil { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "draft"; // 'draft', 'sent', 'accepted', 'rejected', 'expired'

        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        [JsonPropertyName("updated_at")]
        public string? UpdatedAt { get; set; }
    }

    public class QuoteItem
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("quote_id")]
        public int QuoteId { get; set; }

        [JsonPropertyName("service_id")]
        public int? ServiceId { get; set; }

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("quantity")]
        public double Quantity { get; set; }

        [JsonPropertyName("unit_price")]
        public double UnitPrice { get; set; }

        [JsonPropertyName("total_price")]
        public double TotalPrice { get; set; }

        [JsonPropertyName("sort_order")]
        public int SortOrder { get; set; }
    }
}