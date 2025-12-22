using Microsoft.JSInterop;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface IHrService
    {
        Task<List<Employee>> GetEmployeesAsync();
        Task<long> AddEmployeeAsync(Employee employee);
        Task UpdateEmployeeAsync(Employee employee);
        Task DeleteEmployeeAsync(int id);
        
        // Attendance
        Task<List<AttendanceModel>> GetAttendancesAsync();
        Task<long> ClockInAsync(AttendanceModel attendance);
        Task ClockOutAsync(AttendanceModel attendance);
    }

    public class HrService : IHrService
    {
        private readonly TauriInterop _tauri;

        public HrService(TauriInterop tauri)
        {
            _tauri = tauri;
        }

        public async Task<List<Employee>> GetEmployeesAsync()
        {
            return await _tauri.InvokeAsync<List<Employee>>("get_employees", new { });
        }

        public async Task<long> AddEmployeeAsync(Employee employee)
        {
            return await _tauri.InvokeAsync<long>("add_employee", new { employee });
        }

        public async Task UpdateEmployeeAsync(Employee employee)
        {
            await _tauri.InvokeVoidAsync("update_employee", new { employee });
        }

        public async Task DeleteEmployeeAsync(int id)
        {
            await _tauri.InvokeVoidAsync("delete_employee", new { id });
        }

        public async Task<List<AttendanceModel>> GetAttendancesAsync()
        {
            return await _tauri.InvokeAsync<List<AttendanceModel>>("get_attendances", new { });
        }

        public async Task<long> ClockInAsync(AttendanceModel attendance)
        {
            return await _tauri.InvokeAsync<long>("clock_in", new { attendance });
        }

        public async Task ClockOutAsync(AttendanceModel attendance)
        {
            await _tauri.InvokeVoidAsync("clock_out", new { attendance });
        }
    }
}
