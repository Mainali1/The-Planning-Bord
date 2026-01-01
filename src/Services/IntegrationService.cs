using Microsoft.JSInterop;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface IIntegrationService
    {
        Task<List<Integration>> GetIntegrationsAsync();
        Task ToggleIntegrationAsync(int id, bool isConnected);
        Task ConfigureIntegrationAsync(int id, string? apiKey, string? configJson);
    }

    public class IntegrationService : IIntegrationService
    {
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public IntegrationService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<List<Integration>> GetIntegrationsAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<Integration>>("get_integrations", new { token });
        }

        public async Task ToggleIntegrationAsync(int id, bool isConnected)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("toggle_integration", new { id, isConnected, token });
        }

        public async Task ConfigureIntegrationAsync(int id, string? apiKey, string? configJson)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("configure_integration", new { id, apiKey, configJson, token });
        }
    }
}
