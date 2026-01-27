using System.Security.Claims;
using Microsoft.AspNetCore.Components.Authorization;
using ThePlanningBord.Services;
using ThePlanningBord.Models;

namespace ThePlanningBord.Auth
{
    public class CustomAuthenticationStateProvider : AuthenticationStateProvider
    {
        private readonly IUserService _userService;

        public CustomAuthenticationStateProvider(IUserService userService)
        {
            _userService = userService;
        }

        public override async Task<AuthenticationState> GetAuthenticationStateAsync()
        {
            var user = await _userService.GetCurrentUserAsync();
            var identity = user != null 
                ? new ClaimsIdentity(GenerateClaims(user), "apiauth") 
                : new ClaimsIdentity();

            return new AuthenticationState(new ClaimsPrincipal(identity));
        }

        public void NotifyUserLogin(User user)
        {
            var identity = new ClaimsIdentity(GenerateClaims(user), "apiauth");
            var principal = new ClaimsPrincipal(identity);
            NotifyAuthenticationStateChanged(Task.FromResult(new AuthenticationState(principal)));
        }

        public void NotifyUserLogout()
        {
            var identity = new ClaimsIdentity();
            var principal = new ClaimsPrincipal(identity);
            NotifyAuthenticationStateChanged(Task.FromResult(new AuthenticationState(principal)));
        }

        private IEnumerable<Claim> GenerateClaims(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
            };

            if (user.Id.HasValue)
            {
                claims.Add(new Claim(ClaimTypes.NameIdentifier, user.Id.Value.ToString()));
            }

            if (!string.IsNullOrEmpty(user.Role))
            {
                claims.Add(new Claim(ClaimTypes.Role, user.Role));
            }

            if (!string.IsNullOrEmpty(user.FullName))
            {
                claims.Add(new Claim("FullName", user.FullName));
            }

            if (user.Permissions != null)
            {
                foreach (var permission in user.Permissions)
                {
                    claims.Add(new Claim("Permission", permission));
                }
            }

            return claims;
        }
    }
}
