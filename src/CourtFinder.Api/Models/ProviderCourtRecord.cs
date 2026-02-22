namespace CourtFinder.Api.Models;

public sealed record ProviderCourtRecord(
    string FacilityLocation,
    string CourtType,
    DateOnly Date,
    TimeOnly Time
);
