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
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public InventoryService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<PagedResult<Product>> GetProductsAsync(string? search = null, int page = 1, int pageSize = 50)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<PagedResult<Product>>("get_products", new { search, page, pageSize, token });
        }

        public async Task<long> AddProductAsync(Product product)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_product", new { product, token });
        }

        public async Task UpdateProductAsync(Product product)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_product", new { product, token });
        }

        public async Task DeleteProductAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_product", new { id, token });
        }

        public async Task<List<Tool>> GetToolsAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<Tool>>("get_tools", new { token });
        }

        public async Task<long> AddToolAsync(Tool tool)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_tool", new { tool, token });
        }

        public async Task UpdateToolAsync(Tool tool)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_tool", new { tool, token });
        }

        public async Task DeleteToolAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_tool", new { id, token });
        }

        public async Task AssignToolAsync(int toolId, int employeeId, string condition, string? notes)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("assign_tool", new { toolId, employeeId, condition, notes, token });
        }

        public async Task ReturnToolAsync(int toolId, string condition, string? notes)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("return_tool", new { toolId, condition, notes, token });
        }

        public async Task<List<ToolAssignment>> GetToolHistoryAsync(int toolId)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<ToolAssignment>>("get_tool_history", new { toolId, token });
        }
    }
}
