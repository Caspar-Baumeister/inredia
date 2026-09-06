-- Free plan: a total (lifetime) image allowance instead of a daily one.
alter table public.profiles add column if not exists images_total int not null default 0;

-- Carry over what was already generated so nobody gets a fresh 50.
update public.profiles set images_total = greatest(images_total, coalesce(daily_image_count, 0));

create or replace function public.reserve_images(p_user uuid, p_count int, p_limit int)
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  select images_total into v_count from profiles where id = p_user for update;
  if not found then
    insert into profiles (id) values (p_user) on conflict do nothing;
    v_count := 0;
  end if;
  if v_count + p_count > p_limit then
    return -1;
  end if;
  update profiles set images_total = greatest(0, v_count + p_count) where id = p_user;
  return p_limit - greatest(0, v_count + p_count);
end $$;

revoke execute on function public.reserve_images(uuid, int, int) from public, anon, authenticated;

-- Waitlist: where the request came from (upgrade button, image limit, new project …)
alter table public.waitlist add column if not exists source text;
