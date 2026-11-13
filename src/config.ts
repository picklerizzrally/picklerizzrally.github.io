// Everything you might want to change lives in this file.

export const EVENT = {
  brand: "pickle.rizz.rally",
  name: "pickle.rizz.rally Indore Open",
  tournamentId: "indore-open-2026", // database key; change it for your next tournament
  dateLabel: "29 November 2026",
  dateShort: "29 Nov 2026",
  city: "Indore",
  venue: "Buddy’s Pickleball",
  venueFullName: "Buddy’s Pickleball Junction",
  venueAddressLine1: "8, Mahatma Gandhi Rd, near Treasure Island Mall",
  venueAddressLine2: "Indore, Madhya Pradesh 452001",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Buddy%27s+Pickleball+Junction+Mahatma+Gandhi+Rd+Indore+452001",
  parkingNote: "Near Treasure Island Mall, MG Road",
  gatesOpen: "7:00 AM",
  registrationCloses: "24 November",
  upiId: "7869966517@sbi",
  prize: "Trophies",
  instagramUrl: "https://instagram.com/yourhandle",
  instagramHandle: "@yourhandle",
  // country code + number, no plus sign or spaces
  whatsappNumbers: ["917869966517", "918827118995"],
  year: 2026,
};

// Paste the firebaseConfig block from Firebase console > Project settings > Your apps.
// These values are safe to publish. The Firestore security rules protect your data.
export const firebaseConfig = {
  apiKey: "AIzaSyAs2YDvG-PjnLOEsptJClIFMPbYcyajkyI",
  authDomain: "pickle-rizz-rally.firebaseapp.com",
  projectId: "pickle-rizz-rally",
  storageBucket: "pickle-rizz-rally.firebasestorage.app",
  messagingSenderId: "655497749985",
  appId: "1:655497749985:web:5fd12e1755dbdb67245ea0",
};

// Entry fee: early bird until the end of 23 Nov (India time), regular price after that
export const FEE = {
  early: 1000, // doubles team
  regular: 1200,
  soloEarly: 500, // one player, solo entry
  soloRegular: 600,
  earlyUntil: "2026-11-23T23:59:59+05:30",
  earlyLabel: "23 Nov",
};
export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const isEarlyBird = () => Date.now() <= new Date(FEE.earlyUntil).getTime();
// Fee for a doubles team or a solo player, at a given moment (defaults to now)
export const feeFor = (solo: boolean, at: number = Date.now()) => {
  const early = at <= new Date(FEE.earlyUntil).getTime();
  if (solo) return early ? FEE.soloEarly : FEE.soloRegular;
  return early ? FEE.early : FEE.regular;
};
export const currentFee = (solo = false) => feeFor(solo);
export const feeLine = () =>
  isEarlyBird()
    ? `early bird ${rupees(FEE.early)}/team, ${rupees(FEE.soloEarly)} solo till ${FEE.earlyLabel}`
    : `${rupees(FEE.regular)}/team, ${rupees(FEE.soloRegular)} solo`;
// "78699 66517" style for showing numbers on the page
export const prettyPhone = (n: string) => `${n.slice(-10, -5)} ${n.slice(-5)}`;

export const isConfigured = !firebaseConfig.apiKey.startsWith("PASTE");

// Photos live in public/images; this builds the right path on GitHub Pages
export const photo = (name: string) => `${import.meta.env.BASE_URL}images/${name}`;

// The public link people open from your story. Works automatically once the site is live.
export const siteUrl = () => `${window.location.origin}${window.location.pathname}`;
