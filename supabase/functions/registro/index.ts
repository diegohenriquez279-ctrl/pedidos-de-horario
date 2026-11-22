// Crea la cuenta de un empleado.
//
// Por qué existe: la app no pide correo, y Supabase sí necesita uno. Creando
// la cuenta desde aquí, con la llave de servicio (que nunca sale de Supabase
// ni entra al repositorio), la cuenta nace ya confirmada y no se manda ningún
// correo a ningún lado.
//
// Quién puede llamarla: cualquiera que tenga el código de la tienda. Ese es el
// portero. El código lo comprueba la base de datos en el disparador de
// registro, que además fuerza el rol 'empleado': nadie puede darse otro rol.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const DOMINIO_INTERNO = 'pedidos.test'
const USUARIO_VALIDO = /^[a-z0-9._]{3,20}$/
const AREAS = ['cocina', 'servicio']
const CONTRATOS = ['tiempo_completo', 'por_hora']

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

const fallo = (clave: string, status = 400) => responder({ error: clave }, status)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return fallo('METODO_NO_PERMITIDO', 405)

  let cuerpo: Record<string, unknown>
  try {
    cuerpo = await req.json()
  } catch {
    return fallo('CUERPO_INVALIDO')
  }

  const codigo = String(cuerpo.codigo ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
  const usuario = String(cuerpo.usuario ?? '').trim().toLowerCase()
  const clave = String(cuerpo.clave ?? '')
  const nombre = String(cuerpo.nombre_completo ?? '').trim()
  const area = String(cuerpo.area ?? '')
  const contrato = String(cuerpo.contrato ?? '')

  if (!codigo) return fallo('CODIGO_INVALIDO')
  if (!USUARIO_VALIDO.test(usuario)) return fallo('USUARIO_INVALIDO')
  if (clave.length < 6) return fallo('CLAVE_CORTA')
  if (nombre.length < 3) return fallo('NOMBRE_INVALIDO')
  if (!AREAS.includes(area)) return fallo('AREA_INVALIDA')
  if (!CONTRATOS.includes(contrato)) return fallo('CONTRATO_INVALIDO')

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // Primer portero: el código tiene que ser de una tienda de verdad.
  const { data: tienda, error: errorCodigo } = await admin.rpc('verificar_codigo_tienda', {
    p_codigo: codigo,
  })
  if (errorCodigo) return fallo('CODIGO_INVALIDO')
  if (!tienda) return fallo('CODIGO_INVALIDO')

  const { error } = await admin.auth.admin.createUser({
    email: `${usuario}@${DOMINIO_INTERNO}`,
    password: clave,
    email_confirm: true,
    user_metadata: {
      codigo,
      usuario,
      nombre_completo: nombre,
      area,
      contrato,
    },
  })

  if (error) {
    const texto = `${error.message ?? ''}`
    for (const clave of [
      'CODIGO_INVALIDO',
      'USUARIO_INVALIDO',
      'NOMBRE_INVALIDO',
      'AREA_INVALIDA',
      'CONTRATO_INVALIDO',
    ]) {
      if (texto.includes(clave)) return fallo(clave)
    }
    if (/already been registered|duplicate key|perfiles_usuario_key/i.test(texto)) {
      return fallo('USUARIO_OCUPADO', 409)
    }
    console.error('registro falló:', texto)
    return fallo('NO_SE_PUDO_CREAR', 500)
  }

  return responder({ ok: true, tienda })
})
