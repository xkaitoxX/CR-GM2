-- Seller Assistant database. Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Every kind of record (tickets, messages, fact sheets, activity...) lives in this one table.

create table if not exists records (
  collection text not null,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

create index if not exists records_collection_updated on records (collection, updated_at desc);

-- Only the website's server key (service role) can read or write. Nobody else can.
alter table records enable row level security;
