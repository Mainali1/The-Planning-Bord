using System.Text.Json.Serialization;

namespace ThePlanningBord.Models
{
    public class Employee
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("employee_id")]
        public string? EmployeeId { get; set; }

        [JsonPropertyName("first_name")]
        public string FirstName { get; set; } = string.Empty;

        [JsonPropertyName("last_name")]
        public string LastName { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("phone")]
        public string? Phone { get; set; }

        [JsonPropertyName("role")]
        public string Role { get; set; } = "employee";

        [JsonPropertyName("department")]
        public string? Department { get; set; }

        [JsonPropertyName("position")]
        public string? Position { get; set; }

        [JsonPropertyName("salary")]
        public double? Salary { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "active";
    }

    public class AttendanceModel
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("employee_id")]
        public int? EmployeeId { get; set; }

        [JsonPropertyName("check_in")]
        public string CheckIn { get; set; } = string.Empty;

        [JsonPropertyName("check_out")]
        public string? CheckOut { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "present";

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }

        [JsonPropertyName("location")]
        public string? Location { get; set; }
    }
}
