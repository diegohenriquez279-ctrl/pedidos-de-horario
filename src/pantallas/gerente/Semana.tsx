import { useQuery } from '@tanstack/react-query'
import { estadoVentana, vivasDeLaSemana } from '../../lib/api'
import { rangoSemana } from '../../lib/fechas'
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

  return (
    <Pantalla>
      <Contenido className="flex flex-col">
        <BarraSuperior
          titulo="La semana"
          derecha={
            ventana.data ? (
              <span className="text-[12px] text-sobre-pared-2">
                {rangoSemana(ventana.data.semana_inicio, ventana.data.semana_fin)}
              </span>
            ) : undefined
          }
        />

        {(lista.isLoading || ventana.isLoading) && <Cargando cuantos={2} />}
        {(lista.isError || ventana.isError) && <ErrorPantalla alReintentar={() => void lista.refetch()} />}

        {lista.data && ventana.data && lista.data.length > 0 && (
          <TableroSemana peticiones={lista.data} semanaInicio={ventana.data.semana_inicio} detallado />
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
