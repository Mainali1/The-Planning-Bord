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
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public HrService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<List<Employee>> GetEmployeesAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<Employee>>("get_employees", new { token });
        }

        public async Task<long> AddEmployeeAsync(Employee employee)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("add_employee", new { employee, token });
        }

        public async Task UpdateEmployeeAsync(Employee employee)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("update_employee", new { employee, token });
        }

        public async Task DeleteEmployeeAsync(int id)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("delete_employee", new { id, token });
        }

        public async Task<List<AttendanceModel>> GetAttendancesAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<AttendanceModel>>("get_attendances", new { token });
        }

        public async Task<long> ClockInAsync(AttendanceModel attendance)
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<long>("clock_in", new { attendance, token });
        }

        public async Task ClockOutAsync(AttendanceModel attendance)
        {
            var token = await _userService.GetTokenAsync();
            await _tauri.InvokeVoidAsync("clock_out", new { attendance, token });
        }
    }
}
