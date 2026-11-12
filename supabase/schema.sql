-- Ironik Grafix AI Studio — database setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run once on a fresh project.

-- ─────────────────────────────────────────────
-- Profiles: one row per client account
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  business_name text,
  brand_colors text,
  credits integer not null default 0 check (credits >= 0),
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

-- Every credit change is recorded here. "ref" is unique so the same
-- Stripe payment can never add credits twice.
create table if not exists public.credit_ledger (
  id bigserial primary key,
  user_id uuid not null references public.profiles on delete cascade,
  delta integer not null,
  reason text not null,
  ref text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  prompt text not null,
  kind text not null,
  quality text not null,
  cost integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists generations_user_created on public.generations (user_id, created_at desc);
create index if not exists images_user_created on public.images (user_id, created_at desc);

-- ─────────────────────────────────────────────
-- Row level security: clients can only READ their own rows.
-- All writes (credits, images) happen on the server with the service key,
-- so nobody can give themselves free credits from the browser.
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.generations enable row level security;
alter table public.images enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "own ledger" on public.credit_ledger;
create policy "own ledger" on public.credit_ledger for select using (auth.uid() = user_id);
drop policy if exists "own generations" on public.generations;
create policy "own generations" on public.generations for select using (auth.uid() = user_id);
drop policy if exists "own images" on public.images;
create policy "own images" on public.images for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Create a profile automatically when someone signs up
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- Credit functions (atomic, server-only)
-- ─────────────────────────────────────────────

-- Takes credits only if the balance is high enough. Returns false otherwise.
create or replace function public.spend_credits(p_user uuid, p_amount integer, p_ref text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_amount <= 0 then return false; end if;
  update public.profiles set credits = credits - p_amount
    where id = p_user and credits >= p_amount;
  if not found then return false; end if;
  insert into public.credit_ledger (user_id, delta, reason, ref)
    values (p_user, -p_amount, 'generation', p_ref);
  return true;
end $$;

-- Adds credits once per ref (a Stripe payment id, invoice id or refund id).
-- Returns false if that ref was already used.
create or replace function public.add_credits(p_user uuid, p_amount integer, p_reason text, p_ref text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_amount <= 0 then return false; end if;
  insert into public.credit_ledger (user_id, delta, reason, ref)
    values (p_user, p_amount, p_reason, p_ref)
    on conflict (ref) do nothing;
  if not found then return false; end if;
  update public.profiles set credits = credits + p_amount where id = p_user;
  return true;
end $$;

revoke execute on function public.spend_credits(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.add_credits(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.spend_credits(uuid, integer, text) to service_role;
grant execute on function public.add_credits(uuid, integer, text, text) to service_role;

-- ─────────────────────────────────────────────
-- Private storage for generated images
-- (only the server can read/write; clients get short-lived links)
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('generations', 'generations', false)
on conflict (id) do nothing;
