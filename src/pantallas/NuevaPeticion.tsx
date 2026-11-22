import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Drawer } from 'vaul'
import { toast } from 'sonner'
import { PencilSimple, Warning } from '@phosphor-icons/react'
import { useSesion } from '../sesion'
import {
  contarChoques,
  crearPeticion,
  editarPeticion,
  estadoVentana,
  misPeticiones,
  subirDibujo,
  urlDeDibujo,
} from '../lib/api'
import { mensajeDeError } from '../lib/errores'
import { diasDesdeHoy, diasDeSemana, rangoSemana } from '../lib/fechas'
import { ETIQUETA_AREA, ETIQUETA_TIPO, type Prioridad, type Tipo } from '../lib/tipos'
import {
  BarraSuperior,
  Boton,
  Cargando,
  Contenido,
  Etiqueta,
  NotaRoja,
  Pantalla,
  Papel,
} from '../componentes/piezas'
import { CampoTexto } from '../componentes/campos'
import Lienzo from '../componentes/Lienzo'

export default function NuevaPeticion({
  prioridad: prioridadProp,
  editando = false,
}: {
  prioridad: Prioridad
  editando?: boolean
}) {
  const navegar = useNavigate()
  const { id } = useParams()
  const qc = useQueryClient()
  const { perfil } = useSesion()

  const ventana = useQuery({ queryKey: ['ventana'], queryFn: estadoVentana })
  const mias = useQuery({ queryKey: ['mis-peticiones'], queryFn: misPeticiones, enabled: editando })

  const original = editando ? mias.data?.find((p) => p.id === id) : undefined
  const prioridad: Prioridad = original?.prioridad ?? prioridadProp

  const [texto, setTexto] = useState('')
  const [fechas, setFechas] = useState<string[]>([])
  const [tipo, setTipo] = useState<Tipo | null>(null)
  const [dibujoBlob, setDibujoBlob] = useState<Blob | null>(null)
  const [dibujoPrevio, setDibujoPrevio] = useState<string | null>(null)
  const [rutaPrevia, setRutaPrevia] = useState<string | null>(null)
  const [dibujando, setDibujando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(!editando)

  // carga lo que ya estaba escrito cuando se está cambiando un papelito
  useEffect(() => {
    if (!editando || !original || listo) return
    setTexto(original.texto)
    setFechas(original.peticion_dias.map((d) => d.fecha).sort())
    setTipo(original.tipo)
    setRutaPrevia(original.dibujo_path)
    if (original.dibujo_path) {
      void urlDeDibujo(original.dibujo_path).then((u) => setDibujoPrevio(u))
    }
    setListo(true)
  }, [editando, original, listo])

  const dias = useMemo(() => {
    if (!ventana.data) return []
    return prioridad === 'normal'
      ? diasDeSemana(ventana.data.semana_inicio)
      : diasDesdeHoy(ventana.data.hoy, ventana.data.semana_fin)
  }, [ventana.data, prioridad])

  const choques = useQuery({
    queryKey: ['choques', fechas],
    queryFn: () => contarChoques(fechas),
    enabled: fechas.length > 0,
    staleTime: 10_000,
  })

  const vistaDibujo = useMemo(
    () => (dibujoBlob ? URL.createObjectURL(dibujoBlob) : dibujoPrevio),
    [dibujoBlob, dibujoPrevio],
  )

  function tocarDia(iso: string) {
    setError(null)
    if (prioridad === 'emergencia') {
      setFechas([iso])
      return
    }
    setFechas((f) => (f.includes(iso) ? f.filter((x) => x !== iso) : [...f, iso].sort()))
  }

  const guardar = useMutation({
    mutationFn: async () => {
      let ruta = rutaPrevia
      if (dibujoBlob && perfil) {
        ruta = await subirDibujo(dibujoBlob, perfil.tienda_id, perfil.id)
      }
      if (editando && id) {
        await editarPeticion(id, { texto, fechas, tipo, dibujo_path: ruta })
      } else {
        await crearPeticion({ prioridad, texto, fechas, tipo, dibujo_path: ruta })
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries()
      toast(editando ? 'Listo, lo cambiamos' : 'Pegado en la pared')
      navegar(editando ? '/mis-papelitos' : '/')
    },
    onError: (e) => {
      setError(mensajeDeError(e))
      setConfirmando(false)
    },
  })

  function intentarEnviar() {
    setError(null)
    if (texto.trim().length === 0) return setError('Escribí qué querés pedir.')
    if (fechas.length === 0) return setError(prioridad === 'emergencia' ? 'Elegí el día.' : 'Elegí al menos un día.')
    if (prioridad === 'emergencia' && !editando) {
      setConfirmando(true)
      return
    }
    guardar.mutate()
  }

  if (dibujando) {
    return (
      <Lienzo
        dibujoPrevio={vistaDibujo}
        alSalir={() => setDibujando(false)}
        alGuardar={(blob) => {
          setDibujoBlob(blob)
          setDibujoPrevio(null)
          setDibujando(false)
        }}
      />
    )
  }

  if (ventana.isLoading || (editando && mias.isLoading)) {
    return (
      <Pantalla>
        <Cargando cuantos={2} />
      </Pantalla>
    )
  }

  const avisos = (choques.data ?? []).filter((c) => c.cuantas > 0)

  return (
    <Pantalla>
      <Contenido className="flex flex-col">
        <BarraSuperior
          titulo={
            prioridad === 'emergencia' ? (
              <span className="flex items-center gap-2">
                <Warning size={22} weight="bold" className="text-rojo-claro" />
                Emergencia
              </span>
            ) : editando ? (
              'Cambiar el papelito'
            ) : (
              'Tu papelito'
            )
          }
          cerrar={editando ? '/mis-papelitos' : '/'}
          derecha={
            prioridad === 'normal' && ventana.data ? (
              <span className="text-right text-[12px] leading-tight text-sobre-pared-2">
                Semana del
                <br />
                {rangoSemana(ventana.data.semana_inicio, ventana.data.semana_fin)}
              </span>
            ) : undefined
          }
        />

        {prioridad === 'emergencia' && (
          <div className="px-4 pb-1">
            <NotaRoja>
              Es para algo que no se puede mover: una cita médica, un asunto familiar, un imprevisto serio.
            </NotaRoja>
          </div>
        )}

        <div className="px-4 pt-4">
          <Papel rayado>
            <CampoTexto
              etiqueta={prioridad === 'emergencia' ? 'Qué te pasó' : 'Qué querés pedir'}
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, 1000))}
              rows={4}
              manuscrita
              placeholder="Escribí aquí, con tus palabras…"
              ayuda="Con tus palabras. Solo lo lee tu gerente."
            />
          </Papel>
        </div>

        <div className="px-4 pt-5">
          <Etiqueta claro>{prioridad === 'emergencia' ? 'Qué día' : 'Para qué días'}</Etiqueta>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${Math.min(dias.length, 7)}, minmax(0, 1fr))` }}
            role="group"
            aria-label="Días"
          >
            {dias.slice(0, 7).map((d) => {
              const puesto = fechas.includes(d.iso)
              return (
                <button
                  key={d.iso}
                  type="button"
                  aria-pressed={puesto}
                  aria-label={d.largo}
                  onClick={() => tocarDia(d.iso)}
                  className={`min-h-[52px] rounded-papel border-[1.5px] px-0 py-1.5 text-center transition ${
                    puesto ? 'border-tinta bg-tinta text-white' : 'border-borde bg-white'
                  }`}
                >
                  <span className={`block text-[11px] font-bold tracking-wide uppercase ${puesto ? 'text-white/75' : 'text-suave'}`}>
                    {d.abreviatura}
                  </span>
                  <span className="block text-[17px] leading-tight font-extrabold">{d.numero}</span>
                </button>
              )
            })}
          </div>

          {prioridad === 'emergencia' && (
            <p className="mt-2 text-[12.5px] leading-snug text-sobre-pared-2">
              Podés pedir hasta el domingo de la otra semana.
            </p>
          )}

          {avisos.length > 0 && perfil && (
            <div className="mt-3 flex items-start gap-2 rounded-papel border-[1.5px] border-rojo bg-[#fff4f5] px-3 py-2.5">
              <Warning size={19} weight="bold" className="mt-0.5 flex-none text-rojo" />
              <p className="m-0 text-[13.5px] leading-snug text-[#5a2b2b]">
                <b className="font-bold text-rojo-hondo">
                  {avisos.length === 1
                    ? `Ya hay ${avisos[0].cuantas} ${avisos[0].cuantas === 1 ? 'petición' : 'peticiones'} en ${ETIQUETA_AREA[perfil.area].toLowerCase()} para ese día.`
                    : `Ya hay peticiones en ${ETIQUETA_AREA[perfil.area].toLowerCase()} para ${avisos.length} de esos días.`}
                </b>{' '}
                {avisos.length === 1 && avisos[0].cuantas === 1
                  ? 'Podés mandar la tuya igual, pero esa llegó antes.'
                  : 'Podés mandar la tuya igual, pero las otras llegaron antes.'}
              </p>
            </div>
          )}
        </div>

        {prioridad === 'normal' && (
          <div className="px-4 pt-5">
            <Etiqueta claro>Qué es (opcional)</Etiqueta>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ETIQUETA_TIPO) as Tipo[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tipo === t}
                  onClick={() => setTipo(tipo === t ? null : t)}
                  className={`min-h-11 rounded-full border-[1.5px] px-3.5 text-[13.5px] font-bold transition ${
                    tipo === t ? 'border-tinta bg-tinta text-white' : 'border-borde bg-white'
                  }`}
                >
                  {ETIQUETA_TIPO[t]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 pt-5">
          <button
            type="button"
            onClick={() => setDibujando(true)}
            className="flex min-h-[60px] w-full items-center gap-3 rounded-papel bg-papel px-4 py-3.5 text-left shadow-papel transition active:translate-y-px"
          >
            {vistaDibujo ? (
              <img src={vistaDibujo} alt="" className="h-[44px] w-[58px] flex-none rounded-[2px] border border-linea object-contain" />
            ) : (
              <PencilSimple size={25} className="flex-none text-vino" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] leading-tight font-extrabold tracking-tight text-vino">
                {vistaDibujo ? 'Cambiar el dibujo' : 'Dale vida a tu nota'}
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-grafito">
                {vistaDibujo ? 'Tocá para seguir dibujando' : 'Hacele un dibujo, si querés'}
              </span>
            </span>
          </button>
        </div>

        {error && (
          <p className="mx-4 mt-4 rounded-papel border-[1.5px] border-rojo bg-[#fff4f5] px-3 py-2.5 text-[13.5px] leading-snug font-semibold text-rojo-hondo">
            {error}
          </p>
        )}

        <div className="sticky bottom-0 mt-auto border-t border-white/10 bg-[#100b0b]/75 px-4 pt-3.5 pb-4.5 backdrop-blur-sm">
          <Boton onClick={intentarEnviar} disabled={guardar.isPending} className="justify-center">
            <span className="w-full text-center text-[17.5px] font-extrabold tracking-tight">
              {guardar.isPending
                ? 'Pegando…'
                : editando
                  ? 'Guardar los cambios'
                  : prioridad === 'emergencia'
                    ? 'Mandar la emergencia'
                    : 'Pegarlo en la pared'}
            </span>
          </Boton>
        </div>

        <Drawer.Root open={confirmando} onOpenChange={setConfirmando}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60" />
            <Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 mx-auto max-w-[520px] rounded-t-2xl bg-white px-4.5 pt-2.5 pb-5 shadow-hoja">
              <div className="mx-auto mb-3.5 h-1 w-11 rounded-full bg-linea" />
              <Drawer.Title className="mb-2 text-[19px] leading-snug font-extrabold tracking-tight">
                Un momento antes de mandarla
              </Drawer.Title>
              <Drawer.Description className="mb-4 text-[14.5px] leading-relaxed text-grafito">
                Las emergencias se le ponen a tu gerente hasta arriba de la lista, en rojo. Son para citas
                médicas, asuntos familiares o imprevistos serios. ¿Es este el caso?
              </Drawer.Description>
              <div className="grid gap-2.5">
                <Boton onClick={() => guardar.mutate()} disabled={guardar.isPending} className="justify-center">
                  <span className="w-full text-center text-[17px] font-extrabold">
                    {guardar.isPending ? 'Mandando…' : 'Sí, mandarla'}
                  </span>
                </Boton>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmando(false)
                    navegar('/nueva')
                  }}
                  className="min-h-[50px] w-full rounded-papel border border-borde text-[15px] font-bold text-grafito"
                >
                  Mejor la mando normal
                </button>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </Contenido>
    </Pantalla>
  )
}
