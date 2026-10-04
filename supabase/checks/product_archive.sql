-- Read-only installation/permissions check, after the archive migration.
begin;
do $$
declare v_role text; v_function text;
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='deleted_at') then
    raise exception 'ARCHIVE_COLUMN_MISSING';
  end if;
  foreach v_function in array array['public.set_product_archived(text,text,boolean)', 'public.require_active_product()'] loop
    if to_regprocedure(v_function) is null then raise exception 'ARCHIVE_FUNCTION_MISSING: %', v_function; end if;
    foreach v_role in array array['anon','authenticated'] loop
      if has_function_privilege(v_role, v_function, 'execute') then raise exception 'ARCHIVE_CLIENT_PERMISSION_LEAK: %', v_role; end if;
    end loop;
    if not has_function_privilege('service_role', v_function, 'execute') then raise exception 'ARCHIVE_SERVER_PERMISSION_MISSING'; end if;
  end loop;
  if not exists (select 1 from pg_trigger where tgname='sub_products_require_active' and tgrelid='public.sub_products'::regclass and tgenabled='O')
    or not exists (select 1 from pg_trigger where tgname='product_history_require_active' and tgrelid='public.product_history'::regclass and tgenabled='O') then
    raise exception 'ARCHIVE_GUARD_MISSING';
  end if;
end;
$$;
select 'PASS: recoverable archive installed; client RPC access blocked; receipt/history guards enabled' as result;
commit;
