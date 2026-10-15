// Renders one card per customer request. All numbers come from priceRequest().
import { catalog } from "./catalog.js";
import { requests } from "./requests.js";
import { priceRequest } from "./pricing.js";
import { formatEUR, formatDate, plural } from "./format.js";

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child != null) node.append(child);
  }
  return node;
}

function summary(request, school) {
  const where = school ? `${school.name}, ${school.city}` : request.school;
  const stay = `${plural(request.weeks, "week")} from ${formatDate(request.start)}`;
  const acc = request.accommodation ?? "No accommodation";
  return el("dl", { class: "summary" },
    el("dt", {}, "School"), el("dd", {}, where),
    el("dt", {}, "Course"), el("dd", {}, request.course),
    el("dt", {}, "Stay"), el("dd", {}, stay),
    el("dt", {}, "Accommodation"), el("dd", {}, acc),
  );
}

function linesTable(quote) {
  return el("table", { class: "lines" },
    el("caption", { class: "visually-hidden" }, "Price breakdown"),
    el("tbody", {},
      quote.lines.map((line) => el("tr", {},
        el("th", { scope: "row" },
          el("span", { class: "line-label" }, line.label),
          el("span", { class: "line-detail" }, line.detail)),
        el("td", {}, formatEUR(line.amount)),
      )),
    ),
    el("tfoot", {},
      el("tr", { class: "total" },
        el("th", { scope: "row" }, "Total"),
        el("td", {}, formatEUR(quote.total)),
      ),
    ),
  );
}

function mondaysList(quote) {
  return el("div", { class: "mondays" },
    el("h4", {}, "Stay Mondays and ISO weeks"),
    el("ul", {},
      quote.mondays.map((m) => el("li", { class: m.seasonal ? "seasonal" : "" },
        `${formatDate(m.date)} · week ${m.isoWeek}`,
        m.seasonal ? el("span", { class: "tag" }, " · seasonal") : null,
      )),
    ),
  );
}

function pricedBody(quote) {
  return [
    linesTable(quote),
    el("p", { class: "explanation" }, quote.explanation),
    mondaysList(quote),
  ];
}

function unavailableBody(quote) {
  return [
    el("div", { class: "notice", role: "note" },
      el("p", {}, el("strong", {}, "Cannot be priced. "), quote.reason),
      el("p", {}, "No total is shown, because any figure would leave out part of the trip."),
    ),
    quote.available.length
      ? el("div", { class: "options" },
          el("h4", {}, quote.availableTitle),
          el("ul", {}, quote.available.map((o) => el("li", {}, el("strong", {}, o.name), el("br"), o.detail))),
        )
      : null,
  ];
}

function card(request) {
  const quote = priceRequest(catalog, request);
  const school = catalog.schools.find((s) => s.code === request.school);
  const headingId = `request-${request.id}`;
  return el("article", { class: `card ${quote.ok ? "" : "card-unavailable"}`, "aria-labelledby": headingId },
    el("header", { class: "card-header" },
      el("h3", { id: headingId }, `Request ${request.id}`),
      el("span", { class: `badge ${quote.ok ? "badge-ok" : "badge-warn"}` },
        quote.ok ? formatEUR(quote.total) : "Not available"),
    ),
    el("blockquote", {}, `“${request.text}”`),
    summary(request, school),
    quote.ok ? pricedBody(quote) : unavailableBody(quote),
  );
}

const container = document.getElementById("quotes");
container.replaceChildren(...requests.map(card));
