#!/usr/bin/env bash
# Copies every STRIPE_* variable from .env.local into the Vercel project (Production).
# Needs the Vercel CLI once: `npx vercel login` and `npx vercel link` (pick team caspar-baumeister-team, project inredia).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env.local ] || { echo "no .env.local"; exit 1; }
grep -E '^STRIPE_[A-Z0-9_]+=' .env.local | while IFS='=' read -r name value; do
  value="${value%\"}"; value="${value#\"}"
  [ -z "$value" ] && continue
  # remove an existing value first (vercel env add refuses duplicates), then add
  npx --yes vercel env rm "$name" production --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | npx --yes vercel env add "$name" production >/dev/null
  echo "set $name"
done
echo "All STRIPE_* variables are in Vercel (Production). Redeploy or push to apply."
