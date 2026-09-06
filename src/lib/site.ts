// Public constants used across the app (safe for the client).
export const SITE = {
  name: "inredia",
  xUrl: "https://x.com/CasparBaumeist2",
  xHandle: "@CasparBaumeist2",
  founder: "Caspar Baumeister",
  contactEmail: "caspar.baumeister@gmail.com",
  freeImageLimit: Number(process.env.NEXT_PUBLIC_FREE_IMAGE_LIMIT || 50),
} as const;
