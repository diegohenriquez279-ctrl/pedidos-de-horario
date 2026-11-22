-- =====================================================================
-- 0002 · Reglas de acceso (RLS) y el bucket de dibujos
--
-- Idea de fondo: leer está gobernado por RLS; escribir solo pasa por las
-- funciones de 0001. Por eso no hay ninguna política de insert, update ni
-- delete sobre `peticiones` ni `peticion_dias`.
-- =====================================================================

alter table tiendas       enable row level security;
alter table perfiles      enable row level security;
alter table peticiones    enable row level security;
alter table peticion_dias enable row level security;

-- ------------------------------------------------------------- tiendas
-- El empleado no toca esta tabla nunca: el código se comprueba con
-- verificar_codigo_tienda(). La gerente puede leer la suya.
create policy tiendas_lee_gerente on tiendas
  for select to authenticated
  using (soy_gerente() and id = mi_tienda());

-- ------------------------------------------------------------ perfiles
create policy perfiles_lee_propio on perfiles
  for select to authenticated
  using (id = auth.uid());

create policy perfiles_lee_gerente on perfiles
  for select to authenticated
  using (soy_gerente() and tienda_id = mi_tienda());

-- Qué columnas se pueden cambiar lo decide el disparador proteger_perfil().
create policy perfiles_edita_propio on perfiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy perfiles_edita_gerente on perfiles
  for update to authenticated
  using (soy_gerente() and tienda_id = mi_tienda())
  with check (soy_gerente() and tienda_id = mi_tienda());

-- ---------------------------------------------------------- peticiones
create policy peticiones_lee_propias on peticiones
  for select to authenticated
  using (empleado_id = auth.uid());

create policy peticiones_lee_gerente on peticiones
  for select to authenticated
  using (soy_gerente() and tienda_id = mi_tienda());

-- ------------------------------------------------------- peticion_dias
create policy dias_lee on peticion_dias
  for select to authenticated
  using (exists (
    select 1 from peticiones p
    where p.id = peticion_dias.peticion_id
      and (p.empleado_id = auth.uid() or (soy_gerente() and p.tienda_id = mi_tienda()))
  ));

-- ------------------------------------------------------------- dibujos
-- Bucket privado. Ruta: <tienda_id>/<empleado_id>/<peticion_id>.webp
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dibujos', 'dibujos', false, 524288, array['image/webp', 'image/png'])
on conflict (id) do nothing;

create policy dibujos_sube_el_autor on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dibujos'
    and (storage.foldername(name))[1] = mi_tienda()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy dibujos_reemplaza_el_autor on storage.objects
  for update to authenticated
  using (
    bucket_id = 'dibujos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy dibujos_borra_el_autor on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dibujos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Lo ven el autor y la gerente de esa misma tienda. Nadie más.
create policy dibujos_lee_autor_o_gerente on storage.objects
  for select to authenticated
  using (
    bucket_id = 'dibujos'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or (soy_gerente() and (storage.foldername(name))[1] = mi_tienda()::text)
    )
  );
