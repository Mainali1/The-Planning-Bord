using Microsoft.JSInterop;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface ISystemService
    {
        // Setup
        Task<bool> GetSetupStatusAsync();
        Task<string?> GetCompanyNameAsync();
        Task<bool> CheckUsernameExistsAsync(string username);
        Task CompleteSetupAsync(string companyName, string adminName, string adminEmail, string adminPassword, string adminUsername);
        Task<string> GreetAsync(string name);
        Task SaveDbConfigAsync(DbConfig config);
        Task<string> EnsureLocalDbAsync(string? connectionString = null);
        Task<bool> VerifyConnectionAsync(string connectionString);
        Task CleanupLocalDbAsync();
        Task<bool> CheckEmbeddedPostgresAsync();
        Task<bool> CheckPostgresInstalledAsync();
        Task ExitAppAsync();
        
        // RBAC
        Task<List<Role>> GetRolesAsync();
        Task<long> AddRoleAsync(string name, string? description);
        Task<List<Permission>> GetPermissionsAsync();
        Task<List<int>> GetRolePermissionsAsync(int roleId);
        Task UpdateRolePermissionsAsync(int roleId, List<int> permissionIds);
        
        // Feature Toggles
        Task<List<FeatureToggle>> GetFeatureTogglesAsync();
        Task SetFeatureToggleAsync(string key, bool isEnabled);

        // Audit Logs
        Task<List<AuditLog>> GetAuditLogsAsync(int page = 1, int pageSize = 50);

        // Dashboard Configs
        Task<List<DashboardConfig>> GetDashboardConfigsAsync(int userId);
        Task<long> SaveDashboardConfigAsync(DashboardConfig config);
        
        // Demo Data
        Task SeedDemoDataAsync();
    }

    public class SystemService : ISystemService
    {
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public SystemService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<string> GreetAsync(string name)
        {
            return await _tauri.InvokeAsync<string>("greet", new { name });
        }

        public async Task<bool> GetSetupStatusAsync()
        {
            return await _tauri.InvokeAsync<bool>("get_setup_status", new { });
        }

        public async Task<string?> GetCompanyNameAsync()
        {
            try
            {
                return await _tauri.InvokeAsync<string?>("get_company_name", new { });
            }
            catch
            {
                return null;
            }
        }

        public async Task<bool> CheckUsernameExistsAsync(string username)
        {
            return await _tauri.InvokeAsync<bool>("check_username", new { username });
        }

        public async Task CompleteSetupAsync(string companyName, string adminName, string adminEmail, string adminPassword, string adminUsername)
        {
            await _tauri.InvokeVoidAsync("complete_setup", new { companyName, adminName, adminEmail, adminPassword, adminUsername });
        }

        public async Task SaveDbConfigAsync(DbConfig config)
        {
            await _tauri.InvokeVoidAsync("save_db_config", new { config });
        }
        
        public async Task<string> EnsureLocalDbAsync(string? connectionString = null)
        {
            return await _tauri.InvokeAsync<string>("ensure_local_db", new { connectionString });
        }

        public async Task<bool> VerifyConnectionAsync(string connectionString)
        {
            try
            {
                return await _tauri.InvokeAsync<bool>("verify_connection", new { connectionString });
            }
            catch
            {
                return false;
            }
        }
        
        public async Task CleanupLocalDbAsync()
        {
            await _tauri.InvokeVoidAsync("cleanup_local_db", new { });
        }
        
        public async Task<bool> CheckEmbeddedPostgresAsync()
        {
            return await _tauri.InvokeAsync<bool>("check_embedded_pg_available", new { });
        }
        
        public async Task<bool> CheckPostgresInstalledAsync()
        {
            return await _tauri.InvokeAsync<bool>("check_postgres_installed", new { });
        }
        
        public async Task ExitAppAsync()
        {
            await _tauri.InvokeVoidAsync("exit_app", new { });
        }

        public async Task<List<Role>> GetRolesAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<Role>>("get_roles", new { token });
        }

        public async Task<long> AddRoleAsync(string name, string? description)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_role", new { name, description, token });
        }

        public async Task<List<Permission>> GetPermissionsAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<Permission>>("get_permissions", new { token });
        }

        public async Task<List<int>> GetRolePermissionsAsync(int roleId)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<int>>("get_role_permissions", new { roleId, token });
        }

        public async Task UpdateRolePermissionsAsync(int roleId, List<int> permissionIds)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_role_permissions", new { roleId, permissionIds, token });
        }

        public async Task<List<FeatureToggle>> GetFeatureTogglesAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<FeatureToggle>>("get_feature_toggles", new { token });
        }

        public async Task SetFeatureToggleAsync(string key, bool isEnabled)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("set_feature_toggle", new { key, isEnabled, token });
        }

        public async Task<List<AuditLog>> GetAuditLogsAsync(int page = 1, int pageSize = 50)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<AuditLog>>("get_audit_logs", new { page, pageSize, token });
        }

        public async Task<List<DashboardConfig>> GetDashboardConfigsAsync(int userId)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<DashboardConfig>>("get_dashboard_configs", new { userId, token });
        }

        public async Task<long> SaveDashboardConfigAsync(DashboardConfig config)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("save_dashboard_config", new { config, token });
        }

        public async Task SeedDemoDataAsync()
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("seed_demo_data", new { token });
        }
    }
}
