-- SeaGres uses its own server-side sessions, NOT Supabase Auth JWTs.
-- auth.uid() cannot authorize these users. All app data goes through the
-- Next.js server, which checks the session/role/owner and uses service_role.
-- Close direct anon/authenticated access, including account hashes/tokens.
-- No user, inventory, history or uploaded file is deleted by this migration.
-- Scope: the named SeaGres tables/view/RPCs and the lot-photos bucket only.
begin;

do $$
declare
  v_table text;
  v_policy record;
begin
  foreach v_table in array array[
    'users', 'prices', 'lots', 'orders', 'reports', 'products',
    'sub_products', 'product_history', 'history_geo_points', 'history_documents'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    -- These tables are server-only. No client policy can safely identify our
    -- custom sessions; service_role bypasses RLS after server authorization.
    for v_policy in
      select policyname from pg_catalog.pg_policies
      where schemaname = 'public' and tablename = v_table
    loop
      execute format('drop policy %I on public.%I', v_policy.policyname, v_table);
    end loop;
    execute format(
      'revoke all privileges on table public.%I from public, anon, authenticated, service_role', v_table
    );
  end loop;
end;
$$;

-- Only the operations used by the current server are granted. History is
-- append-only through the API; product deletion still cascades per old schema.
grant select, insert, update on table public.users, public.lots, public.orders, public.sub_products to service_role;
-- UPDATE is also required by SELECT ... FOR UPDATE in create_product_receipts.
grant select, insert, update, delete on table public.products to service_role;
grant select, insert on table public.reports, public.product_history, public.history_geo_points, public.history_documents to service_role;
grant select on table public.prices to service_role;

-- Views can otherwise run with their owner's privileges, bypassing table RLS.
alter view public.order_views set (security_invoker = true);
revoke all privileges on table public.order_views from public, anon, authenticated, service_role;
grant select on table public.order_views to service_role;

-- Older RPCs also need explicit revocation: functions default to PUBLIC EXECUTE.
revoke all privileges on function public.reserve_lot_weight(text,numeric) from public, anon, authenticated;
revoke all privileges on function public.apply_accept_effects(text) from public, anon, authenticated;
revoke all privileges on function public.record_stock_event(text,text,text,text,numeric,text) from public, anon, authenticated;
revoke all privileges on function public.create_product_receipts(text,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.reserve_lot_weight(text,numeric) to service_role;
grant execute on function public.apply_accept_effects(text) to service_role;
grant execute on function public.record_stock_event(text,text,text,text,numeric,text) to service_role;
grant execute on function public.create_product_receipts(text,text,jsonb,jsonb) to service_role;
alter function public.reserve_lot_weight(text,numeric) set search_path = '';
alter function public.apply_accept_effects(text) set search_path = '';

-- RESTRICTIVE combines with (rather than replaces) any other storage policy.
-- Direct clients cannot list/mutate our bucket even if an older permissive
-- policy exists. Other buckets and their policies are not changed.
-- Public file URLs intentionally remain public; this is NOT a privacy fix.
drop policy if exists seagres_evidence_server_only on storage.objects;
create policy seagres_evidence_server_only on storage.objects
  as restrictive for all to anon, authenticated
  using (bucket_id <> 'lot-photos')
  with check (bucket_id <> 'lot-photos');

notify pgrst, 'reload schema';
commit;
