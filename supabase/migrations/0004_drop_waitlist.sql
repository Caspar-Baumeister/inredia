-- The Pro waitlist was replaced by Stripe checkout: the upgrade dialog now sells
-- a plan directly, so nothing writes to this table any more. It never held a row.
drop table if exists public.waitlist;
