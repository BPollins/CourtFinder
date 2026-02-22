namespace CourtFinder.Api.Models;

public sealed record CourtAvailabilityRequest(
    string Postcode,
    DateOnly Date,
    TimeOnly Time
);
