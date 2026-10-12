-- MANUAL ONLY: never execute without fresh user approval to re-enable capture.
-- No plaintext credentials are created by this script.
begin;
grant execute on function public.pair_bank_capture_device(text,text,text,text), public.list_bank_capture_devices(), public.revoke_bank_capture_device(uuid), public.read_bank_captures(bigint) to authenticated;
grant execute on function public.ingest_bank_capture(text,text,bigint,text,text,timestamptz,integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
