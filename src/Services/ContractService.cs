using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface IContractService
    {
        Task<List<ServiceContract>> GetServiceContractsAsync(int? clientId = null);
        Task<long> AddServiceContractAsync(ServiceContract contract);
        Task UpdateServiceContractAsync(ServiceContract contract);
        Task DeleteServiceContractAsync(int id);
    }

    public class ContractService : IContractService
    {
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public ContractService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<List<ServiceContract>> GetServiceContractsAsync(int? clientId = null)
        {
            try
            {
                var token = await _userService.GetTokenAsync();
                return await _tauri.InvokeAsync<List<ServiceContract>>("get_service_contracts", new { clientId, token });
            }
            catch
            {
                return new List<ServiceContract>();
            }
        }

        public async Task<long> AddServiceContractAsync(ServiceContract contract)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_service_contract", new { contract, token });
        }

        public async Task UpdateServiceContractAsync(ServiceContract contract)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_service_contract", new { contract, token });
        }

        public async Task DeleteServiceContractAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_service_contract", new { id, token });
        }
    }
}
