using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.AspNetCore.Components.Authorization;
using ThePlanningBord;
using ThePlanningBord.Services;
using ThePlanningBord.Auth;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });

// Auth
builder.Services.AddAuthorizationCore();
builder.Services.AddScoped<AuthenticationStateProvider, CustomAuthenticationStateProvider>();

// Register Domain Services
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IHrService, HrService>();
builder.Services.AddScoped<IFinanceService, FinanceService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IComplaintService, ComplaintService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<ISystemService, SystemService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IIntegrationService, IntegrationService>();
builder.Services.AddScoped<IBusinessConfigurationService, BusinessConfigurationService>();
builder.Services.AddScoped<IClientService, ClientService>();
builder.Services.AddScoped<ISalesService, SalesService>();
builder.Services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();
builder.Services.AddScoped<ITimeTrackingService, TimeTrackingService>();
builder.Services.AddScoped<IContractService, ContractService>();
builder.Services.AddScoped<IQuoteService, QuoteService>();
builder.Services.AddScoped<IResourcePlanningService, ResourcePlanningService>();
builder.Services.AddScoped<MicrosoftGraphService>();
builder.Services.AddScoped<ISlackService, SlackService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<ITauriInterop, TauriInterop>();
builder.Services.AddScoped<BackgroundJobService>();
builder.Services.AddScoped<IThemeService, ThemeService>();
builder.Services.AddScoped<INetworkService, NetworkService>();

await builder.Build().RunAsync();
