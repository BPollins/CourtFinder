namespace CourtFinder.Api.Models;

public sealed record ProviderCourtRecord(
    string FacilityLocation,
    string BookingType,
    DateOnly Date,
    TimeOnly Time,
    string Price,
    string Url
);
