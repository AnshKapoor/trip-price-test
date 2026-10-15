import { catalog } from "../src/catalog.js";
import { requests } from "../src/requests.js";
import { priceRequest, isoWeek, parseDate, isInSeasonalRange } from "../src/pricing.js";
import { describeCharges, explainQuote, describeProblem } from "../src/quote-text.js";
import { assert, assertEqual } from "./harness.js";

const request = (id) => requests.find((r) => r.id === id);
const amounts = (quote) => quote.charges;
const week = (isoDate) => isoWeek(parseDate(isoDate));

// Málaga host family: €270/week, seasonal €35/week in ISO weeks 26–35.
const malagaHostFamily = (start, weeks = 1) => priceRequest(catalog, {
  school: "MAL", course: "Standard Spanish", weeks, start,
  accommodation: "Host family, single room, half board",
});

export const tests = [
  // The five requests from the PDF.
  { name: "Request 1: Málaga 4 weeks standard + host family in summer = €2,220", fn() {
    const q = priceRequest(catalog, request(1));
    assert(q.ok, "should be priced");
    assertEqual(amounts(q), { course: 940, enrolment: 60, accommodation: 1080, seasonal: 140 });
    assertEqual(q.mondays.map((m) => m.isoWeek), [27, 28, 29, 30]);
    assertEqual(q.total, 2220);
  } },
  { name: "Request 2: Dublin 2 weeks + student residence, only week 26 seasonal = €1,485", fn() {
    const q = priceRequest(catalog, request(2));
    assertEqual(amounts(q), { course: 600, enrolment: 75, accommodation: 760, seasonal: 50 });
    assertEqual(q.mondays.map((m) => [m.isoWeek, m.seasonal]), [[25, false], [26, true]]);
    assertEqual(q.total, 1485);
  } },
  { name: "Request 3: Málaga 6 weeks intensive, no accommodation = €1,800", fn() {
    const q = priceRequest(catalog, request(3));
    assertEqual(amounts(q), { course: 1740, enrolment: 60, accommodation: 0, seasonal: 0 });
    assertEqual(q.mondays.map((m) => m.isoWeek), [36, 37, 38, 39, 40, 41]);
    assertEqual(q.total, 1800);
  } },
  { name: "Request 4: Nice 3 weeks + host family, weeks 34–35 seasonal, 36 not = €1,840", fn() {
    const q = priceRequest(catalog, request(4));
    assertEqual(amounts(q), { course: 840, enrolment: 50, accommodation: 870, seasonal: 80 });
    assertEqual(q.mondays.map((m) => [m.isoWeek, m.seasonal]), [[34, true], [35, true], [36, false]]);
    assertEqual(q.total, 1840);
  } },
  { name: "Request 5: studio apartment in Málaga is unavailable, no total, options listed", fn() {
    const q = priceRequest(catalog, request(5));
    assertEqual(q.ok, false);
    assertEqual(q.problem, "unknown-accommodation");
    assert(!("total" in q) && !("charges" in q), "must not carry a total or partial charges");
    const text = describeProblem(q, catalog);
    assert(text.reason.includes("Studio apartment"), "reason should name the missing type");
    assert(!/€\s?\d/.test(text.reason), "reason must not contain a price");
    assertEqual(text.options.map((o) => o.name),
      ["Host family, single room, half board", "Shared apartment, single room"]);
  } },

  // Course rate boundary.
  { name: "Course: 3 weeks uses the normal rate (3 × €260 = €780)", fn() {
    const q = priceRequest(catalog, { school: "MAL", course: "Standard Spanish", weeks: 3, start: "2027-10-04", accommodation: null });
    assertEqual(amounts(q).course, 780);
  } },
  { name: "Course: 4 weeks uses the long-stay rate for all weeks (4 × €235 = €940)", fn() {
    const q = priceRequest(catalog, { school: "MAL", course: "Standard Spanish", weeks: 4, start: "2027-10-04", accommodation: null });
    assertEqual(amounts(q).course, 940);
  } },

  // Seasonal boundaries (2027: week 25 = 21 Jun, 26 = 28 Jun, 35 = 30 Aug, 36 = 6 Sep).
  { name: "Seasonal: Monday in ISO week 25 is not charged", fn() {
    assertEqual(week("2027-06-21").week, 25);
    assertEqual(amounts(malagaHostFamily("2027-06-21")).seasonal, 0);
  } },
  { name: "Seasonal: Monday in ISO week 26 is charged (start of range, inclusive)", fn() {
    assertEqual(week("2027-06-28").week, 26);
    assertEqual(amounts(malagaHostFamily("2027-06-28")).seasonal, 35);
  } },
  { name: "Seasonal: Monday in ISO week 35 is charged (end of range, inclusive)", fn() {
    assertEqual(week("2027-08-30").week, 35);
    assertEqual(amounts(malagaHostFamily("2027-08-30")).seasonal, 35);
  } },
  { name: "Seasonal: Monday in ISO week 36 is not charged", fn() {
    assertEqual(week("2027-09-06").week, 36);
    assertEqual(amounts(malagaHostFamily("2027-09-06")).seasonal, 0);
  } },
  { name: "Seasonal: a stay over weeks 25–36 is charged only for weeks 26–35 (10 × €35)", fn() {
    const q = malagaHostFamily("2027-06-21", 12);
    assertEqual(amounts(q).seasonal, 350);
  } },

  // No accommodation, and accommodation without a supplement.
  { name: "No accommodation in peak season: zero accommodation and zero supplement", fn() {
    const q = priceRequest(catalog, { school: "MAL", course: "Standard Spanish", weeks: 2, start: "2027-07-05", accommodation: null });
    assert(q.ok, "no accommodation is a valid choice");
    assertEqual(amounts(q), { course: 520, enrolment: 60, accommodation: 0, seasonal: 0 });
    assertEqual(q.total, 580);
  } },
  { name: "Accommodation without a seasonal rule: shared apartment in July has no supplement", fn() {
    const q = priceRequest(catalog, { school: "MAL", course: "Standard Spanish", weeks: 2, start: "2027-07-12", accommodation: "Shared apartment, single room" });
    assertEqual(amounts(q), { course: 520, enrolment: 60, accommodation: 420, seasonal: 0 });
    assertEqual(q.total, 1000);
  } },
  { name: "Dublin host family in summer: supplement of the residence is not applied", fn() {
    const q = priceRequest(catalog, { school: "DUB", course: "General English", weeks: 2, start: "2027-07-05", accommodation: "Host family, single room, half board" });
    assertEqual(amounts(q).seasonal, 0);
  } },

  // ISO weeks across year boundaries (UTC).
  { name: "ISO week: Mon 28 Dec 2026 is week 53 of 2026", fn() {
    assertEqual(week("2026-12-28"), { year: 2026, week: 53 });
  } },
  { name: "ISO week: Fri 1 Jan 2027 is still week 53 of 2026", fn() {
    assertEqual(week("2027-01-01"), { year: 2026, week: 53 });
  } },
  { name: "ISO week: Mon 4 Jan 2027 is week 1 of 2027", fn() {
    assertEqual(week("2027-01-04"), { year: 2027, week: 1 });
  } },
  { name: "ISO week: Mon 29 Dec 2025 is week 1 of 2026", fn() {
    assertEqual(week("2025-12-29"), { year: 2026, week: 1 });
  } },
  { name: "ISO week: a stay over new year lists weeks 52, 53, 1", fn() {
    const q = priceRequest(catalog, { school: "NIC", course: "Standard French", weeks: 3, start: "2026-12-21", accommodation: null });
    assertEqual(q.mondays.map((m) => [m.date, m.isoWeek]),
      [["2026-12-21", 52], ["2026-12-28", 53], ["2027-01-04", 1]]);
  } },

  // Input checks.
  { name: "Start date that is not a Monday is rejected", fn() {
    const q = priceRequest(catalog, { school: "MAL", course: "Standard Spanish", weeks: 1, start: "2027-07-06", accommodation: null });
    assertEqual(q.problem, "not-a-monday");
  } },
  { name: "Unknown course is rejected and the school's courses are listed", fn() {
    const q = priceRequest(catalog, { school: "NIC", course: "Intensive French", weeks: 1, start: "2027-07-05", accommodation: null });
    assertEqual(q.problem, "unknown-course");
    assertEqual(describeProblem(q, catalog).options.map((o) => o.name), ["Standard French"]);
  } },
  { name: "Seasonal range that wraps over New Year: [51, 2] includes 51–53 and 1–2 only", fn() {
    assertEqual([50, 51, 53, 1, 2, 3].map((w) => isInSeasonalRange(w, [51, 2])), [false, true, true, true, true, false]);
  } },

  // The displayed lines are exactly the computed charges.
  { name: "Displayed lines come from priceRequest and add up to the total, for every request", fn() {
    for (const r of requests) {
      const q = priceRequest(catalog, r);
      if (!q.ok) continue;
      const shown = describeCharges(q).map((line) => line.amount);
      assertEqual(shown, Object.values(q.charges), `request ${r.id} lines`);
      assertEqual(shown.reduce((a, b) => a + b, 0), q.total, `request ${r.id} total`);
      assert(explainQuote(q).length > 0, `request ${r.id} explanation`);
    }
  } },

  // Data checks: catch typos when someone edits catalog.js or requests.js.
  { name: "Catalog data is complete and consistent", fn() {
    const isPrice = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0;
    const codes = catalog.schools.map((s) => s.code);
    assertEqual(new Set(codes).size, codes.length, "school codes must be unique");
    for (const s of catalog.schools) {
      assert(isPrice(s.enrolmentFee), `${s.code}: enrolmentFee must be a number`);
      assert(s.courses.length > 0, `${s.code}: needs at least one course`);
      for (const c of s.courses) {
        assert(isPrice(c.weekly) && isPrice(c.weekly4plus), `${s.code} "${c.name}": weekly and weekly4plus must be numbers`);
        assert(c.weekly4plus <= c.weekly, `${s.code} "${c.name}": long-stay rate should not be higher than the weekly rate`);
      }
      for (const a of s.accommodation) {
        assert(isPrice(a.weekly), `${s.code} "${a.type}": weekly must be a number`);
        if (a.seasonal) {
          const [from, to] = a.seasonal.isoWeeks ?? [];
          assert([from, to].every((w) => Number.isInteger(w) && w >= 1 && w <= 53),
            `${s.code} "${a.type}": seasonal.isoWeeks must be [from, to] with weeks 1–53`);
          assert(isPrice(a.seasonal.perWeek), `${s.code} "${a.type}": seasonal.perWeek must be a number`);
        }
      }
    }
  } },
  { name: "Every customer request has a unique id and points at a real school and course", fn() {
    const ids = requests.map((r) => r.id);
    assertEqual(new Set(ids).size, ids.length, "request ids must be unique");
    for (const r of requests) {
      const school = catalog.schools.find((s) => s.code === r.school);
      assert(school, `request ${r.id}: unknown school "${r.school}"`);
      assert(school.courses.some((c) => c.name === r.course), `request ${r.id}: "${r.course}" is not a course at ${r.school}`);
      assert(typeof r.text === "string" && r.text.length > 0, `request ${r.id}: text is missing`);
    }
  } },
];
