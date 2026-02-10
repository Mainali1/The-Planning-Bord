using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface ITimeTrackingService
    {
        Task<List<TimeEntry>> GetTimeEntriesAsync(int? employeeId = null, int? clientId = null, int? projectId = null);
        Task<long> AddTimeEntryAsync(TimeEntry entry);
        Task UpdateTimeEntryAsync(TimeEntry entry);
        Task DeleteTimeEntryAsync(int id);
    }

    public class TimeTrackingService : ITimeTrackingService
    {
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public TimeTrackingService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<List<TimeEntry>> GetTimeEntriesAsync(int? employeeId = null, int? clientId = null, int? projectId = null)
        {
            try
            {
                var token = await _userService.GetTokenAsync();
                return await _tauri.InvokeAsync<List<TimeEntry>>("get_time_entries", new { employeeId, clientId, projectId, token });
            }
            catch
            {
                return new List<TimeEntry>();
            }
        }

        public async Task<long> AddTimeEntryAsync(TimeEntry entry)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_time_entry", new { entry, token });
        }

        public async Task UpdateTimeEntryAsync(TimeEntry entry)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_time_entry", new { entry, token });
        }

        public async Task DeleteTimeEntryAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_time_entry", new { id, token });
        }
    }
}
