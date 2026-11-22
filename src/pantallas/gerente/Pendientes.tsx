import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, X } from '@phosphor-icons/react'
import { estadoVentana, pendientes, resolverPeticion, vivasDeLaSemana } from '../../lib/api'
import { mensajeDeError } from '../../lib/errores'
import { diaConMes, hace } from '../../lib/fechas'
import { posicionesPorArea, semanaDominante } from '../../lib/orden'
import { ETIQUETA_AREA, ETIQUETA_CONTRATO_CORTA, type Estado, type PeticionDeLaGerente } from '../../lib/tipos'
import {
  Cargando,
  Chip,
  Contenido,
  ErrorPantalla,
  MarcaEmergencia,
  Pantalla,
  Pestanas,
  Rotulo,
  Vacio,
} from '../../componentes/piezas'
import { MiniDibujo } from '../../componentes/Papelito'
import TableroSemana from '../../componentes/TableroSemana'

export default function Pendientes() {
  const navegar = useNavigate()
  const qc = useQueryClient()

  const ventana = useQuery({ queryKey: ['ventana'], queryFn: estadoVentana })
  const lista = useQuery({ queryKey: ['pendientes'], queryFn: pendientes })
  const vivas = useQuery({ queryKey: ['vivas'], queryFn: vivasDeLaSemana })

  const resolver = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: Estado }) => resolverPeticion(id, estado, null),
    onSuccess: async (_d, v) => {
      await qc.invalidateQueries()
      toast(v.estado === 'aprobada' ? 'Aprobada' : 'Respondida')
    },
    onError: (e) => toast(mensajeDeError(e)),
  })

  const posiciones = posicionesPorArea(lista.data ?? [])
  const semana = ventana.data
    ? semanaDominante(vivas.data ?? lista.data ?? [], ventana.data.semana_inicio)
    : null

  return (
    <Pantalla>
      <Contenido className="flex flex-col">
        <Rotulo className="mt-1 flex items-center gap-3">
          <h1 className="flex-1 text-[22px] leading-tight font-extrabold tracking-[-0.03em]">
            Por resolver
            <span className="mt-0.5 block text-[12.5px] font-medium text-[#ffd5db]">
              {semana ? `Semana del ${diaConMes(semana)}` : 'Cargando la semana…'}
            </span>
          </h1>
          <span className="grid size-[50px] flex-none place-items-center rounded-full bg-rojo text-[21px] font-extrabold text-white">
            {lista.data?.length ?? '·'}
          </span>
        </Rotulo>

        {lista.isLoading && <Cargando />}
        {lista.isError && <ErrorPantalla alReintentar={() => void lista.refetch()} />}

        {lista.data && semana && lista.data.length > 0 && (
          <>
            <TableroSemana peticiones={vivas.data ?? lista.data} semanaInicio={semana} />

            <div className="px-4 pt-6 pb-2">
              <h2 className="mb-0.5 text-[17.5px] font-extrabold tracking-tight text-sobre-pared">La fila</h2>
              <p className="mb-4 text-[12.5px] text-sobre-pared-2">
                Emergencias arriba, después por orden de llegada
              </p>

              {lista.data.map((p, i) => (
                <Tarjeta
                  key={p.id}
                  peticion={p}
                  posicion={posiciones.get(p.id)}
                  gira={i % 2 === 0 ? 1 : 2}
                  alAbrir={() => navegar(`/gerente/peticion/${p.id}`)}
                  alResolver={(estado) => resolver.mutate({ id: p.id, estado })}
                  ocupado={resolver.isPending}
                />
              ))}
            </div>
          </>
        )}

        {lista.data && lista.data.length === 0 && (
          <Vacio
            titulo="No hay nada en la fila"
            texto="Cuando alguien pegue un papelito, te va a aparecer aquí, con las emergencias hasta arriba."
          />
        )}

        <Pestanas rol="gerente" activa="/gerente" />
      </Contenido>
    </Pantalla>
  )
}

function Tarjeta({
  peticion,
  posicion,
  gira,
  alAbrir,
  alResolver,
  ocupado,
}: {
  peticion: PeticionDeLaGerente
  posicion?: number
  gira: 1 | 2
  alAbrir: () => void
  alResolver: (estado: Estado) => void
  ocupado: boolean
}) {
  const emergencia = peticion.prioridad === 'emergencia'
  const dias = [...peticion.peticion_dias].sort((a, b) => a.fecha.localeCompare(b.fecha))

  return (
    <article
      className={`papel papel-cinta papel-cinta-izq gira-${gira} mb-[17px] px-3.5 py-3.5 ${
        emergencia ? 'shadow-[var(--shadow-papel),0_0_0_2px_var(--color-rojo)]' : ''
      }`}
    >
      <button type="button" onClick={alAbrir} className="block w-full text-left">
        {emergencia && <MarcaEmergencia />}
        <div className="flex items-start gap-3">
          {!emergencia && posicion && (
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

        {peticion.dibujo_path && <MiniDibujo ruta={peticion.dibujo_path} />}
      </button>

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
    </article>
  )
}
