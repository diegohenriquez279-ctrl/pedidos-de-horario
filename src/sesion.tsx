import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { cargarPerfil } from './lib/api'
import type { Perfil } from './lib/tipos'

interface Sesion {
  perfil: Perfil | null
  cargando: boolean
  haySesion: boolean
  refrescar: () => Promise<void>
}

const Contexto = createContext<Sesion>({
  perfil: null,
  cargando: true,
  haySesion: false,
  refrescar: async () => {},
})

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [haySesion, setHaySesion] = useState(false)
  const [cargando, setCargando] = useState(true)
  const qc = useQueryClient()

  const refrescar = async () => {
    try {
      const p = await cargarPerfil()
      setPerfil(p)
    } catch {
      setPerfil(null)
    }
  }

  useEffect(() => {
    let vivo = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return
      setHaySesion(!!data.session)
      if (data.session) await refrescar()
      if (vivo) setCargando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (evento, sesion) => {
      if (!vivo) return
      setHaySesion(!!sesion)
      if (evento === 'SIGNED_OUT') {
        setPerfil(null)
        qc.clear()
        return
      }
      if (sesion) {
        await refrescar()
        if (evento === 'SIGNED_IN') qc.invalidateQueries()
      }
    })

    return () => {
      vivo = false
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Contexto.Provider value={{ perfil, cargando, haySesion, refrescar }}>{children}</Contexto.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSesion = () => useContext(Contexto)
