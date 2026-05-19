# SF 311 Dashboard

A real-time dashboard for [San Francisco 311 service requests](https://sf311.org/), built with Next.js 16 and Tailwind CSS.

## Features

- **Live data** — fetches the 200 most recent service requests from the [SF Open Data API](https://data.sfgov.org/City-Infrastructure/311-Cases/vw6y-z8j6)
- **Summary stats** — total requests, open vs. closed counts, average resolution time
- **Category breakdown** — horizontal bar chart of the top 10 request categories
- **Filterable table** — search by ID, address, or category; filter by status and category; paginated results

## Tech Stack

- [Next.js 16](https://nextjs.org/) with the App Router and Cache Components (Partial Prerendering)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [SF Open Data / Socrata API](https://dev.socrata.com/) — no API key required

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Data Source

Service request data is provided by the City and County of San Francisco via [DataSF](https://datasf.org/). The dataset is updated in near-real-time and covers all 311 cases submitted through phone, web, or the SF311 mobile app.
