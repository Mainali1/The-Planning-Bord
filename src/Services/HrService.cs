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
            Console.WriteLine($"HrService.ClockInAsync: Clocking in employee {attendance.EmployeeId} at {attendance.CheckIn}");
            var token = await _userService.GetTokenAsync();
            try
            {
                var result = await _tauri.InvokeAsync<long>("clock_in", new { attendance, token });
                Console.WriteLine($"HrService.ClockInAsync: Successfully clocked in with ID {result}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"HrService.ClockInAsync: Error clocking in - {ex.Message}");
                throw;
            }
        }

        public async Task ClockOutAsync(AttendanceModel attendance)
        {
            Console.WriteLine($"HrService.ClockOutAsync: Clocking out attendance record {attendance.Id} at {attendance.CheckOut}");
            var token = await _userService.GetTokenAsync();
            try
            {
                await _tauri.InvokeVoidAsync("clock_out", new { attendance, token });
                Console.WriteLine($"HrService.ClockOutAsync: Successfully clocked out");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"HrService.ClockOutAsync: Error clocking out - {ex.Message}");
                throw;
            }
        }
    }
}
