using CourtFinder.Api.Models;
using CourtFinder.Api.Options;
using Microsoft.Extensions.Options;

namespace CourtFinder.Api.Services;

public sealed class CourtAvailabilityService : ICourtAvailabilityService
{
    private readonly ILambdaInvoker _lambdaInvoker;
    private readonly LambdaOptions _lambdaOptions;

    public CourtAvailabilityService(
        ILambdaInvoker lambdaInvoker,
        IOptions<LambdaOptions> lambdaOptions)
    {
        _lambdaInvoker = lambdaInvoker;
        _lambdaOptions = lambdaOptions.Value;
    }

    public async Task<CourtAvailabilityResponse> GetAvailableCourtsAsync(
        CourtAvailabilityRequest request,
        CancellationToken cancellationToken)
    {
        var providerResponse = await _lambdaInvoker.GetProviderOneAvailabilityAsync(request, cancellationToken);

        var courts = providerResponse.Courts
            .Select(court => new AvailableCourt(
                Provider: "ProviderOne",
                FacilityLocation: court.FacilityLocation,
                BookingType: court.BookingType,
                Date: court.Date,
                Time: court.Time,
                Price: court.Price,
                BookingUrl: _lambdaOptions.ProviderOneBookingUrl))
            .ToArray();

        return new CourtAvailabilityResponse(courts);
    }
}
