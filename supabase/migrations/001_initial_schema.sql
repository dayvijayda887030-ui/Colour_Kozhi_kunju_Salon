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

alter table profiles enable row level security;
alter table settings enable row level security;
alter table gallery enable row level security;
alter table videos enable row level security;
alter table locations enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'own profile') then
    execute 'create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid())';
  end if;
end $$;

do $$
declare
  t text;
  p text;
begin
  foreach t in array array['settings','gallery','videos','locations'] loop
    foreach p in array array['read','ins','upd','del'] loop
      if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = p || ' ' || t) then
        if p = 'read' then
          execute format('create policy %I on public.%I for select to anon, authenticated using (true)', p || ' ' || t, t);
        elsif p = 'ins' then
          execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())', p || ' ' || t, t);
        elsif p = 'upd' then
          execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', p || ' ' || t, t);
        else
          execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', p || ' ' || t, t);
        end if;
      end if;
    end loop;
  end loop;
end $$;

insert into storage.buckets (id, name, public) values ('gallery', 'gallery', true) on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'gallery read') then
    execute 'create policy "gallery read" on storage.objects for select using (bucket_id = ''gallery'')';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'gallery upload') then
    execute 'create policy "gallery upload" on storage.objects for insert to authenticated with check (bucket_id = ''gallery'' and public.is_admin())';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'gallery delete') then
    execute 'create policy "gallery delete" on storage.objects for delete to authenticated using (bucket_id = ''gallery'' and public.is_admin())';
  end if;
end $$;