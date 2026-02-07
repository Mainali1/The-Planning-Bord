using System.Text.Json.Serialization;

namespace ThePlanningBord.Models
{
    public class PurchaseOrder
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("supplier_id")]
        public int? SupplierId { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Draft";

        [JsonPropertyName("order_date")]
        public string? OrderDate { get; set; }

        [JsonPropertyName("expected_delivery_date")]
        public string? ExpectedDeliveryDate { get; set; }

        [JsonPropertyName("total_amount")]
        public double TotalAmount { get; set; }

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }

        [JsonPropertyName("created_by_user_id")]
        public int? CreatedByUserId { get; set; }

        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        [JsonPropertyName("updated_at")]
        public string? UpdatedAt { get; set; }

        [JsonPropertyName("lines")]
        public List<PurchaseOrderLine>? Lines { get; set; }
    }

    public class PurchaseOrderLine
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("po_id")]
        public int? PoId { get; set; }

        [JsonPropertyName("product_id")]
        public int? ProductId { get; set; }

        [JsonPropertyName("quantity_ordered")]
        public double QuantityOrdered { get; set; }

        [JsonPropertyName("quantity_received")]
        public double QuantityReceived { get; set; }

        [JsonPropertyName("unit_price")]
        public double UnitPrice { get; set; }

        [JsonPropertyName("total_price")]
        public double TotalPrice { get; set; }

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }
    }
}
