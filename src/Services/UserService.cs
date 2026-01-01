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
        Task<string?> GetTokenAsync();
    }

    public class UserService : IUserService
    {
        private readonly ITauriInterop _tauriInterop;
        private readonly IJSRuntime _jsRuntime;
        private User? _currentUser;

        private string? _token;

        public UserService(ITauriInterop tauriInterop, IJSRuntime jsRuntime)
        {
            _tauriInterop = tauriInterop;
            _jsRuntime = jsRuntime;
        }

        public async Task<User?> LoginAsync(string username, string password)
        {
            try
            {
                // Call Rust backend
                var response = await _tauriInterop.InvokeAsync<LoginResponse>("login", new { username = username, password_plain = password });
                
                if (response != null && response.User != null)
                {
                    _currentUser = response.User;
                    _token = response.Token;
                    await _jsRuntime.InvokeVoidAsync("sessionStorage.setItem", "currentUser", System.Text.Json.JsonSerializer.Serialize(_currentUser));
                    await _jsRuntime.InvokeVoidAsync("sessionStorage.setItem", "authToken", _token);
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
            _token = null;
            await _jsRuntime.InvokeVoidAsync("sessionStorage.removeItem", "currentUser");
            await _jsRuntime.InvokeVoidAsync("sessionStorage.removeItem", "authToken");
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
                    _token = await _jsRuntime.InvokeAsync<string>("sessionStorage.getItem", "authToken");
                }
            }
            catch { }

            return _currentUser;
        }

        public async Task<string?> GetTokenAsync()
        {
            if (_token == null)
            {
                await GetCurrentUserAsync();
            }
            return _token;
        }

        public async Task<bool> IsAuthenticatedAsync()
        {
            return (await GetCurrentUserAsync()) != null;
        }
    }
}
