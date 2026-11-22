import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { resueltas } from '../../lib/api'
import { diaCorto } from '../../lib/fechas'
import { ETIQUETA_AREA, type Estado } from '../../lib/tipos'
import {
  BarraSuperior,
  Cargando,
  Chip,
  Comentario,
  Contenido,
  ErrorPantalla,
  Pantalla,
  Pestanas,
  Sello,
  Vacio,
} from '../../componentes/piezas'

type Filtro = 'todas' | 'aprobada' | 'rechazada'

export default function Resueltas() {
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
              <article
                key={p.id}
                className={`papel papel-cinta papel-cinta-izq gira-${i % 2 === 0 ? 1 : 2} mb-[17px] px-3.5 py-3.5`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15.5px] leading-snug font-extrabold tracking-tight">
                      {p.perfiles?.nombre_completo ?? 'Alguien de la tienda'}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.perfiles && <Chip>{ETIQUETA_AREA[p.perfiles.area]}</Chip>}
                      {p.prioridad === 'emergencia' && <Chip>Emergencia</Chip>}
                    </div>
                  </div>
                  <Sello estado={p.estado} />
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {[...p.peticion_dias]
                    .sort((a, b) => a.fecha.localeCompare(b.fecha))
                    .map((d) => (
                      <span
                        key={d.fecha}
                        className="rounded-full border-[1.5px] border-rojo px-2 py-0.5 text-[11.5px] font-bold tracking-wide text-rojo-hondo uppercase"
                      >
                        {diaCorto(d.fecha)}
                      </span>
                    ))}
                </div>

                {p.comentario_gerente && <Comentario>{p.comentario_gerente}</Comentario>}
              </article>
            ))}
          </div>
        )}

        {todas.length > 0 && (
          <p className="mt-auto px-4 pt-2 pb-4 text-center text-[12.5px] text-sobre-pared-3">
            Nada se borra. Queda para cuando alguien pregunte.
          </p>
        )}

        <Pestanas rol="gerente" activa="/gerente/resueltas" />
      </Contenido>
    </Pantalla>
  )
}
