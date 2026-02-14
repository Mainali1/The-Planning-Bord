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

        [JsonPropertyName("full_name")]
        public string? FullName { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("phone")]
        public string? Phone { get; set; }

        [JsonPropertyName("role")]
        public string Role { get; set; } = "Employee";

        [JsonPropertyName("department")]
        public string? Department { get; set; }

        [JsonPropertyName("position")]
        public string? Position { get; set; }

        [JsonPropertyName("manager_id")]
        public int? ManagerId { get; set; }

        [JsonPropertyName("hire_date")]
        public string? HireDate { get; set; }

        [JsonPropertyName("salary")]
        public double? Salary { get; set; }

        [JsonPropertyName("hourly_cost")]
        public double? HourlyCost { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "active";

        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        [JsonPropertyName("updated_at")]
        public string? UpdatedAt { get; set; }
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

    public class Invite
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("token")]
        public string Token { get; set; } = string.Empty;

        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("expiration")]
        public string Expiration { get; set; } = string.Empty;

        [JsonPropertyName("is_used")]
        public bool IsUsed { get; set; }

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; }
    }
}
