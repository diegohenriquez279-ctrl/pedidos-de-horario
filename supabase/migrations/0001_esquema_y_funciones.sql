-- =====================================================================
-- 0001 · Esquema, funciones y disparadores
-- App de peticiones de horario. Multi-tienda desde el inicio.
-- No contiene datos: la tienda y su código se cargan aparte, a mano.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
create type area_t      as enum ('cocina', 'servicio');
create type contrato_t  as enum ('tiempo_completo', 'por_hora');
create type rol_t       as enum ('empleado', 'gerente');
create type prioridad_t as enum ('normal', 'emergencia');
create type tipo_t      as enum ('dia_libre', 'turno', 'otro');
create type estado_t    as enum ('pendiente', 'aprobada', 'rechazada');

-- --------------------------------------------------------------- tablas
create table tiendas (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  codigo_acceso text not null unique,
  zona_horaria  text not null default 'America/El_Salvador',
  creada_en     timestamptz not null default now()
);

create table perfiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  tienda_id       uuid not null references tiendas (id),
  usuario         text not null unique,
  nombre_completo text not null,
  area            area_t not null,
  contrato        contrato_t not null,
  rol             rol_t not null default 'empleado',
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  constraint usuario_formato check (usuario ~ '^[a-z0-9._]{3,20}$'),
  constraint nombre_no_vacio check (length(btrim(nombre_completo)) >= 3)
);

create table peticiones (
  id                 uuid primary key default gen_random_uuid(),
  tienda_id          uuid not null references tiendas (id),
  empleado_id        uuid not null references perfiles (id) on delete cascade,
  prioridad          prioridad_t not null default 'normal',
  tipo               tipo_t,
  semana_inicio      date not null,
  texto              text not null,
  dibujo_path        text,
  estado             estado_t not null default 'pendiente',
  creada_en          timestamptz not null default now(),
  -- define el orden de llegada; se reinicia si el empleado cambia los días
  en_fila_desde      timestamptz not null default now(),
  editada_en         timestamptz,
  comentario_gerente text,
  resuelta_en        timestamptz,
  resuelta_por       uuid references perfiles (id),
  constraint texto_tamano check (length(btrim(texto)) between 1 and 1000),
  constraint comentario_tamano check (comentario_gerente is null or length(comentario_gerente) <= 500)
);

create table peticion_dias (
  peticion_id uuid not null references peticiones (id) on delete cascade,
  fecha       date not null,
  primary key (peticion_id, fecha)
);

create index peticiones_cola_idx     on peticiones (tienda_id, estado, prioridad, en_fila_desde);
create index peticiones_empleado_idx on peticiones (empleado_id, creada_en desc);
create index peticion_dias_fecha_idx on peticion_dias (fecha);

-- ------------------------------------------------- ayudantes de sesión
-- Todos son security definer para que las políticas de RLS puedan leer
-- el perfil del usuario sin caer en recursión infinita.

create or replace function mi_tienda()
returns uuid language sql stable security definer set search_path = public as $$
  select tienda_id from perfiles where id = auth.uid()
$$;

create or replace function mi_area()
returns area_t language sql stable security definer set search_path = public as $$
  select area from perfiles where id = auth.uid()
$$;

create or replace function soy_gerente()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'gerente' from perfiles where id = auth.uid()), false)
$$;

create or replace function estoy_activo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select activo from perfiles where id = auth.uid()), false)
$$;

-- ------------------------------------------------- el reloj de la tienda
create or replace function tz_tienda(p_tienda uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select zona_horaria from tiendas where id = p_tienda), 'America/El_Salvador')
$$;

create or replace function hoy_tienda(p_tienda uuid)
returns date language sql stable security definer set search_path = public as $$
  select (now() at time zone tz_tienda(p_tienda))::date
$$;

-- Abierto de lunes 00:00 a viernes 23:59:59, hora de la tienda.
create or replace function ventana_abierta(p_tienda uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select extract(isodow from (now() at time zone tz_tienda(p_tienda))) <= 5
$$;

-- Lunes de la semana siguiente, hora de la tienda.
create or replace function semana_objetivo(p_tienda uuid)
returns date language sql stable security definer set search_path = public as $$
  select (date_trunc('week', (now() at time zone tz_tienda(p_tienda)))::date + 7)
$$;

-- Lo que la página necesita saber antes de dibujar nada.
create or replace function estado_ventana()
returns table (abierta boolean, hoy date, semana_inicio date, semana_fin date, zona text)
language sql stable security definer set search_path = public as $$
  select ventana_abierta(mi_tienda()),
         hoy_tienda(mi_tienda()),
         semana_objetivo(mi_tienda()),
         semana_objetivo(mi_tienda()) + 6,
         tz_tienda(mi_tienda())
$$;

-- --------------------------------------------- código de tienda (secreto)
-- Devuelve solo el nombre. El código nunca sale de la base de datos.
create or replace function verificar_codigo_tienda(p_codigo text)
returns text language sql stable security definer set search_path = public as $$
  select nombre from tiendas where codigo_acceso = upper(btrim(p_codigo))
$$;

-- ------------------------------------------------------------- choques
-- Cuántas peticiones vivas hay de OTRA gente de mi misma área, por fecha.
-- No devuelve identidades ni textos.
create or replace function contar_choques(p_fechas date[])
returns table (fecha date, cuantas integer)
language sql stable security definer set search_path = public as $$
  select d.fecha, count(*)::int
  from unnest(p_fechas) as d(fecha)
  join peticion_dias pd on pd.fecha = d.fecha
  join peticiones    p  on p.id = pd.peticion_id
  join perfiles      pe on pe.id = p.empleado_id
  where p.tienda_id   = mi_tienda()
    and pe.area       = mi_area()
    and p.estado      in ('pendiente', 'aprobada')
    and p.empleado_id <> auth.uid()
  group by d.fecha
$$;

-- ------------------------------------------------- crear / editar / quitar
-- Las escrituras pasan solo por estas funciones: RLS no da permiso de
-- insert, update ni delete directo sobre las tablas.

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
  if not ventana_abierta(v_perfil.tienda_id) then raise exception 'VENTANA_CERRADA'; end if;
  if length(btrim(coalesce(p_texto, ''))) = 0 then raise exception 'TEXTO_VACIO'; end if;
  if p_fechas is null or coalesce(array_length(p_fechas, 1), 0) = 0 then raise exception 'SIN_DIAS'; end if;
  if p_prioridad = 'emergencia' and array_length(p_fechas, 1) <> 1 then raise exception 'EMERGENCIA_UN_SOLO_DIA'; end if;

  v_hoy   := hoy_tienda(v_perfil.tienda_id);
  v_lunes := semana_objetivo(v_perfil.tienda_id);

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
  if not ventana_abierta(v_perfil.tienda_id) then raise exception 'VENTANA_CERRADA'; end if;
  if length(btrim(coalesce(p_texto, ''))) = 0 then raise exception 'TEXTO_VACIO'; end if;
  if p_fechas is null or coalesce(array_length(p_fechas, 1), 0) = 0 then raise exception 'SIN_DIAS'; end if;
  if v_pet.prioridad = 'emergencia' and array_length(p_fechas, 1) <> 1 then raise exception 'EMERGENCIA_UN_SOLO_DIA'; end if;

  v_hoy   := hoy_tienda(v_perfil.tienda_id);
  v_lunes := semana_objetivo(v_perfil.tienda_id);

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
         -- cambiar los días manda la petición al final de la fila
         en_fila_desde = case when v_antes is distinct from v_ahora then now() else en_fila_desde end
   where id = p_id;
end $$;

-- Devuelve la ruta del dibujo para que la página lo borre del Storage.
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
  if not ventana_abierta(v_pet.tienda_id) then raise exception 'VENTANA_CERRADA'; end if;

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
  if not soy_gerente() then raise exception 'SOLO_GERENTE'; end if;
  if p_estado not in ('aprobada', 'rechazada') then raise exception 'ESTADO_INVALIDO'; end if;

  select * into v_pet from peticiones where id = p_id;
  if v_pet.id is null then raise exception 'NO_EXISTE'; end if;
  if v_pet.tienda_id <> mi_tienda() then raise exception 'OTRA_TIENDA'; end if;
  if v_pet.estado <> 'pendiente' then raise exception 'YA_RESUELTA'; end if;

  update peticiones
     set estado             = p_estado,
         comentario_gerente = nullif(btrim(coalesce(p_comentario, '')), ''),
         resuelta_en        = now(),
         resuelta_por       = auth.uid()
   where id = p_id;
end $$;

-- Cuántas emergencias lleva cada quien este mes. Solo para la gerente.
create or replace function emergencias_del_mes(p_empleado uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int
  from peticiones p
  where p.empleado_id = p_empleado
    and p.prioridad   = 'emergencia'
    and p.tienda_id   = mi_tienda()
    and soy_gerente()
    and p.creada_en >= date_trunc('month', now())
$$;

-- ---------------------------------------------------- registro de usuario
-- Lee los datos del registro, valida el código y crea el perfil.
-- Fuerza rol = 'empleado': nadie puede darse otro rol desde la página.
create or replace function manejar_usuario_nuevo()
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
  if v_tienda is null                              then raise exception 'CODIGO_INVALIDO'; end if;
  if v_usuario !~ '^[a-z0-9._]{3,20}$'             then raise exception 'USUARIO_INVALIDO'; end if;
  if length(v_nombre) < 3                          then raise exception 'NOMBRE_INVALIDO'; end if;
  if v_area not in ('cocina', 'servicio')          then raise exception 'AREA_INVALIDA'; end if;
  if v_contrato not in ('tiempo_completo', 'por_hora') then raise exception 'CONTRATO_INVALIDO'; end if;

  insert into perfiles (id, tienda_id, usuario, nombre_completo, area, contrato, rol, activo)
  values (new.id, v_tienda, v_usuario, v_nombre, v_area::area_t, v_contrato::contrato_t, 'empleado', true);

  return new;
end $$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function manejar_usuario_nuevo();

-- --------------------------------------------------- blindaje del perfil
-- Nadie se cambia el rol, la tienda ni el usuario. La gerente solo
-- puede tocar `activo` de la gente de su tienda.
create or replace function proteger_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
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

create trigger al_editar_perfil
  before update on perfiles
  for each row execute function proteger_perfil();

-- ------------------------------------------------------------- permisos
revoke all on function verificar_codigo_tienda(text) from public;
grant execute on function verificar_codigo_tienda(text) to anon, authenticated;

grant execute on function estado_ventana()                                                   to authenticated;
grant execute on function contar_choques(date[])                                             to authenticated;
grant execute on function crear_peticion(prioridad_t, text, date[], tipo_t, text)            to authenticated;
grant execute on function editar_peticion(uuid, text, date[], tipo_t, text)                  to authenticated;
grant execute on function eliminar_peticion(uuid)                                            to authenticated;
grant execute on function resolver_peticion(uuid, estado_t, text)                            to authenticated;
grant execute on function emergencias_del_mes(uuid)                                          to authenticated;
