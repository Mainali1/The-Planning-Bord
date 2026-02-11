using Microsoft.JSInterop;

namespace ThePlanningBord.Services
{
    public interface INetworkService : IDisposable
    {
        Task InitializeAsync();
        Task<bool> IsOnlineAsync();
        event Action<bool>? OnStatusChanged;
    }

    public class NetworkService : INetworkService, IDisposable
    {
        private readonly IJSRuntime _js;
        private DotNetObjectReference<NetworkService>? _dotNetRef;
        private bool _isOnline = true;

        public event Action<bool>? OnStatusChanged;

        public NetworkService(IJSRuntime js)
        {
            _js = js;
        }

        public async Task InitializeAsync()
        {
            _dotNetRef = DotNetObjectReference.Create(this);
            await _js.InvokeVoidAsync("appInterop.network.init", _dotNetRef);
            _isOnline = await _js.InvokeAsync<bool>("appInterop.network.checkConnection");
        }

        public async Task<bool> IsOnlineAsync()
        {
             return await _js.InvokeAsync<bool>("appInterop.network.checkConnection");
        }

        [JSInvokable]
        public void OnConnectionStatusChanged(bool isOnline)
        {
            if (_isOnline != isOnline)
            {
                _isOnline = isOnline;
                OnStatusChanged?.Invoke(isOnline);
            }
        }

        public void Dispose()
        {
            _dotNetRef?.Dispose();
            _dotNetRef = null;
        }
    }
}
