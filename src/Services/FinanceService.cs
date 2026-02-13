using Microsoft.JSInterop;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface IFinanceService
    {
        Task<List<Payment>> GetPaymentsAsync();
        Task<FinanceOverview> GetFinanceOverviewAsync();
        Task<long> AddPaymentAsync(Payment payment);
        Task UpdatePaymentAsync(Payment payment);
        Task DeletePaymentAsync(int id);

        // Advanced Finance
        Task<List<Account>> GetAccountsAsync();
        Task<long> AddAccountAsync(Account account);
        Task<List<Invoice>> GetInvoicesAsync();
        Task<long> CreateInvoiceAsync(Invoice invoice);

        // General Ledger
        Task<List<GlAccount>> GetGlAccountsAsync();
        Task<long> AddGlAccountAsync(GlAccount account);
        Task<List<GlEntry>> GetGlEntriesAsync(string? startDate, string? endDate);
        Task<long> AddGlEntryAsync(GlEntry entry);
    }

    public class FinanceService : IFinanceService
    {
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public FinanceService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<List<Payment>> GetPaymentsAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<Payment>>("get_payments", new { token });
        }

        public async Task<FinanceOverview> GetFinanceOverviewAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<FinanceOverview>("get_finance_overview", new { token });
        }

        public async Task<long> AddPaymentAsync(Payment payment)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_payment", new { payment, token });
        }

        public async Task UpdatePaymentAsync(Payment payment)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_payment", new { payment, token });
        }

        public async Task DeletePaymentAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_payment", new { id, token });
        }

        public async Task<List<Account>> GetAccountsAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<Account>>("get_accounts", new { token });
        }

        public async Task<long> AddAccountAsync(Account account)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_account", new { account, token });
        }

        public async Task<List<Invoice>> GetInvoicesAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<Invoice>>("get_invoices", new { token });
        }

        public async Task<long> CreateInvoiceAsync(Invoice invoice)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("create_invoice", new { invoice, token });
        }

        public async Task<List<GlAccount>> GetGlAccountsAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<GlAccount>>("get_gl_accounts", new { token });
        }

        public async Task<long> AddGlAccountAsync(GlAccount account)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_gl_account", new { account, token });
        }

        public async Task<List<GlEntry>> GetGlEntriesAsync(string? startDate, string? endDate)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<GlEntry>>("get_gl_entries", new { startDate, endDate, token });
        }

        public async Task<long> AddGlEntryAsync(GlEntry entry)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_gl_entry", new { entry, token });
        }
    }
}
