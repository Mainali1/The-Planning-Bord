using Microsoft.JSInterop;
using System.Text.Json;

namespace ThePlanningBord.Services
{
    public interface ITauriInterop
    {
        bool IsConnected { get; }
        Task<bool> CheckHealthAsync();
        Task<T> InvokeAsync<T>(string command, object? args = null);
        Task InvokeVoidAsync(string command, object? args = null);
    }

    public class TauriInterop : ITauriInterop
    {
        private readonly IJSRuntime _jsRuntime;
        private readonly NotificationService _notificationService;
        
        public bool IsConnected { get; private set; } = true;

        public TauriInterop(IJSRuntime jsRuntime, NotificationService notificationService)
        {
            _jsRuntime = jsRuntime;
            _notificationService = notificationService;
        }

        public async Task<bool> CheckHealthAsync()
        {
            try
            {
                // We use a separate direct call to avoid infinite recursion if we used InvokeAsync (which could check health)
                // But here InvokeAsync is fine as it doesn't call CheckHealthAsync automatically yet.
                // However, to be safe and simple, let's just use InvokeAsync but catch errors silently here.
                var response = await InvokeAsync<string>("ping");
                IsConnected = response == "pong";
                return IsConnected;
            }
            catch
            {
                IsConnected = false;
                return false;
            }
        }

        public async Task<T> InvokeAsync<T>(string command, object? args = null)
        {
            int maxRetries = 3;
            int delay = 500;

            for (int i = 0; i < maxRetries; i++)
            {
                try
                {
                    T result;
                    if (args == null)
                    {
                        result = await _jsRuntime.InvokeAsync<T>($"__TAURI__.core.invoke", command);
                    }
                    else
                    {
                        result = await _jsRuntime.InvokeAsync<T>($"__TAURI__.core.invoke", command, args);
                    }
                    
                    if (!IsConnected)
                    {
                        IsConnected = true;
                        Console.WriteLine("[TauriInterop] Connection restored.");
                    }
                    return result;
                }
                catch (Exception ex)
                {
                    string msg = ex.Message;
                    // Check for non-retryable errors (Validation)
                    if (msg.Contains("Invalid") || msg.Contains("taken") || msg.Contains("used") || msg.Contains("not found") || msg.Contains("Incorrect"))
                    {
                         throw new TauriValidationException(msg, ex);
                    }

                    Console.WriteLine($"[TauriInterop] Command '{command}' failed (Attempt {i + 1}/{maxRetries}): {msg}");
                    
                    if (i == maxRetries - 1)
                    {
                        IsConnected = false;
                        _notificationService.ShowError($"System Error ({command}): {msg}");
                        throw;
                    }

                    await Task.Delay(delay);
                    delay *= 2; // Exponential backoff
                }
            }

            return default!;
        }

        public async Task InvokeVoidAsync(string command, object? args = null)
        {
            int maxRetries = 3;
            int delay = 500;

            for (int i = 0; i < maxRetries; i++)
            {
                try
                {
                    if (args == null)
                    {
                        await _jsRuntime.InvokeVoidAsync($"__TAURI__.core.invoke", command);
                    }
                    else
                    {
                        await _jsRuntime.InvokeVoidAsync($"__TAURI__.core.invoke", command, args);
                    }

                    if (!IsConnected)
                    {
                        IsConnected = true;
                        Console.WriteLine("[TauriInterop] Connection restored.");
                    }
                    return;
                }
                catch (Exception ex)
                {
                    string msg = ex.Message;
                    // Check for non-retryable errors (Validation)
                    if (msg.Contains("Invalid") || msg.Contains("taken") || msg.Contains("used") || msg.Contains("not found") || msg.Contains("Incorrect"))
                    {
                         throw new TauriValidationException(msg, ex);
                    }

                    Console.WriteLine($"[TauriInterop] Command '{command}' failed (Attempt {i + 1}/{maxRetries}): {msg}");

                    if (i == maxRetries - 1)
                    {
                        IsConnected = false;
                        _notificationService.ShowError($"System Error ({command}): {msg}");
                        
                         if (msg.Contains("Connection") || msg.Contains("timeout") || msg.Contains("Network"))
                             throw new TauriNetworkException(msg, ex);

                        throw new TauriException($"Command {command} failed: {msg}", ex);
                    }

                    await Task.Delay(delay);
                    delay *= 2;
                }
            }
        }
    }
}
