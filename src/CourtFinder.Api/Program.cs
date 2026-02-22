using CourtFinder.Api.Models;
using CourtFinder.Api.Options;
using CourtFinder.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<LambdaOptions>(builder.Configuration.GetSection(LambdaOptions.SectionName));
builder.Services.AddHttpClient<ILambdaInvoker, LambdaFunctionUrlInvoker>();
builder.Services.AddScoped<ICourtAvailabilityService, CourtAvailabilityService>();

var app = builder.Build();

app.MapPost("/api/courts/availability", async (
    CourtAvailabilityRequest request,
    ICourtAvailabilityService service,
    CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Postcode))
    {
        return Results.BadRequest(new { error = "Postcode is required." });
    }

    var response = await service.GetAvailableCourtsAsync(request, cancellationToken);
    return Results.Ok(response);
});

app.Run();
