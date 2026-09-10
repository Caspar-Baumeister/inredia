import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Impressum · inredia", robots: { index: true } };

export default function ImprintPage() {
  return (
    <article className="legal">
      <h1 className="font-display text-4xl leading-tight">Impressum</h1>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">Angaben gemäß § 5 DDG</p>

      <h2>Anbieter</h2>
      <p>
        {LEGAL.legalName}
        <br />
        {LEGAL.street}
        <br />
        {LEGAL.postalCode} {LEGAL.city}
        <br />
        {LEGAL.country}
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
        <br />
        X: <a href={SITE.xUrl}>{SITE.xHandle}</a>
      </p>

      <h2>Vertreten durch</h2>
      <p>{LEGAL.representative}</p>

      <h2>Umsatzsteuer</h2>
      <p>{LEGAL.vatNote}</p>

      <h2>Verantwortlich für den Inhalt</h2>
      <p>
        {LEGAL.representative}, Anschrift wie oben.
      </p>

      <h2>Streitbeilegung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:{" "}
        <a href="https://ec.europa.eu/consumers/odr/" rel="noreferrer" target="_blank">
          ec.europa.eu/consumers/odr
        </a>
        . Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </article>
  );
}
