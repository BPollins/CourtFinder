namespace CourtFinder.Api.Models;

public sealed record CourtAvailabilityResponse(IReadOnlyCollection<AvailableCourt> Courts);
