-- =====================================================================
-- 0003 · Qué lugar llevo en la fila
--
-- El empleado no puede ver las peticiones de nadie más, pero sí tiene
-- derecho a saber en qué lugar quedó. Esta función devuelve solo un
-- número: ninguna identidad, ningún texto, ninguna fecha ajena.
-- =====================================================================

create or replace function mi_posicion(p_peticion uuid)
returns integer
language plpgsql stable security definer set search_path = public as $$
declare
  v_tienda    uuid;
  v_area      area_t;
  v_prioridad prioridad_t;
  v_fila      timestamptz;
  v_fechas    date[];
  v_delante   integer;
begin
  select p.tienda_id, pe.area, p.prioridad, p.en_fila_desde
    into v_tienda, v_area, v_prioridad, v_fila
  from peticiones p
  join perfiles pe on pe.id = p.empleado_id
  where p.id = p_peticion
    and p.empleado_id = auth.uid();

  if v_tienda is null then
    return null;
  end if;

  select array_agg(fecha) into v_fechas from peticion_dias where peticion_id = p_peticion;

  select count(*)
    into v_delante
  from peticiones o
  join perfiles po on po.id = o.empleado_id
  where o.tienda_id = v_tienda
    and po.area     = v_area
    and o.estado    in ('pendiente', 'aprobada')
    and o.id       <> p_peticion
    and exists (
      select 1 from peticion_dias d
      where d.peticion_id = o.id and d.fecha = any (v_fechas)
    )
    and (
      (o.prioridad = 'emergencia' and v_prioridad = 'normal')
      or (o.prioridad = v_prioridad and o.en_fila_desde < v_fila)
    );

  return v_delante + 1;
end $$;

grant execute on function mi_posicion(uuid) to authenticated;
