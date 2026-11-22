-- Oriva Design collaboration schema. This migration only creates new objects.
create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled project',
  description text not null default '',
  design_type text not null default 'ui' check (design_type in ('ui', 'logo')),
  data jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  share_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.design_members (
  design_id uuid not null references public.designs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (design_id, user_id)
);

create table if not exists public.design_comments (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists designs_owner_updated_idx on public.designs (owner_id, updated_at desc);
create index if not exists design_members_user_idx on public.design_members (user_id, design_id);
create index if not exists design_comments_design_created_idx on public.design_comments (design_id, created_at desc);

create or replace function public.touch_design_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists designs_touch_updated_at on public.designs;
create trigger designs_touch_updated_at before update on public.designs
for each row execute function public.touch_design_updated_at();

-- Definer helpers avoid recursive RLS queries through design_members.
create or replace function public.is_design_member(target_design uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.designs d
    where d.id = target_design
      and (d.owner_id = (select auth.uid()) or exists (
        select 1 from public.design_members m
        where m.design_id = d.id and m.user_id = (select auth.uid())
      ))
  );
$$;

create or replace function public.can_edit_design(target_design uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.designs d
    where d.id = target_design
      and (d.owner_id = (select auth.uid()) or exists (
        select 1 from public.design_members m
        where m.design_id = d.id and m.user_id = (select auth.uid()) and m.role = 'editor'
      ))
  );
$$;

create or replace function public.invite_to_design(target_design uuid, invitee_email text, member_role text default 'editor')
returns void language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  recipient_id uuid;
begin
  if caller_id is null then raise exception 'Sign in before inviting a collaborator.'; end if;
  if member_role not in ('editor', 'viewer') then raise exception 'Role must be editor or viewer.'; end if;
  if not exists (select 1 from public.designs d where d.id = target_design and d.owner_id = caller_id) then
    raise exception 'Only the design owner can invite collaborators.';
  end if;
  select u.id into recipient_id from auth.users u where lower(u.email) = lower(trim(invitee_email)) limit 1;
  if recipient_id is null then raise exception 'No Oriva account was found for that email. Ask them to create an account first.'; end if;
  if recipient_id = caller_id then raise exception 'You already own this design.'; end if;
  insert into public.design_members (design_id, user_id, role, invited_by)
  values (target_design, recipient_id, member_role, caller_id)
  on conflict (design_id, user_id) do update set role = excluded.role, invited_by = excluded.invited_by;
end;
$$;

alter table public.designs enable row level security;
alter table public.design_members enable row level security;
alter table public.design_comments enable row level security;

drop policy if exists "Designs are visible to their team or by public share" on public.designs;
create policy "Designs are visible to their team or by public share" on public.designs
for select to anon, authenticated using (is_public or public.is_design_member(id));

drop policy if exists "Owners create designs" on public.designs;
create policy "Owners create designs" on public.designs
for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "Owners and editors update designs" on public.designs;
create policy "Owners and editors update designs" on public.designs
for update to authenticated using (public.can_edit_design(id)) with check (public.can_edit_design(id));

drop policy if exists "Only owners delete designs" on public.designs;
create policy "Only owners delete designs" on public.designs
for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "Team members list collaborators" on public.design_members;
create policy "Team members list collaborators" on public.design_members
for select to authenticated using (public.is_design_member(design_id));

drop policy if exists "Owners remove collaborators" on public.design_members;
create policy "Owners remove collaborators" on public.design_members
for delete to authenticated using (exists (
  select 1 from public.designs d where d.id = design_id and d.owner_id = (select auth.uid())
));

drop policy if exists "Team members read comments" on public.design_comments;
create policy "Team members read comments" on public.design_comments
for select to authenticated using (public.is_design_member(design_id));

drop policy if exists "Team members add comments" on public.design_comments;
create policy "Team members add comments" on public.design_comments
for insert to authenticated with check (author_id = (select auth.uid()) and public.is_design_member(design_id));

drop policy if exists "Authors or owners delete comments" on public.design_comments;
create policy "Authors or owners delete comments" on public.design_comments
for delete to authenticated using (
  author_id = (select auth.uid()) or exists (
    select 1 from public.designs d where d.id = design_id and d.owner_id = (select auth.uid())
  )
);

revoke all on function public.invite_to_design(uuid, text, text) from public;
grant execute on function public.invite_to_design(uuid, text, text) to authenticated;
grant execute on function public.is_design_member(uuid) to anon, authenticated;
grant execute on function public.can_edit_design(uuid) to authenticated;
grant select, insert, update, delete on public.designs to authenticated;
grant select, delete on public.design_members to authenticated;
grant select, insert, delete on public.design_comments to authenticated;
grant select on public.designs to anon;

-- Realtime is optional if the default Supabase publication exists; do not fail if absent.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'designs') then
      alter publication supabase_realtime add table public.designs;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'design_comments') then
      alter publication supabase_realtime add table public.design_comments;
    end if;
  end if;
end;
$$;
