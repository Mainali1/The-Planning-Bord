using Microsoft.JSInterop;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface IComplaintService
    {
        Task<List<Complaint>> GetComplaintsAsync();
        Task<long> SubmitComplaintAsync(string content);
        Task ResolveComplaintAsync(int id, string status, string resolution, string resolvedBy, string? adminNotes);
        Task DeleteComplaintAsync(int id);
    }

    public class ComplaintService : IComplaintService
    {
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public ComplaintService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<List<Complaint>> GetComplaintsAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<Complaint>>("get_complaints", new { token });
        }

        public async Task<long> SubmitComplaintAsync(string content)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("submit_complaint", new { content, token });
        }

        public async Task ResolveComplaintAsync(int id, string status, string resolution, string resolvedBy, string? adminNotes)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("resolve_complaint", new { id, status, resolution, resolvedBy, adminNotes, token });
        }

        public async Task DeleteComplaintAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_complaint", new { id, token });
        }
    }
}
