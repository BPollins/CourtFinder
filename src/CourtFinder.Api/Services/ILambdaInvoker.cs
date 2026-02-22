using CourtFinder.Api.Models;

namespace CourtFinder.Api.Services;

public interface ILambdaInvoker
{
    Task<ProviderLambdaResponse> GetProviderOneAvailabilityAsync(
        CourtAvailabilityRequest request,
        CancellationToken cancellationToken);
}
