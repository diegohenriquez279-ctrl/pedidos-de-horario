-- =====================================================================
-- 0006 · Quien no ha iniciado sesión no toca la API
--
-- Supabase le da permiso a `anon` sobre toda función nueva del esquema
-- público. Aquí se lo quitamos una por una. La única que queda abierta es
-- `verificar_codigo_tienda`, porque la usa justo quien todavía no tiene
-- cuenta, y lo único que devuelve es el nombre de la tienda cuando el
-- código es correcto.
-- =====================================================================

revoke execute on function estado_ventana()                                        from anon;
revoke execute on function contar_choques(date[])                                  from anon;
revoke execute on function mi_posicion(uuid)                                       from anon;
revoke execute on function crear_peticion(prioridad_t, text, date[], tipo_t, text) from anon;
revoke execute on function editar_peticion(uuid, text, date[], tipo_t, text)       from anon;
revoke execute on function eliminar_peticion(uuid)                                 from anon;
revoke execute on function resolver_peticion(uuid, estado_t, text)                 from anon;
revoke execute on function emergencias_del_mes(uuid)                               from anon;

-- Que las funciones que se creen más adelante no nazcan abiertas.
alter default privileges in schema public revoke execute on functions from anon;
