using System.Text.Json.Serialization;

namespace ThePlanningBord.Models
{
    public class User
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("username")]
        public string Username { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("full_name")]
        public string? FullName { get; set; }

        [JsonPropertyName("role")]
        public string Role { get; set; } = "user";

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; }

        [JsonPropertyName("last_login")]
        public string? LastLogin { get; set; }
    }

    public class LoginResponse
    {
        [JsonPropertyName("user")]
        public User User { get; set; } = new User();

        [JsonPropertyName("token")]
        public string Token { get; set; } = string.Empty;
    }
}
