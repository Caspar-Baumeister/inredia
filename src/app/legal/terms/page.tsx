import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";
import { PLANS } from "@/lib/plans";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "AGB" };

export default function TermsPage() {
  return (
    <article className="legal">
      <h1 className="font-display text-4xl leading-tight">Allgemeine Geschäftsbedingungen</h1>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">Stand: {LEGAL.updated}</p>

      <h2>1. Anbieter und Geltungsbereich</h2>
      <p>
        Diese Bedingungen gelten für die Nutzung von inredia, angeboten von {LEGAL.legalName}, {LEGAL.street}, {LEGAL.postalCode} {LEGAL.city}.
      </p>

      <h2>2. Leistung</h2>
      <p>
        inredia erzeugt aus den von Ihnen hochgeladenen Raumfotos mit Hilfe von KI Ansichten desselben Raums in möbliertem Zustand. Die Bilder sind Visualisierungen, keine Planungsunterlagen: Möbel, Maße, Preise und Produktangaben sind Schätzungen und unverbindlich. Sie ersetzen weder eine Innenarchitektin noch eine Kaufentscheidung, und die angezeigten Renditezahlen sind Beispielrechnungen ohne Anlageberatung.
      </p>

      <h2>3. Konto</h2>
      <p>
        Für die Nutzung ist ein Konto per Google-Anmeldung nötig. Sie dürfen nur Fotos hochladen, an denen Sie die nötigen Rechte haben, und keine Inhalte, die Rechte Dritter oder geltendes Recht verletzen.
      </p>

      <h2>4. Preise und Zahlung</h2>
      <p>
        Der kostenlose Plan umfasst {PLANS.free.totalImages} erzeugte Bilder insgesamt und ein Projekt. Kostenpflichtige Pläne ({PLANS.hobby.name}: {(PLANS.hobby.price!.month / 100).toFixed(2).replace(".", ",")} € pro Monat bzw. {(PLANS.hobby.price!.year / 100).toLocaleString("de-DE")} € pro Jahr; {PLANS.pro.name}: {(PLANS.pro.price!.month / 100).toFixed(2).replace(".", ",")} € pro Monat bzw. {(PLANS.pro.price!.year / 100).toLocaleString("de-DE")} € pro Jahr) sind Abonnements und werden über Stripe abgerechnet. Alle Preise verstehen sich inklusive gesetzlicher Umsatzsteuer. Die Zahlung ist im Voraus für die jeweilige Laufzeit fällig.
      </p>

      <h2>5. Laufzeit und Kündigung</h2>
      <p>
        Abonnements laufen einen Monat bzw. ein Jahr und verlängern sich um dieselbe Dauer, wenn sie nicht vorher gekündigt werden. Sie können jederzeit zum Ende der laufenden Periode kündigen — in der App unter „Settings → Manage billing“. Bereits gezahlte Beträge für die laufende Periode werden nicht anteilig erstattet.
      </p>

      <h2>6. Widerrufsrecht für Verbraucher</h2>
      <p>
        Verbraucherinnen und Verbraucher haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen zu widerrufen. Die Frist beginnt mit Vertragsschluss. Der Widerruf ist formlos an{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> zu richten. Beginnen wir auf Ihren ausdrücklichen Wunsch vor Ablauf der Frist mit der Leistung, schulden Sie einen anteiligen Betrag für die bis zum Widerruf genutzte Zeit.
      </p>

      <h2>7. Nutzungsrechte an den Bildern</h2>
      <p>
        An den für Sie erzeugten Bildern räumen wir Ihnen ein einfaches, zeitlich und räumlich unbeschränktes Nutzungsrecht ein, auch für gewerbliche Zwecke wie Exposés und Inserate. Bitte kennzeichnen Sie die Bilder dort als digital erstellte Visualisierung — das verlangen die meisten Immobilienportale, und wir übernehmen keine Haftung für eine unterlassene Kennzeichnung.
      </p>

      <h2>8. Verfügbarkeit und Haftung</h2>
      <p>
        Wir bemühen uns um einen durchgehenden Betrieb, schulden aber keine bestimmte Verfügbarkeit; der Dienst befindet sich in Entwicklung. Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper und Gesundheit. Bei einfacher Fahrlässigkeit haften wir nur für die Verletzung wesentlicher Vertragspflichten und der Höhe nach begrenzt auf den vertragstypischen, vorhersehbaren Schaden.
      </p>

      <h2>9. Änderungen</h2>
      <p>
        Wir können diese Bedingungen und den Leistungsumfang ändern. Über Änderungen informieren wir per E-Mail; widersprechen Sie nicht binnen sechs Wochen, gelten sie als angenommen. Es gilt deutsches Recht.
      </p>
    </article>
  );
}
