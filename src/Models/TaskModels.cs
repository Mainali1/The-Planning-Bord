using System.Text.Json.Serialization;

namespace ThePlanningBord.Models
{
    public class TaskModel
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("employee_id")]
        public int? EmployeeId { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("due_date")]
        public DateTime? DueDate { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "pending";

        [JsonPropertyName("priority")]
        public string Priority { get; set; } = "medium";

        [JsonPropertyName("assigned_date")]
        public DateTime? AssignedDate { get; set; }

        [JsonPropertyName("completed_date")]
        public DateTime? CompletedDate { get; set; }
    }

    public class Complaint
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;

        [JsonPropertyName("created_at")]
        public string CreatedAt { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "pending";

        [JsonPropertyName("admin_notes")]
        public string? AdminNotes { get; set; }
    }
}
