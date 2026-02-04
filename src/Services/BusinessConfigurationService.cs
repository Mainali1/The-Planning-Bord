using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface IBusinessConfigurationService
    {
        Task<BusinessConfiguration?> GetBusinessConfigurationAsync();
        Task<long> SaveBusinessConfigurationAsync(BusinessConfiguration config);
        Task<List<Service>> GetServicesAsync();
        Task<long> AddServiceAsync(Service service);
        Task UpdateServiceAsync(Service service);
        Task DeleteServiceAsync(int id);
    }

    public class BusinessConfigurationService : IBusinessConfigurationService
    {
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public BusinessConfigurationService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<BusinessConfiguration?> GetBusinessConfigurationAsync()
        {
            try
            {
                var token = await _userService.GetTokenAsync();
                return await _tauri.InvokeAsync<BusinessConfiguration?>("get_business_configuration", new { token });
            }
            catch
            {
                return null;
            }
        }

        public async Task<long> SaveBusinessConfigurationAsync(BusinessConfiguration config)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("save_business_configuration", new { config, token });
        }

        public async Task<List<Service>> GetServicesAsync()
        {
            try
            {
                var token = await _userService.GetTokenAsync();
                return await _tauri.InvokeAsync<List<Service>>("get_services", new { token });
            }
            catch
            {
                return new List<Service>();
            }
        }

        public async Task<long> AddServiceAsync(Service service)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_service", new { service, token });
        }

        public async Task UpdateServiceAsync(Service service)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_service", new { service, token });
        }

        public async Task DeleteServiceAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_service", new { id, token });
        }
    }
}
