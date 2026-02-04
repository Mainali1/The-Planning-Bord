using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface IClientService
    {
        Task<List<Client>> GetClientsAsync();
        Task<long> AddClientAsync(Client client);
        Task UpdateClientAsync(Client client);
        Task DeleteClientAsync(int id);
    }

    public class ClientService : IClientService
    {
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public ClientService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<List<Client>> GetClientsAsync()
        {
            try
            {
                var token = await _userService.GetTokenAsync();
                return await _tauri.InvokeAsync<List<Client>>("get_clients", new { token });
            }
            catch
            {
                return new List<Client>();
            }
        }

        public async Task<long> AddClientAsync(Client client)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_client", new { client, token });
        }

        public async Task UpdateClientAsync(Client client)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_client", new { client, token });
        }

        public async Task DeleteClientAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_client", new { id, token });
        }
    }
}
