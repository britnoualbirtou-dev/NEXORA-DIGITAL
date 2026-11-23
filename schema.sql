-- NEXORA DIGITAL database schema
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  price text not null check (char_length(price) between 1 and 60),
  category text not null check (char_length(category) between 1 and 60),
  description text not null default '',
  image text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.store_settings(key,value) values
 ('title','وجهتك الرقمية بلمسة واحدة.'),
 ('subtitle','منتجات رقمية مختارة بعناية، طلب سريع، وخدمة مباشرة عبر واتساب.'),
 ('whatsapp','213657329477')
on conflict (key) do nothing;

alter table public.products enable row level security;
alter table public.store_settings enable row level security;
-- No anon/authenticated table policies are intentionally created.
-- The Netlify Function accesses Supabase using the service role key stored only
-- in Netlify environment variables. Never put that key in browser JavaScript.

create index if not exists products_active_created_idx on public.products(active,created_at desc);
