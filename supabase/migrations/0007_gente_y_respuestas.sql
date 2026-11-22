-- =====================================================================
-- 0007 · La gerente manda sobre su gente y sobre sus respuestas
--
-- Dos cosas que salieron probando la fase 3:
--
-- 1) La gerente no podía deshacer. Los botones Sí y No están bajo el
--    pulgar; si toca el que no era, el empleado se come un “no” que nadie
--    quiso dar. Ahora puede cambiar su respuesta o devolver la petición a
--    la fila.
--
-- 2) Cuando alguien se va del restaurante, no se borra su cuenta: se le
--    suelta de la tienda. Conserva su usuario y su historial, y la próxima
--    vez que entre le toca elegir restaurante con un código. Para eso
--    `perfiles.tienda_id` pasa a poder ser nulo.
-- =====================================================================

alter table perfiles alter column tienda_id drop not null;

-- --------------------------------------------- la puerta del blindaje
-- `proteger_perfil` impide cambiar tienda_id desde la app, y está bien.
-- Las funciones de abajo necesitan poder hacerlo, así que abren una
-- puerta que solo vive dentro de su propia transacción.
create or replace function app.proteger_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- administración directa (editor de SQL / llave de servicio)
  if auth.uid() is null then
    return new;
  end if;

  -- una de nuestras funciones, que ya comprobó quién llama y para qué
  if coalesce(current_setting('app.saltar_proteccion', true), '') = '1' then
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

-- ------------------------------------------------- cambiar la respuesta
-- `p_estado` puede ser 'pendiente': eso la devuelve a la fila como si
-- nunca se hubiera respondido.
create or replace function cambiar_respuesta(
  p_id         uuid,
  p_estado     estado_t,
  p_comentario text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_pet peticiones;
begin
  if not app.soy_gerente() then raise exception 'SOLO_GERENTE'; end if;

  select * into v_pet from peticiones where id = p_id;
  if v_pet.id is null then raise exception 'NO_EXISTE'; end if;
  if v_pet.tienda_id is distinct from app.mi_tienda() then raise exception 'OTRA_TIENDA'; end if;

  if p_estado = 'pendiente' then
    update peticiones
       set estado             = 'pendiente',
           comentario_gerente = null,
           resuelta_en        = null,
           resuelta_por       = null
     where id = p_id;
  else
    update peticiones
       set estado             = p_estado,
           comentario_gerente = nullif(btrim(coalesce(p_comentario, '')), ''),
           resuelta_en        = now(),
           resuelta_por       = auth.uid()
     where id = p_id;
  end if;
end $$;

-- --------------------------------------------- sacar a alguien del local
-- No borra la cuenta: la suelta de la tienda. Se lleva por delante sus
-- peticiones pendientes, que ya no tienen sentido; lo resuelto se queda
-- en el historial.
create or replace function quitar_del_restaurante(p_empleado uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_p perfiles;
begin
  if not app.soy_gerente() then raise exception 'SOLO_GERENTE'; end if;
  if p_empleado = auth.uid() then raise exception 'NO_TE_PODES_QUITAR'; end if;

  select * into v_p from perfiles where id = p_empleado;
  if v_p.id is null then raise exception 'NO_EXISTE'; end if;
  if v_p.tienda_id is distinct from app.mi_tienda() then raise exception 'OTRA_TIENDA'; end if;

  delete from peticiones where empleado_id = p_empleado and estado = 'pendiente';

  perform set_config('app.saltar_proteccion', '1', true);
  update perfiles set tienda_id = null where id = p_empleado;
  perform set_config('app.saltar_proteccion', '0', true);
end $$;

-- ------------------------------------------------- entrar a un restaurante
-- Para quien no tiene tienda: ni recién salido de una, ni nunca tuvo.
create or replace function unirme_a_tienda(p_codigo text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_p      perfiles;
  v_id     uuid;
  v_nombre text;
begin
  select * into v_p from perfiles where id = auth.uid();
  if v_p.id is null then raise exception 'SIN_PERFIL'; end if;
  if v_p.tienda_id is not null then raise exception 'YA_TENES_TIENDA'; end if;

  select id, nombre into v_id, v_nombre from tiendas where codigo_acceso = upper(btrim(p_codigo));
  if v_id is null then raise exception 'CODIGO_INVALIDO'; end if;

  perform set_config('app.saltar_proteccion', '1', true);
  update perfiles set tienda_id = v_id, activo = true where id = auth.uid();
  perform set_config('app.saltar_proteccion', '0', true);

  return v_nombre;
end $$;

-- ------------------------------------- sin tienda no se pide nada
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
  if v_perfil.tienda_id is null then raise exception 'SIN_TIENDA'; end if;
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

-- --------------------------------------------------------------- permisos
revoke all on function cambiar_respuesta(uuid, estado_t, text) from public;
revoke all on function quitar_del_restaurante(uuid)            from public;
revoke all on function unirme_a_tienda(text)                   from public;

grant execute on function cambiar_respuesta(uuid, estado_t, text) to authenticated;
grant execute on function quitar_del_restaurante(uuid)            to authenticated;
grant execute on function unirme_a_tienda(text)                   to authenticated;
