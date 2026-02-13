using System.Text.Json.Serialization;

namespace ThePlanningBord.Models
{
    public class FinanceOverview
    {
        [JsonPropertyName("net_income")]
        public double NetIncome { get; set; }

        [JsonPropertyName("total_revenue")]
        public double TotalRevenue { get; set; }

        [JsonPropertyName("outstanding_invoices")]
        public double OutstandingInvoices { get; set; }

        [JsonPropertyName("revenue_trend")]
        public List<ChartDataPoint> RevenueTrend { get; set; } = new();

        [JsonPropertyName("expense_allocation")]
        public List<ChartDataPoint> ExpenseAllocation { get; set; } = new();
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

    public class GlAccount
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("code")]
        public string Code { get; set; } = "";

        [JsonPropertyName("name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("account_type")]
        public string AccountType { get; set; } = "Asset"; // 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'

        [JsonPropertyName("balance")]
        public double Balance { get; set; }

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; } = true;

        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        [JsonPropertyName("updated_at")]
        public string? UpdatedAt { get; set; }
    }

    public class GlEntry
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("transaction_date")]
        public string? TransactionDate { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("reference_type")]
        public string? ReferenceType { get; set; } // 'Invoice', 'Payment', 'Bill', 'Manual'

        [JsonPropertyName("reference_id")]
        public int? ReferenceId { get; set; }

        [JsonPropertyName("posted_by")]
        public int? PostedBy { get; set; }

        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        [JsonPropertyName("lines")]
        public List<GlEntryLine>? Lines { get; set; }
    }

    public class GlEntryLine
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("entry_id")]
        public int? EntryId { get; set; }

        [JsonPropertyName("account_id")]
        public int AccountId { get; set; }

        [JsonPropertyName("debit")]
        public double Debit { get; set; }

        [JsonPropertyName("credit")]
        public double Credit { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }
}
