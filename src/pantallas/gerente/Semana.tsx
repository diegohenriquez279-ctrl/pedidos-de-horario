import { useQuery } from '@tanstack/react-query'
import { estadoVentana, vivasDeLaSemana } from '../../lib/api'
import { addDays } from 'date-fns'
import { aFecha, aISO, rangoSemana } from '../../lib/fechas'
import { semanaDominante } from '../../lib/orden'
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

export default function Semana() {
  const ventana = useQuery({ queryKey: ['ventana'], queryFn: estadoVentana })
  const lista = useQuery({ queryKey: ['vivas'], queryFn: vivasDeLaSemana })

  const semana = ventana.data
    ? semanaDominante(lista.data ?? [], ventana.data.semana_inicio)
    : null
  const semanaFin = semana ? aISO(addDays(aFecha(semana), 6)) : null

  return (
    <Pantalla>
      <Contenido className="flex flex-col">
        <BarraSuperior
          titulo="La semana"
          derecha={
            semana && semanaFin ? (
              <span className="text-[12px] text-sobre-pared-2">{rangoSemana(semana, semanaFin)}</span>
            ) : undefined
          }
        />

        {(lista.isLoading || ventana.isLoading) && <Cargando cuantos={2} />}
        {(lista.isError || ventana.isError) && <ErrorPantalla alReintentar={() => void lista.refetch()} />}

        {lista.data && semana && lista.data.length > 0 && (
          <TableroSemana peticiones={lista.data} semanaInicio={semana} detallado />
        )}

        {lista.data && lista.data.length === 0 && (
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
