-- A private per-user snapshot with atomic revision checks.
create table if not exists public.finance_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.finance_state enable row level security;
revoke all on public.finance_state from anon;
revoke insert, update, delete on public.finance_state from authenticated;
grant select on public.finance_state to authenticated;
drop policy if exists "Read own finance data" on public.finance_state;
create policy "Read own finance data" on public.finance_state for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.save_finance_state(expected_revision bigint, new_snapshot jsonb)
returns table(revision bigint, snapshot jsonb)
language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Sign in first'; end if;
  if jsonb_typeof(new_snapshot) is distinct from 'object' or jsonb_typeof(new_snapshot->'transactions') is distinct from 'array'
     or coalesce(new_snapshot->>'schemaVersion','') <> '4' then raise exception 'Invalid finance snapshot'; end if;
  if octet_length(new_snapshot::text) > 10000000 then raise exception 'Snapshot exceeds 10 MB; export a backup and contact support'; end if;
  if expected_revision = 0 then
    return query insert into public.finance_state as s(user_id, revision, snapshot)
      values(current_user_id, 1, new_snapshot) on conflict (user_id) do nothing returning s.revision,s.snapshot;
  else
    return query update public.finance_state as s set snapshot = new_snapshot, revision = s.revision + 1, updated_at = now()
      where s.user_id = current_user_id and s.revision = expected_revision returning s.revision,s.snapshot;
  end if;
end;
$$;
revoke all on function public.save_finance_state(bigint,jsonb) from public,anon;
grant execute on function public.save_finance_state(bigint,jsonb) to authenticated;
