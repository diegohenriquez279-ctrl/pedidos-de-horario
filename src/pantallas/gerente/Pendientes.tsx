import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { estadoVentana, pendientes, resolverPeticion, vivasDeLaSemana } from '../../lib/api'
import { mensajeDeError } from '../../lib/errores'
import { diaConMes } from '../../lib/fechas'
import { posicionesPorArea, semanaDominante } from '../../lib/orden'
import type { Estado } from '../../lib/tipos'
import {
  Cargando,
  Contenido,
  ErrorPantalla,
  Pantalla,
  Pestanas,
  Rotulo,
  Vacio,
} from '../../componentes/piezas'
import TableroSemana from '../../componentes/TableroSemana'
import TarjetaGerente from '../../componentes/TarjetaGerente'

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
            <TableroSemana
              peticiones={vivas.data ?? lista.data}
              semanaInicio={semana}
              alTocarDia={(iso) => navegar(`/gerente/semana?dia=${iso}`)}
            />

            <div className="px-4 pt-6 pb-2">
              <h2 className="mb-0.5 text-[17.5px] font-extrabold tracking-tight text-sobre-pared">La fila</h2>
              <p className="mb-4 text-[12.5px] text-sobre-pared-2">
                Emergencias arriba, después por orden de llegada
              </p>

              {lista.data.map((p, i) => (
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
