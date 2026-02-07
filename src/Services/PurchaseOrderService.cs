using Microsoft.JSInterop;
using System.Text.Json;
using System.Text.Json.Serialization;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface IPurchaseOrderService
    {
        Task<List<PurchaseOrder>> GetPurchaseOrdersAsync();
        Task<PurchaseOrder?> GetPurchaseOrderAsync(int id);
        Task<long> CreatePurchaseOrderAsync(PurchaseOrder po);
        Task UpdatePurchaseOrderStatusAsync(int id, string status);
        Task ReceivePurchaseOrderAsync(int id);
    }

    public class PurchaseOrderService : IPurchaseOrderService
    {
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public PurchaseOrderService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<List<PurchaseOrder>> GetPurchaseOrdersAsync()
        {
            Console.WriteLine("PurchaseOrderService.GetPurchaseOrdersAsync: Fetching all POs");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<List<PurchaseOrder>>("get_purchase_orders", new { token });
                Console.WriteLine($"PurchaseOrderService.GetPurchaseOrdersAsync: Fetched {result?.Count ?? 0} POs");
                return result ?? new List<PurchaseOrder>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"PurchaseOrderService.GetPurchaseOrdersAsync: Error - {ex.Message}");
                throw;
            }
        }

        public async Task<PurchaseOrder?> GetPurchaseOrderAsync(int id)
        {
            Console.WriteLine($"PurchaseOrderService.GetPurchaseOrderAsync: Fetching PO #{id}");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<PurchaseOrder?>("get_purchase_order", new { id, token });
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"PurchaseOrderService.GetPurchaseOrderAsync: Error - {ex.Message}");
                throw;
            }
        }

        public async Task<long> CreatePurchaseOrderAsync(PurchaseOrder po)
        {
            Console.WriteLine($"PurchaseOrderService.CreatePurchaseOrderAsync: Creating PO for Supplier {po.SupplierId}");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<long>("create_purchase_order", new { po, token });
                Console.WriteLine($"PurchaseOrderService.CreatePurchaseOrderAsync: Created PO #{result}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"PurchaseOrderService.CreatePurchaseOrderAsync: Error - {ex.Message}");
                throw;
            }
        }

        public async Task UpdatePurchaseOrderStatusAsync(int id, string status)
        {
            Console.WriteLine($"PurchaseOrderService.UpdatePurchaseOrderStatusAsync: Updating PO #{id} to {status}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("update_purchase_order_status", new { id, status, token });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"PurchaseOrderService.UpdatePurchaseOrderStatusAsync: Error - {ex.Message}");
                throw;
            }
        }

        public async Task ReceivePurchaseOrderAsync(int id)
        {
            Console.WriteLine($"PurchaseOrderService.ReceivePurchaseOrderAsync: Receiving PO #{id}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("receive_purchase_order", new { id, token });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"PurchaseOrderService.ReceivePurchaseOrderAsync: Error - {ex.Message}");
                throw;
            }
        }
    }
}
