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
        private readonly TauriInterop _tauri;

        public ComplaintService(TauriInterop tauri)
        {
            _tauri = tauri;
        }

        public async Task<List<Complaint>> GetComplaintsAsync()
        {
            return await _tauri.InvokeAsync<List<Complaint>>("get_complaints", new { });
        }

        public async Task<long> SubmitComplaintAsync(string content)
        {
            return await _tauri.InvokeAsync<long>("submit_complaint", new { content });
        }

        public async Task ResolveComplaintAsync(int id, string status, string resolution, string resolvedBy, string? adminNotes)
        {
            await _tauri.InvokeVoidAsync("resolve_complaint", new { id, status, resolution, resolvedBy, adminNotes });
        }

        public async Task DeleteComplaintAsync(int id)
        {
            await _tauri.InvokeVoidAsync("delete_complaint", new { id });
        }
    }
}
