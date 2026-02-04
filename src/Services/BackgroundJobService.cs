using System.Timers;
using Microsoft.JSInterop;

namespace ThePlanningBord.Services
{
    public class BackgroundJobService : IDisposable
    {
        private readonly IInventoryService _inventoryService;
        private readonly IJSRuntime _jsRuntime;
        private readonly MicrosoftGraphService _graphService;
        private System.Timers.Timer? _timer;
        private bool _isRunning;

        public BackgroundJobService(IInventoryService inventoryService, IJSRuntime jsRuntime, MicrosoftGraphService graphService)
        {
            _inventoryService = inventoryService;
            _jsRuntime = jsRuntime;
            _graphService = graphService;
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

                // Fetch all products for check (using a large page size for now)
                var result = await _inventoryService.GetProductsAsync(null, 1, 1000);
                var products = result.Items;
                var lowStock = products.Where(p => p.CurrentQuantity <= p.MinimumQuantity).ToList();

                if (lowStock.Any())
                {
                    var message = $"Warning: {lowStock.Count} items are low on stock!";
                    await _jsRuntime.InvokeVoidAsync("notify", message);
                    
                    // Future: Trigger M365 Email if enabled
                    var emailEnabledStr = await _jsRuntime.InvokeAsync<string>("getSetting", "email_alerts_enabled");
                    if (bool.TryParse(emailEnabledStr, out bool emailEnabled) && emailEnabled)
                    {
                        var adminEmail = await _jsRuntime.InvokeAsync<string>("getSetting", "admin_email");
                        if (!string.IsNullOrEmpty(adminEmail))
                        {
                            var sb = new System.Text.StringBuilder();
                            sb.AppendLine("The following items are low on stock:");
                            foreach (var item in lowStock)
                            {
                                sb.AppendLine($"- {item.Name} (SKU: {item.Sku}): {item.CurrentQuantity} / {item.MinimumQuantity}");
                            }
                            
                            await _graphService.SendRestockEmailAsync(adminEmail, "Low Stock Alert", sb.ToString());
                        }
                    }
                }
            }
            catch
            {
                // Background job errors should not crash the app, but maybe notify admin?
                // For now, suppress or log to notification if critical
                // _notificationService.ShowError($"Background job error: {ex.Message}");
            }
        }

        public void Dispose()
        {
            _timer?.Stop();
            _timer?.Dispose();
        }
    }
}
