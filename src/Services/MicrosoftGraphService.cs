using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.JSInterop;

namespace ThePlanningBord.Services
{
    public class MicrosoftGraphService
    {
        private readonly HttpClient _httpClient;
        private readonly IJSRuntime _jsRuntime;
        private readonly NotificationService _notificationService;
        private readonly IIntegrationService _integrationService;
        private const string GraphApiUrl = "https://graph.microsoft.com/v1.0";

        public MicrosoftGraphService(HttpClient httpClient, IJSRuntime jsRuntime, NotificationService notificationService, IIntegrationService integrationService)
        {
            _httpClient = httpClient;
            _jsRuntime = jsRuntime;
            _notificationService = notificationService;
            _integrationService = integrationService;
        }

        private async Task<string?> GetAccessTokenAsync()
        {
            try
            {
                var integrations = await _integrationService.GetIntegrationsAsync();
                // We use "Outlook Calendar" as the primary M365/Graph integration for now
                var m365 = integrations.FirstOrDefault(i => i.Name == "Outlook Calendar" && i.IsConnected);
                return m365?.ApiKey;
            }
            catch
            {
                return null;
            }
        }

        public async Task<bool> IsConnected()
        {
            var token = await GetAccessTokenAsync();
            return !string.IsNullOrEmpty(token);
        }

        public async Task<bool> SendRestockEmailAsync(string toAddress, string subject, string content)
        {
            try
            {
                var token = await GetAccessTokenAsync();
                if (string.IsNullOrEmpty(token))
                {
                    // Fallback to mailto if not connected
                    var mailtoLink = $"mailto:{toAddress}?subject={Uri.EscapeDataString(subject)}&body={Uri.EscapeDataString(content)}";
                    await _jsRuntime.InvokeVoidAsync("open", mailtoLink, "_blank");
                    return true;
                }

                var message = new
                {
                    message = new
                    {
                        subject = subject,
                        body = new
                        {
                            contentType = "Text",
                            content = content
                        },
                        toRecipients = new[]
                        {
                            new
                            {
                                emailAddress = new
                                {
                                    address = toAddress
                                }
                            }
                        }
                    },
                    saveToSentItems = "true"
                };

                var request = new HttpRequestMessage(HttpMethod.Post, $"{GraphApiUrl}/me/sendMail");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                request.Content = new StringContent(JsonSerializer.Serialize(message), Encoding.UTF8, "application/json");

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    _notificationService.ShowSuccess("Email sent successfully via M365");
                    return true;
                }
                else
                {
                    _notificationService.ShowError($"Failed to send email: {response.ReasonPhrase}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _notificationService.ShowError($"Graph API Error: {ex.Message}");
                return false;
            }
        }

        public async Task LoginAsync(string token)
        {
            var integrations = await _integrationService.GetIntegrationsAsync();
            var m365 = integrations.FirstOrDefault(i => i.Name == "Outlook Calendar");
            if (m365 != null && m365.Id.HasValue)
            {
                await _integrationService.ConfigureIntegrationAsync(m365.Id.Value, token, null);
                await _integrationService.ToggleIntegrationAsync(m365.Id.Value, true);
                _notificationService.ShowSuccess("Connected to Microsoft 365");
            }
            else
            {
                _notificationService.ShowError("Outlook Calendar integration not found in database");
            }
        }
        
        public async Task LogoutAsync()
        {
            var integrations = await _integrationService.GetIntegrationsAsync();
            var m365 = integrations.FirstOrDefault(i => i.Name == "Outlook Calendar");
            if (m365 != null && m365.Id.HasValue)
            {
                await _integrationService.ConfigureIntegrationAsync(m365.Id.Value, null, null);
                await _integrationService.ToggleIntegrationAsync(m365.Id.Value, false);
                 _notificationService.ShowSuccess("Disconnected from Microsoft 365");
            }
        }
    }
}
