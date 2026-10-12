-- User-requested reversible shutdown. Keep data, tables and functions.
begin;
revoke all on function public.ingest_bank_capture(text,text,bigint,text,text,timestamptz,integer) from public,anon,authenticated;
revoke all on function public.pair_bank_capture_device(text,text,text,text) from public,anon,authenticated;
revoke all on function public.list_bank_capture_devices() from public,anon,authenticated;
revoke all on function public.revoke_bank_capture_device(uuid) from public,anon,authenticated;
revoke all on function public.read_bank_captures(bigint) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
