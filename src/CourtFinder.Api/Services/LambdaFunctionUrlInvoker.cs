using System.Net.Http.Json;
using CourtFinder.Api.Models;
using CourtFinder.Api.Options;
using Microsoft.Extensions.Options;

namespace CourtFinder.Api.Services;

public sealed class LambdaFunctionUrlInvoker : ILambdaInvoker
{
    private readonly HttpClient _httpClient;
    private readonly LambdaOptions _lambdaOptions;

    public LambdaFunctionUrlInvoker(
        HttpClient httpClient,
        IOptions<LambdaOptions> lambdaOptions)
    {
        _httpClient = httpClient;
        _lambdaOptions = lambdaOptions.Value;
    }

    public async Task<ProviderLambdaResponse> GetProviderOneAvailabilityAsync(
        CourtAvailabilityRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_lambdaOptions.ProviderOneFunctionUrl))
        {
            throw new InvalidOperationException(
                "Lambda:ProviderOneFunctionUrl is not configured.");
        }

        using var response = await _httpClient.PostAsJsonAsync(
            _lambdaOptions.ProviderOneFunctionUrl,
            request,
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var providerResponse = await response.Content.ReadFromJsonAsync<ProviderLambdaResponse>(cancellationToken);

        return providerResponse ?? new ProviderLambdaResponse(Array.Empty<ProviderCourtRecord>());
    }
}
