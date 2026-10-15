// Pricing rules from the PDF:
// - Course: weekly rate × weeks; from 4 weeks on, the long-stay rate applies to ALL weeks.
// - Enrolment fee: once per booking, per school.
// - Accommodation: weekly rate × weeks; only the types listed for that school exist.
// - Seasonal supplement: belongs to the accommodation. Charged per week for each stay week whose
//   Monday falls in the accommodation's ISO week range (inclusive).
// - Stays start on a Monday and last whole weeks.
// If a request cannot be priced, we return ok: false with the reason and the available options,
// and never a partial total.
import { formatEUR, plural } from "./format.js";

export const LONG_STAY_WEEKS = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

// Parse "YYYY-MM-DD" as a UTC date (no local time zone involved). Returns null if invalid.
export function parseDate(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate ?? "");
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  const roundTrips = date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
  return roundTrips ? date : null;
}

export function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

// ISO 8601 week: weeks start on Monday; week 1 is the week containing the year's first Thursday.
export function isoWeek(date) {
  const thursday = new Date(date.getTime());
  const dayOfWeek = date.getUTCDay() || 7; // Mon=1 … Sun=7
  thursday.setUTCDate(date.getUTCDate() + 4 - dayOfWeek);
  const year = thursday.getUTCFullYear();
  const week = Math.floor((thursday - Date.UTC(year, 0, 1)) / DAY_MS / 7) + 1;
  return { year, week };
}

// Inclusive range check. A range like [50, 2] wraps over the new year.
export function isInIsoWeekRange(week, [from, to]) {
  return from <= to ? week >= from && week <= to : week >= from || week <= to;
}

// The Monday of each stay week with its ISO week number.
export function stayMondays(start, weeks) {
  return Array.from({ length: weeks }, (_, i) => {
    const monday = new Date(start.getTime() + i * 7 * DAY_MS);
    return { date: toIsoDate(monday), isoWeek: isoWeek(monday).week };
  });
}

function unavailable(reason, availableTitle, available) {
  return { ok: false, reason, availableTitle, available };
}

function describeAccommodation(acc) {
  const season = acc.seasonal
    ? `, plus ${formatEUR(acc.seasonal.perWeek)}/week seasonal supplement in ISO weeks ${acc.seasonal.isoWeeks[0]}–${acc.seasonal.isoWeeks[1]}`
    : ", no seasonal supplement";
  return { name: acc.type, detail: `${formatEUR(acc.weekly)}/week${season}` };
}

/**
 * Price one request against the catalog.
 * request: { school, course, weeks, start: "YYYY-MM-DD", accommodation: type name | null }
 * Returns { ok: true, lines, total, mondays, explanation, ... } or
 *         { ok: false, reason, availableTitle, available: [{ name, detail }] }.
 */
export function priceRequest(catalog, request) {
  const school = catalog.schools.find((s) => s.code === request.school);
  if (!school) {
    return unavailable(`We have no school with code "${request.school}".`, "Available schools",
      catalog.schools.map((s) => ({ name: `${s.name} (${s.code})`, detail: `${s.city}, ${s.country}` })));
  }

  const course = school.courses.find((c) => c.name === request.course);
  if (!course) {
    return unavailable(`${school.name} does not offer "${request.course}".`, `Courses at ${school.name}`,
      school.courses.map((c) => ({
        name: c.name,
        detail: `${formatEUR(c.weekly)}/week, ${formatEUR(c.weekly4plus)}/week from ${LONG_STAY_WEEKS} weeks`,
      })));
  }

  const weeks = request.weeks;
  if (!Number.isInteger(weeks) || weeks < 1) {
    return unavailable(`A stay must last a whole number of weeks (got "${weeks}").`, "", []);
  }

  const start = parseDate(request.start);
  if (!start || start.getUTCDay() !== 1) {
    return unavailable(`Stays start on a Monday; "${request.start}" is not a Monday.`, "", []);
  }

  let accommodation = null;
  if (request.accommodation != null) {
    accommodation = school.accommodation.find((a) => a.type === request.accommodation);
    if (!accommodation) {
      return unavailable(
        `${school.name} in ${school.city} has no "${request.accommodation}" accommodation, so this stay cannot be priced as requested.`,
        `Accommodation available at ${school.name}`,
        school.accommodation.map(describeAccommodation),
      );
    }
  }

  const mondays = stayMondays(start, weeks).map((m) => ({
    ...m,
    seasonal: Boolean(accommodation?.seasonal) && isInIsoWeekRange(m.isoWeek, accommodation.seasonal.isoWeeks),
  }));

  const longStay = weeks >= LONG_STAY_WEEKS;
  const courseRate = longStay ? course.weekly4plus : course.weekly;
  const seasonalWeeks = mondays.filter((m) => m.seasonal).length;
  const seasonalRate = accommodation?.seasonal?.perWeek ?? 0;

  const lines = [
    {
      key: "course",
      label: `Course: ${course.name}`,
      detail: `${plural(weeks, "week")} × ${formatEUR(courseRate)}${longStay ? ` (long-stay rate, ${LONG_STAY_WEEKS}+ weeks)` : ""}`,
      amount: weeks * courseRate,
    },
    {
      key: "enrolment",
      label: "Enrolment fee",
      detail: `Once per booking at ${school.name}`,
      amount: school.enrolmentFee,
    },
    {
      key: "accommodation",
      label: accommodation ? `Accommodation: ${accommodation.type}` : "Accommodation",
      detail: accommodation ? `${plural(weeks, "week")} × ${formatEUR(accommodation.weekly)}` : "None requested",
      amount: accommodation ? weeks * accommodation.weekly : 0,
    },
    {
      key: "seasonal",
      label: "Seasonal supplement",
      detail: seasonalDetail(accommodation, seasonalWeeks),
      amount: seasonalWeeks * seasonalRate,
    },
  ];
  const total = lines.reduce((sum, line) => sum + line.amount, 0);

  return {
    ok: true, school, course, accommodation, weeks, mondays, lines, total,
    explanation: explain({ weeks, longStay, courseRate, school, accommodation, mondays, seasonalWeeks }),
  };
}

function seasonalDetail(accommodation, seasonalWeeks) {
  if (!accommodation) return "Applies only to accommodation";
  if (!accommodation.seasonal) return "None for this accommodation";
  const [from, to] = accommodation.seasonal.isoWeeks;
  return `${plural(seasonalWeeks, "week")} × ${formatEUR(accommodation.seasonal.perWeek)} (Mondays in ISO weeks ${from}–${to})`;
}

function explain({ weeks, longStay, courseRate, school, accommodation, mondays, seasonalWeeks }) {
  const coursePart = `${plural(weeks, "week")} of course at ${formatEUR(courseRate)}/week`
    + (longStay ? ` (the long-stay rate, used for every week because the stay is ${LONG_STAY_WEEKS}+ weeks)` : "");
  const feePart = `the ${formatEUR(school.enrolmentFee)} enrolment fee`;

  if (!accommodation) {
    return `${coursePart}, plus ${feePart}; no accommodation was requested, so there is no accommodation or seasonal charge.`;
  }
  const accPart = `${plural(weeks, "week")} of accommodation at ${formatEUR(accommodation.weekly)}/week`;
  if (!accommodation.seasonal) {
    return `${coursePart}, plus ${feePart} and ${accPart}; this accommodation has no seasonal supplement.`;
  }
  const [from, to] = accommodation.seasonal.isoWeeks;
  const weekList = mondays.map((m) => m.isoWeek).join(", ");
  return `${coursePart}, plus ${feePart}, ${accPart}, and a ${formatEUR(accommodation.seasonal.perWeek)} supplement for `
    + `${seasonalWeeks} of ${weeks} stay Mondays (ISO weeks ${weekList}) falling in ISO weeks ${from}–${to}.`;
}
