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

        // Advanced Finance
        Task<List<Account>> GetAccountsAsync();
        Task<long> AddAccountAsync(Account account);
        Task<List<Invoice>> GetInvoicesAsync();
        Task<long> CreateInvoiceAsync(Invoice invoice);
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

        public async Task<List<Account>> GetAccountsAsync()
        {
            return await _tauri.InvokeAsync<List<Account>>("get_accounts", new { });
        }

        public async Task<long> AddAccountAsync(Account account)
        {
            return await _tauri.InvokeAsync<long>("add_account", new { account });
        }

        public async Task<List<Invoice>> GetInvoicesAsync()
        {
            return await _tauri.InvokeAsync<List<Invoice>>("get_invoices", new { });
        }

        public async Task<long> CreateInvoiceAsync(Invoice invoice)
        {
            return await _tauri.InvokeAsync<long>("create_invoice", new { invoice });
        }
    }
}
