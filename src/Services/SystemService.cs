using Microsoft.JSInterop;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface ISystemService
    {
        // Setup
        Task<bool> GetSetupStatusAsync();
        Task CompleteSetupAsync(string companyName);
        Task<string> GreetAsync(string name);
        
        // RBAC
        Task<List<Role>> GetRolesAsync();
        Task<long> AddRoleAsync(string name, string? description);
        Task<List<Permission>> GetPermissionsAsync();
        Task<List<int>> GetRolePermissionsAsync(int roleId);
        Task UpdateRolePermissionsAsync(int roleId, List<int> permissionIds);
        
        // Feature Toggles
        Task<List<FeatureToggle>> GetFeatureTogglesAsync();
        Task SetFeatureToggleAsync(string key, bool isEnabled);
    }

    public class SystemService : ISystemService
    {
        private readonly TauriInterop _tauri;

        public SystemService(TauriInterop tauri)
        {
            _tauri = tauri;
        }

        public async Task<string> GreetAsync(string name)
        {
            return await _tauri.InvokeAsync<string>("greet", new { name });
        }

        public async Task<bool> GetSetupStatusAsync()
        {
            return await _tauri.InvokeAsync<bool>("get_setup_status", new { });
        }

        public async Task CompleteSetupAsync(string companyName)
        {
            await _tauri.InvokeVoidAsync("complete_setup", new { companyName });
        }

        public async Task<List<Role>> GetRolesAsync()
        {
            return await _tauri.InvokeAsync<List<Role>>("get_roles", new { });
        }

        public async Task<long> AddRoleAsync(string name, string? description)
        {
            return await _tauri.InvokeAsync<long>("add_role", new { name, description });
        }

        public async Task<List<Permission>> GetPermissionsAsync()
        {
            return await _tauri.InvokeAsync<List<Permission>>("get_permissions", new { });
        }

        public async Task<List<int>> GetRolePermissionsAsync(int roleId)
        {
            return await _tauri.InvokeAsync<List<int>>("get_role_permissions", new { roleId });
        }

        public async Task UpdateRolePermissionsAsync(int roleId, List<int> permissionIds)
        {
            await _tauri.InvokeVoidAsync("update_role_permissions", new { roleId, permissionIds });
        }

        public async Task<List<FeatureToggle>> GetFeatureTogglesAsync()
        {
            return await _tauri.InvokeAsync<List<FeatureToggle>>("get_feature_toggles", new { });
        }

        public async Task SetFeatureToggleAsync(string key, bool isEnabled)
        {
            await _tauri.InvokeVoidAsync("set_feature_toggle", new { key, isEnabled });
        }
    }
}
