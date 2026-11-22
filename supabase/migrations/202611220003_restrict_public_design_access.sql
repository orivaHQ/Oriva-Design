-- Public designs are retrieved only through their unguessable share token.
-- Do not grant anonymous callers table-wide SELECT access to all public designs.
drop policy if exists "Designs are visible to their team or by public share" on public.designs;
create policy "Team members read their designs" on public.designs
for select to authenticated using (public.is_design_member(id));
revoke select on public.designs from anon;

create or replace function public.guard_design_owner_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.owner_id is distinct from auth.uid()
    and (
      new.owner_id is distinct from old.owner_id
      or new.is_public is distinct from old.is_public
      or new.share_token is distinct from old.share_token
    ) then
    raise exception 'Only the design owner can change ownership or link access.';
  end if;
  return new;
end;
$$;

drop trigger if exists designs_guard_owner_fields on public.designs;
create trigger designs_guard_owner_fields
before update on public.designs
for each row execute function public.guard_design_owner_fields();

create or replace function public.get_shared_design(target_token uuid)
returns table (
  id uuid,
  name text,
  description text,
  design_type text,
  data jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.name, d.description, d.design_type, d.data
  from public.designs as d
  where d.share_token = target_token and d.is_public
  limit 1;
$$;

revoke all on function public.get_shared_design(uuid) from public;
grant execute on function public.get_shared_design(uuid) to anon, authenticated;
