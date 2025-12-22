using System.Text.Json.Serialization;

namespace ThePlanningBord.Models
{
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
}
