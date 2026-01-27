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
            var integrations = await _tauri.InvokeAsync<List<Integration>>("get_integrations", new { token });
            
            foreach (var i in integrations)
            {
                EnrichIntegrationMetadata(i);
            }
            
            return integrations;
        }

        private void EnrichIntegrationMetadata(Integration i)
        {
            switch (i.Name)
            {
                case "QuickBooks":
                    i.Icon = "📗";
                    i.Description = "Accounting software for small businesses.";
                    break;
                case "Xero":
                    i.Icon = "📘";
                    i.Description = "Cloud-based accounting software.";
                    break;
                case "Slack":
                    i.Icon = "💬";
                    i.Description = "Team communication and collaboration.";
                    break;
                case "Microsoft Teams":
                    i.Icon = "👥";
                    i.Description = "Workspace for real-time collaboration.";
                    break;
                case "Google Calendar":
                    i.Icon = "📅";
                    i.Description = "Time management and scheduling.";
                    break;
                case "Outlook Calendar":
                    i.Icon = "📆";
                    i.Description = "Microsoft Outlook calendar integration.";
                    break;
                case "SurveyMonkey":
                    i.Icon = "📝";
                    i.Description = "Create and run online surveys.";
                    break;
                case "Typeform":
                    i.Icon = "📋";
                    i.Description = "People-friendly forms and surveys.";
                    break;
                default:
                    i.Icon = "🔌";
                    i.Description = "External tool integration.";
                    break;
            }
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
