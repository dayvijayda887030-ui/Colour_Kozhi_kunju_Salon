-- Run this whole file in Supabase > SQL Editor

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('admin','super_admin')),
  created_at timestamptz default now()
);
create table if not exists settings (key text primary key, value text);
create table if not exists gallery (
  id bigint generated always as identity primary key,
  url text not null, caption text, sort int default 0,
  created_at timestamptz default now()
);
create table if not exists videos (
  id bigint generated always as identity primary key,
  url text not null, title text, sort int default 0
);
create table if not exists locations (
  id bigint generated always as identity primary key,
  name text not null, address text, maps_url text, sort int default 0
);

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as
$$ select exists (select 1 from profiles where id = auth.uid()) $$;

alter table profiles  enable row level security;
alter table settings  enable row level security;
alter table gallery   enable row level security;
alter table videos    enable row level security;
alter table locations enable row level security;

-- profiles: a user can read only their own row (writes go through /api/users with the service key)
create policy "own profile" on profiles for select to authenticated using (id = auth.uid());

-- public content: everyone reads, admins write
do $$
declare t text;
begin
  foreach t in array array['settings','gallery','videos','locations'] loop
    execute format('create policy "read %1$s" on %1$I for select to anon, authenticated using (true)', t);
    execute format('create policy "ins %1$s" on %1$I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "upd %1$s" on %1$I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "del %1$s" on %1$I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- image storage
insert into storage.buckets (id, name, public) values ('gallery', 'gallery', true) on conflict (id) do nothing;
create policy "gallery read"   on storage.objects for select using (bucket_id = 'gallery');
create policy "gallery upload" on storage.objects for insert to authenticated with check (bucket_id = 'gallery' and public.is_admin());
create policy "gallery delete" on storage.objects for delete to authenticated using (bucket_id = 'gallery' and public.is_admin());

-- FIRST SUPER ADMIN:
-- 1) Supabase > Authentication > Users > Add user (email + password, tick "Auto confirm")
-- 2) Put that same email below and run:
-- insert into profiles (id, role) select id, 'super_admin' from auth.users where email = 'YOUR_EMAIL@example.com';
