namespace CourtFinder.Api.Models;

public sealed record ProviderLambdaResponse(IReadOnlyCollection<ProviderCourtRecord> Courts);
