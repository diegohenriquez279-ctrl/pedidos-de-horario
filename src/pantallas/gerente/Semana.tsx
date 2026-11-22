import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays } from 'date-fns'
import { toast } from 'sonner'
import { cambiarRespuesta, estadoVentana, resolverPeticion, vivasDeLaSemana } from '../../lib/api'
import { mensajeDeError } from '../../lib/errores'
import { aFecha, aISO, conMayuscula, diaTitulo, rangoSemana } from '../../lib/fechas'
import { posicionesPorArea, semanaDominante } from '../../lib/orden'
import { ETIQUETA_AREA, type Area, type Estado } from '../../lib/tipos'
import {
  BarraSuperior,
  Cargando,
  Contenido,
  ErrorPantalla,
  Pantalla,
  Pestanas,
  Vacio,
} from '../../componentes/piezas'
import TableroSemana from '../../componentes/TableroSemana'
import TarjetaGerente from '../../componentes/TarjetaGerente'

export default function Semana() {
  const navegar = useNavigate()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const dia = params.get('dia')

  const ventana = useQuery({ queryKey: ['ventana'], queryFn: estadoVentana })
  const lista = useQuery({ queryKey: ['vivas'], queryFn: vivasDeLaSemana })

  const deshacer = useMutation({
    mutationFn: (id: string) => cambiarRespuesta(id, 'pendiente', null),
    onSuccess: async () => {
      await qc.invalidateQueries()
      toast('Volvió a la fila')
    },
    onError: (e) => toast(mensajeDeError(e)),
  })

  const resolver = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: Estado }) => resolverPeticion(id, estado, null),
    onSuccess: async (_d, v) => {
      await qc.invalidateQueries()
      toast(v.estado === 'aprobada' ? 'Aprobada' : 'Respondida', {
        duration: 8000,
        action: { label: 'Deshacer', onClick: () => deshacer.mutate(v.id) },
      })
    },
    onError: (e) => toast(mensajeDeError(e)),
  })

  const semana = ventana.data ? semanaDominante(lista.data ?? [], ventana.data.semana_inicio) : null
  const semanaFin = semana ? aISO(addDays(aFecha(semana), 6)) : null

  const todas = lista.data ?? []
  const posiciones = posicionesPorArea(todas)
  const delDia = dia ? todas.filter((p) => p.peticion_dias.some((d) => d.fecha === dia)) : []

  const porArea = (area: Area) => delDia.filter((p) => p.perfiles?.area === area)

  const elegir = (iso: string) => {
    if (dia === iso) setParams({})
    else setParams({ dia: iso })
  }

  return (
    <Pantalla>
      <Contenido className="flex flex-col">
        <BarraSuperior
          titulo={dia ? conMayuscula(diaTitulo(dia)) : 'La semana'}
          volver={dia ? () => setParams({}) : undefined}
          derecha={
            !dia && semana && semanaFin ? (
              <span className="text-[12px] text-sobre-pared-2">{rangoSemana(semana, semanaFin)}</span>
            ) : undefined
          }
        />

        {(lista.isLoading || ventana.isLoading) && <Cargando cuantos={2} />}
        {(lista.isError || ventana.isError) && <ErrorPantalla alReintentar={() => void lista.refetch()} />}

        {lista.data && semana && todas.length > 0 && (
          <TableroSemana
            peticiones={todas}
            semanaInicio={semana}
            detallado
            alTocarDia={elegir}
            diaElegido={dia}
          />
        )}

        {dia && (
          <div className="px-4 pt-5 pb-2">
            {delDia.length === 0 ? (
              <p className="rounded-papel bg-white/5 px-3 py-4 text-center text-[14px] text-sobre-pared-2">
                Nadie pidió nada para este día.
              </p>
            ) : (
              (['cocina', 'servicio'] as Area[]).map((area) => {
                const dela = porArea(area)
                if (dela.length === 0) return null
                return (
                  <div key={area} className="mb-5">
                    <h2 className="mb-3 text-[15px] font-extrabold tracking-tight text-sobre-pared">
                      {ETIQUETA_AREA[area]}
                      <span className="ml-1.5 font-medium text-sobre-pared-2">
                        · {dela.length} {dela.length === 1 ? 'petición' : 'peticiones'}
                      </span>
                    </h2>
                    {dela.map((p, i) => (
                      <TarjetaGerente
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
                )
              })
            )}
          </div>
        )}

        {lista.data && todas.length === 0 && (
          <Vacio
            titulo="La semana está limpia"
            texto="Todavía nadie ha pedido nada para esta semana."
          />
        )}

        <Pestanas rol="gerente" activa="/gerente/semana" />
      </Contenido>
    </Pantalla>
  )
}
