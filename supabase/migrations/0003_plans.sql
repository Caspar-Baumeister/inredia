-- Plans + Stripe billing on profiles. Free = 50 images total; paid = N images per day.
alter table public.profiles
  add column if not exists plan text not null default 'free' check (plan in ('free','hobby','pro')),
  add column if not exists plan_status text,                 -- stripe subscription status (active, trialing, past_due, canceled …)
  add column if not exists plan_interval text,               -- month | year
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists images_total int not null default 0,
  add column if not exists daily_image_count int not null default 0,
  add column if not exists daily_count_reset_at timestamptz not null default now();

-- Reserve images. p_mode = 'total' (lifetime allowance, free plan) or 'daily'
-- (allowance per calendar day, paid plans). Negative p_count refunds. Returns the
-- remaining allowance, or -1 when the request would exceed it.
drop function if exists public.reserve_images(uuid, int, int);
create or replace function public.reserve_images(p_user uuid, p_count int, p_limit int, p_mode text default 'total')
returns int language plpgsql security definer set search_path = public as $$
declare v_total int; v_daily int; v_reset timestamptz; v_count int;
begin
  select images_total, daily_image_count, daily_count_reset_at into v_total, v_daily, v_reset
    from profiles where id = p_user for update;
  if not found then
    insert into profiles (id) values (p_user) on conflict do nothing;
    v_total := 0; v_daily := 0; v_reset := now();
  end if;
  if v_reset < date_trunc('day', now()) then
    v_daily := 0;
    update profiles set daily_image_count = 0, daily_count_reset_at = now() where id = p_user;
  end if;
  v_count := case when p_mode = 'daily' then v_daily else v_total end;
  if p_count > 0 and v_count + p_count > p_limit then
    return -1;
  end if;
  update profiles
     set images_total = greatest(0, images_total + p_count),
         daily_image_count = greatest(0, v_daily + p_count)
   where id = p_user;
  return p_limit - greatest(0, v_count + p_count);
end $$;

revoke execute on function public.reserve_images(uuid, int, int, text) from public, anon, authenticated;

-- The server (service role) writes billing columns; users may only read their profile.
drop policy if exists "profiles own" on public.profiles;
create policy "profiles read own" on public.profiles for select using (id = auth.uid());
create policy "profiles insert own" on public.profiles for insert with check (id = auth.uid());
