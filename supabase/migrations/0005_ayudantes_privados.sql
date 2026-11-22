-- =====================================================================
-- 0005 · Los ayudantes internos salen de la API pública
--
-- Los advisors de Supabase avisaron de que funciones como `soy_gerente()`
-- o `tz_tienda()` se podían llamar desde fuera, por `/rest/v1/rpc/...`.
-- No son parte de la API: existen para que las políticas de RLS y los
-- disparadores puedan leer el perfil sin recursión.
--
-- Se mudan al esquema `app`, que PostgREST no publica. Las políticas las
-- siguen llamando con nombre completo. De paso, las funciones que SÍ son
-- API quedan solo para quien ha iniciado sesión: `anon` pierde el permiso,
-- menos en `verificar_codigo_tienda`, que es la que usa quien todavía no
-- tiene cuenta y solo devuelve el nombre de la tienda.
-- =====================================================================

create schema if not exists app;
grant usage on schema app to authenticated, anon;

-- ------------------------------------------------- ayudantes, ahora en app
create or replace function app.mi_tienda()
returns uuid language sql stable security definer set search_path = public as $$
  select tienda_id from perfiles where id = auth.uid()
$$;

create or replace function app.mi_area()
returns area_t language sql stable security definer set search_path = public as $$
  select area from perfiles where id = auth.uid()
$$;

create or replace function app.soy_gerente()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'gerente' from perfiles where id = auth.uid()), false)
$$;

create or replace function app.tz_tienda(p_tienda uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select zona_horaria from tiendas where id = p_tienda), 'America/El_Salvador')
$$;

create or replace function app.hoy_tienda(p_tienda uuid)
returns date language sql stable security definer set search_path = public as $$
  select (now() at time zone app.tz_tienda(p_tienda))::date
$$;

create or replace function app.ventana_abierta(p_tienda uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select extract(isodow from (now() at time zone app.tz_tienda(p_tienda))) <= 5
$$;

create or replace function app.semana_objetivo(p_tienda uuid)
returns date language sql stable security definer set search_path = public as $$
  select (date_trunc('week', (now() at time zone app.tz_tienda(p_tienda)))::date + 7)
$$;

create or replace function app.manejar_usuario_nuevo()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_codigo   text  := upper(btrim(coalesce(v_meta ->> 'codigo', '')));
  v_usuario  text  := lower(btrim(coalesce(v_meta ->> 'usuario', '')));
  v_nombre   text  := btrim(coalesce(v_meta ->> 'nombre_completo', ''));
  v_area     text  := coalesce(v_meta ->> 'area', '');
  v_contrato text  := coalesce(v_meta ->> 'contrato', '');
  v_tienda   uuid;
begin
  select id into v_tienda from tiendas where codigo_acceso = v_codigo;
  if v_tienda is null                                  then raise exception 'CODIGO_INVALIDO'; end if;
  if v_usuario !~ '^[a-z0-9._]{3,20}$'                 then raise exception 'USUARIO_INVALIDO'; end if;
  if length(v_nombre) < 3                              then raise exception 'NOMBRE_INVALIDO'; end if;
  if v_area not in ('cocina', 'servicio')              then raise exception 'AREA_INVALIDA'; end if;
  if v_contrato not in ('tiempo_completo', 'por_hora') then raise exception 'CONTRATO_INVALIDO'; end if;

  insert into perfiles (id, tienda_id, usuario, nombre_completo, area, contrato, rol, activo)
  values (new.id, v_tienda, v_usuario, v_nombre, v_area::area_t, v_contrato::contrato_t, 'empleado', true);

  return new;
end $$;

create or replace function app.proteger_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  new.id        := old.id;
  new.tienda_id := old.tienda_id;
  new.rol       := old.rol;
  new.usuario   := old.usuario;
  new.creado_en := old.creado_en;

  if auth.uid() = old.id then
    new.activo := old.activo;
  else
    new.nombre_completo := old.nombre_completo;
    new.area            := old.area;
    new.contrato        := old.contrato;
  end if;

  return new;
end $$;

-- --------------------------------------------- disparadores a las nuevas
drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function app.manejar_usuario_nuevo();

drop trigger if exists al_editar_perfil on perfiles;
create trigger al_editar_perfil
  before update on perfiles
  for each row execute function app.proteger_perfil();

-- ------------------------------------------------ políticas a las nuevas
drop policy if exists tiendas_lee_gerente     on tiendas;
drop policy if exists perfiles_lee_gerente    on perfiles;
drop policy if exists perfiles_edita_gerente  on perfiles;
drop policy if exists peticiones_lee_gerente  on peticiones;
drop policy if exists dias_lee                on peticion_dias;

create policy tiendas_lee_gerente on tiendas
  for select to authenticated
  using (app.soy_gerente() and id = app.mi_tienda());

create policy perfiles_lee_gerente on perfiles
  for select to authenticated
  using (app.soy_gerente() and tienda_id = app.mi_tienda());

create policy perfiles_edita_gerente on perfiles
  for update to authenticated
  using (app.soy_gerente() and tienda_id = app.mi_tienda())
  with check (app.soy_gerente() and tienda_id = app.mi_tienda());

create policy peticiones_lee_gerente on peticiones
  for select to authenticated
  using (app.soy_gerente() and tienda_id = app.mi_tienda());

create policy dias_lee on peticion_dias
  for select to authenticated
  using (exists (
    select 1 from peticiones p
    where p.id = peticion_dias.peticion_id
      and (p.empleado_id = auth.uid() or (app.soy_gerente() and p.tienda_id = app.mi_tienda()))
  ));

drop policy if exists dibujos_sube_el_autor         on storage.objects;
drop policy if exists dibujos_lee_autor_o_gerente   on storage.objects;

create policy dibujos_sube_el_autor on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dibujos'
    and (storage.foldername(name))[1] = app.mi_tienda()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy dibujos_lee_autor_o_gerente on storage.objects
  for select to authenticated
  using (
    bucket_id = 'dibujos'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or (app.soy_gerente() and (storage.foldername(name))[1] = app.mi_tienda()::text)
    )
  );

-- --------------------------------------- la API, ahora llamando a app.*
create or replace function estado_ventana()
returns table (abierta boolean, hoy date, semana_inicio date, semana_fin date, zona text)
language sql stable security definer set search_path = public as $$
  select app.ventana_abierta(app.mi_tienda()),
         app.hoy_tienda(app.mi_tienda()),
         app.semana_objetivo(app.mi_tienda()),
         app.semana_objetivo(app.mi_tienda()) + 6,
         app.tz_tienda(app.mi_tienda())
$$;

create or replace function contar_choques(p_fechas date[])
returns table (fecha date, cuantas integer)
language sql stable security definer set search_path = public as $$
  select d.fecha, count(*)::int
  from unnest(p_fechas) as d(fecha)
  join peticion_dias pd on pd.fecha = d.fecha
  join peticiones    p  on p.id = pd.peticion_id
  join perfiles      pe on pe.id = p.empleado_id
  where p.tienda_id   = app.mi_tienda()
    and pe.area       = app.mi_area()
    and p.estado      in ('pendiente', 'aprobada')
    and p.empleado_id <> auth.uid()
  group by d.fecha
$$;

create or replace function crear_peticion(
  p_prioridad   prioridad_t,
  p_texto       text,
  p_fechas      date[],
  p_tipo        tipo_t default null,
  p_dibujo_path text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_perfil  perfiles;
  v_hoy     date;
  v_lunes   date;
  v_semana  date;
  v_id      uuid;
  f         date;
begin
  select * into v_perfil from perfiles where id = auth.uid();
  if v_perfil.id is null then raise exception 'SIN_PERFIL'; end if;
  if not v_perfil.activo then raise exception 'CUENTA_INACTIVA'; end if;
  if not app.ventana_abierta(v_perfil.tienda_id) then raise exception 'VENTANA_CERRADA'; end if;
  if length(btrim(coalesce(p_texto, ''))) = 0 then raise exception 'TEXTO_VACIO'; end if;
  if p_fechas is null or coalesce(array_length(p_fechas, 1), 0) = 0 then raise exception 'SIN_DIAS'; end if;
  if p_prioridad = 'emergencia' and array_length(p_fechas, 1) <> 1 then raise exception 'EMERGENCIA_UN_SOLO_DIA'; end if;

  v_hoy   := app.hoy_tienda(v_perfil.tienda_id);
  v_lunes := app.semana_objetivo(v_perfil.tienda_id);

  foreach f in array p_fechas loop
    if p_prioridad = 'normal' then
      if f < v_lunes or f > v_lunes + 6 then raise exception 'FECHA_FUERA_DE_SEMANA'; end if;
    else
      if f < v_hoy or f > v_lunes + 6 then raise exception 'FECHA_FUERA_DE_RANGO'; end if;
    end if;
  end loop;

  if p_prioridad = 'normal' then
    v_semana := v_lunes;
  else
    v_semana := date_trunc('week', p_fechas[1])::date;
  end if;

  insert into peticiones (tienda_id, empleado_id, prioridad, tipo, semana_inicio, texto, dibujo_path)
  values (v_perfil.tienda_id, v_perfil.id, p_prioridad, p_tipo, v_semana, btrim(p_texto), p_dibujo_path)
  returning id into v_id;

  insert into peticion_dias (peticion_id, fecha)
  select v_id, x from unnest(p_fechas) as x
  on conflict do nothing;

  return v_id;
end $$;

create or replace function editar_peticion(
  p_id          uuid,
  p_texto       text,
  p_fechas      date[],
  p_tipo        tipo_t default null,
  p_dibujo_path text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_perfil  perfiles;
  v_pet     peticiones;
  v_hoy     date;
  v_lunes   date;
  v_antes   date[];
  v_ahora   date[];
  f         date;
begin
  select * into v_perfil from perfiles where id = auth.uid();
  if v_perfil.id is null then raise exception 'SIN_PERFIL'; end if;

  select * into v_pet from peticiones where id = p_id;
  if v_pet.id is null then raise exception 'NO_EXISTE'; end if;
  if v_pet.empleado_id <> v_perfil.id then raise exception 'NO_ES_TUYA'; end if;
  if v_pet.estado <> 'pendiente' then raise exception 'YA_RESUELTA'; end if;
  if not app.ventana_abierta(v_perfil.tienda_id) then raise exception 'VENTANA_CERRADA'; end if;
  if length(btrim(coalesce(p_texto, ''))) = 0 then raise exception 'TEXTO_VACIO'; end if;
  if p_fechas is null or coalesce(array_length(p_fechas, 1), 0) = 0 then raise exception 'SIN_DIAS'; end if;
  if v_pet.prioridad = 'emergencia' and array_length(p_fechas, 1) <> 1 then raise exception 'EMERGENCIA_UN_SOLO_DIA'; end if;

  v_hoy   := app.hoy_tienda(v_perfil.tienda_id);
  v_lunes := app.semana_objetivo(v_perfil.tienda_id);

  foreach f in array p_fechas loop
    if v_pet.prioridad = 'normal' then
      if f < v_lunes or f > v_lunes + 6 then raise exception 'FECHA_FUERA_DE_SEMANA'; end if;
    else
      if f < v_hoy or f > v_lunes + 6 then raise exception 'FECHA_FUERA_DE_RANGO'; end if;
    end if;
  end loop;

  select array_agg(fecha order by fecha) into v_antes from peticion_dias where peticion_id = p_id;
  select array_agg(x order by x) into v_ahora from (select distinct unnest(p_fechas) as x) s;

  delete from peticion_dias where peticion_id = p_id;
  insert into peticion_dias (peticion_id, fecha)
  select p_id, x from unnest(p_fechas) as x
  on conflict do nothing;

  update peticiones
     set texto         = btrim(p_texto),
         tipo          = p_tipo,
         dibujo_path   = p_dibujo_path,
         editada_en    = now(),
         en_fila_desde = case when v_antes is distinct from v_ahora then now() else en_fila_desde end
   where id = p_id;
end $$;

create or replace function eliminar_peticion(p_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_pet peticiones;
begin
  select * into v_pet from peticiones where id = p_id;
  if v_pet.id is null then raise exception 'NO_EXISTE'; end if;
  if v_pet.empleado_id <> auth.uid() then raise exception 'NO_ES_TUYA'; end if;
  if v_pet.estado <> 'pendiente' then raise exception 'YA_RESUELTA'; end if;
  if not app.ventana_abierta(v_pet.tienda_id) then raise exception 'VENTANA_CERRADA'; end if;

  delete from peticiones where id = p_id;
  return v_pet.dibujo_path;
end $$;

create or replace function resolver_peticion(
  p_id         uuid,
  p_estado     estado_t,
  p_comentario text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_pet peticiones;
begin
  if not app.soy_gerente() then raise exception 'SOLO_GERENTE'; end if;
  if p_estado not in ('aprobada', 'rechazada') then raise exception 'ESTADO_INVALIDO'; end if;

  select * into v_pet from peticiones where id = p_id;
  if v_pet.id is null then raise exception 'NO_EXISTE'; end if;
  if v_pet.tienda_id <> app.mi_tienda() then raise exception 'OTRA_TIENDA'; end if;
  if v_pet.estado <> 'pendiente' then raise exception 'YA_RESUELTA'; end if;

  update peticiones
     set estado             = p_estado,
         comentario_gerente = nullif(btrim(coalesce(p_comentario, '')), ''),
         resuelta_en        = now(),
         resuelta_por       = auth.uid()
   where id = p_id;
end $$;

create or replace function emergencias_del_mes(p_empleado uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int
  from peticiones p
  where p.empleado_id = p_empleado
    and p.prioridad   = 'emergencia'
    and p.tienda_id   = app.mi_tienda()
    and app.soy_gerente()
    and p.creada_en >= date_trunc('month', now())
$$;

-- ------------------------------------------------- fuera las de `public`
drop function if exists mi_tienda();
drop function if exists mi_area();
drop function if exists soy_gerente();
drop function if exists estoy_activo();
drop function if exists tz_tienda(uuid);
drop function if exists hoy_tienda(uuid);
drop function if exists ventana_abierta(uuid);
drop function if exists semana_objetivo(uuid);
drop function if exists manejar_usuario_nuevo();
drop function if exists proteger_perfil();

-- --------------------------------------------------- permisos, al milímetro
-- Nada de la API queda abierto a quien no ha iniciado sesión, menos la
-- comprobación del código, que es justo para quien aún no tiene cuenta.
revoke all on function estado_ventana()                                        from public;
revoke all on function contar_choques(date[])                                  from public;
revoke all on function mi_posicion(uuid)                                       from public;
revoke all on function crear_peticion(prioridad_t, text, date[], tipo_t, text) from public;
revoke all on function editar_peticion(uuid, text, date[], tipo_t, text)       from public;
revoke all on function eliminar_peticion(uuid)                                 from public;
revoke all on function resolver_peticion(uuid, estado_t, text)                 from public;
revoke all on function emergencias_del_mes(uuid)                               from public;
revoke all on function verificar_codigo_tienda(text)                           from public;

grant execute on function estado_ventana()                                        to authenticated;
grant execute on function contar_choques(date[])                                  to authenticated;
grant execute on function mi_posicion(uuid)                                       to authenticated;
grant execute on function crear_peticion(prioridad_t, text, date[], tipo_t, text) to authenticated;
grant execute on function editar_peticion(uuid, text, date[], tipo_t, text)       to authenticated;
grant execute on function eliminar_peticion(uuid)                                 to authenticated;
grant execute on function resolver_peticion(uuid, estado_t, text)                 to authenticated;
grant execute on function emergencias_del_mes(uuid)                               to authenticated;
grant execute on function verificar_codigo_tienda(text)                           to anon, authenticated;

-- Los ayudantes se llaman desde las políticas, así que la sesión necesita
-- poder ejecutarlos; lo que ya no pueden es llamarse desde la API, porque
-- PostgREST no publica el esquema `app`.
grant execute on all functions in schema app to authenticated, anon;
