# Language trip prices

A static web page that prices five customer requests for language trips. Every line (course, enrolment fee, accommodation, seasonal supplement) and the total are calculated in the browser from the catalog data. No price is typed into the page.

- **Live:** https://trip-price-test.ansh605-0e3.workers.dev
- **Source:** https://github.com/AnshKapoor/trip-price-test

Plain HTML, CSS and JavaScript modules. The page has no runtime dependencies and no framework. Wrangler is the only dev dependency, used to deploy.

## Where things live

The project has four layers, and each has one job:

| Layer | File | What it contains | Change it when… |
|---|---|---|---|
| Data | [`src/catalog.js`](src/catalog.js) | Schools, courses, accommodation, seasonal rules (from the task PDF) | A price, school, course or accommodation changes |
| Data | [`src/requests.js`](src/requests.js) | The customer requests shown on the page | You add or change a request |
| Rules | [`src/pricing.js`](src/pricing.js) | `priceRequest()`: the only place prices are calculated. Also the ISO-week and UTC date helpers. | A pricing *rule* changes |
| Wording | [`src/quote-text.js`](src/quote-text.js) | Line labels, the one-sentence explanation, the "cannot be priced" text and options | The customer-facing text changes |
| Page | [`index.html`](index.html), [`styles.css`](styles.css), [`src/app.js`](src/app.js), [`src/format.js`](src/format.js) | Layout, styling, rendering the cards, EUR and date formatting | The design changes |

Supporting files:

| File | Purpose |
|---|---|
| [`tests/pricing.tests.js`](tests/pricing.tests.js) | All tests, including data checks that catch typos in `catalog.js` and `requests.js` |
| [`tests/harness.js`](tests/harness.js), [`tests/run.js`](tests/run.js), [`tests/index.html`](tests/index.html) | A tiny test harness, plus runners for Node and for the browser |
| [`scripts/build.js`](scripts/build.js) | Copies only the public site files into `dist/` for deployment |
| [`wrangler.jsonc`](wrangler.jsonc) | Cloudflare config: serve `dist/` as static assets |
| [`WORKLOG.md`](WORKLOG.md) | Log of prompts, checks and results |

Flow: `app.js` takes each request from `requests.js`, calls `priceRequest(catalog, request)` in `pricing.js`, gets text from `quote-text.js`, and renders a card. `app.js` and `quote-text.js` never calculate a price. A test checks that the displayed lines equal the computed charges and add up to the total.

## Pricing rules (implemented in `src/pricing.js`)

- **Course:** weekly rate × weeks. From 4 weeks on (`LONG_STAY_WEEKS`), the long-stay rate `weekly4plus` applies to *every* week, not only the weeks after the 4th.
- **Enrolment fee:** charged once per booking.
- **Accommodation:** weekly rate × weeks. Only types listed for that school can be booked. `accommodation: null` means none is needed, which is valid and costs €0.
- **Seasonal supplement:** belongs to the chosen accommodation, not the course. For each stay week, look at the **Monday** it starts on and that Monday's **ISO week number**. If the number is inside the accommodation's `isoWeeks: [from, to]`, **both ends included**, charge `perWeek`. With `[26, 35]`, weeks 26 and 35 are charged and weeks 25 and 36 are not. Without accommodation, or with accommodation that has no `seasonal` entry, the supplement is €0.
- **ISO weeks:** weeks run Monday to Sunday, and week 1 is the week containing the year's first Thursday. Near New Year the ISO year can differ from the calendar year: 28 Dec 2026 is week 53 of 2026, and 29 Dec 2025 is week 1 of 2026. Only the week number is compared with the seasonal range, so a range repeats every year. A range like `[51, 2]` wraps over New Year.
- **Dates:** handled in UTC, so results don't depend on the computer's time zone. A stay must start on a Monday and last a whole number of weeks.
- **Cannot be priced:** an unknown school, course or accommodation type (or a bad date or week count) returns `{ ok: false, problem }`. The page shows the reason and the school's actual options. It never substitutes another type and never shows a partial total.

## Commands

Run all commands from the project folder. Node.js 18 or later is needed for the tests and for deploying.

| Task | Command |
|---|---|
| Run the tests | `npm test` |
| Preview locally | `python -m http.server 8000`, then open http://localhost:8000/ (the page) or http://localhost:8000/tests/ (the tests in a browser) |
| First-time deploy setup | `npm install`, then `npx wrangler login` |
| Redeploy | `npm run deploy` (runs the tests, builds `dist/`, uploads; stops if a test fails) |

```bash
npm test
```

```bash
python -m http.server 8000
```

```bash
npm run deploy
```

The page uses ES modules, so it needs a web server. Opening `index.html` straight from disk won't load the scripts. `npx serve .` works too, instead of Python.

## How to make common changes

After any change, run `npm test`, check the page locally, then `npm run deploy`.

### Change a weekly rate

Example: Sol Language School's Standard Spanish goes from €260 to €270 per week. In [`src/catalog.js`](src/catalog.js), under the school with `code: "MAL"`:

```js
{ name: "Standard Spanish", weekly: 270, weekly4plus: 235 },   // was weekly: 260
```

Then run `npm test`. Tests that expect the old price fail, and each one shows the expected and actual amounts. This example breaks three tests in [`tests/pricing.tests.js`](tests/pricing.tests.js):

```text
FAIL  Course: 3 weeks uses the normal rate (3 × €260 = €780)
      expected 780, got 810
FAIL  No accommodation in peak season: zero accommodation and zero supplement
      expected {"course":520,...}, got {"course":540,...}
FAIL  Accommodation without a seasonal rule: shared apartment in July has no supplement
      expected {"course":520,...}, got {"course":540,...}
```

Check that each new figure is what you meant (3 × €270 = €810, 2 × €270 = €540), then update those expected amounts and their totals (€580 → €600, €1,000 → €1,020). Request 1 is 4 weeks, so it uses `weekly4plus` and doesn't change.

Accommodation and seasonal prices work the same way: change `weekly` on the accommodation, or `perWeek` / `isoWeeks` inside its `seasonal` entry.

### Add a school

Add an object to `schools` in [`src/catalog.js`](src/catalog.js). The code must be unique. Leave out `seasonal` if there's no supplement.

```js
{
  code: "BER", name: "Spree Sprachschule", city: "Berlin", country: "Germany", enrolmentFee: 70,
  courses: [
    { name: "Standard German", weekly: 270, weekly4plus: 245 },
  ],
  accommodation: [
    { type: "Host family, single room, half board", weekly: 280,
      seasonal: { isoWeeks: [27, 34], perWeek: 30 } },
    { type: "Student residence, single room", weekly: 330 },
  ],
},
```

`npm test` includes a data check ("Catalog data is complete and consistent"). It fails with a clear message if a price is missing or isn't a number, if a code is duplicated, or if the season isn't a valid `[from, to]` pair of weeks 1–53.

### Add a customer request

Add an object to the list in [`src/requests.js`](src/requests.js). It appears as a new card, in list order. The `course` and `accommodation` must match the names in `catalog.js` exactly, including capital letters. Use `null` for no accommodation.

```js
{
  id: 6,
  text: "3 weeks of German in Berlin from 2 August 2027, host family please.",
  school: "BER", course: "Standard German", weeks: 3, start: "2027-08-02",
  accommodation: "Host family, single room, half board",
},
```

`start` must be a Monday, written as `YYYY-MM-DD`. The data check fails if the id is a duplicate or the school/course doesn't exist. If the accommodation name isn't one the school offers, the card shows "Cannot be priced" with the real options. That's deliberate, so check the spelling if you didn't mean it. To pin the price, add a test for the new request in `tests/pricing.tests.js`, modelled on the "Request 1" test.

### For a non-technical teammate: ask Claude Code

You can make a catalog change by giving Claude Code a prompt like this in this folder:

> In src/catalog.js, change the weekly price of "Standard Spanish" at Sol Language School (MAL) from €260 to €270. Don't change the long-stay rate or anything else. Then run `npm test`. If tests fail only because they expected the old price, show me each one with the old and new amount, and update them only after I confirm. Then start a local preview and tell me which cards on the page changed and by how much. Don't deploy until I say so.

This keeps the change small, lets you check every changed figure before it's accepted, and doesn't publish anything until you approve.

## Tests

`npm test` runs [`tests/run.js`](tests/run.js). It prints PASS/FAIL per test and exits with code 1 if any test fails. The same tests run in the browser at http://localhost:8000/tests/.

They cover:

- the five requests: €2,220, €1,485, €1,800, €1,840, and request 5 (studio apartment) unavailable with no total and no price in the reason
- the course-rate boundary at 3 versus 4 weeks
- seasonal boundaries at ISO weeks 25, 26, 35 and 36, a 12-week stay across the whole range, and a range that wraps over New Year
- no accommodation during the seasonal period, and accommodation without a seasonal supplement
- ISO weeks across year boundaries (28 Dec 2026 = 2026-W53, 1 Jan 2027 = 2026-W53, 4 Jan 2027 = 2027-W01, 29 Dec 2025 = 2026-W01)
- a start date that isn't a Monday, and an unknown course
- that the displayed lines equal the computed charges and add up to the total
- data checks on `catalog.js` and `requests.js`

## Deployment

It's hosted as Cloudflare Workers static assets, which Wrangler 4.151 uses for new Pages projects. There is no Worker script: Cloudflare serves the files directly. `npm run deploy` runs the tests, then [`scripts/build.js`](scripts/build.js) (which copies only `index.html`, `styles.css` and `src/` into `dist/`), then `wrangler deploy`. The tests, the task PDF, `.claude/` and `node_modules` are never uploaded. Right after a deploy, a browser may show the previous `styles.css` once. A reload fixes it.

## Known limitations

- Requests are typed into `src/requests.js` as structured data. There's no free-text input on the page.
- Names must match the catalog exactly. A misspelt accommodation name shows as "cannot be priced" rather than an error.
- Seasonal ranges compare only the week number, not the year, so a season can't be limited to one particular year.
- All prices are whole euros with no VAT, discounts or currency conversion, as in the task data.
- There is no admin interface. Prices are changed by editing `src/catalog.js` and redeploying.
