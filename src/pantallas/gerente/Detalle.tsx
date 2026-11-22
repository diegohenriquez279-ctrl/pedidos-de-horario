import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { emergenciasDelMes, resolverPeticion, unaPeticion } from '../../lib/api'
import { mensajeDeError } from '../../lib/errores'
import { diaConMes, horaCorta } from '../../lib/fechas'
import { ETIQUETA_AREA, ETIQUETA_CONTRATO, ETIQUETA_TIPO, type Estado } from '../../lib/tipos'
import {
  BarraSuperior,
  Boton,
  Cargando,
  Chip,
  Contenido,
  ErrorPantalla,
  Etiqueta,
  MarcaEmergencia,
  Pantalla,
  Papel,
  Sello,
} from '../../componentes/piezas'
import { useDibujo } from '../../componentes/Papelito'
import { CampoTexto } from '../../componentes/campos'

export default function Detalle() {
  const { id } = useParams()
  const navegar = useNavigate()
  const qc = useQueryClient()
  const [comentario, setComentario] = useState('')

  const pet = useQuery({
    queryKey: ['peticion', id],
    queryFn: () => unaPeticion(id!),
    enabled: !!id,
  })

  const dibujo = useDibujo(pet.data?.dibujo_path ?? null)

  const emergencias = useQuery({
    queryKey: ['emergencias', pet.data?.empleado_id],
    queryFn: () => emergenciasDelMes(pet.data!.empleado_id),
    enabled: !!pet.data?.empleado_id,
  })

  const resolver = useMutation({
    mutationFn: (estado: Estado) => resolverPeticion(id!, estado, comentario.trim() || null),
    onSuccess: async (_d, estado) => {
      await qc.invalidateQueries()
      toast(estado === 'aprobada' ? 'Aprobada' : 'Respondida')
      navegar('/gerente')
    },
    onError: (e) => toast(mensajeDeError(e)),
  })

  if (pet.isLoading) {
    return (
      <Pantalla>
        <Cargando cuantos={2} />
      </Pantalla>
    )
  }

  if (pet.isError || !pet.data) {
    return (
      <Pantalla>
        <BarraSuperior titulo="Petición" volver="/gerente" />
        <ErrorPantalla alReintentar={() => void pet.refetch()} />
      </Pantalla>
    )
  }

  const p = pet.data
  const dias = [...p.peticion_dias].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const resuelta = p.estado !== 'pendiente'

  return (
    <Pantalla>
      <Contenido className="flex flex-col">
        <BarraSuperior
          titulo="Petición"
          volver="/gerente"
          derecha={
            p.prioridad === 'emergencia' ? (
              <span className="text-[12px] font-bold text-rojo-claro">Emergencia</span>
            ) : undefined
          }
        />

        <div className="px-4 pt-1.5">
          <Papel>
            {p.prioridad === 'emergencia' && <MarcaEmergencia />}
            <h2 className="text-[16px] leading-snug font-extrabold tracking-tight">
              {p.perfiles?.nombre_completo ?? 'Alguien de la tienda'}
            </h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {p.perfiles && <Chip>{ETIQUETA_AREA[p.perfiles.area]}</Chip>}
              {p.perfiles && <Chip>{ETIQUETA_CONTRATO[p.perfiles.contrato]}</Chip>}
              {p.tipo && <Chip>{ETIQUETA_TIPO[p.tipo]}</Chip>}
              {p.prioridad === 'emergencia' && typeof emergencias.data === 'number' && (
                <Chip>
                  {emergencias.data}.ª del mes
                </Chip>
              )}
            </div>

            <p className="mano mt-3 text-[20px] text-lapicero">{p.texto}</p>

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

            {p.dibujo_path && (
              <>
                <div className="mt-3.5 grid place-items-center rounded-papel border border-linea p-2.5">
                  {dibujo.data ? (
                    <img src={dibujo.data} alt="Dibujo que mandó" className="max-h-[220px] w-full object-contain" />
                  ) : (
                    <span className="hueso h-[140px] w-full" />
                  )}
                </div>
                <p className="mt-1.5 text-center text-[12.5px] text-suave">
                  El dibujo que mandó. Solo lo ven esa persona y vos.
                </p>
              </>
            )}

            <div className="mt-3.5 border-t border-dashed border-linea pt-3 text-[12.5px] leading-snug text-suave">
              Llegó el {horaCorta(p.en_fila_desde)}
              {p.editada_en && ' · lo cambió después de mandarlo'}
            </div>
          </Papel>
        </div>

        {resuelta ? (
          <div className="px-4 pt-5">
            <Papel cinta={false}>
              <div className="flex items-center gap-2.5">
                <Sello estado={p.estado} />
                <span className="ml-auto text-[12.5px] text-suave">
                  {p.resuelta_en ? horaCorta(p.resuelta_en) : ''}
                </span>
              </div>
              {p.comentario_gerente && (
                <p className="mano mt-3 text-[18px] font-bold text-rojo">{p.comentario_gerente}</p>
              )}
            </Papel>
          </div>
        ) : (
          <>
            <div className="px-4 pt-5">
              <Papel cinta={false}>
                <Etiqueta>Escribile algo (opcional)</Etiqueta>
                <CampoTexto
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Te lo doy, pero entrás el jueves en la tarde."
                  manuscrita
                />
                <p className="mt-1.5 text-[12.5px] leading-snug text-suave">
                  Lo va a ver solo esa persona, junto a tu respuesta.
                </p>
              </Papel>
            </div>

            <div className="sticky bottom-0 mt-auto grid grid-cols-2 gap-2.5 border-t border-white/10 bg-[#100b0b]/75 px-4 pt-3.5 pb-4.5 backdrop-blur-sm">
              <button
                type="button"
                disabled={resolver.isPending}
                onClick={() => resolver.mutate('rechazada')}
                className="min-h-[54px] rounded-papel border border-[#e6b9bf] bg-white text-[15px] font-extrabold text-rojo-hondo disabled:opacity-60"
              >
                No esta vez
              </button>
              <Boton
                disabled={resolver.isPending}
                onClick={() => resolver.mutate('aprobada')}
                className="min-h-[54px] justify-center"
              >
                <span className="w-full text-center text-[16px] font-extrabold">Aprobar</span>
              </Boton>
            </div>
          </>
        )}
      </Contenido>
    </Pantalla>
  )
}
