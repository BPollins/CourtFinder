# CourtFinder

CourtFinder is an API-first application that receives a postcode/date/time request, calls provider-specific AWS Lambda functions, and returns a uniform list of available badminton courts with booking links.

## Folder structure

```text
CourtFinder/
├── CourtFinder.sln
├── README.md
├── src/
│   └── CourtFinder.Api/
│       ├── CourtFinder.Api.csproj
│       ├── Program.cs
│       ├── appsettings.json
│       ├── appsettings.Development.json
│       ├── CourtFinder.Api.http
│       ├── Models/
│       │   ├── AvailableCourt.cs
│       │   ├── CourtAvailabilityRequest.cs
│       │   ├── CourtAvailabilityResponse.cs
│       │   ├── ProviderCourtRecord.cs
│       │   └── ProviderLambdaResponse.cs
│       ├── Options/
│       │   └── LambdaOptions.cs
│       ├── Services/
│       │   ├── CourtAvailabilityService.cs
│       │   ├── ICourtAvailabilityService.cs
│       │   ├── ILambdaInvoker.cs
│       │   └── LambdaFunctionUrlInvoker.cs
│       └── Properties/
│           └── launchSettings.json
├── lambdas/
│   └── provider-one/
│       ├── handler.py
│       ├── requirements.txt
│       └── event.sample.json
└── tests/
    └── CourtFinder.Api.Tests/
        └── README.md
```

## API request

`POST /api/courts/availability`

```json
{
  "postcode": "SW1A 1AA",
  "date": "2026-03-15",
  "time": "18:30:00"
}
```

## API response shape

```json
{
  "courts": [
    {
      "provider": "ProviderOne",
      "facilityLocation": "SW1A 1AA Leisure Centre",
      "bookingType": "40min",
      "date": "2026-03-15",
      "time": "18:30:00",
      "bookingUrl": "https://provider-one.example.com/book"
    }
  ]
}
```

## Running locally

1. Update `Lambda.ProviderOneFunctionUrl` in `src/CourtFinder.Api/appsettings.Development.json`.
2. Run the API:

   ```bash
   dotnet run --project src/CourtFinder.Api
   ```

3. Use `src/CourtFinder.Api/CourtFinder.Api.http` to send a request.

## Next steps

- Add provider two and three Lambda functions with the same output schema.
- Add tests and a deployment pipeline (API + Lambda + IAM + networking).
- Add retries/timeouts/circuit-breakers around provider calls.
