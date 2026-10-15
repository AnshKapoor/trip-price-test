# Language trip prices

A static web page that prices five customer requests for language trips. Every line (course, enrolment fee, accommodation, seasonal supplement) and the total are calculated in the browser from the catalog data. No price is typed into the page.

No build step and no dependencies: plain HTML, CSS and JavaScript modules, ready for Cloudflare Pages.

## Files

| Path | What it is |
|---|---|
| `index.html`, `styles.css` | The page |
| `src/catalog.js` | The catalog from the task PDF: schools, courses, accommodation, seasonal rules |
| `src/requests.js` | The five customer requests: the customer's own words plus the structured reading of each one |
| `src/pricing.js` | All pricing rules (`priceRequest`), plus ISO-week and UTC date helpers |
| `src/format.js` | EUR and date formatting |
| `src/app.js` | Renders one card per request using `priceRequest` |
| `tests/pricing.tests.js` | The test cases |
| `tests/harness.js` | A small dependency-free test harness, so the same tests run in Node and in a browser |
| `tests/run.js`, `tests/index.html` | Test runners for Node and for the browser |
| `scripts/build.js` | Copies the public site files into `dist/` for deployment |
| `wrangler.jsonc` | Cloudflare config: serve `dist/` as static assets |
| `WORKLOG.md` | Log of prompts, checks and results |

## Pricing rules (as implemented in `src/pricing.js`)

- **Course:** weekly rate × weeks. From 4 weeks on, the long-stay rate (`weekly4plus`) applies to every week.
- **Enrolment fee:** charged once per booking.
- **Accommodation:** weekly rate × weeks. Only types listed for that school can be booked. `accommodation: null` means none is needed, which is valid and costs €0.
- **Seasonal supplement:** belongs to the chosen accommodation. Each stay week whose Monday falls inside the accommodation's ISO-week range (inclusive) is charged `perWeek`. Without accommodation, or with accommodation that has no seasonal rule, the supplement is €0.
- **Dates:** parsed as UTC. A stay must start on a Monday and last a whole number of weeks.
- **Unavailable requests:** an unknown accommodation type, course or school returns `ok: false` with the reason and the school's available options. Nothing is substituted and there is no partial total.

## Local preview

The page uses ES modules, so it needs a local web server (opening `index.html` directly from disk will not load the scripts). Either of these works from the project folder:

```bash
python -m http.server 8000
```

```bash
npx serve .
```

Then open http://localhost:8000/ for the page and http://localhost:8000/tests/ to run the tests in the browser.

## Running the tests

With Node.js 18 or later:

```bash
npm test
```

This runs `node tests/run.js`. It prints PASS/FAIL per test and exits with code 1 if any test fails. With no Node installed, open http://localhost:8000/tests/ while the preview server is running; it runs the same tests and shows the same results.

Covered by the tests:

- the five requests: €2,220, €1,485, €1,800, €1,840, and request 5 (studio apartment) unavailable with no total
- course-rate boundary at 3 versus 4 weeks
- seasonal boundaries at ISO weeks 25, 26, 35 and 36, plus a 12-week stay across the whole range
- no accommodation during the seasonal period
- accommodation without a seasonal supplement
- ISO week numbering across year boundaries (28 Dec 2026 = 2026-W53, 1 Jan 2027 = 2026-W53, 4 Jan 2027 = 2027-W01, 29 Dec 2025 = 2026-W01)
- a start date that is not a Monday, and an unknown course

## Changing prices or requests

Edit `src/catalog.js` or `src/requests.js`. The page and tests pick up the change on the next load. If you change catalog prices, update the expected amounts in `tests/pricing.tests.js` too.

## Deploying to Cloudflare

Live at **https://trip-price-test.ansh605-0e3.workers.dev**

It's hosted as Cloudflare Workers static assets, which Wrangler 4.151 uses for new Pages projects. There is no Worker script: Cloudflare serves the files directly.

```bash
npm install
```

```bash
npx wrangler login
```

```bash
npm run deploy
```

`npm run deploy` runs the tests, then `scripts/build.js` (which copies only `index.html`, `styles.css` and `src/` into `dist/`), then `wrangler deploy`. `wrangler.jsonc` points the assets directory at `./dist`. That way the tests, the task PDF, `.claude/` and `node_modules` are never uploaded.
