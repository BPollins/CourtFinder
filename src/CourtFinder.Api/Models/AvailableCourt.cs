namespace CourtFinder.Api.Models;

public sealed record AvailableCourt(
    string Provider,
    string FacilityLocation,
    string CourtType,
    DateOnly Date,
    TimeOnly Time,
    string BookingUrl
);
