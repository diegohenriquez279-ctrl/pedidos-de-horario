import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const llave = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !llave) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env.local.',
  )
}

export const supabase = createClient(url, llave, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

/**
 * La app no pide correo. Por dentro Supabase necesita uno, así que se arma
 * con un dominio reservado que nunca puede existir (RFC 2606) y las cuentas
 * se crean ya confirmadas desde la función `registro`, así no se manda
 * ningún correo a ningún lado.
 */
export const DOMINIO_INTERNO = 'pedidos.test'

export const correoDe = (usuario: string) => `${usuario.trim().toLowerCase()}@${DOMINIO_INTERNO}`

export const normalizarUsuario = (u: string) => u.trim().toLowerCase()

export const normalizarCodigo = (c: string) => c.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
