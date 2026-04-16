create extension if not exists pgcrypto;

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  requirements_hash text not null,
  proposal_data jsonb not null,
  project_info jsonb not null,
  company_id text not null,
  total_cost numeric not null default 0,
  timeline text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists proposals_created_at_idx on public.proposals (created_at desc);
create index if not exists proposals_requirements_hash_idx on public.proposals (requirements_hash);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists proposals_set_updated_at on public.proposals;
create trigger proposals_set_updated_at
before update on public.proposals
for each row
execute function public.set_updated_at();

create table if not exists public.google_auth_sessions (
  session_id text primary key,
  client_id text not null,
  client_secret text not null,
  tokens jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists google_auth_sessions_set_updated_at on public.google_auth_sessions;
create trigger google_auth_sessions_set_updated_at
before update on public.google_auth_sessions
for each row
execute function public.set_updated_at();
