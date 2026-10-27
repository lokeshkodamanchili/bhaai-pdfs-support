-- Existing projects only: allow the updated 100-paise (₹1) minimum.
begin;
alter table public.donations drop constraint donations_amount_paise_check;
alter table public.donations add constraint donations_amount_paise_check check(amount_paise between 100 and 100000000);
commit;
