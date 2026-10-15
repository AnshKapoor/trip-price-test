# Work log

A factual record of the prompts given to Claude Code, the checks run, and what actually happened.

## 2026-10-15

### Prompt 1: analysis only, no code

> Read Trip-Price-Test-Ansh.pdf in this folder. Before writing code: extract the catalog and five customer requests; calculate each request with separate course, enrolment fee, accommodation, seasonal supplement, and total lines; show the ISO week number for each Monday in each stay; apply the long-stay course rate to all weeks for stays of 4 weeks or more; for unavailable accommodation, list the available options without showing a partial total. Calculate independently from the PDF. Stop after the analysis so I can check your answers.

What Claude did:
- Read both pages of the PDF and copied out the catalog JSON and the five requests.
- Worked out the ISO weeks with Python's `date.isocalendar()` (not from memory). It also confirmed that every start date is a Monday.
- Results reported: 1 = €2,220, 2 = €1,485, 3 = €1,800, 4 = €1,840, 5 = cannot be priced (MAL has no studio apartment). It listed the host family at €270/week (+€35/week in weeks 26–35) and the shared apartment at €210/week.
- It flagged the parts that need a judgment call: request 3 has no accommodation and no supplement, request 2 has only week 26 seasonal, and request 4 counts week 35 but not week 36.

Check by me: I confirmed the analysis was correct before allowing any implementation.

### Prompt 2: implementation

> Implement the assignment now in this project folder. Use a simple static website with HTML, CSS and JavaScript, suitable for Cloudflare Pages. Keep dependencies minimal. […] Store the complete PDF catalog and five requests as structured data. Put the pricing logic in a separate module. […] Calculate ISO weeks correctly using UTC dates. […] Reject unavailable accommodation without substituting another type or displaying a partial total. […] Write and run automated tests covering: the five requests; the course-rate boundary at 3 versus 4 weeks; seasonal boundaries at ISO weeks 25, 26, 35 and 36; no accommodation during the seasonal period; accommodation without a seasonal supplement; ISO week numbering across a year boundary. Add a README with local preview and test instructions. Keep a factual work log of prompts, checks and actual […]

(The prompt was cut off after "actual".)

What Claude built: `src/catalog.js`, `src/requests.js`, `src/pricing.js`, `src/format.js`, `src/app.js`, `index.html`, `styles.css`, a test suite (`tests/`), and this log plus `README.md`.

### Checks and their actual results

| Check | How | Result |
|---|---|---|
| Node available for `npm test`? | `node --version` | **Not installed** on this machine (`node: command not found`); Python 3.13 is. So the tests use a small harness that runs in Node *and* in the browser, and were run in the browser. `npm test` has not been run yet. |
| Test suite | Opened `http://localhost:8000/tests/` (Python `http.server`) | **22 passed, 0 failed** |
| Can the tests fail? | Changed `weeks >= LONG_STAY_WEEKS` to `weeks > LONG_STAY_WEEKS` on purpose and re-ran | **2 failed** as expected: request 1 (course €1,040 instead of €940) and the 4-week boundary test. Then reverted the change and re-ran: 22 passed. |
| ISO-week function against a reference | Compared the JS `isoWeek()` for every day from 2020-01-01 to 2032-12-31 with Python's `isocalendar()`, using a SHA-256 hash of the full list | Both 4,749 days, **identical hash** (`cb0f9d8a…08691b9`) |
| Page shows the correct figures | Read the rendered page text | Cards show €2,220 / €1,485 / €1,800 / €1,840 with all four lines each; request 5 shows "Not available", the reason, both Málaga options, and no total. No console errors. |
| Phone layout | Browser viewport at 375×812 | Single column, no horizontal scroll (`scrollWidth` = `clientWidth` = 375), all text readable |
| Text contrast | Calculated WCAG contrast ratios for the colour pairs | All ≥ 6.5:1 (AA needs 4.5:1). Light: muted 7.75, accent 7.54, accent-on-badge 6.54, warning 7.1. Dark: 7.42–11.25. |

### Things that went wrong or were corrected

- **Contrast numbers in the CSS comments were estimates and were wrong.** Claude first wrote "7.6:1", "7.4:1" and "7.0:1" into `styles.css`, then measured 7.75, 7.54 and 7.1. The comments were changed to the measured values.
- **"No Node on the machine" was only partly true.** `node` was not on the PATH, so Claude concluded Node was not installed. It did not install software without asking. It made the tests runnable in both environments and ran them in the browser instead. (Corrected later the same day: see Prompt 3.)
- During the deliberate-failure test the browser preview tab closed once. Claude reopened it and ran the check again. This had no effect on the results.

### Prompt 3: install Node and run the tests

> Yes, install Node.js LTS with winget, then run npm test.

| Step | Actual result |
|---|---|
| `winget install --id OpenJS.NodeJS.LTS -e` | Downloaded Node 24.20.0 (hash verified), but the MSI **failed with exit code 1603** |
| Read the installer log | Cause: *"A later version of Node.js is already installed."* The registry lists Node.js 26.12.0, and `C:\Program Files\nodejs\node.exe` exists. That folder is not on the system PATH, which is why `node` was "not found" earlier. Nothing new was installed, and PATH was left unchanged. |
| `npm test` (Node v26.12.0, npm 11.20.0, `C:\Program Files\nodejs` added to the PATH for this shell only) | **22 passed, 0 failed, exit code 0** |
| `node tests/run.js` with `TZ` set to Pacific/Kiritimati (UTC+14), America/Los_Angeles (UTC−8) and Pacific/Pago_Pago (UTC−11) | **22 passed, 0 failed** in all three. The date logic does not depend on the local time zone. |

### Prompt 4: deploy

> Yes, deploy only index.html, styles.css and src/ to Cloudflare Pages using the Cloudflare skills.

| Step | Actual result |
|---|---|
| Loaded the `cloudflare:wrangler` skill. Ran `npm install --save-dev wrangler` | Wrangler 4.151.0 installed locally. npm skipped the install scripts for esbuild and workerd; a static-asset deploy turned out not to need them. |
| Read `wrangler pages deploy --help` and `pages project create --help` | Confirmed the flags before using them |
| Added `scripts/build.js` (copies only `index.html`, `styles.css` and `src/` into `dist/`) and ran it | `dist/` contained exactly 7 files |
| `wrangler login` | OAuth page opened in the user's browser. **The user approved it**; Claude did not touch the sign-in page. Account: one Cloudflare account, no existing Pages projects. |
| `wrangler pages project create trip-price-test --production-branch main` | **Failed.** Wrangler now hands new Pages projects to "the latest version of Cloudflare Pages, now part of Cloudflare Workers", and that path errored with "Missing entry-point to Worker script or to assets directory". Nothing was created. The follow-up `wrangler pages deploy` then failed with "project does not exist". |
| Choice | Claude asked the user to pick classic Pages (`--force`) or Workers static assets. **The user chose Workers static assets.** |
| Added `wrangler.jsonc` (`assets.directory: ./dist`, no Worker script). Ran `wrangler deploy --dry-run` | Read the 8 entries in `dist/` (7 files + the `src` folder) with no bindings. |
| `npm run deploy` (= `npm test` → build → `wrangler deploy`) | 22 tests passed. **Uploaded exactly 7 files.** Live at https://trip-price-test.ansh605-0e3.workers.dev (version `c34ce356-…`). |
| Live check in the browser | Cards show €2,220 / €1,485 / €1,800 / €1,840 and request 5 "Not available" with no total row. Served over HTTPS. `/tests/`, the PDF, `package.json`, `.claude/settings.json` and `WORKLOG.md` all return **404**. |
| Live check at phone width (375×812, Android UA) | No horizontal scroll (`scrollWidth` 375 = `clientWidth` 375) |
| Odd result | On the **first** page load after deploying, `styles.css` returned 404. The reload returned 200, and 24 follow-up requests (styles, page, script, 8 rounds each) all returned 200. This looks like propagation delay right after the deploy. It did not happen again. |

### Not done yet

- Add `C:\Program Files\nodejs` to the system PATH, so `node`/`npm` work in new terminals (a system setting, left for the user).
- The "How I worked" section and the source-code link on the page itself, which the PDF asks for. The deployment URL is known now. The GitHub repository does not exist yet.
