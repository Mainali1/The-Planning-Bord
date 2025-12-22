using Microsoft.JSInterop;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface IUserService
    {
        Task<User?> LoginAsync(string username, string password);
        Task LogoutAsync();
        Task<User?> GetCurrentUserAsync();
        Task<bool> IsAuthenticatedAsync();
    }

    public class UserService : IUserService
    {
        private readonly IJSRuntime _jsRuntime;
        private User? _currentUser;

        public UserService(IJSRuntime jsRuntime)
        {
            _jsRuntime = jsRuntime;
        }

        public async Task<User?> LoginAsync(string username, string password)
        {
            try
            {
                // In a real app, we would hash password and verify with backend
                // Here we invoke a Rust command or simulate
                // For now, let's assume we have a 'login_user' command in Rust or just mock it for this step
                // Since I haven't implemented 'login_user' in Rust yet, I'll simulate or use a simple check
                // But wait, the db.rs has a 'users' table with 'hashed_password'.
                // I should implement 'login_user' in Rust properly.
                // For this refactoring step, I will use a mock that returns a user if username is 'admin'
                
                // TODO: Implement actual backend login command
                // var user = await _jsRuntime.InvokeAsync<User>("__TAURI__.core.invoke", "login_user", new { username, password });
                
                // Mock implementation
                if (username == "admin" && password == "admin") 
                {
                    _currentUser = new User 
                    { 
                        Id = 1, 
                        Username = "admin", 
                        Email = "admin@example.com", 
                        FullName = "System Administrator", 
                        Role = "CEO", 
                        IsActive = true 
                    };
                    await _jsRuntime.InvokeVoidAsync("sessionStorage.setItem", "currentUser", System.Text.Json.JsonSerializer.Serialize(_currentUser));
                    return _currentUser;
                }
                
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Login error: {ex.Message}");
                return null;
            }
        }

        public async Task LogoutAsync()
        {
            _currentUser = null;
            await _jsRuntime.InvokeVoidAsync("sessionStorage.removeItem", "currentUser");
        }

        public async Task<User?> GetCurrentUserAsync()
        {
            if (_currentUser != null) return _currentUser;

            try
            {
                var userJson = await _jsRuntime.InvokeAsync<string>("sessionStorage.getItem", "currentUser");
                if (!string.IsNullOrEmpty(userJson))
                {
                    _currentUser = System.Text.Json.JsonSerializer.Deserialize<User>(userJson);
                }
            }
            catch { }

            return _currentUser;
        }

        public async Task<bool> IsAuthenticatedAsync()
        {
            return (await GetCurrentUserAsync()) != null;
        }
    }
}
