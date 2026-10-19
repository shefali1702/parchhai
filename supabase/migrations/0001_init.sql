-- =========================================================
-- Parchhai: initial schema
-- Paste this whole file into Supabase → SQL Editor → Run.
-- Every family can only ever read and write its own rows (row-level security).
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- families and who belongs to them ----------
create table if not exists public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Our family',
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_by  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id  uuid not null references public.families (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index if not exists family_members_user_idx on public.family_members (user_id);

-- is the signed-in user part of this family? (security definer avoids RLS recursion)
create or replace function public.is_family_member(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.family_members where family_id = fid and user_id = auth.uid());
$$;

-- whoever creates a family becomes its owner
create or replace function public.add_family_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.family_members (family_id, user_id, role) values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists families_add_owner on public.families;
create trigger families_add_owner after insert on public.families
  for each row execute function public.add_family_owner();

-- create a family and return it (done server-side so the new row is readable straight away)
create or replace function public.create_family(fname text)
returns public.families language plpgsql security definer set search_path = public as $$
declare f public.families;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.families (name, created_by)
  values (coalesce(nullif(trim(fname), ''), 'Our family'), auth.uid())
  returning * into f;
  return f;
end $$;
revoke all on function public.create_family(text) from public, anon;
grant execute on function public.create_family(text) to authenticated;

-- join a family with the invite code someone shared with you
create or replace function public.join_family(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into fid from public.families where invite_code = upper(trim(code));
  if fid is null then raise exception 'invalid invite code'; end if;
  insert into public.family_members (family_id, user_id, role) values (fid, auth.uid(), 'member')
  on conflict do nothing;
  return fid;
end $$;
revoke all on function public.join_family(text) from public, anon;
grant execute on function public.join_family(text) to authenticated;

-- ---------- elders, stories, capsules ----------
create table if not exists public.elders (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  name        text not null,
  call_name   text,
  lang        text not null default 'en' check (lang in ('en', 'hi', 'pa', 'ta')),
  dialect     text,
  birth_year  int check (birth_year between 1880 and 2030),
  hometown    text,
  photo       text,               -- small square JPEG as a data URL (~30 KB)
  consent_at  timestamptz,
  sample      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists elders_family_idx on public.elders (family_id);

create table if not exists public.stories (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families (id) on delete cascade,
  elder_id     uuid not null references public.elders (id) on delete cascade,
  question_id  text not null,
  theme        text not null,
  lang         text not null,
  audio_path   text,              -- object path in the private 'audio' bucket
  mime         text,
  duration     int not null default 0,
  transcript   text,
  translation  text,
  listens      int not null default 0,
  sample       boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists stories_elder_idx on public.stories (elder_id, created_at desc);
create index if not exists stories_family_idx on public.stories (family_id);

create table if not exists public.capsules (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  elder_id    uuid references public.elders (id) on delete set null,
  story_id    uuid references public.stories (id) on delete set null,
  recipient   text not null,
  occasion    int not null default 0,
  unlock_at   timestamptz not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists capsules_family_idx on public.capsules (family_id, unlock_at);

-- volunteer and old-age-home sign-ups: anyone may submit, nobody can read them from the app
create table if not exists public.volunteers (
  id          uuid primary key default gen_random_uuid(),
  role        text not null check (role in ('volunteer', 'home')),
  name        text not null,
  email       text not null,
  phone       text,
  city        text,
  org         text,
  languages   text[] not null default '{}',
  availability int,
  message     text,
  created_at  timestamptz not null default now()
);

-- ---------- row-level security ----------
alter table public.families       enable row level security;
alter table public.family_members enable row level security;
alter table public.elders         enable row level security;
alter table public.stories        enable row level security;
alter table public.capsules       enable row level security;
alter table public.volunteers     enable row level security;

drop policy if exists "members read family"   on public.families;
drop policy if exists "users create family"   on public.families;
drop policy if exists "owners update family"  on public.families;
create policy "members read family"  on public.families for select to authenticated using (public.is_family_member(id));
create policy "users create family"  on public.families for insert to authenticated with check (created_by = auth.uid());
create policy "owners update family" on public.families for update to authenticated using (created_by = auth.uid());

drop policy if exists "members read members" on public.family_members;
drop policy if exists "users leave family"   on public.family_members;
create policy "members read members" on public.family_members for select to authenticated using (public.is_family_member(family_id));
create policy "users leave family"   on public.family_members for delete to authenticated using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['elders', 'stories', 'capsules'] loop
    execute format('drop policy if exists "family reads %1$s"   on public.%1$I', t);
    execute format('drop policy if exists "family writes %1$s"  on public.%1$I', t);
    execute format('drop policy if exists "family updates %1$s" on public.%1$I', t);
    execute format('drop policy if exists "family deletes %1$s" on public.%1$I', t);
    execute format('create policy "family reads %1$s"   on public.%1$I for select to authenticated using (public.is_family_member(family_id))', t);
    execute format('create policy "family writes %1$s"  on public.%1$I for insert to authenticated with check (public.is_family_member(family_id))', t);
    execute format('create policy "family updates %1$s" on public.%1$I for update to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id))', t);
    execute format('create policy "family deletes %1$s" on public.%1$I for delete to authenticated using (public.is_family_member(family_id))', t);
  end loop;
end $$;

drop policy if exists "anyone can sign up to volunteer" on public.volunteers;
create policy "anyone can sign up to volunteer" on public.volunteers for insert to anon, authenticated with check (true);

-- ---------- private audio storage: audio/<family_id>/<story_id>.<ext> ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', false, 52428800, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a'])
on conflict (id) do nothing;

drop policy if exists "family reads audio"   on storage.objects;
drop policy if exists "family uploads audio" on storage.objects;
drop policy if exists "family deletes audio" on storage.objects;
create policy "family reads audio" on storage.objects for select to authenticated
  using (bucket_id = 'audio' and public.is_family_member(((storage.foldername(name))[1])::uuid));
create policy "family uploads audio" on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and public.is_family_member(((storage.foldername(name))[1])::uuid));
create policy "family deletes audio" on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and public.is_family_member(((storage.foldername(name))[1])::uuid));
