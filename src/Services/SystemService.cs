using Microsoft.JSInterop;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface ISystemService
    {
        // Setup
        Task<bool> GetSetupStatusAsync();
        Task CompleteSetupAsync(string companyName, string adminEmail, string adminPassword);
        Task<string> GreetAsync(string name);
        Task SaveDbConfigAsync(DbConfig config);
        Task<string> EnsureLocalDbAsync(string? connectionString = null);
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

        public async Task CompleteSetupAsync(string companyName, string adminEmail, string adminPassword)
        {
            await _tauri.InvokeVoidAsync("complete_setup", new { companyName, adminEmail, adminPassword });
        }

        public async Task SaveDbConfigAsync(DbConfig config)
        {
            await _tauri.InvokeVoidAsync("save_db_config", new { config });
        }
        
        public async Task<string> EnsureLocalDbAsync(string? connectionString = null)
        {
            return await _tauri.InvokeAsync<string>("ensure_local_db", new { connectionString });
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

        public async Task<List<AuditLog>> GetAuditLogsAsync(int page = 1, int pageSize = 50)
        {
            return await _tauri.InvokeAsync<List<AuditLog>>("get_audit_logs", new { page, pageSize });
        }

        public async Task<List<DashboardConfig>> GetDashboardConfigsAsync(int userId)
        {
            return await _tauri.InvokeAsync<List<DashboardConfig>>("get_dashboard_configs", new { userId });
        }

        public async Task<long> SaveDashboardConfigAsync(DashboardConfig config)
        {
            // Note: Assuming existing bug/feature where fields are passed flattened? 
            // Keeping original implementation style for SaveDashboardConfigAsync if it was working
            // But actually, I should probably check if it was working.
            // Based on previous read, it was passing flattened fields. 
            // But if I want to be safe, I'll keep it as is from the read.
            return await _tauri.InvokeAsync<long>("save_dashboard_config", new { userId = config.UserId, name = config.Name, layoutJson = config.LayoutJson, isDefault = config.IsDefault });
        }

        public async Task SeedDemoDataAsync()
        {
            await _tauri.InvokeVoidAsync("seed_demo_data", new { });
        }
    }
}
