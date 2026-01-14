using Microsoft.JSInterop;
using System.Text.Json;
using System.Text.Json.Serialization;
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

        // Supply Chain (BOM, Batches, Velocity)
        Task<(BomHeader? Header, List<BomLine> Lines)> GetProductBomAsync(int productId);
        Task SaveBomAsync(BomHeader header, List<BomLine> lines);
        Task<List<InventoryBatch>> GetBatchesAsync(int productId);
        Task<long> AddBatchAsync(InventoryBatch batch);
        Task UpdateBatchAsync(InventoryBatch batch);
        Task<List<VelocityReport>> GetVelocityReportAsync();

        // Suppliers
        Task<List<Supplier>> GetSuppliersAsync();
        Task<long> AddSupplierAsync(Supplier supplier);
        Task UpdateSupplierAsync(Supplier supplier);
        Task DeleteSupplierAsync(int id);

        // Supplier Orders
        Task<List<SupplierOrder>> GetSupplierOrdersAsync(int? supplierId = null);
        Task<long> AddSupplierOrderAsync(SupplierOrder order);
        Task UpdateSupplierOrderAsync(SupplierOrder order);
        Task DeleteSupplierOrderAsync(int id);
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

        public async Task<(BomHeader? Header, List<BomLine> Lines)> GetProductBomAsync(int productId)
        {
            var token = await _userService.GetTokenAsync();
            // Backend returns (Option<BomHeader>, Vec<BomLine>).
            // Tauri/Serde usually serializes Rust tuples as JSON arrays: [header, lines]
            // BUT for named fields or complex objects, sometimes it's better to verify.
            // However, invoking and expecting a Tuple in C# from a JSON array works if configured, 
            // but often it's safer to map to a specific DTO if the tuple is complex.
            // Let's assume the standard behavior: JSON array [header, lines].
            // NOTE: C# System.Text.Json might not deserialize a JSON array directly into a ValueTuple easily without custom converters.
            // A safer bet is to use a specific DTO or JArray parsing if we were using Newtonsoft.
            // Since we use System.Text.Json (likely), let's try to map it to a temporary class or JElement if needed.
            // Actually, let's look at `TauriInterop`. It uses `JsonSerializer`.
            // Tuple deserialization from [A, B] is supported in newer .NET versions if it matches.
            
            // To be safe and robust, I'll return a helper struct from Rust side or use a generic object here.
            // Wait, I updated `models.rs` to have `BomData` struct just in case! 
            // BUT `get_product_bom` in `lib.rs` returns `(Option<BomHeader>, Vec<BomLine>)`.
            // I should probably change `lib.rs` to return `BomData` to make C# life easier.
            // For now, I'll update this method to match what I'm about to change in `lib.rs`.
            
            // Re-reading my previous thought: I did NOT change `lib.rs` to return `BomData` yet.
            // I added `BomData` struct to `models.rs` but didn't use it in `lib.rs`.
            // I SHOULD use it in `lib.rs`.
            
            // Let's implement this as if `lib.rs` returns `BomData`. I will update `lib.rs` next.
            var data = await _tauri.InvokeAsync<BomData>("get_product_bom", new { productId, token });
            return (data.Header, data.Lines);
        }

        public async Task SaveBomAsync(BomHeader header, List<BomLine> lines)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("save_bom", new { header, lines, token });
        }

        public async Task<List<InventoryBatch>> GetBatchesAsync(int productId)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<InventoryBatch>>("get_batches", new { productId, token });
        }

        public async Task<long> AddBatchAsync(InventoryBatch batch)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_batch", new { batch, token });
        }

        public async Task UpdateBatchAsync(InventoryBatch batch)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_batch", new { batch, token });
        }

        public async Task<List<VelocityReport>> GetVelocityReportAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<VelocityReport>>("get_velocity_report", new { token });
        }

        // Suppliers
        public async Task<List<Supplier>> GetSuppliersAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<Supplier>>("get_suppliers", new { token });
        }

        public async Task<long> AddSupplierAsync(Supplier supplier)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_supplier", new { supplier, token });
        }

        public async Task UpdateSupplierAsync(Supplier supplier)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_supplier", new { supplier, token });
        }

        public async Task DeleteSupplierAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_supplier", new { id, token });
        }

        // Supplier Orders
        public async Task<List<SupplierOrder>> GetSupplierOrdersAsync(int? supplierId = null)
        {
            var token = await _userService.GetTokenAsync();
            var orders = await _tauri.InvokeAsync<List<SupplierOrder>>("get_supplier_orders", new { token });
            
            if (supplierId.HasValue)
            {
                return orders.Where(o => o.SupplierId == supplierId.Value).ToList();
            }
            
            return orders;
        }

        public async Task<long> AddSupplierOrderAsync(SupplierOrder order)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_supplier_order", new { order, token });
        }

        public async Task UpdateSupplierOrderAsync(SupplierOrder order)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_supplier_order", new { order, token });
        }

        public async Task DeleteSupplierOrderAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_supplier_order", new { id, token });
        }
    }

    public class BomData 
    {
        [JsonPropertyName("header")]
        public BomHeader? Header { get; set; }
        [JsonPropertyName("lines")]
        public List<BomLine> Lines { get; set; } = new();
    }
}
