import { supabase, correoDe, normalizarCodigo, normalizarUsuario } from './supabase'
import type {
  Area,
  Contrato,
  Choque,
  Estado,
  EstadoVentana,
  Perfil,
  PeticionConDias,
  PeticionDeLaGerente,
  Prioridad,
  Tipo,
} from './tipos'

const reventar = (error: { message: string } | null) => {
  if (error) throw new Error(error.message)
}

/* ------------------------------------------------------------------ sesión */

export async function entrar(usuario: string, clave: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: correoDe(normalizarUsuario(usuario)),
    password: clave,
  })
  reventar(error)
}

export async function salir() {
  await supabase.auth.signOut()
}

export async function verificarCodigo(codigo: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('verificar_codigo_tienda', {
    p_codigo: normalizarCodigo(codigo),
  })
  reventar(error)
  return (data as string | null) ?? null
}

export interface DatosRegistro {
  codigo: string
  usuario: string
  clave: string
  nombre_completo: string
  area: Area
  contrato: Contrato
}

/**
 * El registro pasa por una función del servidor que crea la cuenta ya
 * confirmada. Así no se manda ningún correo a ningún lado y la llave
 * secreta nunca sale de Supabase.
 */
export async function registrarse(datos: DatosRegistro) {
  const { data, error } = await supabase.functions.invoke('registro', {
    body: {
      codigo: normalizarCodigo(datos.codigo),
      usuario: normalizarUsuario(datos.usuario),
      clave: datos.clave,
      nombre_completo: datos.nombre_completo.trim(),
      area: datos.area,
      contrato: datos.contrato,
    },
  })

  if (error) {
    // El cuerpo del error trae nuestro código propio (CODIGO_INVALIDO, etc.)
    let detalle = error.message
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.text === 'function') {
      try {
        detalle = await ctx.text()
      } catch {
        /* nos quedamos con el mensaje de arriba */
      }
    }
    throw new Error(detalle)
  }
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error))
  }

  await entrar(datos.usuario, datos.clave)
}

/* ------------------------------------------------------------------ perfil */

export async function cargarPerfil(): Promise<Perfil | null> {
  const { data: sesion } = await supabase.auth.getUser()
  if (!sesion.user) return null
  const { data, error } = await supabase.from('perfiles').select('*').eq('id', sesion.user.id).maybeSingle()
  reventar(error)
  return (data as Perfil) ?? null
}

/* ----------------------------------------------------------------- ventana */

export async function estadoVentana(): Promise<EstadoVentana> {
  const { data, error } = await supabase.rpc('estado_ventana')
  reventar(error)
  const fila = Array.isArray(data) ? data[0] : data
  return fila as EstadoVentana
}

/* --------------------------------------------------------------- peticiones */

const SELECT_PETICION = '*, peticion_dias(fecha)'

export async function misPeticiones(): Promise<PeticionConDias[]> {
  const { data, error } = await supabase
    .from('peticiones')
    .select(SELECT_PETICION)
    .order('creada_en', { ascending: false })
  reventar(error)
  return (data ?? []) as unknown as PeticionConDias[]
}

export async function contarChoques(fechas: string[]): Promise<Choque[]> {
  if (fechas.length === 0) return []
  const { data, error } = await supabase.rpc('contar_choques', { p_fechas: fechas })
  reventar(error)
  return (data ?? []) as Choque[]
}

export async function miPosicion(peticionId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('mi_posicion', { p_peticion: peticionId })
  reventar(error)
  return (data as number | null) ?? null
}

export interface DatosPeticion {
  prioridad: Prioridad
  texto: string
  fechas: string[]
  tipo: Tipo | null
  dibujo_path: string | null
}

export async function crearPeticion(d: DatosPeticion): Promise<string> {
  const { data, error } = await supabase.rpc('crear_peticion', {
    p_prioridad: d.prioridad,
    p_texto: d.texto,
    p_fechas: d.fechas,
    p_tipo: d.tipo,
    p_dibujo_path: d.dibujo_path,
  })
  reventar(error)
  return data as string
}

export async function editarPeticion(id: string, d: Omit<DatosPeticion, 'prioridad'>) {
  const { error } = await supabase.rpc('editar_peticion', {
    p_id: id,
    p_texto: d.texto,
    p_fechas: d.fechas,
    p_tipo: d.tipo,
    p_dibujo_path: d.dibujo_path,
  })
  reventar(error)
}

export async function eliminarPeticion(id: string) {
  const { data, error } = await supabase.rpc('eliminar_peticion', { p_id: id })
  reventar(error)
  const ruta = data as string | null
  if (ruta) await borrarDibujo(ruta)
}

/* ------------------------------------------------------------------ gerente */

const SELECT_GERENTE =
  '*, peticion_dias(fecha), perfiles!peticiones_empleado_id_fkey(nombre_completo, area, contrato)'

export async function pendientes(): Promise<PeticionDeLaGerente[]> {
  const { data, error } = await supabase
    .from('peticiones')
    .select(SELECT_GERENTE)
    .eq('estado', 'pendiente')
    .order('prioridad', { ascending: false })
    .order('en_fila_desde', { ascending: true })
  reventar(error)
  return (data ?? []) as unknown as PeticionDeLaGerente[]
}

/**
 * Para el tablero de la semana: lo que todavía pesa en el horario, o sea
 * las pendientes y las ya aprobadas. Una aprobada sigue ocupando ese día.
 */
export async function vivasDeLaSemana(): Promise<PeticionDeLaGerente[]> {
  const { data, error } = await supabase
    .from('peticiones')
    .select(SELECT_GERENTE)
    .in('estado', ['pendiente', 'aprobada'])
  reventar(error)
  return (data ?? []) as unknown as PeticionDeLaGerente[]
}

export async function resueltas(): Promise<PeticionDeLaGerente[]> {
  const { data, error } = await supabase
    .from('peticiones')
    .select(SELECT_GERENTE)
    .neq('estado', 'pendiente')
    .order('resuelta_en', { ascending: false })
    .limit(100)
  reventar(error)
  return (data ?? []) as unknown as PeticionDeLaGerente[]
}

export async function unaPeticion(id: string): Promise<PeticionDeLaGerente | null> {
  const { data, error } = await supabase.from('peticiones').select(SELECT_GERENTE).eq('id', id).maybeSingle()
  reventar(error)
  return (data as unknown as PeticionDeLaGerente) ?? null
}

export async function resolverPeticion(id: string, estado: Estado, comentario: string | null) {
  const { error } = await supabase.rpc('resolver_peticion', {
    p_id: id,
    p_estado: estado,
    p_comentario: comentario,
  })
  reventar(error)
}

/** Cambiar una respuesta ya dada. Con 'pendiente' la devuelve a la fila. */
export async function cambiarRespuesta(id: string, estado: Estado, comentario: string | null) {
  const { error } = await supabase.rpc('cambiar_respuesta', {
    p_id: id,
    p_estado: estado,
    p_comentario: comentario,
  })
  reventar(error)
}

/* -------------------------------------------------------- la gente */

export async function genteDeLaTienda(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .order('area', { ascending: true })
    .order('nombre_completo', { ascending: true })
  reventar(error)
  return (data ?? []) as Perfil[]
}

export async function quitarDelRestaurante(empleadoId: string) {
  const { error } = await supabase.rpc('quitar_del_restaurante', { p_empleado: empleadoId })
  reventar(error)
}

/** Para quien quedó sin restaurante: entrar a uno con su código. */
export async function unirmeATienda(codigo: string): Promise<string> {
  const { data, error } = await supabase.rpc('unirme_a_tienda', {
    p_codigo: normalizarCodigo(codigo),
  })
  reventar(error)
  return data as string
}

export async function emergenciasDelMes(empleadoId: string): Promise<number> {
  const { data, error } = await supabase.rpc('emergencias_del_mes', { p_empleado: empleadoId })
  reventar(error)
  return (data as number) ?? 0
}

/* ------------------------------------------------------------------ dibujos */

export async function subirDibujo(blob: Blob, tiendaId: string, empleadoId: string): Promise<string> {
  const nombre = `${tiendaId}/${empleadoId}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from('dibujos').upload(nombre, blob, {
    contentType: blob.type || 'image/webp',
    upsert: false,
  })
  reventar(error)
  return nombre
}

export async function urlDeDibujo(ruta: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('dibujos').createSignedUrl(ruta, 60 * 30)
  if (error) return null
  return data?.signedUrl ?? null
}

export async function borrarDibujo(ruta: string) {
  await supabase.storage.from('dibujos').remove([ruta])
}
