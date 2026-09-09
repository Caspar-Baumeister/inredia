// One-time Stripe setup: creates the inredia products + prices and the webhook
// endpoint, then prints the env vars to paste into Vercel / .env.local.
//
//   STRIPE_SECRET_KEY=sk_live_... APP_URL=https://inredia.com node scripts/stripe-setup.mjs
//
// Safe to re-run: existing prices are found by lookup_key, the webhook by URL.
import Stripe from "stripe";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

// Reads STRIPE_SECRET_KEY from .env.local (so you never paste the key into a terminal)
// and writes the resulting env lines back into .env.local.
const ENV_FILE = new URL("../.env.local", import.meta.url).pathname;
const envText = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const key = process.env.STRIPE_SECRET_KEY;
const appUrl = (process.env.APP_URL || "https://inredia.com").replace(/\/+$/, "");
if (!key) {
  console.error("Put STRIPE_SECRET_KEY=sk_live_... into .env.local first.");
  process.exit(1);
}
const stripe = new Stripe(key);

const PLANS = [
  { id: "hobby", name: "inredia Hobby", description: "20 images every day, 3 projects.", month: 1900, year: 14900 },
  { id: "pro", name: "inredia Pro", description: "200 images every day, unlimited projects.", month: 5900, year: 49000 },
];

const env = [];
for (const p of PLANS) {
  let product = (await stripe.products.search({ query: `metadata['inredia_plan']:'${p.id}'` })).data[0];
  if (!product) product = await stripe.products.create({ name: p.name, description: p.description, metadata: { inredia_plan: p.id } });
  for (const interval of ["month", "year"]) {
    const lookup = `inredia_${p.id}_${interval}`;
    let price = (await stripe.prices.list({ lookup_keys: [lookup], limit: 1 })).data[0];
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        currency: "eur",
        unit_amount: interval === "month" ? p.month : p.year,
        recurring: { interval },
        lookup_key: lookup,
        tax_behavior: "inclusive",
      });
    }
    env.push(`STRIPE_PRICE_${p.id.toUpperCase()}_${interval === "month" ? "MONTHLY" : "YEARLY"}=${price.id}`);
  }
}

const url = `${appUrl}/api/stripe/webhook`;
const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((w) => w.url === url);
if (existing) {
  env.push(`# webhook already exists (${existing.id}) — its secret is only shown once; reveal it in the Stripe dashboard if you lost it`);
} else {
  const wh = await stripe.webhookEndpoints.create({
    url,
    enabled_events: ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "invoice.payment_failed"],
    description: "inredia",
  });
  env.push(`STRIPE_WEBHOOK_SECRET=${wh.secret}`);
}

// Customer portal defaults (so "Manage billing" works out of the box).
try {
  const configs = await stripe.billingPortal.configurations.list({ limit: 1 });
  if (!configs.data.length) {
    await stripe.billingPortal.configurations.create({
      business_profile: { headline: "inredia billing" },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
        subscription_update: { enabled: true, default_allowed_updates: ["price"], proration_behavior: "create_prorations", products: [] },
      },
    });
  }
} catch (e) {
  console.warn("portal config skipped:", e.message);
}

// Write into .env.local (replace existing STRIPE_PRICE_* / STRIPE_WEBHOOK_SECRET lines).
const written = env.filter((l) => !l.startsWith("#"));
let out = envText;
for (const l of written) {
  const [name] = l.split("=");
  const re = new RegExp(`^${name}=.*$`, "m");
  out = re.test(out) ? out.replace(re, l) : out + (out.endsWith("\n") || out === "" ? "" : "\n") + l + "\n";
}
writeFileSync(ENV_FILE, out);

console.log("\nDone. Written to .env.local:\n");
console.log(env.join("\n"));
console.log("\nNow copy STRIPE_* to Vercel:  npm run vercel:env\n");
