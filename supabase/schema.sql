-- ============================================================
-- CODE FIRST — Database schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- AVAILABILITY (consultation slots Reza opens) ----------
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_booked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.availability enable row level security;

-- Anyone can see open (not-yet-booked, future) slots.
drop policy if exists "Open slots are public" on public.availability;
create policy "Open slots are public"
  on public.availability for select
  using (is_booked = false and starts_at > now());

-- ---------- BOOKINGS ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slot_id uuid not null references public.availability (id),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'completed')),
  amount_cents integer not null default 9900,
  currency text not null default 'usd',
  stripe_session_id text,
  meet_link text,
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

drop policy if exists "Bookings viewable by owner" on public.bookings;
create policy "Bookings viewable by owner"
  on public.bookings for select
  using (auth.uid() = user_id);

drop policy if exists "Bookings insertable by owner" on public.bookings;
create policy "Bookings insertable by owner"
  on public.bookings for insert
  with check (auth.uid() = user_id);

-- Updates (status -> paid, meet_link) happen via the Stripe webhook using the
-- service-role key, which bypasses RLS. No public update policy on purpose.

-- ---------- PAYMENTS ----------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete set null,
  stripe_payment_intent text,
  stripe_session_id text,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null default 'created',
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;
-- Payments are managed only by the server (service role). No public policies.

-- ---------- WEBINARS (future: online classes / webinars) ----------
create table if not exists public.webinars (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  duration_minutes integer not null default 60,
  price_cents integer not null default 0,
  capacity integer,
  join_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.webinars enable row level security;

drop policy if exists "Published webinars are public" on public.webinars;
create policy "Published webinars are public"
  on public.webinars for select
  using (is_published = true);

create table if not exists public.webinar_registrations (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'registered',
  created_at timestamptz not null default now(),
  unique (webinar_id, user_id)
);

alter table public.webinar_registrations enable row level security;

drop policy if exists "Registrations viewable by owner" on public.webinar_registrations;
create policy "Registrations viewable by owner"
  on public.webinar_registrations for select
  using (auth.uid() = user_id);

drop policy if exists "Registrations insertable by owner" on public.webinar_registrations;
create policy "Registrations insertable by owner"
  on public.webinar_registrations for insert
  with check (auth.uid() = user_id);
