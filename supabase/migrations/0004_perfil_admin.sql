-- =====================================================================
-- 0004 · El blindaje del perfil no debe estorbar a la administración
--
-- `proteger_perfil` impedía cambiar el rol SIEMPRE, también desde el editor
-- de SQL de Supabase, que es justo donde se le da el rol de gerente a una
-- cuenta. Cuando no hay sesión de usuario (auth.uid() es null) quien está
-- escribiendo es un administrador con la llave de servicio, que nunca llega
-- al navegador. Ahí se deja pasar; desde la app, las reglas siguen iguales.
-- =====================================================================

create or replace function proteger_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- administración directa (editor de SQL / llave de servicio)
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
