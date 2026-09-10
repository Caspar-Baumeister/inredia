// Operator details for the legal pages.
// ⚠️ TODO Caspar: replace the placeholders below with your real address before
// taking payments — an Impressum with wrong/missing details is abmahnfähig.
export const LEGAL = {
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME || "Caspar Baumeister",
  street: process.env.NEXT_PUBLIC_LEGAL_STREET || "— Straße und Hausnummer eintragen —",
  postalCode: process.env.NEXT_PUBLIC_LEGAL_ZIP || "—————",
  city: process.env.NEXT_PUBLIC_LEGAL_CITY || "— Ort eintragen —",
  country: process.env.NEXT_PUBLIC_LEGAL_COUNTRY || "Deutschland",
  representative: process.env.NEXT_PUBLIC_LEGAL_REP || "Caspar Baumeister",
  vatNote:
    process.env.NEXT_PUBLIC_LEGAL_VAT ||
    "Kleinunternehmer gemäß § 19 UStG — es wird keine Umsatzsteuer ausgewiesen. (Falls umsatzsteuerpflichtig: USt-IdNr. hier eintragen.)",
  /** Last time the privacy policy / terms were edited. */
  updated: "10. September 2026",
} as const;
