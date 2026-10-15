// Customer-facing wording for a quote. Every amount shown here comes from priceRequest()
// in pricing.js; this file only turns those numbers into readable lines and sentences.
import { LONG_STAY_WEEKS } from "./pricing.js";
import { formatEUR, plural } from "./format.js";

// The four price lines in display order: { label, detail, amount }.
export function describeCharges(quote) {
  const { charges, weeks, longStay, courseRate, course, school, accommodation, seasonalWeeks } = quote;
  return [
    {
      label: `Course: ${course.name}`,
      detail: `${plural(weeks, "week")} × ${formatEUR(courseRate)}`
        + (longStay ? ` (long-stay rate, ${LONG_STAY_WEEKS}+ weeks)` : ""),
      amount: charges.course,
    },
    {
      label: "Enrolment fee",
      detail: `Once per booking at ${school.name}`,
      amount: charges.enrolment,
    },
    {
      label: accommodation ? `Accommodation: ${accommodation.type}` : "Accommodation",
      detail: accommodation ? `${plural(weeks, "week")} × ${formatEUR(accommodation.weekly)}` : "None requested",
      amount: charges.accommodation,
    },
    {
      label: "Seasonal supplement",
      detail: seasonalDetail(accommodation, seasonalWeeks),
      amount: charges.seasonal,
    },
  ];
}

function seasonalDetail(accommodation, seasonalWeeks) {
  if (!accommodation) return "Applies only to accommodation";
  if (!accommodation.seasonal) return "None for this accommodation";
  const [from, to] = accommodation.seasonal.isoWeeks;
  return `${plural(seasonalWeeks, "week")} × ${formatEUR(accommodation.seasonal.perWeek)} (Mondays in ISO weeks ${from}–${to})`;
}

// One sentence on how the total was built.
export function explainQuote(quote) {
  const { weeks, longStay, courseRate, school, accommodation, mondays, seasonalWeeks } = quote;
  const coursePart = `${plural(weeks, "week")} of course at ${formatEUR(courseRate)}/week`
    + (longStay ? ` (the long-stay rate, used for every week because the stay is ${LONG_STAY_WEEKS}+ weeks)` : "");
  const feePart = `the ${formatEUR(school.enrolmentFee)} enrolment fee`;

  if (!accommodation) {
    return `${coursePart}, plus ${feePart}; no accommodation was requested, so there is no accommodation or seasonal charge.`;
  }
  const accommodationPart = `${plural(weeks, "week")} of accommodation at ${formatEUR(accommodation.weekly)}/week`;
  if (!accommodation.seasonal) {
    return `${coursePart}, plus ${feePart} and ${accommodationPart}; this accommodation has no seasonal supplement.`;
  }
  const [from, to] = accommodation.seasonal.isoWeeks;
  const weekList = mondays.map((monday) => monday.isoWeek).join(", ");
  return `${coursePart}, plus ${feePart}, ${accommodationPart}, and a ${formatEUR(accommodation.seasonal.perWeek)} supplement for `
    + `${seasonalWeeks} of ${weeks} stay Mondays (ISO weeks ${weekList}) falling in ISO weeks ${from}–${to}.`;
}

// Why a request cannot be priced, and what the customer could choose instead:
// { reason, optionsTitle, options: [{ name, detail }] }. No price is ever included.
export function describeProblem(quote, catalog) {
  const { problem, request, school } = quote;
  switch (problem) {
    case "unknown-school":
      return {
        reason: `We have no school with code "${request.school}".`,
        optionsTitle: "Available schools",
        options: catalog.schools.map((s) => ({ name: `${s.name} (${s.code})`, detail: `${s.city}, ${s.country}` })),
      };
    case "unknown-course":
      return {
        reason: `${school.name} does not offer "${request.course}".`,
        optionsTitle: `Courses at ${school.name}`,
        options: school.courses.map((c) => ({
          name: c.name,
          detail: `${formatEUR(c.weekly)}/week, ${formatEUR(c.weekly4plus)}/week from ${LONG_STAY_WEEKS} weeks`,
        })),
      };
    case "unknown-accommodation":
      return {
        reason: `${school.name} in ${school.city} has no "${request.accommodation}" accommodation, so this stay cannot be priced as requested.`,
        optionsTitle: `Accommodation available at ${school.name}`,
        options: school.accommodation.map(describeAccommodationOption),
      };
    case "invalid-weeks":
      return { reason: `A stay must last a whole number of weeks (got "${request.weeks}").`, optionsTitle: "", options: [] };
    case "not-a-monday":
      return { reason: `Stays start on a Monday; "${request.start}" is not a Monday.`, optionsTitle: "", options: [] };
    default:
      return { reason: `This request cannot be priced (${problem}).`, optionsTitle: "", options: [] };
  }
}

function describeAccommodationOption(accommodation) {
  const season = accommodation.seasonal
    ? `, plus ${formatEUR(accommodation.seasonal.perWeek)}/week seasonal supplement in ISO weeks `
      + `${accommodation.seasonal.isoWeeks[0]}–${accommodation.seasonal.isoWeeks[1]}`
    : ", no seasonal supplement";
  return { name: accommodation.type, detail: `${formatEUR(accommodation.weekly)}/week${season}` };
}
