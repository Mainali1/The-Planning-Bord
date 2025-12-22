using Microsoft.JSInterop;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface IInventoryService
    {
        Task<PagedResult<Product>> GetProductsAsync(string? search = null, int page = 1, int pageSize = 50);
        Task<long> AddProductAsync(Product product);
        Task UpdateProductAsync(Product product);
        Task DeleteProductAsync(int id);
        
        // Tools
        Task<List<Tool>> GetToolsAsync();
        Task<long> AddToolAsync(Tool tool);
        Task UpdateToolAsync(Tool tool);
        Task DeleteToolAsync(int id);
        
        // Tool Assignments
        Task AssignToolAsync(int toolId, int employeeId, string condition, string? notes);
        Task ReturnToolAsync(int toolId, string condition, string? notes);
        Task<List<ToolAssignment>> GetToolHistoryAsync(int toolId);
    }

    public class InventoryService : IInventoryService
    {
        private readonly TauriInterop _tauri;

        public InventoryService(TauriInterop tauri)
        {
            _tauri = tauri;
        }

        public async Task<PagedResult<Product>> GetProductsAsync(string? search = null, int page = 1, int pageSize = 50)
        {
            return await _tauri.InvokeAsync<PagedResult<Product>>("get_products", new { search, page, pageSize });
        }

        public async Task<long> AddProductAsync(Product product)
        {
            return await _tauri.InvokeAsync<long>("add_product", new { product });
        }

        public async Task UpdateProductAsync(Product product)
        {
            await _tauri.InvokeVoidAsync("update_product", new { product });
        }

        public async Task DeleteProductAsync(int id)
        {
            await _tauri.InvokeVoidAsync("delete_product", new { id });
        }

        public async Task<List<Tool>> GetToolsAsync()
        {
            return await _tauri.InvokeAsync<List<Tool>>("get_tools", new { });
        }

        public async Task<long> AddToolAsync(Tool tool)
        {
            return await _tauri.InvokeAsync<long>("add_tool", new { tool });
        }

        public async Task UpdateToolAsync(Tool tool)
        {
            await _tauri.InvokeVoidAsync("update_tool", new { tool });
        }

        public async Task DeleteToolAsync(int id)
        {
            await _tauri.InvokeVoidAsync("delete_tool", new { id });
        }

        public async Task AssignToolAsync(int toolId, int employeeId, string condition, string? notes)
        {
            await _tauri.InvokeVoidAsync("assign_tool", new { toolId, employeeId, condition, notes });
        }

        public async Task ReturnToolAsync(int toolId, string condition, string? notes)
        {
            await _tauri.InvokeVoidAsync("return_tool", new { toolId, condition, notes });
        }

        public async Task<List<ToolAssignment>> GetToolHistoryAsync(int toolId)
        {
            return await _tauri.InvokeAsync<List<ToolAssignment>>("get_tool_history", new { toolId });
        }
    }
}
