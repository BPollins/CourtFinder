# CourtFinder Frontend

Single-page React app that lets a user pick a date, location (postcode), time, and booking length, then calls the CourtFinder aggregator Lambda and renders the merged results.

Styled to match the [Ben Pollins portfolio site](https://benpollins.com): dark `bg-gray-950` background, cyan-to-blue gradient accents, monospaced uppercase headings, shadcn-style primitives.

## Stack

- Vite + React 19
- Tailwind CSS (with the same shadcn `style: new-york` design tokens as the portfolio)
- Native `fetch` against the aggregator Lambda
- Lucide icons
- No router (single page)

## Local development

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173).

## Build for S3 + CloudFront

```bash
npm run build
```

The static bundle lands in `frontend/dist/`. Sync that into your S3 origin (the same bucket as the portfolio if you want), then invalidate CloudFront:

```bash
aws s3 sync dist/ s3://<bucket>/courtfinder/ --delete
aws cloudfront create-invalidation \
  --distribution-id <dist-id> \
  --paths "/courtfinder/*"
```

## Wiring to the aggregator Lambda

Two deployment shapes work, both free-tier friendly:

1. **Same-origin via CloudFront (recommended).** Add a CloudFront behavior with path pattern `/courtfinder/api/*` that forwards to the aggregator's Function URL origin. Set `VITE_COURTFINDER_API_URL=/courtfinder/api/availability` in `.env`. No CORS required.
2. **Direct cross-origin Function URL.** Set `VITE_COURTFINDER_API_URL` to the full Lambda Function URL. The aggregator Lambda already returns permissive CORS headers (`access-control-allow-origin: *`).

## Folder layout

```text
frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── jsconfig.json
├── .env.example
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── lib/
    │   └── utils.js
    ├── components/
    │   ├── Header.jsx
    │   ├── Footer.jsx
    │   └── ui/
    │       ├── badge.jsx
    │       ├── button.jsx
    │       ├── card.jsx
    │       ├── input.jsx
    │       ├── label.jsx
    │       └── select.jsx
    └── pages/
        └── CourtFinder.jsx
```

The `components/ui/` primitives mirror the portfolio's shadcn output (`style: new-york`, `baseColor: neutral`) so dropping `pages/CourtFinder.jsx` into the portfolio repo later requires no other changes.
