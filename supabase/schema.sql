-- Mountain Race Shop production booking storage
-- Run in Supabase SQL editor before enabling remote booking storage.
create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  booking_status text not null default 'New request',
  customer_name text not null,
  phone text not null,
  email text not null,
  suburb text,
  preferred_contact_method text,
  bike_brand text not null,
  bike_model text not null,
  bike_year integer,
  motorcycle_type text,
  rider_weight text,
  main_use text,
  handling_problem text,
  service_name text,
  service_code text,
  wants_pickup_dropoff boolean not null default false,
  preferred_monday_date date,
  pickup_type text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists bookings_created_at_idx on public.bookings(created_at desc);
create index if not exists bookings_monday_idx on public.bookings(preferred_monday_date) where wants_pickup_dropoff = true;

alter table public.bookings enable row level security;

-- Public customers may submit a booking, but may not list/read bookings.
drop policy if exists "public can submit bookings" on public.bookings;
create policy "public can submit bookings"
on public.bookings for insert
to anon
with check (true);

-- Reads/updates are intentionally not granted to anon.
-- Workshop/admin access should use an authenticated user or server-side service role.
