alter table public.design_members add column if not exists invited_email text not null default '';
create or replace function public.invite_to_design(target_design uuid, invitee_email text, member_role text default 'editor')
returns void language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); recipient_id uuid; normalized_email text := lower(trim(invitee_email));
begin
  if caller_id is null then raise exception 'Sign in before inviting a collaborator.'; end if;
  if member_role not in ('editor', 'viewer') then raise exception 'Role must be editor or viewer.'; end if;
  if normalized_email = '' then raise exception 'Enter an email address.'; end if;
  if not exists (select 1 from public.designs d where d.id = target_design and d.owner_id = caller_id) then raise exception 'Only the design owner can invite collaborators.'; end if;
  select u.id into recipient_id from auth.users u where lower(u.email) = normalized_email limit 1;
  if recipient_id is null then raise exception 'No Oriva account was found for that email. Ask them to create an account first.'; end if;
  if recipient_id = caller_id then raise exception 'You already own this design.'; end if;
  insert into public.design_members (design_id, user_id, role, invited_by, invited_email)
  values (target_design, recipient_id, member_role, caller_id, normalized_email)
  on conflict (design_id, user_id) do update set role = excluded.role, invited_by = excluded.invited_by, invited_email = excluded.invited_email;
end; $$;
revoke all on function public.invite_to_design(uuid, text, text) from public;
grant execute on function public.invite_to_design(uuid, text, text) to authenticated;
