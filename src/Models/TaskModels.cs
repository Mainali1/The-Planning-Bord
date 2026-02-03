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

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("submitted_by_employee_id")]
        public int? SubmittedByEmployeeId { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "open";

        [JsonPropertyName("submitted_at")]
        public string SubmittedAt { get; set; } = string.Empty;

        [JsonPropertyName("resolved_at")]
        public string? ResolvedAt { get; set; }

        [JsonPropertyName("resolution")]
        public string? Resolution { get; set; }

        [JsonPropertyName("resolved_by_user_id")]
        public int? ResolvedByUserId { get; set; }

        [JsonPropertyName("admin_notes")]
        public string? AdminNotes { get; set; }

        [JsonPropertyName("is_anonymous")]
        public bool IsAnonymous { get; set; }

        // Legacy property for compatibility
        [JsonPropertyName("content")]
        public string Content 
        { 
            get => Title + "\n" + Description; 
            set 
            { 
                var lines = value.Split('\n');
                Title = lines.Length > 0 ? lines[0] : "Untitled Complaint";
                Description = lines.Length > 1 ? string.Join("\n", lines.Skip(1)) : "";
            }
        }

        [JsonPropertyName("created_at")]
        public string CreatedAt 
        { 
            get => SubmittedAt; 
            set => SubmittedAt = value; 
        }
    }
}
