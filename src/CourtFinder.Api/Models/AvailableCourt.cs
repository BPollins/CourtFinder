namespace CourtFinder.Api.Models;

public sealed record AvailableCourt(
    string Provider,
    string FacilityLocation,
    string BookingType,
    DateOnly Date,
    TimeOnly Time,
    string BookingUrl
);
