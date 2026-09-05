-- inredia — initial schema
-- Run with: supabase db push   (or paste into the SQL editor of your Supabase project)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (one per auth user) — holds the daily image counter
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  daily_image_count int not null default 0,
  daily_count_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- projects — one apartment/house. preferences = answers, plan = furnishing plan
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'My home',
  preferences jsonb not null default '{}'::jsonb,
  plan jsonb,
  plan_version int not null default 0,
  plan_status text not null default 'none' check (plan_status in ('none','building','ready','failed')),
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects (user_id, created_at desc);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type text not null default 'other',
  label text,
  budget_share numeric,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists rooms_project_idx on public.rooms (project_id, sort_order);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  storage_path text not null,
  width int,
  height int,
  detected jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists photos_project_idx on public.photos (project_id, sort_order);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  photo_id uuid not null references public.photos (id) on delete cascade,
  plan_version int not null,
  kind text not null default 'variant' check (kind in ('variant','edit')),
  parent_generation_id uuid references public.generations (id) on delete set null,
  variation jsonb not null default '{}'::jsonb,
  prompt text,
  edit_instruction text,
  storage_path text,
  status text not null default 'queued' check (status in ('queued','generating','ready','failed')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists generations_stack_idx on public.generations (photo_id, plan_version, created_at);

create table if not exists public.swipes (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('like','dislike','edit')),
  created_at timestamptz not null default now(),
  unique (generation_id)
);

create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  generation_id uuid not null references public.generations (id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (generation_id)
);

create table if not exists public.avoid_rules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  photo_id uuid references public.photos (id) on delete cascade,
  text text not null,
  source text not null default 'swipe' check (source in ('swipe','chat')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  diff jsonb,
  applied boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  reason text,
  created_at timestamptz not null default now()
);

-- updated_at helper
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();
drop trigger if exists generations_touch on public.generations;
create trigger generations_touch before update on public.generations for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Daily limit: atomic reserve of N images. Returns remaining after reserve, or -1 if over limit.
-- ---------------------------------------------------------------------------
create or replace function public.reserve_images(p_user uuid, p_count int, p_limit int)
returns int language plpgsql security definer set search_path = public as $$
declare v_count int; v_reset timestamptz;
begin
  select daily_image_count, daily_count_reset_at into v_count, v_reset from profiles where id = p_user for update;
  if not found then
    insert into profiles (id) values (p_user) on conflict do nothing;
    v_count := 0; v_reset := now();
  end if;
  if v_reset < date_trunc('day', now()) then
    v_count := 0;
    update profiles set daily_image_count = 0, daily_count_reset_at = now() where id = p_user;
  end if;
  if v_count + p_count > p_limit then
    return -1;
  end if;
  update profiles set daily_image_count = v_count + p_count where id = p_user;
  return p_limit - (v_count + p_count);
end $$;

-- Only the service role (server) may reserve images.
revoke execute on function public.reserve_images(uuid, int, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS — everything is scoped to the owning user via projects.user_id
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.rooms enable row level security;
alter table public.photos enable row level security;
alter table public.generations enable row level security;
alter table public.swipes enable row level security;
alter table public.library_items enable row level security;
alter table public.avoid_rules enable row level security;
alter table public.chat_messages enable row level security;
alter table public.waitlist enable row level security;

create policy "profiles own" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "projects own" on public.projects for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.owns_project(p_project uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from projects where id = p_project and user_id = auth.uid());
$$;

create policy "rooms own" on public.rooms for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "photos own" on public.photos for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "generations own" on public.generations for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "swipes own" on public.swipes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "library own" on public.library_items for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "avoid own" on public.avoid_rules for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "chat own" on public.chat_messages for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "waitlist insert" on public.waitlist for insert with check (user_id = auth.uid());
create policy "waitlist read own" on public.waitlist for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: private buckets, paths are <user_id>/<project_id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('originals', 'originals', false, 20971520, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('generations', 'generations', false, 20971520, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "originals owner rw" on storage.objects for all
  using (bucket_id = 'originals' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'originals' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "generations owner read" on storage.objects for select
  using (bucket_id = 'generations' and (storage.foldername(name))[1] = auth.uid()::text);
