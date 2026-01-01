using Microsoft.JSInterop;
using ThePlanningBord.Models;

namespace ThePlanningBord.Services
{
    public interface IReportService
    {
        Task<DashboardStats> GetDashboardStatsAsync();
        Task<ReportSummary> GetReportSummaryAsync();
        Task<List<ChartDataPoint>> GetMonthlyCashflowAsync();
    }

    public class ReportService : IReportService
    {
        private readonly ITauriInterop _tauri;
        private readonly IUserService _userService;

        public ReportService(ITauriInterop tauri, IUserService userService)
        {
            _tauri = tauri;
            _userService = userService;
        }

        public async Task<DashboardStats> GetDashboardStatsAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<DashboardStats>("get_dashboard_stats", new { token });
        }

        public async Task<ReportSummary> GetReportSummaryAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<ReportSummary>("get_report_summary", new { token });
        }

        public async Task<List<ChartDataPoint>> GetMonthlyCashflowAsync()
        {
            var token = await _userService.GetTokenAsync();
            return await _tauri.InvokeAsync<List<ChartDataPoint>>("get_monthly_cashflow", new { token });
        }
    }
}
