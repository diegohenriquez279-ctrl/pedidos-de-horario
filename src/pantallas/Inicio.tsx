import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FilePlus, Warning } from '@phosphor-icons/react'
import { useSesion } from '../sesion'
import { estadoVentana, misPeticiones } from '../lib/api'
import { diaTitulo } from '../lib/fechas'
import { ETIQUETA_AREA, ETIQUETA_CONTRATO_CORTA } from '../lib/tipos'
import {
  BotonGrande,
  Cargando,
  Chip,
  Contenido,
  ErrorPantalla,
  Etiqueta,
  NotaRoja,
  Pantalla,
  Papel,
  Pestanas,
  Rotulo,
  Sello,
} from '../componentes/piezas'
import { Papelito } from '../componentes/Papelito'

export default function Inicio() {
  const navegar = useNavigate()
  const { perfil } = useSesion()

  const ventana = useQuery({ queryKey: ['ventana'], queryFn: estadoVentana })
  const mias = useQuery({ queryKey: ['mis-peticiones'], queryFn: misPeticiones })

  const abierta = ventana.data?.abierta ?? false
  const recientes = (mias.data ?? []).slice(0, 2)

  return (
    <Pantalla>
      <Contenido className="flex flex-col">
        <Rotulo className="mt-1">
          <p className="text-[23px] leading-none font-extrabold tracking-[-0.035em]">
            El <span className="text-[#ff9fac]">Papelito</span>
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[14.5px] font-bold">Hola, {perfil?.nombre_completo.split(' ')[0]}</span>
            <span className="flex gap-1.5">
              {perfil && <Chip oscuro>{ETIQUETA_AREA[perfil.area]}</Chip>}
              {perfil && <Chip oscuro>{ETIQUETA_CONTRATO_CORTA[perfil.contrato]}</Chip>}
            </span>
          </div>
        </Rotulo>

        {ventana.isLoading && <Cargando cuantos={2} />}

        {ventana.isError && <ErrorPantalla alReintentar={() => void ventana.refetch()} />}

        {ventana.data && (
          <>
            <div className="mt-6 px-4">
              <div className="gira-2">
                {abierta ? (
                  <Papel rayado>
                    <Etiqueta>Estás pidiendo para</Etiqueta>
                    <h2 className="text-[24px] leading-tight font-extrabold tracking-[-0.03em]">
                      {diaTitulo(ventana.data.semana_inicio)}
                      <span className="block text-[17px] font-medium tracking-tight text-grafito">
                        a {diaTitulo(ventana.data.semana_fin)}
                      </span>
                    </h2>
                    <p className="mt-2.5 flex items-start gap-2 text-[13px] leading-snug text-grafito">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="size-[18px] flex-none text-vino">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7.5V12l3 2" />
                      </svg>
                      <span>
                        Podés pedir hasta el <b className="font-bold text-tinta">viernes a las 11:59 p.&nbsp;m.</b>
                      </span>
                    </p>
                  </Papel>
                ) : (
                  <Papel className="text-center">
                    <span className="mb-3 inline-block">
                      <Sello estado="rechazada" texto="Cerrado" />
                    </span>
                    <h2 className="mt-2 mb-2 text-[21px] leading-snug font-extrabold tracking-tight">
                      Las peticiones cerraron
                    </h2>
                    <p className="text-[14.5px] leading-relaxed text-grafito">
                      Tu gerente está armando el horario de la otra semana. Volvé el lunes y pedís lo tuyo.
                    </p>
                  </Papel>
                )}
              </div>
            </div>

            <div className="grid gap-2.5 px-4 pt-6">
              <BotonGrande
                icono={<FilePlus size={25} weight="regular" />}
                titulo="Escribir un papelito"
                bajada={abierta ? 'Qué querés y para qué días' : 'Se abre el lunes a las 12 de la noche'}
                variante={abierta ? 'rojo' : 'apagado'}
                disabled={!abierta}
                onClick={() => abierta && navegar('/nueva')}
              />
              {abierta ? (
                <BotonGrande
                  icono={<Warning size={25} weight="regular" />}
                  titulo="Es una emergencia"
                  bajada="Cita médica o imprevisto serio"
                  variante="papel"
                  onClick={() => navegar('/emergencia')}
                />
              ) : (
                <NotaRoja>
                  ¿Te salió una emergencia este fin de semana? Hablá directo con tu gerente.
                </NotaRoja>
              )}
            </div>
          </>
        )}

        <div className="px-4 pt-7 pb-2">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="text-[17.5px] font-extrabold tracking-tight text-sobre-pared">Mis papelitos</h2>
            {(mias.data?.length ?? 0) > 2 && (
              <button
                type="button"
                onClick={() => navegar('/mis-papelitos')}
                className="py-1 text-[13px] font-bold text-[#ff9fac] underline underline-offset-[3px]"
              >
                Ver los {mias.data?.length}
              </button>
            )}
          </div>

          {mias.isLoading && <Cargando cuantos={1} />}

          {mias.data && recientes.length === 0 && (
            <Papel className="text-center">
              <p className="text-[14.5px] leading-relaxed text-grafito">
                Todavía no has pedido nada. Cuando escribás tu primer papelito, te aparece aquí con el lugar
                que te tocó en la fila.
              </p>
            </Papel>
          )}

          {recientes.map((p, i) => (
            <Papelito key={p.id} peticion={p} gira={i % 2 === 0 ? 1 : 2} />
          ))}
        </div>

        <Pestanas rol="empleado" activa="/" />
      </Contenido>
    </Pantalla>
  )
}
