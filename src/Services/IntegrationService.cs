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
        private readonly IJSRuntime _jsRuntime;

        public IntegrationService(IJSRuntime jsRuntime)
        {
            _jsRuntime = jsRuntime;
        }

        public async Task<List<Integration>> GetIntegrationsAsync()
        {
            return await _jsRuntime.InvokeAsync<List<Integration>>("__TAURI__.core.invoke", "get_integrations", new { });
        }

        public async Task ToggleIntegrationAsync(int id, bool isConnected)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "toggle_integration", new { id, isConnected });
        }

        public async Task ConfigureIntegrationAsync(int id, string? apiKey, string? configJson)
        {
            await _jsRuntime.InvokeVoidAsync("__TAURI__.core.invoke", "configure_integration", new { id, apiKey, configJson });
        }
    }
}
