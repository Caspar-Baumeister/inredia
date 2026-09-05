# inredia

Upload photos of your rooms, answer a few adaptive questions, then swipe through professionally rendered furnishing options — all generated from one consistent plan that respects your style and budget.

Next.js (App Router) · Supabase (Auth, Postgres, Storage) · Gemini (text + image) · Vercel.

## 1. Setup (once)

### Supabase
1. Create a project at https://supabase.com → **Project Settings → API**: copy URL, anon key, service-role key.
2. Run the schema: open **SQL Editor**, paste `supabase/migrations/0001_init.sql`, run. (Or `supabase link` + `supabase db push`.)
   This creates all tables, RLS policies, the `originals` / `generations` storage buckets and the daily-limit function.
3. **Authentication → Providers**: enable **Email** (magic link works out of the box) and **Google** (paste your Google OAuth client id/secret; add `https://<ref>.supabase.co/auth/v1/callback` as redirect URI in Google Cloud).
4. **Authentication → URL Configuration**: Site URL `http://localhost:3000`, add `http://localhost:3000/api/auth/callback` and later `https://app.<domain>/api/auth/callback` to the redirect allow-list.

### Gemini
Create a key at https://aistudio.google.com/apikey.
- `GEMINI_TEXT_MODEL` (default `gemini-2.5-flash`) — classification, furnishing plan, chat diffs, dislike-learning.
- `GEMINI_IMAGE_MODEL` (default `gemini-2.5-flash-image`) — generation and edits. For noticeably higher quality try the Pro image model (e.g. `gemini-3-pro-image-preview`), it costs more per image.

### Local
```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```

### Vercel
Import the repo, set the same env vars (Production + Preview), set `NEXT_PUBLIC_APP_URL=https://app.<domain>`. `vercel.json` already raises the function timeout for generation.

## 2. How it works

```
upload → classify (Gemini vision) → adaptive wizard → preferences (jsonb)
                                                         │
                                       furnishing plan (Gemini text, JSON)
                                       style guide + per-room shopping list
                                       budget split in code, enforced in code
                                                         │
          original photo + plan + variation + avoid rules + liked refs
                                                         │
                                 Gemini image (edit mode) → Storage → stack card
```

- **Consistency**: every image of a project is rendered from the same `projects.plan`. The prompt quotes the style guide and the room's fixed furniture list; up to two liked images from other rooms are attached as style references.
- **Budget**: `splitBudget()` distributes the total across rooms by room-type weight (or manual values); `enforceBudgets()` trims the model's list until it fits. Prices are estimates and shown as such.
- **Stacks**: a stack = all `generations` of a photo with the current `plan_version` and no `swipes` row. Switching photos never regenerates; only swiping consumes cards (a new one is generated in the background). Changing preferences via chat bumps `plan_version`, which discards every stack at once.
- **Learning from dislikes**: after ≥2 rejected cards of the same photo, Gemini looks at them and proposes one avoid-rule. A toast shows it with an *Adjust* link that pre-fills the chat. Rules are visible/removable under Preferences.
- **Limit**: `DAILY_IMAGE_LIMIT` per user per day (atomic `reserve_images()`); when hit, the stack shows a waitlist card (`waitlist` table).

## 3. Layout

```
src/app/(app)/         dashboard, library, projects, preferences, settings, onboarding
src/features/          onboarding wizard, dashboard (stack, chat, dialogs), library, projects
src/lib/ai/            gemini client, classify, plan, prompt builder, image provider, chat diff
src/lib/pipeline.ts    plan lifecycle, stack ensure/preload, generation worker, edits
supabase/migrations/   schema
```

## 4. Not yet
Billing/credits (the *Upgrade* tile is a placeholder), marketing landing page (separate project), real product links in shopping lists.
