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
        Task<long> RecordSaleAsync(Sale sale);
        
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
            Console.WriteLine($"InventoryService.GetProductsAsync: Fetching products with search '{search}' (page {page}, {pageSize} per page)");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<PagedResult<Product>>("get_products", new { search, page, pageSize, token });
                Console.WriteLine($"InventoryService.GetProductsAsync: Successfully fetched {result.Total} products");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.GetProductsAsync: Error fetching products - {ex.Message}");
                throw;
            }
        }

        public async Task<long> AddProductAsync(Product product)
        {
            Console.WriteLine($"InventoryService.AddProductAsync: Adding product '{product.Name}' with SKU '{product.Sku}'");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<long>("add_product", new { product, token });
                Console.WriteLine($"InventoryService.AddProductAsync: Successfully added product with ID {result}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.AddProductAsync: Error adding product - {ex.Message}");
                throw;
            }
        }

        public async Task UpdateProductAsync(Product product)
        {
            Console.WriteLine($"InventoryService.UpdateProductAsync: Updating product with ID {product.Id}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("update_product", new { product, token });
                Console.WriteLine($"InventoryService.UpdateProductAsync: Successfully updated product with ID {product.Id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.UpdateProductAsync: Error updating product - {ex.Message}");
                throw;
            }
        }

        public async Task DeleteProductAsync(int id)
        {
            Console.WriteLine($"InventoryService.DeleteProductAsync: Deleting product with ID {id}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("delete_product", new { id, token });
                Console.WriteLine($"InventoryService.DeleteProductAsync: Successfully deleted product with ID {id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.DeleteProductAsync: Error deleting product - {ex.Message}");
                throw;
            }
        }

        public async Task<long> RecordSaleAsync(Sale sale)
        {
            Console.WriteLine($"InventoryService.RecordSaleAsync: Recording sale for product {sale.ProductId} with quantity {sale.Quantity}");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<long>("record_sale", new { sale, token });
                Console.WriteLine($"InventoryService.RecordSaleAsync: Successfully recorded sale with ID {result}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.RecordSaleAsync: Error recording sale - {ex.Message}");
                throw;
            }
        }

        public async Task<List<Tool>> GetToolsAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<Tool>>("get_tools", new { token });
        }

        public async Task<long> AddToolAsync(Tool tool)
        {
            Console.WriteLine($"InventoryService.AddToolAsync: Adding tool '{tool.Name}' of type '{tool.TypeName}'");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<long>("add_tool", new { tool, token });
                Console.WriteLine($"InventoryService.AddToolAsync: Successfully added tool with ID {result}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.AddToolAsync: Error adding tool - {ex.Message}");
                throw;
            }
        }

        public async Task UpdateToolAsync(Tool tool)
        {
            Console.WriteLine($"InventoryService.UpdateToolAsync: Updating tool with ID {tool.Id}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("update_tool", new { tool, token });
                Console.WriteLine($"InventoryService.UpdateToolAsync: Successfully updated tool with ID {tool.Id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.UpdateToolAsync: Error updating tool - {ex.Message}");
                throw;
            }
        }

        public async Task DeleteToolAsync(int id)
        {
            Console.WriteLine($"InventoryService.DeleteToolAsync: Deleting tool with ID {id}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("delete_tool", new { id, token });
                Console.WriteLine($"InventoryService.DeleteToolAsync: Successfully deleted tool with ID {id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.DeleteToolAsync: Error deleting tool - {ex.Message}");
                throw;
            }
        }

        public async Task AssignToolAsync(int toolId, int employeeId, string condition, string? notes)
        {
            Console.WriteLine($"InventoryService.AssignToolAsync: Assigning tool {toolId} to employee {employeeId} with condition '{condition}'");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("assign_tool", new { toolId, employeeId, condition, notes, token });
                Console.WriteLine($"InventoryService.AssignToolAsync: Successfully assigned tool {toolId} to employee {employeeId}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.AssignToolAsync: Error assigning tool - {ex.Message}");
                throw;
            }
        }

        public async Task ReturnToolAsync(int toolId, string condition, string? notes)
        {
            Console.WriteLine($"InventoryService.ReturnToolAsync: Returning tool {toolId} with condition '{condition}'");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("return_tool", new { toolId, condition, notes, token });
                Console.WriteLine($"InventoryService.ReturnToolAsync: Successfully returned tool {toolId}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.ReturnToolAsync: Error returning tool - {ex.Message}");
                throw;
            }
        }

        public async Task<List<ToolAssignment>> GetToolHistoryAsync(int toolId)
        {
            Console.WriteLine($"InventoryService.GetToolHistoryAsync: Fetching history for tool {toolId}");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<List<ToolAssignment>>("get_tool_history", new { toolId, token });
                Console.WriteLine($"InventoryService.GetToolHistoryAsync: Successfully fetched {result?.Count ?? 0} history entries");
                return result ?? new List<ToolAssignment>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.GetToolHistoryAsync: Error fetching tool history - {ex.Message}");
                throw;
            }
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
            Console.WriteLine($"InventoryService.SaveBomAsync: Saving BOM for product {header.ProductId}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("save_bom", new { header, lines, token });
                Console.WriteLine($"InventoryService.SaveBomAsync: Successfully saved BOM for product {header.ProductId}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.SaveBomAsync: Error saving BOM for product {header.ProductId} - {ex.Message}");
                throw;
            }
        }

        public async Task<List<InventoryBatch>> GetBatchesAsync(int productId)
        {
            Console.WriteLine($"InventoryService.GetBatchesAsync: Fetching batches for product {productId}");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<List<InventoryBatch>>("get_batches", new { productId, token });
                Console.WriteLine($"InventoryService.GetBatchesAsync: Successfully fetched {result?.Count ?? 0} batches");
                return result ?? new List<InventoryBatch>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.GetBatchesAsync: Error fetching batches for product {productId} - {ex.Message}");
                throw;
            }
        }

        public async Task<long> AddBatchAsync(InventoryBatch batch)
        {
            Console.WriteLine($"InventoryService.AddBatchAsync: Adding batch for product {batch.ProductId}");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<long>("add_batch", new { batch, token });
                Console.WriteLine($"InventoryService.AddBatchAsync: Successfully added batch with ID {result}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.AddBatchAsync: Error adding batch for product {batch.ProductId} - {ex.Message}");
                throw;
            }
        }

        public async Task UpdateBatchAsync(InventoryBatch batch)
        {
            Console.WriteLine($"InventoryService.UpdateBatchAsync: Updating batch with ID {batch.Id}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("update_batch", new { batch, token });
                Console.WriteLine($"InventoryService.UpdateBatchAsync: Successfully updated batch with ID {batch.Id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.UpdateBatchAsync: Error updating batch with ID {batch.Id} - {ex.Message}");
                throw;
            }   
        }

        public async Task<List<VelocityReport>> GetVelocityReportAsync()
        {
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<List<VelocityReport>>("get_velocity_report", new { token });
                Console.WriteLine($"InventoryService.GetVelocityReportAsync: Successfully fetched {result?.Count ?? 0} velocity reports");
                return result ?? new List<VelocityReport>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.GetVelocityReportAsync: Error fetching velocity report - {ex.Message}");
                throw;
            }
        }

        // Suppliers
        public async Task<List<Supplier>> GetSuppliersAsync()
        {
            Console.WriteLine($"InventoryService.GetSuppliersAsync: Fetching suppliers");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<List<Supplier>>("get_suppliers", new { token });
                Console.WriteLine($"InventoryService.GetSuppliersAsync: Successfully fetched {result?.Count ?? 0} suppliers");
                return result ?? new List<Supplier>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.GetSuppliersAsync: Error fetching suppliers - {ex.Message}");
                throw;
            }
        }

        public async Task<long> AddSupplierAsync(Supplier supplier)
        {
            Console.WriteLine($"InventoryService.AddSupplierAsync: Adding supplier '{supplier.Name}'");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<long>("add_supplier", new { supplier, token });
                Console.WriteLine($"InventoryService.AddSupplierAsync: Successfully added supplier with ID {result}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.AddSupplierAsync: Error adding supplier '{supplier.Name}' - {ex.Message}");
                throw;
            }
        }

        public async Task UpdateSupplierAsync(Supplier supplier)
        {
            Console.WriteLine($"InventoryService.UpdateSupplierAsync: Updating supplier with ID {supplier.Id}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("update_supplier", new { supplier, token });
                Console.WriteLine($"InventoryService.UpdateSupplierAsync: Successfully updated supplier with ID {supplier.Id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.UpdateSupplierAsync: Error updating supplier with ID {supplier.Id} - {ex.Message}");
                throw;
            }
        }

        public async Task DeleteSupplierAsync(int id)
        {
            Console.WriteLine($"InventoryService.DeleteSupplierAsync: Deleting supplier with ID {id}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("delete_supplier", new { id, token });
                Console.WriteLine($"InventoryService.DeleteSupplierAsync: Successfully deleted supplier with ID {id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.DeleteSupplierAsync: Error deleting supplier - {ex.Message}");
                throw;
            }
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
            Console.WriteLine($"InventoryService.AddSupplierOrderAsync: Adding supplier order for supplier ID {order.SupplierId}");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<long>("add_supplier_order", new { order, token });
                Console.WriteLine($"InventoryService.AddSupplierOrderAsync: Successfully added supplier order with ID {result}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.AddSupplierOrderAsync: Error adding supplier order for supplier ID {order.SupplierId} - {ex.Message}");
                throw;
            }
        }

        public async Task UpdateSupplierOrderAsync(SupplierOrder order)
        {
            Console.WriteLine($"InventoryService.UpdateSupplierOrderAsync: Updating supplier order with ID {order.Id}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("update_supplier_order", new { order, token });
                Console.WriteLine($"InventoryService.UpdateSupplierOrderAsync: Successfully updated supplier order with ID {order.Id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InventoryService.UpdateSupplierOrderAsync: Error updating supplier order with ID {order.Id} - {ex.Message}");
                throw;
            }
        }

        public async Task DeleteSupplierOrderAsync(int id)
        {
            Console.WriteLine($"InventoryService.DeleteSupplierOrderAsync: Deleting supplier order with ID {id}");
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
