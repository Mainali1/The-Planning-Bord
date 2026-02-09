using Microsoft.JSInterop;

namespace ThePlanningBord.Services
{
    public interface IThemeService
    {
        Task InitializeAsync();
        Task SetThemeAsync(string theme);
        Task<string> GetThemePreferenceAsync();
        event Action<bool>? SystemThemeChanged;
    }

    public class ThemeService : IThemeService
    {
        private readonly IJSRuntime _js;
        private DotNetObjectReference<ThemeService>? _dotNetRef;

        public event Action<bool>? SystemThemeChanged;

        public ThemeService(IJSRuntime js)
        {
            _js = js;
        }

        public async Task InitializeAsync()
        {
            _dotNetRef = DotNetObjectReference.Create(this);
            await _js.InvokeVoidAsync("appInterop.theme.init", _dotNetRef);
        }

        public async Task SetThemeAsync(string theme)
        {
            await _js.InvokeVoidAsync("appInterop.theme.apply", theme);
        }

        public async Task<string> GetThemePreferenceAsync()
        {
            return await _js.InvokeAsync<string>("appInterop.theme.getPreference");
        }

        [JSInvokable]
        public void OnSystemThemeChanged(bool isDark)
        {
            SystemThemeChanged?.Invoke(isDark);
        }
    }
}
