using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface ISlackService
    {
        Task<bool> SendNotificationAsync(string message);
    }

    public class SlackService : ISlackService
    {
        private readonly HttpClient _httpClient;
        private readonly IIntegrationService _integrationService;
        private readonly NotificationService _notificationService;

        public SlackService(HttpClient httpClient, IIntegrationService integrationService, NotificationService notificationService)
        {
            _httpClient = httpClient;
            _integrationService = integrationService;
            _notificationService = notificationService;
        }

        public async Task<bool> SendNotificationAsync(string message)
        {
            try
            {
                var integrations = await _integrationService.GetIntegrationsAsync();
                var slack = integrations.FirstOrDefault(i => i.Name == "Slack" && i.IsConnected);

                if (slack == null || string.IsNullOrEmpty(slack.ApiKey))
                {
                    // Slack not connected or configured
                    return false;
                }

                // Assuming ApiKey holds the Webhook URL for Slack
                // If it's a real token, we'd use chat.postMessage API.
                // For simplicity, let's assume Webhook URL which is common for simple integrations.
                // However, the field is named "ApiKey". Let's support both or assume Webhook if it starts with https.

                string webhookUrl = slack.ApiKey;
                
                // If it's not a URL, maybe it's a token? But for now let's assume Webhook.
                if (!webhookUrl.StartsWith("https://hooks.slack.com"))
                {
                     // If it's a token, we need a channel ID. That might be in ConfigJson.
                     // Let's keep it simple: "Enter Webhook URL in API Key field".
                     return false;
                }

                var payload = new { text = message };
                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(webhookUrl, content);

                if (response.IsSuccessStatusCode)
                {
                    return true;
                }
                else
                {
                    _notificationService.ShowError($"Failed to send Slack notification: {response.ReasonPhrase}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _notificationService.ShowError($"Slack Error: {ex.Message}");
                return false;
            }
        }
    }
}
