using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface ISalesService
    {
        Task<List<SalesOrder>> GetSalesOrdersAsync();
        Task<SalesOrder?> GetSalesOrderAsync(int id);
        Task<long> CreateSalesOrderAsync(SalesOrder order);
        Task ShipSalesOrderAsync(int id);
    }

    public class SalesService : ISalesService
    {
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public SalesService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<List<SalesOrder>> GetSalesOrdersAsync()
        {
            try
            {
                var token = await _userService.GetTokenAsync();
                return await _tauri.InvokeAsync<List<SalesOrder>>("get_sales_orders", new { token }) ?? new List<SalesOrder>();
            }
            catch
            {
                return new List<SalesOrder>();
            }
        }

        public async Task<SalesOrder?> GetSalesOrderAsync(int id)
        {
            try
            {
                var token = await _userService.GetTokenAsync();
                return await _tauri.InvokeAsync<SalesOrder?>("get_sales_order", new { id, token });
            }
            catch
            {
                return null;
            }
        }

        public async Task<long> CreateSalesOrderAsync(SalesOrder order)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("create_sales_order", new { order, token });
        }

        public async Task ShipSalesOrderAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("ship_sales_order", new { id, token });
        }
    }
}
