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
        private const string GraphApiUrl = "https://graph.microsoft.com/v1.0";

        public MicrosoftGraphService(HttpClient httpClient, IJSRuntime jsRuntime)
        {
            _httpClient = httpClient;
            _jsRuntime = jsRuntime;
        }

        public async Task<bool> IsConnected()
        {
            var token = await _jsRuntime.InvokeAsync<string>("getSetting", "m365_token");
            return !string.IsNullOrEmpty(token);
        }

        public async Task<bool> SendRestockEmailAsync(string toAddress, string subject, string content)
        {
            try
            {
                var token = await _jsRuntime.InvokeAsync<string>("getSetting", "m365_token");
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
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Graph API Error: {ex.Message}");
                return false;
            }
        }

        // Simulates a login flow - in production this would use MSAL.js or a popup
        public async Task LoginAsync(string clientId)
        {
            // For this standalone demo, we might prompt the user to paste a token or 
            // initiate a device flow. Here we just mock it or set a dummy token for testing.
            await _jsRuntime.InvokeVoidAsync("setSetting", "m365_token", "demo_token_xyz");
        }
        
        public async Task LogoutAsync()
        {
            await _jsRuntime.InvokeVoidAsync("setSetting", "m365_token", "");
        }
    }
}
