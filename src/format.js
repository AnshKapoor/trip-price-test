// Display helpers shared by the pricing explanations and the page.
const eur = new Intl.NumberFormat("en-IE", {
  style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2,
});

export function formatEUR(amount) {
  return eur.format(amount);
}

const longDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

// "2027-07-05" -> "Mon 5 Jul 2027"
export function formatDate(isoDate) {
  return longDate.format(new Date(`${isoDate}T00:00:00Z`));
}

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
