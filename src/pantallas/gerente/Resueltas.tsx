import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { resueltas } from '../../lib/api'
import type { Estado } from '../../lib/tipos'
import {
  BarraSuperior,
  Cargando,
  Contenido,
  ErrorPantalla,
  Pantalla,
  Pestanas,
  Vacio,
} from '../../componentes/piezas'
import TarjetaGerente from '../../componentes/TarjetaGerente'

type Filtro = 'todas' | 'aprobada' | 'rechazada'

export default function Resueltas() {
  const navegar = useNavigate()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const lista = useQuery({ queryKey: ['resueltas'], queryFn: resueltas })

  const todas = lista.data ?? []
  const vistas = filtro === 'todas' ? todas : todas.filter((p) => p.estado === filtro)
  const cuenta = (e: Estado) => todas.filter((p) => p.estado === e).length

  return (
    <Pantalla>
      <Contenido className="flex flex-col">
        <BarraSuperior titulo="Resueltas" />

        {todas.length > 0 && (
          <div className="mx-4 mb-4 flex overflow-hidden rounded-papel border border-sobre-pared/30">
            {(
              [
                ['todas', `Todas · ${todas.length}`],
                ['aprobada', `Aprobadas · ${cuenta('aprobada')}`],
                ['rechazada', `No · ${cuenta('rechazada')}`],
              ] as [Filtro, string][]
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={filtro === valor}
                onClick={() => setFiltro(valor)}
                className={`min-h-[46px] flex-1 text-[13.5px] font-bold ${
                  filtro === valor ? 'bg-[#f4ebe8] text-tinta' : 'text-sobre-pared-2'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
        )}

        {lista.isLoading && <Cargando />}
        {lista.isError && <ErrorPantalla alReintentar={() => void lista.refetch()} />}

        {lista.data && todas.length === 0 && (
          <Vacio
            titulo="Todavía no hay nada resuelto"
            texto="Cuando respondás una petición, se guarda aquí. Nada se borra."
          />
        )}

        {vistas.length > 0 && (
          <div className="px-4 pb-2">
            {vistas.map((p, i) => (
              <TarjetaGerente
                key={p.id}
                peticion={p}
                gira={i % 2 === 0 ? 1 : 2}
                alAbrir={() => navegar(`/gerente/peticion/${p.id}`)}
              />
            ))}
          </div>
        )}

        {todas.length > 0 && (
          <p className="mt-auto px-4 pt-2 pb-4 text-center text-[12.5px] text-sobre-pared-3">
            Nada se borra. Tocá una si querés cambiar tu respuesta.
          </p>
        )}

        <Pestanas rol="gerente" activa="/gerente/resueltas" />
      </Contenido>
    </Pantalla>
  )
}
