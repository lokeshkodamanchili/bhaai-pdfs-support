-- Run once in the NEW bhaai-pdfs-support project SQL Editor.
begin;
create table public.donations (
  order_id text primary key,
  payment_id text unique,
  display_name text not null check(char_length(display_name) between 1 and 60),
  amount_paise bigint not null check(amount_paise between 1000 and 100000000),
  refunded_paise bigint not null default 0 check(refunded_paise >= 0 and refunded_paise <= amount_paise),
  status text not null default 'pending' check(status in ('pending','captured')),
  mode text not null check(mode in ('test','live')),
  created_at timestamptz not null default now()
);
create table public.reviews (
  id bigint generated always as identity primary key,
  name text not null default 'Anonymous' check(char_length(name) between 1 and 60),
  rating smallint not null check(rating between 1 and 5),
  text text not null check(char_length(text) between 5 and 500),
  created_at timestamptz not null default now()
);
alter table public.donations enable row level security;
alter table public.reviews enable row level security;
revoke all on public.donations,public.reviews from public,anon,authenticated;
grant all on public.donations,public.reviews to service_role;
grant usage,select on sequence public.reviews_id_seq to service_role;
create index donations_campaign_idx on public.donations(mode,status,created_at desc);
create function public.campaign_totals(payment_mode text) returns jsonb
language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object('raised',coalesce(sum(amount_paise-refunded_paise),0),'count',count(*) filter(where refunded_paise < amount_paise))
 from public.donations where mode=payment_mode and status='captured';
$$;
create function public.review_totals() returns jsonb
language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object('total',count(*),'average',coalesce(round(avg(rating),1),0),
 'counts',jsonb_build_array(count(*) filter(where rating=1),count(*) filter(where rating=2),count(*) filter(where rating=3),count(*) filter(where rating=4),count(*) filter(where rating=5))) from public.reviews;
$$;
revoke all on function public.campaign_totals(text),public.review_totals() from public,anon,authenticated;
grant execute on function public.campaign_totals(text),public.review_totals() to service_role;
commit;
