// The five customer requests from the PDF: the customer's words, plus how we read them.
// accommodation: an accommodation type name, or null when the customer needs none.
export const requests = [
  {
    id: 1,
    text: "4 weeks of Spanish in Málaga, standard course, host family, starting Monday 5 July 2027.",
    school: "MAL", course: "Standard Spanish", weeks: 4, start: "2027-07-05",
    accommodation: "Host family, single room, half board",
  },
  {
    id: 2,
    text: "2 weeks General English in Dublin from 21 June 2027, I'd like the student residence.",
    school: "DUB", course: "General English", weeks: 2, start: "2027-06-21",
    accommodation: "Student residence, single room",
  },
  {
    id: 3,
    text: "6 weeks intensive Spanish in Málaga from 6 September 2027. I have my own place to stay.",
    school: "MAL", course: "Intensive Spanish", weeks: 6, start: "2027-09-06",
    accommodation: null,
  },
  {
    id: 4,
    text: "3 weeks of French in Nice with a host family, starting 23 August 2027.",
    school: "NIC", course: "Standard French", weeks: 3, start: "2027-08-23",
    accommodation: "Host family, single room, half board",
  },
  {
    id: 5,
    text: "2 weeks standard Spanish in Málaga from 12 July 2027, in a studio apartment please.",
    school: "MAL", course: "Standard Spanish", weeks: 2, start: "2027-07-12",
    accommodation: "Studio apartment",
  },
];
