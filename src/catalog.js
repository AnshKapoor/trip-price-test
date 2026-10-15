// Catalog data, copied exactly from the "Trip Price Test" PDF (page 2).
// Prices are whole euros. Seasonal isoWeeks are an inclusive [from, to] range.
export const catalog = {
  schools: [
    {
      code: "MAL", name: "Sol Language School", city: "Málaga", country: "Spain", enrolmentFee: 60,
      courses: [
        { name: "Standard Spanish", weekly: 260, weekly4plus: 235 },
        { name: "Intensive Spanish", weekly: 320, weekly4plus: 290 },
      ],
      accommodation: [
        { type: "Host family, single room, half board", weekly: 270,
          seasonal: { isoWeeks: [26, 35], perWeek: 35 } },
        { type: "Shared apartment, single room", weekly: 210 },
      ],
    },
    {
      code: "DUB", name: "Liffey English Centre", city: "Dublin", country: "Ireland", enrolmentFee: 75,
      courses: [
        { name: "General English", weekly: 300, weekly4plus: 270 },
      ],
      accommodation: [
        { type: "Host family, single room, half board", weekly: 310 },
        { type: "Student residence, single room", weekly: 380,
          seasonal: { isoWeeks: [26, 35], perWeek: 50 } },
      ],
    },
    {
      code: "NIC", name: "Azur Langues", city: "Nice", country: "France", enrolmentFee: 50,
      courses: [
        { name: "Standard French", weekly: 280, weekly4plus: 250 },
      ],
      accommodation: [
        { type: "Host family, single room, half board", weekly: 290,
          seasonal: { isoWeeks: [26, 35], perWeek: 40 } },
      ],
    },
  ],
};
