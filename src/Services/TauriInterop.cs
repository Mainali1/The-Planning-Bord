using Microsoft.JSInterop;
using System.Text.Json;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.Extensions.DependencyInjection;

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
        private readonly IServiceProvider _serviceProvider;
        
        public bool IsConnected { get; private set; } = true;

        public TauriInterop(IJSRuntime jsRuntime, NotificationService notificationService, IServiceProvider serviceProvider)
        {
            _jsRuntime = jsRuntime;
            _notificationService = notificationService;
            _serviceProvider = serviceProvider;
        }

        public async Task<bool> CheckHealthAsync()
        {
            try
            {
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

        private async Task HandleErrorAsync(string command, string msg)
        {
            IsConnected = false;
            
            if (await ShouldShowBackendErrorAsync())
            {
                _notificationService.ShowError($"System Error ({command}): {msg}");
            }
        }

        private async Task<bool> ShouldShowBackendErrorAsync()
        {
            try
            {
                var authStateProvider = _serviceProvider.GetRequiredService<AuthenticationStateProvider>();
                var authState = await authStateProvider.GetAuthenticationStateAsync();
                var user = authState.User;

                return user.Identity?.IsAuthenticated == true && 
                       (user.HasClaim(c => c.Type == "Permission" && c.Value == "VIEW_BACKEND_ERRORS") || 
                        user.IsInRole("Technical") || 
                        user.IsInRole("CEO"));
            }
            catch
            {
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

                    if (i == maxRetries - 1)
                    {
                        await HandleErrorAsync(command, msg);
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

                    if (i == maxRetries - 1)
                    {
                        await HandleErrorAsync(command, msg);
                        
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
