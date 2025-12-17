using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using ThePlanningBord;
using ThePlanningBord.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<Application>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });
builder.Services.AddScoped<ITauriService, TauriService>();
builder.Services.AddScoped<MicrosoftGraphService>();
builder.Services.AddScoped<BackgroundJobService>();

await builder.Build().RunAsync();
