# CourtFinder

CourtFinder is a serverless badminton-court availability search. The browser posts a date/location/time/booking-length to an **aggregator Lambda**, which fans out (via `boto3.invoke`) to one provider Lambda per booking system, merges the responses, and returns a uniform list of bookable slots.

## Architecture

```text
Browser ──► CloudFront ──► S3 (frontend/)              [static React app]
                       └─► Aggregator Lambda           [boto3 fan-out]
                              ├─► better-gym Lambda
                              ├─► provider-2 Lambda    [future]
                              └─► provider-N Lambda    [future]
```

Everything sits inside the AWS Always-Free tier for typical portfolio traffic: S3, CloudFront, Lambda Function URLs, and (optionally) API Gateway HTTP API.

## Folder structure

```text
CourtFinder/
├── README.md
├── frontend/                             # React + Vite + Tailwind UI
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   ├── .env.example
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── lib/utils.js
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── Footer.jsx
│       │   └── ui/                       # shadcn-style primitives
│       └── pages/CourtFinder.jsx
└── lambdas/
    ├── aggregator/                       # fans out via boto3
    │   ├── handler.py
    │   ├── requirements.txt
    │   └── event.sample.json
    └── better-gym/                       # provider Lambda
        ├── handler.py
        ├── requirements.txt
        └── event.sample.json
```

## API contract

The aggregator Lambda accepts the same shape regardless of whether it's invoked directly, via Lambda Function URL, or via API Gateway.

`POST /` (body)

```json
{
  "postcode": "SW1A 1AA",
  "date": "2026-03-15",
  "time": "18:30:00",
  "bookingType": "60min"
}
```

Response:

```json
{
  "courts": [
    {
      "provider": "better-gym",
      "facilityLocation": "clissold-leisure-centre",
      "bookingType": "60min",
      "date": "2026-03-15",
      "time": "18:30:00",
      "price": "£26.00",
      "bookingUrl": "https://bookings.better.org.uk/location/clissold-leisure-centre/badminton-60min/2026-03-15/by-time/slot/18:30-19:30"
    }
  ],
  "errors": []
}
```

`errors` is a list of `{ provider, error }` entries — partial failure is preferred over a 5xx so the user still sees results from healthy providers.

## Aggregator Lambda

`lambdas/aggregator/handler.py` reads the `PROVIDER_FUNCTIONS` env var and fans out via `boto3.client("lambda").invoke()` in a thread pool.

`PROVIDER_FUNCTIONS` is a comma-separated list of `name=function-name` pairs:

```text
PROVIDER_FUNCTIONS=better-gym=courtfinder-better-gym,virgin-active=courtfinder-virgin-active
```

The Lambda's execution role needs `lambda:InvokeFunction` on each provider Lambda's ARN. Recommended hardening: switch every provider Lambda's Function URL `AuthType` to `AWS_IAM` (or remove the URL entirely) so the aggregator is the only thing that can invoke them.

### Local run

```bash
cd lambdas/aggregator
pip install boto3            # only needed locally; runtime supplies it
python run_local.py          # invokes real provider Lambdas via your AWS creds
```

## Frontend

React + Vite + Tailwind app under `frontend/`. See `frontend/README.md` for full details.

```bash
cd frontend
npm install
cp .env.example .env         # set VITE_COURTFINDER_API_URL
npm run dev                  # http://localhost:5173
npm run build                # outputs to frontend/dist/
```

## Deployment (GitHub Actions)

Workflow: **Update Lambda** (`.github/workflows/update-lambda.yml`). Run it from **Actions → Update Lambda → Run workflow**, then pick the package:

- `better-gym`
- `aggregator`

It zips `lambdas/<choice>/` (dependencies + `handler.py`) and runs `aws lambda update-function-code` against the function name from the matching repo variable.

Configure in the repo:

| Type     | Name                       | Purpose                          |
|----------|----------------------------|----------------------------------|
| Secret   | `AWS_ACCESS_KEY_ID`        | IAM user/key with `lambda:UpdateFunctionCode` |
| Secret   | `AWS_SECRET_ACCESS_KEY`    | Matching secret key              |
| Variable | `AWS_REGION`               | e.g. `eu-west-2`                 |
| Variable | `BETTER_GYM_LAMBDA_NAME`   | AWS function name for `better-gym` |
| Variable | `AGGREGATOR_LAMBDA_NAME`   | AWS function name for the aggregator |

To add another provider later: add a folder under `lambdas/`, extend the workflow `options`, add a `case` branch and matching repo variable, then add the new entry to `PROVIDER_FUNCTIONS` on the aggregator.

### Cross-repo CourtFinder page sync

Workflow: **Sync CourtFinder Page to Portfolio** (`.github/workflows/sync-courtfinder-page.yml`).

This workflow runs on pushes to `main` when `frontend/src/pages/CourtFinder.jsx` changes (and also supports manual dispatch). It copies only that file into `BPollins/portfolio-website` and creates or updates a PR against `main`.

Configure in the `CourtFinder` repo:

| Type   | Name                   | Purpose |
|--------|------------------------|---------|
| Secret | `PORTFOLIO_REPO_TOKEN` | Fine-grained PAT with repo access to `BPollins/portfolio-website` and permissions: **Contents (Read and write)** + **Pull requests (Read and write)** |

Validation:

1. Push a change to `frontend/src/pages/CourtFinder.jsx` on `main`.
2. Confirm the workflow succeeds in `CourtFinder` Actions.
3. Confirm a PR is opened (or updated) in `BPollins/portfolio-website` targeting `main`.
4. Confirm the PR diff contains only `frontend/src/pages/CourtFinder.jsx`.

## Next steps

- Add provider two and three Lambda functions with the same output schema.
- Move provider Function URLs to `AuthType=AWS_IAM` once the aggregator's IAM role is in place.
- Capture the architecture (S3, CloudFront, Lambdas, IAM) as IaC.
