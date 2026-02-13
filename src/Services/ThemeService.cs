using Microsoft.JSInterop;

namespace ThePlanningBord.Services
{
    public interface IThemeService : IDisposable
    {
        Task InitializeAsync();
        Task SetThemeAsync(string theme);
        Task<string> GetThemePreferenceAsync();
        string CurrentTheme { get; }
        event Action<string>? ThemeChanged;
        event Action<bool>? SystemThemeChanged;
    }

    public class ThemeService : IThemeService, IDisposable
    {
        private readonly IJSRuntime _js;
        private DotNetObjectReference<ThemeService>? _dotNetRef;
        private string _currentTheme = "system";

        public string CurrentTheme => _currentTheme;
        public event Action<string>? ThemeChanged;
        public event Action<bool>? SystemThemeChanged;

        public ThemeService(IJSRuntime js)
        {
            _js = js;
        }

        public async Task InitializeAsync()
        {
            _currentTheme = await GetThemePreferenceAsync();
            _dotNetRef = DotNetObjectReference.Create(this);
            await _js.InvokeVoidAsync("appInterop.theme.init", _dotNetRef);
        }

        public async Task SetThemeAsync(string theme)
        {
            _currentTheme = theme;
            await _js.InvokeVoidAsync("appInterop.theme.apply", theme);
            ThemeChanged?.Invoke(theme);
        }

        public async Task<string> GetThemePreferenceAsync()
        {
            try
            {
                return await _js.InvokeAsync<string>("appInterop.theme.getPreference");
            }
            catch
            {
                return "system";
            }
        }

        [JSInvokable]
        public void OnSystemThemeChanged(bool isDark)
        {
            SystemThemeChanged?.Invoke(isDark);
        }

        public void Dispose()
        {
            _dotNetRef?.Dispose();
            _dotNetRef = null;
        }
    }
}
