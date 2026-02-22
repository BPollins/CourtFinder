using CourtFinder.Api.Models;

namespace CourtFinder.Api.Services;

public interface ICourtAvailabilityService
{
    Task<CourtAvailabilityResponse> GetAvailableCourtsAsync(
        CourtAvailabilityRequest request,
        CancellationToken cancellationToken);
}
