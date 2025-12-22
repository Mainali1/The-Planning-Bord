using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using ThePlanningBord;
using ThePlanningBord.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });

// Register Domain Services
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IHrService, HrService>();
builder.Services.AddScoped<IFinanceService, FinanceService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IComplaintService, ComplaintService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<ISystemService, SystemService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<MicrosoftGraphService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<TauriInterop>();
builder.Services.AddScoped<BackgroundJobService>();

await builder.Build().RunAsync();
