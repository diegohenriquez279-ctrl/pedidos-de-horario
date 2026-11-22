import { Check, X } from '@phosphor-icons/react'
import { diaConMes, hace } from '../lib/fechas'
import { ETIQUETA_AREA, ETIQUETA_CONTRATO_CORTA, type Estado, type PeticionDeLaGerente } from '../lib/tipos'
import { Chip, Comentario, MarcaEmergencia, Sello } from './piezas'
import { MiniDibujo } from './Papelito'

export default function TarjetaGerente({
  peticion,
  posicion,
  gira,
  alAbrir,
  alResolver,
  ocupado = false,
}: {
  peticion: PeticionDeLaGerente
  posicion?: number
  gira: 1 | 2
  alAbrir: () => void
  alResolver?: (estado: Estado) => void
  ocupado?: boolean
}) {
  const emergencia = peticion.prioridad === 'emergencia'
  const resuelta = peticion.estado !== 'pendiente'
  const dias = [...peticion.peticion_dias].sort((a, b) => a.fecha.localeCompare(b.fecha))

  return (
    <article
      className={`papel papel-cinta papel-cinta-izq gira-${gira} mb-[17px] px-3.5 py-3.5 ${
        emergencia && !resuelta ? 'shadow-[var(--shadow-papel),0_0_0_2px_var(--color-rojo)]' : ''
      }`}
    >
      <button type="button" onClick={alAbrir} className="block w-full text-left">
        {emergencia && <MarcaEmergencia />}
        <div className="flex items-start gap-3">
          {!emergencia && posicion && !resuelta && (
            <span className="mano grid size-[42px] flex-none place-items-center rounded-full border-2 border-rojo text-[22px] leading-none font-bold text-rojo">
              #{posicion}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] leading-snug font-extrabold tracking-tight">
              {peticion.perfiles?.nombre_completo ?? 'Alguien de la tienda'}
            </h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {peticion.perfiles && <Chip>{ETIQUETA_AREA[peticion.perfiles.area]}</Chip>}
              {peticion.perfiles && <Chip>{ETIQUETA_CONTRATO_CORTA[peticion.perfiles.contrato]}</Chip>}
            </div>
          </div>
          {resuelta && <Sello estado={peticion.estado} />}
        </div>

        <p className="mano mt-3 text-[20px] text-lapicero">{peticion.texto}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {dias.map((d) => (
            <span
              key={d.fecha}
              className="rounded-full border-[1.5px] border-rojo px-2 py-0.5 text-[11.5px] font-bold tracking-wide text-rojo-hondo uppercase"
            >
              {diaConMes(d.fecha)}
            </span>
          ))}
        </div>

        {peticion.dibujo_path && <MiniDibujo ruta={peticion.dibujo_path} texto="Mandó un dibujo" />}

        {resuelta && peticion.comentario_gerente && (
          <Comentario>{peticion.comentario_gerente}</Comentario>
        )}
      </button>

      {alResolver && !resuelta && (
        <div className="mt-3.5 flex items-center gap-2.5 border-t border-dashed border-linea pt-3">
          <span className="mr-auto text-[12.5px] text-suave">{hace(peticion.en_fila_desde)}</span>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => alResolver('rechazada')}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-papel border border-borde px-4 text-[14px] font-extrabold text-grafito disabled:opacity-50"
          >
            <X size={16} weight="bold" />
            No
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => alResolver('aprobada')}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-papel bg-tinta px-5 text-[14px] font-extrabold text-white disabled:opacity-50"
          >
            <Check size={16} weight="bold" />
            Sí
          </button>
        </div>
      )}
    </article>
  )
}
