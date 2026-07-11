-- Mountain Race Shop™ production booking system
-- Run in a new Supabase project before adding the browser URL and anon key.

create extension if not exists pgcrypto;

create table if not exists public.workshop_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pickup_date_settings (
  pickup_date date primary key,
  status text not null default 'available'
    check (status in ('available', 'full', 'workshop_closed', 'no_canberra_run')),
  customer_message text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  booking_status text not null default 'New request'
    check (booking_status in (
      'New request',
      'Awaiting customer confirmation',
      'Confirmed',
      'Waiting on parts',
      'Booked into workshop',
      'Completed',
      'Cancelled'
    )),

  customer_name text not null,
  phone text not null,
  email text not null,
  suburb text not null,
  preferred_contact_method text,

  bike_brand text not null,
  bike_model text not null,
  bike_year integer,
  motorcycle_type text,
  suspension_removed_status text,

  selected_suspension_service text,
  suspension_service_id text,
  suspension_service_price numeric(10,2),
  suspension_service_location_type text,
  estimated_fixed_total numeric(10,2) not null default 0,

  wants_pickup_dropoff boolean not null default false,
  pickup_type text,
  pickup_price numeric(10,2),
  preferred_monday_date date,
  pickup_area text,
  pickup_notes text,
  pickup_capacity_bikes integer not null default 0 check (pickup_capacity_bikes >= 0),
  pickup_capacity_loose integer not null default 0 check (pickup_capacity_loose >= 0),

  payment_preference text,
  source text,
  campaign text,
  medium text,
  referral_code text,
  landing_page text,
  internal_notes text,
  notification_token text,
  notification_claimed_at timestamptz,
  notification_sent_at timestamptz,

  payload jsonb not null default '{}'::jsonb,
  constraint pickup_date_required_when_requested check (
    not wants_pickup_dropoff or preferred_monday_date is not null
  )
);

create index if not exists bookings_created_at_idx
  on public.bookings (created_at desc);
create index if not exists bookings_status_idx
  on public.bookings (booking_status);
create index if not exists bookings_pickup_date_idx
  on public.bookings (preferred_monday_date)
  where wants_pickup_dropoff and booking_status <> 'Cancelled';
create index if not exists bookings_customer_email_idx
  on public.bookings (lower(email));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

drop trigger if exists pickup_dates_set_updated_at on public.pickup_date_settings;
create trigger pickup_dates_set_updated_at
before update on public.pickup_date_settings
for each row execute function public.set_updated_at();

create or replace function public.is_workshop_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workshop_admin_users
    where user_id = auth.uid()
  );
$$;

alter table public.bookings enable row level security;
alter table public.pickup_date_settings enable row level security;
alter table public.workshop_admin_users enable row level security;

revoke all on public.bookings from anon, authenticated;
revoke all on public.pickup_date_settings from anon, authenticated;
revoke all on public.workshop_admin_users from anon, authenticated;

grant select on public.bookings to authenticated;
grant update (booking_status, internal_notes) on public.bookings to authenticated;
grant select, insert, update, delete on public.pickup_date_settings to authenticated;
grant select on public.workshop_admin_users to authenticated;

create policy "workshop admins read bookings"
on public.bookings for select
to authenticated
using (public.is_workshop_admin());

create policy "workshop admins update bookings"
on public.bookings for update
to authenticated
using (public.is_workshop_admin())
with check (public.is_workshop_admin());

create policy "workshop admins read pickup settings"
on public.pickup_date_settings for select
to authenticated
using (public.is_workshop_admin());

create policy "workshop admins insert pickup settings"
on public.pickup_date_settings for insert
to authenticated
with check (public.is_workshop_admin());

create policy "workshop admins update pickup settings"
on public.pickup_date_settings for update
to authenticated
using (public.is_workshop_admin())
with check (public.is_workshop_admin());

create policy "workshop admins delete pickup settings"
on public.pickup_date_settings for delete
to authenticated
using (public.is_workshop_admin());

create policy "admins can read their admin record"
on public.workshop_admin_users for select
to authenticated
using (user_id = auth.uid() or public.is_workshop_admin());

create or replace function public.get_pickup_availability(p_dates date[])
returns table (
  pickup_date date,
  date_status text,
  customer_message text,
  bikes_used integer,
  loose_used integer,
  bikes_remaining integer,
  loose_remaining integer
)
language sql
stable
security definer
set search_path = public
as $$
  with requested_dates as (
    select distinct unnest(p_dates) as pickup_date
  ), usage as (
    select
      b.preferred_monday_date as pickup_date,
      coalesce(sum(b.pickup_capacity_bikes), 0)::integer as bikes_used,
      coalesce(sum(b.pickup_capacity_loose), 0)::integer as loose_used
    from public.bookings b
    where b.wants_pickup_dropoff
      and b.booking_status <> 'Cancelled'
      and b.preferred_monday_date = any(p_dates)
    group by b.preferred_monday_date
  )
  select
    d.pickup_date,
    coalesce(s.status, 'available') as date_status,
    s.customer_message,
    coalesce(u.bikes_used, 0) as bikes_used,
    coalesce(u.loose_used, 0) as loose_used,
    greatest(0, 3 - coalesce(u.bikes_used, 0)) as bikes_remaining,
    greatest(0, 10 - coalesce(u.loose_used, 0)) as loose_remaining
  from requested_dates d
  left join public.pickup_date_settings s using (pickup_date)
  left join usage u using (pickup_date)
  order by d.pickup_date;
$$;

create or replace function public.validate_booking_pickup_capacity_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date_status text := 'available';
  v_customer_message text;
  v_used_bikes integer := 0;
  v_used_loose integer := 0;
begin
  if new.wants_pickup_dropoff
     and new.booking_status <> 'Cancelled'
     and (
       old.booking_status = 'Cancelled'
       or old.wants_pickup_dropoff is distinct from new.wants_pickup_dropoff
       or old.preferred_monday_date is distinct from new.preferred_monday_date
       or old.pickup_capacity_bikes is distinct from new.pickup_capacity_bikes
       or old.pickup_capacity_loose is distinct from new.pickup_capacity_loose
     ) then
    if new.preferred_monday_date is null then
      raise exception 'MRS_INVALID: pickup date is required';
    end if;

    perform pg_advisory_xact_lock(hashtextextended('mrs-pickup-' || new.preferred_monday_date::text, 0));

    select status, customer_message
      into v_date_status, v_customer_message
    from public.pickup_date_settings
    where pickup_date = new.preferred_monday_date;

    v_date_status := coalesce(v_date_status, 'available');
    if v_date_status <> 'available' then
      raise exception 'MRS_DATE_UNAVAILABLE: %',
        coalesce(v_customer_message, 'No Canberra pickup run is available on this date.');
    end if;

    select
      coalesce(sum(pickup_capacity_bikes), 0)::integer,
      coalesce(sum(pickup_capacity_loose), 0)::integer
    into v_used_bikes, v_used_loose
    from public.bookings
    where wants_pickup_dropoff
      and preferred_monday_date = new.preferred_monday_date
      and booking_status <> 'Cancelled'
      and id <> old.id;

    if v_used_bikes + new.pickup_capacity_bikes > 3 then
      raise exception 'MRS_CAPACITY: bike pickup capacity is full';
    end if;
    if v_used_loose + new.pickup_capacity_loose > 10 then
      raise exception 'MRS_CAPACITY: loose suspension capacity is full';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_validate_pickup_capacity on public.bookings;
create trigger bookings_validate_pickup_capacity
before update on public.bookings
for each row execute function public.validate_booking_pickup_capacity_update();

create or replace function public.create_booking_atomic(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id text;
  v_notification_token text;
  v_payload jsonb;
  v_wants_pickup boolean := coalesce((p_payload->>'wants_pickup_dropoff')::boolean, false);
  v_pickup_date date;
  v_pickup_type text := nullif(p_payload->>'pickup_type', '');
  v_expected_pickup_type text;
  v_need_bikes integer := 0;
  v_need_loose integer := 0;
  v_used_bikes integer := 0;
  v_used_loose integer := 0;
  v_date_status text := 'available';
  v_customer_message text;
  v_service_id text := nullif(p_payload->>'suspension_service_id', '');
  v_service_label text;
  v_service_price numeric(10,2);
  v_service_location text;
  v_pickup_price numeric(10,2) := 0;
  v_tyre_fitting_quantity integer := 0;
  v_tyre_fitting_cost numeric(10,2) := 0;
  v_estimated_total numeric(10,2) := 0;
begin
  if nullif(trim(p_payload->>'customer_name'), '') is null
     or nullif(trim(p_payload->>'phone'), '') is null
     or nullif(trim(p_payload->>'email'), '') is null
     or nullif(trim(p_payload->>'suburb'), '') is null
     or nullif(trim(p_payload->>'bike_brand'), '') is null
     or nullif(trim(p_payload->>'bike_model'), '') is null then
    raise exception 'MRS_INVALID: required customer or motorcycle details are missing';
  end if;

  if lower(trim(p_payload->>'email')) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'MRS_INVALID: email address is invalid';
  end if;

  if not coalesce((p_payload->>'accepted_terms')::boolean, false) then
    raise exception 'MRS_INVALID: booking terms must be accepted';
  end if;

  select service_label, service_price, service_location, expected_pickup_type
  into v_service_label, v_service_price, v_service_location, v_expected_pickup_type
  from (values
    ('fork_off', 'Fork service — off the bike', 320::numeric, 'off_bike', 'loose_forks'),
    ('shock_off', 'Shock service — off the bike', 340::numeric, 'off_bike', 'loose_shock'),
    ('fork_shock_off', 'Fork and shock service — off the bike, delivered together', 600::numeric, 'off_bike', 'loose_forks_and_shock'),
    ('fork_on', 'Fork service — on the bike', 360::numeric, 'on_bike', 'complete_bike'),
    ('shock_on', 'Shock service — on the bike', 460::numeric, 'on_bike', 'complete_bike'),
    ('revalve_off', 'Revalve, springs and service — fork and shock, off the bike', 1260::numeric, 'off_bike', 'loose_forks_and_shock'),
    ('revalve_on', 'Revalve, springs and service — fork and shock, on the bike', 1470::numeric, 'on_bike', 'complete_bike'),
    ('air_fork_off', 'Air fork bike revalve and service — fork and shock, off the bike', 1080::numeric, 'off_bike', 'loose_forks_and_shock'),
    ('air_fork_on', 'Air fork bike revalve and service — fork and shock, on the bike', 1260::numeric, 'on_bike', 'complete_bike'),
    ('suspension_other', 'Other / not sure — contact me before booking', null::numeric, 'unknown', null::text)
  ) as services(service_id, service_label, service_price, service_location, expected_pickup_type)
  where service_id = v_service_id;

  if v_service_id is not null and v_service_label is null then
    raise exception 'MRS_INVALID: unknown suspension service';
  end if;

  if v_wants_pickup then
    v_pickup_date := nullif(p_payload->>'preferred_monday_date', '')::date;
    if v_pickup_date is null then
      raise exception 'MRS_INVALID: pickup date is required';
    end if;
    if extract(isodow from v_pickup_date) <> 1 then
      raise exception 'MRS_INVALID: Canberra pickup date must be a Monday';
    end if;
    if v_pickup_date < (current_timestamp at time zone 'Australia/Sydney')::date then
      raise exception 'MRS_INVALID: pickup date is in the past';
    end if;

    if v_expected_pickup_type is not null and v_pickup_type <> v_expected_pickup_type then
      raise exception 'MRS_INVALID: pickup type does not match selected suspension service';
    end if;

    case v_pickup_type
      when 'complete_bike' then
        v_need_bikes := 1;
        v_need_loose := 0;
        v_pickup_price := 20;
      when 'loose_forks' then
        v_need_bikes := 0;
        v_need_loose := 1;
        v_pickup_price := 10;
      when 'loose_shock' then
        v_need_bikes := 0;
        v_need_loose := 1;
        v_pickup_price := 10;
      when 'loose_forks_and_shock' then
        v_need_bikes := 0;
        v_need_loose := 2;
        v_pickup_price := 20;
      else
        raise exception 'MRS_INVALID: unknown pickup type';
    end case;

    perform pg_advisory_xact_lock(hashtextextended('mrs-pickup-' || v_pickup_date::text, 0));

    select status, customer_message
      into v_date_status, v_customer_message
    from public.pickup_date_settings
    where pickup_date = v_pickup_date;

    v_date_status := coalesce(v_date_status, 'available');
    if v_date_status <> 'available' then
      raise exception 'MRS_DATE_UNAVAILABLE: %',
        coalesce(v_customer_message, 'No Canberra pickup run is available on this date.');
    end if;

    select
      coalesce(sum(pickup_capacity_bikes), 0)::integer,
      coalesce(sum(pickup_capacity_loose), 0)::integer
    into v_used_bikes, v_used_loose
    from public.bookings
    where wants_pickup_dropoff
      and preferred_monday_date = v_pickup_date
      and booking_status <> 'Cancelled';

    if v_used_bikes + v_need_bikes > 3 then
      raise exception 'MRS_CAPACITY: bike pickup capacity is full';
    end if;
    if v_used_loose + v_need_loose > 10 then
      raise exception 'MRS_CAPACITY: loose suspension capacity is full';
    end if;
  else
    v_pickup_type := null;
    v_pickup_date := null;
  end if;

  if coalesce((p_payload->>'tyre_fitting_required')::boolean, false) then
    v_tyre_fitting_quantity := coalesce((p_payload->>'tyre_fitting_quantity')::integer, 0);
    if v_tyre_fitting_quantity < 1 or v_tyre_fitting_quantity > 4 then
      raise exception 'MRS_INVALID: tyre fitting quantity must be between 1 and 4';
    end if;
    v_tyre_fitting_cost := v_tyre_fitting_quantity * 30;
  end if;

  if v_service_id is null
     and jsonb_array_length(coalesce(p_payload->'selected_engine_services', '[]'::jsonb)) = 0
     and jsonb_array_length(coalesce(p_payload->'selected_tyres', '[]'::jsonb)) = 0
     and jsonb_array_length(coalesce(p_payload->'brake_pad_check_options', '[]'::jsonb)) = 0
     and v_tyre_fitting_quantity = 0 then
    raise exception 'MRS_INVALID: at least one workshop service is required';
  end if;

  v_estimated_total := coalesce(v_service_price, 0) + v_pickup_price + v_tyre_fitting_cost;
  v_booking_id := 'MRS-' ||
    to_char(current_timestamp at time zone 'Australia/Sydney', 'YYYYMMDD') || '-' ||
    upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 4));
  v_notification_token := encode(gen_random_bytes(24), 'hex');

  v_payload := p_payload || jsonb_build_object(
    'selected_suspension_service', v_service_label,
    'suspension_service_price', v_service_price,
    'suspension_service_location_type', v_service_location,
    'pickup_type', v_pickup_type,
    'pickup_price', case when v_wants_pickup then v_pickup_price else null end,
    'pickup_capacity_bikes', v_need_bikes,
    'pickup_capacity_loose', v_need_loose,
    'tyre_fitting_quantity', nullif(v_tyre_fitting_quantity, 0),
    'tyre_fitting_cost', nullif(v_tyre_fitting_cost, 0),
    'estimated_fixed_total', v_estimated_total
  );

  insert into public.bookings (
    booking_id,
    customer_name,
    phone,
    email,
    suburb,
    preferred_contact_method,
    bike_brand,
    bike_model,
    bike_year,
    motorcycle_type,
    suspension_removed_status,
    selected_suspension_service,
    suspension_service_id,
    suspension_service_price,
    suspension_service_location_type,
    estimated_fixed_total,
    wants_pickup_dropoff,
    pickup_type,
    pickup_price,
    preferred_monday_date,
    pickup_area,
    pickup_notes,
    pickup_capacity_bikes,
    pickup_capacity_loose,
    payment_preference,
    source,
    campaign,
    medium,
    referral_code,
    landing_page,
    notification_token,
    payload
  ) values (
    v_booking_id,
    trim(p_payload->>'customer_name'),
    trim(p_payload->>'phone'),
    lower(trim(p_payload->>'email')),
    trim(p_payload->>'suburb'),
    nullif(p_payload->>'preferred_contact_method', ''),
    trim(p_payload->>'bike_brand'),
    trim(p_payload->>'bike_model'),
    nullif(p_payload->>'bike_year', '')::integer,
    nullif(p_payload->>'motorcycle_type', ''),
    nullif(p_payload->>'suspension_removed_status', ''),
    v_service_label,
    v_service_id,
    v_service_price,
    v_service_location,
    v_estimated_total,
    v_wants_pickup,
    v_pickup_type,
    case when v_wants_pickup then v_pickup_price else null end,
    v_pickup_date,
    nullif(p_payload->>'pickup_area', ''),
    nullif(p_payload->>'pickup_notes', ''),
    v_need_bikes,
    v_need_loose,
    nullif(p_payload->>'payment_preference', ''),
    nullif(p_payload->>'source', ''),
    nullif(p_payload->>'campaign', ''),
    nullif(p_payload->>'medium', ''),
    nullif(p_payload->>'referral_code', ''),
    nullif(p_payload->>'landing_page', ''),
    v_notification_token,
    v_payload
  );

  return jsonb_build_object(
    'booking_id', v_booking_id,
    'booking_status', 'New request',
    'preferred_monday_date', v_pickup_date,
    'estimated_fixed_total', v_estimated_total,
    'notification_token', v_notification_token
  );
end;
$$;

create or replace function public.claim_booking_notification(
  p_booking_id text,
  p_notification_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  update public.bookings
  set notification_token = null,
      notification_claimed_at = now()
  where booking_id = p_booking_id
    and notification_token = p_notification_token
    and notification_claimed_at is null
  returning * into v_booking;

  if not found then
    return null;
  end if;
  return to_jsonb(v_booking);
end;
$$;

revoke all on function public.get_pickup_availability(date[]) from public;
revoke all on function public.create_booking_atomic(jsonb) from public;
revoke all on function public.claim_booking_notification(text, text) from public;
grant execute on function public.get_pickup_availability(date[]) to anon, authenticated;
grant execute on function public.create_booking_atomic(jsonb) to anon, authenticated;
grant execute on function public.claim_booking_notification(text, text) to service_role;

-- After creating Craig's Supabase Auth account, run this once with the correct UUID:
-- insert into public.workshop_admin_users (user_id, email)
-- values ('AUTH-USER-UUID-HERE', 'sales@mountainraceshop.com.au');
