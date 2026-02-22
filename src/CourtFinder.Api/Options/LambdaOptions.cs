namespace CourtFinder.Api.Options;

public sealed class LambdaOptions
{
    public const string SectionName = "Lambda";

    public string ProviderOneFunctionUrl { get; set; } = string.Empty;

    public string ProviderOneBookingUrl { get; set; } = string.Empty;
}
