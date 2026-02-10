using System.Text.Json;
using Microsoft.JSInterop;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public class SmtpEmailService
    {
        private readonly ITauriInterop _tauriInterop;
        private readonly IJSRuntime _jsRuntime;
        private readonly NotificationService _notificationService;

        public SmtpEmailService(ITauriInterop tauriInterop, IJSRuntime jsRuntime, NotificationService notificationService)
        {
            _tauriInterop = tauriInterop;
            _jsRuntime = jsRuntime;
            _notificationService = notificationService;
        }

        public async Task<SmtpConfig?> GetConfigAsync()
        {
            try
            {
                var json = await _jsRuntime.InvokeAsync<string>("getSetting", "smtp_config");
                if (string.IsNullOrEmpty(json)) return null;
                return JsonSerializer.Deserialize<SmtpConfig>(json);
            }
            catch
            {
                return null;
            }
        }

        public async Task SaveConfigAsync(SmtpConfig config)
        {
            var json = JsonSerializer.Serialize(config);
            await _jsRuntime.InvokeVoidAsync("saveSetting", "smtp_config", json);
        }

        public async Task<bool> SendEmailAsync(string to, string subject, string body)
        {
            try
            {
                var config = await GetConfigAsync();
                if (config == null || string.IsNullOrEmpty(config.Host) || string.IsNullOrEmpty(config.FromEmail))
                {
                    _notificationService.ShowError("SMTP Configuration missing. Please configure in Settings.");
                    return false;
                }

                var request = new EmailRequest
                {
                    To = to,
                    Subject = subject,
                    Body = body,
                    Config = config
                };

                // Invoke Tauri command
                // Command: send_email(request: EmailRequest)
                // In Tauri 2.0 / InvokeAsync, we pass object directly as 'args'
                // The args object must have properties matching the command arguments names.
                // Command arg name is 'request'.
                
                var args = new { request = request };
                
                await _tauriInterop.InvokeAsync<string>("send_email", args);
                
                _notificationService.ShowSuccess($"Email sent to {to}");
                return true;
            }
            catch (Exception ex)
            {
                _notificationService.ShowError($"Failed to send email: {ex.Message}");
                return false;
            }
        }
    }
}
