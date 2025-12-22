using Microsoft.JSInterop;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface IFinanceService
    {
        Task<List<Payment>> GetPaymentsAsync();
        Task<long> AddPaymentAsync(Payment payment);
        Task UpdatePaymentAsync(Payment payment);
        Task DeletePaymentAsync(int id);
    }

    public class FinanceService : IFinanceService
    {
        private readonly TauriInterop _tauri;

        public FinanceService(TauriInterop tauri)
        {
            _tauri = tauri;
        }

        public async Task<List<Payment>> GetPaymentsAsync()
        {
            return await _tauri.InvokeAsync<List<Payment>>("get_payments", new { });
        }

        public async Task<long> AddPaymentAsync(Payment payment)
        {
            return await _tauri.InvokeAsync<long>("add_payment", new { payment });
        }

        public async Task UpdatePaymentAsync(Payment payment)
        {
            await _tauri.InvokeVoidAsync("update_payment", new { payment });
        }

        public async Task DeletePaymentAsync(int id)
        {
            await _tauri.InvokeVoidAsync("delete_payment", new { id });
        }
    }
}
