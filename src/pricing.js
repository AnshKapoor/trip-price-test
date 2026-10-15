// Pricing rules (from the task PDF). This file only works out numbers; all customer-facing
// wording lives in quote-text.js.
//
// - Course: weekly rate × weeks. From LONG_STAY_WEEKS weeks on, the lower long-stay rate
//   (weekly4plus) applies to ALL weeks, not just the weeks after the 4th.
// - Enrolment fee: once per booking, per school.
// - Accommodation: weekly rate × weeks. Only the types listed for that school exist.
//   accommodation: null means the customer needs none; that is valid and costs €0.
// - Seasonal supplement: belongs to the chosen accommodation, not the course. For each stay week
//   whose Monday falls inside the accommodation's seasonal ISO-week range, charge perWeek once.
// - Stays start on a Monday and last whole weeks. Dates are handled in UTC so the result never
//   depends on the time zone of the computer running the code.
//
// A request that cannot be priced returns { ok: false, problem } and never a partial total.

export const LONG_STAY_WEEKS = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

// Parse "YYYY-MM-DD" as midnight UTC. Returns null for malformed or impossible dates (e.g. 2027-02-30).
export function parseDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate ?? "");
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isRealDate ? date : null;
}

export function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

// ISO 8601 week number. ISO weeks run Monday to Sunday, and week 1 is the week that contains
// the year's first Thursday. So every week belongs to the year its Thursday falls in: we move
// to the Thursday of the date's week and count whole weeks from 1 January of that year.
// Near New Year this differs from the calendar year: Mon 28 Dec 2026 is week 53 of 2026,
// Fri 1 Jan 2027 is still week 53 of 2026, and Mon 29 Dec 2025 is week 1 of 2026.
export function isoWeek(date) {
  const dayOfWeek = date.getUTCDay() || 7; // Monday = 1 … Sunday = 7
  const thursday = new Date(date.getTime() + (4 - dayOfWeek) * DAY_MS);
  const year = thursday.getUTCFullYear();
  const daysSinceNewYear = (thursday - Date.UTC(year, 0, 1)) / DAY_MS;
  return { year, week: Math.floor(daysSinceNewYear / 7) + 1 };
}

// Is an ISO week inside a seasonal range [from, to]? Both ends are INCLUDED: with [26, 35],
// weeks 26 and 35 are charged, 25 and 36 are not. Only the week number is compared, so the
// range repeats every year. A range with from > to wraps over New Year: [51, 2] means 51, 52, 53, 1, 2.
export function isInSeasonalRange(week, [from, to]) {
  if (from <= to) return week >= from && week <= to;
  return week >= from || week <= to;
}

// One entry per stay week: the Monday it starts on and that Monday's ISO week number.
export function stayMondays(startMonday, weeks) {
  return Array.from({ length: weeks }, (_, weekIndex) => {
    const monday = new Date(startMonday.getTime() + weekIndex * 7 * DAY_MS);
    return { date: toIsoDate(monday), isoWeek: isoWeek(monday).week };
  });
}

/**
 * Price one customer request against the catalog.
 *
 * request: { school: "MAL", course: "Standard Spanish", weeks: 4, start: "2027-07-05",
 *            accommodation: "Host family, single room, half board" | null }
 *
 * Priced:   { ok: true, total, charges: { course, enrolment, accommodation, seasonal },
 *             school, course, accommodation, weeks, mondays, longStay, courseRate, seasonalWeeks }
 * Problem:  { ok: false, problem, request, school? } where problem is one of
 *           "unknown-school", "unknown-course", "invalid-weeks", "not-a-monday", "unknown-accommodation".
 */
export function priceRequest(catalog, request) {
  const school = catalog.schools.find((s) => s.code === request.school);
  if (!school) return { ok: false, problem: "unknown-school", request };

  const course = school.courses.find((c) => c.name === request.course);
  if (!course) return { ok: false, problem: "unknown-course", request, school };

  const weeks = request.weeks;
  if (!Number.isInteger(weeks) || weeks < 1) return { ok: false, problem: "invalid-weeks", request, school };

  const start = parseDate(request.start);
  if (!start || start.getUTCDay() !== 1) return { ok: false, problem: "not-a-monday", request, school };

  let accommodation = null;
  if (request.accommodation != null) { // null or missing = no accommodation
    accommodation = school.accommodation.find((a) => a.type === request.accommodation);
    // Never substitute another type: the customer asked for something we cannot sell.
    if (!accommodation) return { ok: false, problem: "unknown-accommodation", request, school };
  }

  const season = accommodation?.seasonal; // undefined when there is no accommodation or no seasonal rule
  const mondays = stayMondays(start, weeks).map((monday) => ({
    ...monday,
    seasonal: season ? isInSeasonalRange(monday.isoWeek, season.isoWeeks) : false,
  }));
  const seasonalWeeks = mondays.filter((monday) => monday.seasonal).length;

  const longStay = weeks >= LONG_STAY_WEEKS;
  const courseRate = longStay ? course.weekly4plus : course.weekly;

  const charges = {
    course: weeks * courseRate,
    enrolment: school.enrolmentFee,
    accommodation: accommodation ? weeks * accommodation.weekly : 0,
    seasonal: season ? seasonalWeeks * season.perWeek : 0,
  };
  const total = charges.course + charges.enrolment + charges.accommodation + charges.seasonal;

  return {
    ok: true, total, charges,
    school, course, accommodation, weeks, mondays, longStay, courseRate, seasonalWeeks,
  };
}
