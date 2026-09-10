import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Datenschutz" };

export default function PrivacyPage() {
  return (
    <article className="legal">
      <h1 className="font-display text-4xl leading-tight">Datenschutzerklärung</h1>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">Stand: {LEGAL.updated}</p>

      <h2>1. Verantwortlicher</h2>
      <p>
        {LEGAL.legalName}, {LEGAL.street}, {LEGAL.postalCode} {LEGAL.city}, {LEGAL.country}. E-Mail:{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <p>
        <strong>Konto:</strong> Beim Anmelden über Google erhalten wir Ihre E-Mail-Adresse und Ihre Google-Nutzer-ID. Ein Passwort speichern wir nicht.
      </p>
      <p>
        <strong>Ihre Fotos:</strong> Die Raumfotos, die Sie hochladen, und die daraus erzeugten Bilder werden in unserer Datenbank und in einem privaten Speicher abgelegt. Sie sind nur über zeitlich befristete, signierte Links abrufbar und nur Ihrem Konto zugeordnet.
      </p>
      <p>
        <strong>Projektdaten:</strong> Ihre Angaben aus dem Fragebogen (Stil, Budget, Bodenwunsch, Notizen), Ihre Chatnachrichten an die App sowie welche Bilder Sie behalten oder verworfen haben.
      </p>
      <p>
        <strong>Zahlungen:</strong> Bei einem kostenpflichtigen Plan verarbeitet Stripe Ihre Zahlungsdaten. Wir selbst sehen und speichern keine Kartendaten, sondern nur die Stripe-Kundennummer, den gebuchten Plan und dessen Status.
      </p>
      <p>
        <strong>Technische Daten:</strong> Beim Aufruf der Seite fallen serverseitig Protokolldaten an (IP-Adresse, Zeitpunkt, aufgerufene Seite, Browserkennung).
      </p>

      <h2>3. Zwecke und Rechtsgrundlagen</h2>
      <p>
        Wir verarbeiten diese Daten, um Ihnen den Dienst bereitzustellen und den Vertrag mit Ihnen zu erfüllen (Art. 6 Abs. 1 lit. b DSGVO), um gesetzliche Aufbewahrungspflichten zu erfüllen (lit. c) und um den Betrieb sicher und funktionsfähig zu halten (lit. f). Ein Tracking zu Werbezwecken findet nicht statt; wir setzen keine Analyse- oder Werbe-Cookies. Die einzigen Cookies sind technisch notwendig (Anmeldung, zuletzt gewähltes Projekt).
      </p>

      <h2>4. Empfänger und Auftragsverarbeiter</h2>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> (USA) — Hosting und Auslieferung der Website.
        </li>
        <li>
          <strong>Supabase</strong> — Datenbank, Anmeldung und Dateispeicher; unsere Instanz liegt in der EU (Frankfurt).
        </li>
        <li>
          <strong>Google Ireland/LLC</strong> — Anmeldung über Google sowie die Gemini-API, die aus Ihren Fotos die eingerichteten Ansichten erzeugt. Dafür werden Ihre hochgeladenen Fotos und die Beschreibung Ihres Projekts an Google übermittelt.
        </li>
        <li>
          <strong>Stripe Payments Europe Ltd.</strong> (Irland) — Zahlungsabwicklung bei kostenpflichtigen Plänen.
        </li>
      </ul>
      <p>
        Soweit dabei Daten in die USA übermittelt werden, stützen wir dies auf die Standardvertragsklauseln der EU-Kommission bzw. die Zertifizierung der Anbieter unter dem EU-US Data Privacy Framework.
      </p>

      <h2>5. Speicherdauer</h2>
      <p>
        Ihre Fotos, Projekte und erzeugten Bilder speichern wir, solange Ihr Konto besteht. Löschen Sie ein Projekt oder Ihr Konto, entfernen wir die zugehörigen Dateien. Rechnungsrelevante Daten bewahren wir zehn Jahre auf, soweit gesetzlich vorgeschrieben.
      </p>

      <h2>6. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Eine Nachricht an{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> genügt. Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren.
      </p>

      <h2>7. Konto löschen</h2>
      <p>
        Schreiben Sie uns an <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>; wir löschen Ihr Konto samt Fotos und erzeugten Bildern innerhalb weniger Tage.
      </p>
    </article>
  );
}
