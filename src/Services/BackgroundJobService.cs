using System.Timers;
using Microsoft.JSInterop;

namespace ThePlanningBord.Services
{
    public class BackgroundJobService : IDisposable
    {
        private readonly ITauriService _tauriService;
        private readonly IJSRuntime _jsRuntime;
        private System.Timers.Timer? _timer;
        private bool _isRunning;

        public BackgroundJobService(ITauriService tauriService, IJSRuntime jsRuntime)
        {
            _tauriService = tauriService;
            _jsRuntime = jsRuntime;
        }

        public void Start()
        {
            if (_isRunning) return;

            _timer = new System.Timers.Timer(60000); // Check every 1 minute
            _timer.Elapsed += async (sender, e) => await CheckInventory();
            _timer.AutoReset = true;
            _timer.Enabled = true;
            _isRunning = true;
        }

        private async Task CheckInventory()
        {
            try
            {
                var notificationsEnabledStr = await _jsRuntime.InvokeAsync<string>("getSetting", "notifications_enabled");
                if (!bool.TryParse(notificationsEnabledStr, out bool notificationsEnabled) || !notificationsEnabled)
                {
                    return;
                }

                var products = await _tauriService.GetProductsAsync();
                var lowStock = products.Where(p => p.CurrentQuantity <= p.MinimumQuantity).ToList();

                if (lowStock.Any())
                {
                    var message = $"Warning: {lowStock.Count} items are low on stock!";
                    await _jsRuntime.InvokeVoidAsync("notify", message);
                    
                    // Future: Trigger M365 Email if enabled
                    var emailEnabledStr = await _jsRuntime.InvokeAsync<string>("getSetting", "email_alerts_enabled");
                    if (bool.TryParse(emailEnabledStr, out bool emailEnabled) && emailEnabled)
                    {
                        // TODO: Call Graph API to send email
                        Console.WriteLine("Would send email here...");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Background job error: {ex.Message}");
            }
        }

        public void Dispose()
        {
            _timer?.Stop();
            _timer?.Dispose();
        }
    }
}
