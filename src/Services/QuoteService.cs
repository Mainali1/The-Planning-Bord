using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface IQuoteService
    {
        Task<List<Quote>> GetQuotesAsync(int? clientId = null);
        Task<long> AddQuoteAsync(Quote quote);
        Task UpdateQuoteAsync(Quote quote);
        Task DeleteQuoteAsync(int id);
        Task<List<QuoteItem>> GetQuoteItemsAsync(int quoteId);
        Task<long> AddQuoteItemAsync(QuoteItem item);
        Task UpdateQuoteItemAsync(QuoteItem item);
        Task DeleteQuoteItemAsync(int id);
    }

    public class QuoteService : IQuoteService
    {
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public QuoteService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<List<Quote>> GetQuotesAsync(int? clientId = null)
        {
            try
            {
                var token = await _userService.GetTokenAsync();
                return await _tauri.InvokeAsync<List<Quote>>("get_quotes", new { clientId, token });
            }
            catch
            {
                return new List<Quote>();
            }
        }

        public async Task<long> AddQuoteAsync(Quote quote)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_quote", new { quote, token });
        }

        public async Task UpdateQuoteAsync(Quote quote)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_quote", new { quote, token });
        }

        public async Task DeleteQuoteAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_quote", new { id, token });
        }

        public async Task<List<QuoteItem>> GetQuoteItemsAsync(int quoteId)
        {
            try
            {
                var token = await _userService.GetTokenAsync();
                return await _tauri.InvokeAsync<List<QuoteItem>>("get_quote_items", new { quoteId, token });
            }
            catch
            {
                return new List<QuoteItem>();
            }
        }

        public async Task<long> AddQuoteItemAsync(QuoteItem item)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_quote_item", new { item, token });
        }

        public async Task UpdateQuoteItemAsync(QuoteItem item)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_quote_item", new { item, token });
        }

        public async Task DeleteQuoteItemAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_quote_item", new { id, token });
        }
    }
}
