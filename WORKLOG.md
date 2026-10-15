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

### Prompt 5: GitHub repo and "How I worked"

> Yes: initialise git, create a public GitHub repo with gh, then add the How I worked section and source link to the page and redeploy.

| Step | Actual result |
|---|---|
| Checked `gh` | **Not installed** (checked the PATH and the usual install folders, after the Node mistake). Git 2.55 was present, with no author identity set. |
| Asked the user | The user approved installing gh with winget, and using the GitHub noreply email as commit author (set for this repo only). |
| `winget install --id GitHub.cli` | First attempt: **exit 1602, "You cancelled the installation"**, because the Windows admin prompt was not accepted. Asked the user, who chose to retry and accept it. Second attempt: installed gh 2.102.0. |
| `gh auth login --web` in a visible terminal tab | The user answered the prompts and entered the one-time code on github.com. The first "done" was early: `gh auth status` said not logged in, and the tab was still waiting for Enter. After the user pressed Enter: logged in as **AnshKapoor**. |
| Chose what to publish | `.gitignore` excludes `*.pdf` (the task brief) and `.claude/`, plus `node_modules/`, `dist/` and `.wrangler/`. Added `.gitattributes` (`eol=lf`). 19 files committed. |
| Wrote the "How I worked" section in `index.html` | Prompts, the Node mistake and how it was caught, the checks, and the deploy path. Rendered locally and checked at 375 px (no horizontal scroll). |
| Filled in the GitHub link with PowerShell | `Set-Content -Encoding utf8` (Windows PowerShell 5.1) **added a BOM** to `index.html`. Found it by checking the first bytes (`ef bb bf`), then removed it. The non-ASCII text (€, −, á) was still intact. |
| `gh repo create trip-price-test --public --source . --push` | https://github.com/AnshKapoor/trip-price-test, **PUBLIC**. Commit `2763036` by `Ansh Kapoor <32305554+AnshKapoor@users.noreply.github.com>`. The repo root lists no PDF and no `.claude/`. Both links on the page return 200. |
| `npm run deploy` | 22 passed. Uploaded only the 2 changed files (`index.html`, `styles.css`; the other 5 were already up). Version `61c7a61d-…`. |
| Live check | Totals unchanged and the "How I worked" section is present with real links. **The first load after deploying used the old `styles.css`**: the browser revalidated it (300 bytes) and kept the stale copy. A direct fetch already returned the new file, and the next load applied it. Same just-after-deploy effect as in Prompt 4. 375 px: no horizontal scroll. |

### Prompt 6: readability review

> Review this project against the PDF requirement: "Simple, readable code that a teammate could change tomorrow." […] Keep catalog data, customer requests, pricing logic, and presentation clearly separated. […] Explain non-obvious rules, especially ISO weeks and the inclusive seasonal range. Ensure all displayed prices come from the shared pricing function. Expand the README […] include a short example prompt [for] a non-technical teammate […]. Do not add an admin interface. Preserve the pricing rules and current design. Run the existing tests after any changes […].

Main finding: `src/pricing.js` mixed calculation with customer-facing wording (labels, explanation sentences, error messages, EUR formatting). A teammate changing a rule had to read past the text, and vice versa.

| Change | Detail |
|---|---|
| Split numbers from wording | `pricing.js` now returns named `charges` (`course`, `enrolment`, `accommodation`, `seasonal`) and an explicit sum as `total`, or `{ ok: false, problem }` with a problem code. All text moved to the new `src/quote-text.js` (`describeCharges`, `explainQuote`, `describeProblem`). `app.js` renders only. |
| Comments | Explained why ISO weeks use the Thursday of the week, with New Year examples. Explained the inclusive `[from, to]` range (26 and 35 charged, 25 and 36 not) and the New Year wrap. Added field guides at the top of `catalog.js` and `requests.js`, including the exact-name rule. |
| Names | `isInIsoWeekRange` → `isInSeasonalRange`, `card` → `requestCard`. Spelled out single-letter names in `pricing.js` (`m` → `match`, `y/mo/d` → `year/month/day`). |
| Slip caught in my own refactor | While rewriting, I changed `request.accommodation != null` to `!== null`. That would have turned a request with the field *missing* into "unknown accommodation" instead of "no accommodation". I reverted it before running anything, to keep behaviour unchanged. |
| New tests (22 → 26) | A seasonal range wrapping over New Year (`[51, 2]`). The displayed lines equal the computed charges and add up to the total for every request. A data check on `catalog.js`. A data check on `requests.js`. Request 5 now also asserts that the reason contains no price. |
| README rewritten | A layer table with exact file paths. Commands table. Recipes for changing a weekly rate, adding a school, and adding a request. A safe example prompt for a non-technical teammate. Known limitations. |

Checks and actual results:

| Check | Result |
|---|---|
| `npm test` | **26 passed, 0 failed** |
| ISO weeks after rewriting `isoWeek()` | Node vs Python `isocalendar()` for 2020–2032: 4,749 days, **identical hash** (`cb0f9d8a…`) |
| Planted a typo in memory (`weekly: "260"` as a string) | Only the new data check failed. The price tests **still passed**, because JavaScript turns `"260" × 3` into 780. So without the data check this typo would have gone unnoticed. |
| Followed my own README example (MAL Standard Spanish €260 → €270) in memory | **My first README draft was wrong**: it said one test would fail, but **three** failed (the 3-week test and both 2-week Málaga tests). I corrected the README to show the real failing output and the new totals (€580 → €600, €1,000 → €1,020). |
| Page unchanged | Compared the rendered text of all 5 cards on the local page (new code, `quote-text.js` loaded) and the live site (old code). **Identical** SHA-256 over 4,179 characters. No console errors. |

### Not done yet

- Commit, push and redeploy this readability pass. The page output is identical, but these steps publish code, so they wait for approval.
- Add `C:\Program Files\nodejs` to the system PATH, so `node`/`npm` work in new terminals (a system setting, left for the user).
