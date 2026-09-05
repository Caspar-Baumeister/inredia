import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "inredia",
  description: "Furnish your rooms with AI — swipe through professional visualisations of your own space.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
