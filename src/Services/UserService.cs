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
        Task<string> GenerateInviteTokenAsync(string role, string name, string email, int expirationHours);
        Task<InviteClaims?> CheckInviteTokenAsync(string token);
        Task<User?> AcceptInviteAsync(string token, string password, string username, string fullName);
        Task<List<Invite>> GetInvitesAsync();
        Task ToggleInviteStatusAsync(int inviteId, bool isActive);
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
            // Call Rust backend
            var response = await _tauriInterop.InvokeAsync<LoginResponse>("login", new { username = username, passwordPlain = password });
            
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

        public async Task LogoutAsync()
        {
            var token = await GetTokenAsync();
            if (!string.IsNullOrEmpty(token))
            {
                try { await _tauriInterop.InvokeVoidAsync("logout", new { token }); } catch { }
            }
            _currentUser = null;
            _token = null;
            await _jsRuntime.InvokeVoidAsync("sessionStorage.removeItem", "currentUser");
            await _jsRuntime.InvokeVoidAsync("sessionStorage.removeItem", "authToken");
            await _jsRuntime.InvokeVoidAsync("localStorage.removeItem", "tour_completed");
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

        public async Task<string> GenerateInviteTokenAsync(string role, string name, string email, int expirationHours)
        {
            var token = await GetTokenAsync();
            return await _tauriInterop.InvokeAsync<string>("generate_invite_token", new { role, name, email, expirationHours, token });
        }

        public async Task<InviteClaims?> CheckInviteTokenAsync(string inviteToken)
        {
            return await _tauriInterop.InvokeAsync<InviteClaims>("check_invite_token", new { inviteToken });
        }

        public async Task<User?> AcceptInviteAsync(string token, string password, string username, string fullName)
        {
            var response = await _tauriInterop.InvokeAsync<LoginResponse>("accept_invite", new { inviteToken = token, passwordPlain = password, username = username, fullName = fullName });
            
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

        public async Task<List<Invite>> GetInvitesAsync()
        {
            var token = await GetTokenAsync();
            return await _tauriInterop.InvokeAsync<List<Invite>>("get_all_invites", new { token });
        }

        public async Task ToggleInviteStatusAsync(int inviteId, bool isActive)
        {
            var token = await GetTokenAsync();
            await _tauriInterop.InvokeAsync<object>("toggle_invite_status", new { token, inviteId, isActive });
        }
    }
}
