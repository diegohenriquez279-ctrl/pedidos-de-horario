import { useQuery } from '@tanstack/react-query'
import { PencilSimple, Trash } from '@phosphor-icons/react'
import { miPosicion, urlDeDibujo } from '../lib/api'
import { diaCorto, hace } from '../lib/fechas'
import type { PeticionConDias } from '../lib/tipos'
import { Comentario, Papel, Sello } from './piezas'

export function useDibujo(ruta: string | null) {
  return useQuery({
    queryKey: ['dibujo', ruta],
    queryFn: () => (ruta ? urlDeDibujo(ruta) : Promise.resolve(null)),
    enabled: !!ruta,
    staleTime: 1000 * 60 * 20,
  })
}

export function MiniDibujo({ ruta, texto = 'Le hiciste un dibujo' }: { ruta: string; texto?: string }) {
  const { data } = useDibujo(ruta)
  return (
    <div className="mt-3 flex items-center gap-2.5 text-[12.5px] text-grafito">
      <span className="grid h-[42px] w-[56px] flex-none place-items-center overflow-hidden rounded-[2px] border border-linea bg-white">
        {data ? (
          <img src={data} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="hueso h-full w-full" />
        )}
      </span>
      <span>{texto}</span>
    </div>
  )
}

function Posicion({ id, estado }: { id: string; estado: string }) {
  const { data } = useQuery({
    queryKey: ['posicion', id],
    queryFn: () => miPosicion(id),
    enabled: estado === 'pendiente',
    staleTime: 30_000,
  })

  const pendiente = estado === 'pendiente'
  return (
    <span
      className={`mano grid size-[42px] flex-none place-items-center rounded-full border-2 text-[22px] leading-none font-bold ${
        pendiente ? 'border-rojo text-rojo' : 'border-borde text-suave'
      }`}
      aria-label={pendiente && data ? `Lugar ${data} en la fila` : undefined}
    >
      {pendiente && data ? `#${data}` : '·'}
    </span>
  )
}

export function Papelito({
  peticion,
  gira,
  alEditar,
  alBorrar,
}: {
  peticion: PeticionConDias
  gira?: 1 | 2 | 3
  alEditar?: () => void
  alBorrar?: () => void
}) {
  const dias = [...peticion.peticion_dias].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const sePuedeTocar = peticion.estado === 'pendiente' && (alEditar || alBorrar)

  return (
    <article className={gira ? `gira-${gira} mb-[18px]` : 'mb-[18px]'}>
      <Papel>
        <div className="flex items-start gap-3">
          <Posicion id={peticion.id} estado={peticion.estado} />
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {peticion.prioridad === 'emergencia' && (
                <span className="rounded-full bg-rojo px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-white uppercase">
                  Emergencia
                </span>
              )}
              {dias.map((d) => (
                <span
                  key={d.fecha}
                  className="rounded-full border border-borde px-2 py-0.5 text-[11.5px] font-bold tracking-wide text-[#443c3a] uppercase"
                >
                  {diaCorto(d.fecha)}
                </span>
              ))}
            </div>
            <p className="mano m-0 text-[19.5px] text-lapicero">{peticion.texto}</p>
          </div>
        </div>

        {peticion.dibujo_path && <MiniDibujo ruta={peticion.dibujo_path} />}

        {peticion.comentario_gerente && <Comentario>{peticion.comentario_gerente} — tu gerente</Comentario>}

        <div className={`mt-3 flex items-center gap-2.5 pt-2.5 ${sePuedeTocar ? '' : 'border-t border-dashed border-linea'}`}>
          <Sello estado={peticion.estado} />
          <span className="ml-auto text-[12.5px] text-suave">
            {peticion.estado === 'pendiente'
              ? hace(peticion.en_fila_desde)
              : peticion.resuelta_en
                ? hace(peticion.resuelta_en)
                : hace(peticion.creada_en)}
          </span>
        </div>

        {sePuedeTocar && (
          <>
            <div className="mt-3 flex gap-1.5 border-t border-dashed border-linea pt-2.5">
              {alEditar && (
                <button
                  type="button"
                  onClick={alEditar}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-papel border-[1.5px] border-borde bg-white text-[13.5px] font-bold"
                >
                  <PencilSimple size={16} weight="bold" />
                  Cambiarlo
                </button>
              )}
              {alBorrar && (
                <button
                  type="button"
                  onClick={alBorrar}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-papel border-[1.5px] border-[#e6b9bf] bg-white text-[13.5px] font-bold text-rojo-hondo"
                >
                  <Trash size={16} weight="bold" />
                  Quitarlo
                </button>
              )}
            </div>
            <p className="mt-2 text-[12.5px] leading-snug text-suave">
              Si le cambiás los días, tu papelito pasa al final de esa fila.
            </p>
          </>
        )}
      </Papel>
    </article>
  )
}
