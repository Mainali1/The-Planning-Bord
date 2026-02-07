using System.Text.Json.Serialization;

namespace ThePlanningBord.Models
{
    public class SalesOrder
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("client_id")]
        public int? ClientId { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Draft";

        [JsonPropertyName("currency")]
        public string Currency { get; set; } = "USD";

        [JsonPropertyName("order_date")]
        public string? OrderDate { get; set; }

        [JsonPropertyName("expected_shipment_date")]
        public string? ExpectedShipmentDate { get; set; }

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
        public List<SalesOrderLine>? Lines { get; set; }
    }

    public class SalesOrderLine
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("so_id")]
        public int? SoId { get; set; }

        [JsonPropertyName("product_id")]
        public int? ProductId { get; set; }

        [JsonPropertyName("quantity")]
        public double Quantity { get; set; }

        [JsonPropertyName("unit_price")]
        public double UnitPrice { get; set; }

        [JsonPropertyName("total_price")]
        public double TotalPrice { get; set; }

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }
    }
}
