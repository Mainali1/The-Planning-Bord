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
        private readonly IJSRuntime _jsRuntime;

        public ReportService(IJSRuntime jsRuntime)
        {
            _jsRuntime = jsRuntime;
        }

        public async Task<DashboardStats> GetDashboardStatsAsync()
        {
            return await _jsRuntime.InvokeAsync<DashboardStats>("__TAURI__.core.invoke", "get_dashboard_stats", new { });
        }

        public async Task<ReportSummary> GetReportSummaryAsync()
        {
            return await _jsRuntime.InvokeAsync<ReportSummary>("__TAURI__.core.invoke", "get_report_summary", new { });
        }

        public async Task<List<ChartDataPoint>> GetMonthlyCashflowAsync()
        {
            return await _jsRuntime.InvokeAsync<List<ChartDataPoint>>("__TAURI__.core.invoke", "get_monthly_cashflow", new { });
        }
    }
}
