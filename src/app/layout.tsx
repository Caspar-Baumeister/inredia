import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://inredia.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "inredia — See it furnished before you buy",
    template: "%s · inredia",
  },
  description:
    "Stage any property listing with AI: upload one photo per room, get every room furnished in one matching style and budget, and compare the furnished rental yield before you make an offer.",
  keywords: ["virtual staging", "AI home staging", "Mietrendite", "möbliert vermieten", "Immobilien Investment", "interior AI"],
  openGraph: {
    type: "website",
    siteName: "inredia",
    url: BASE,
    title: "inredia — See it furnished before you buy",
    description: "AI staging for buy-to-let investors. One photo per room, every room in one style, and the furnished yield next to the numbers.",
    locale: "en",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "inredia — an empty room, furnished by AI" }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@CasparBaumeist2",
    title: "inredia — See it furnished before you buy",
    description: "AI staging for buy-to-let investors. Compare the furnished yield before you make an offer.",
    images: ["/og.jpg"],
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Cookie-free page + referrer analytics (no consent banner needed). */}
        <Analytics />
      </body>
    </html>
  );
}
