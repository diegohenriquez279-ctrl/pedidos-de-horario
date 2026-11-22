import { useCallback, useEffect, useRef, useState } from 'react'
import { getStroke } from 'perfect-freehand'
import { ArrowUUpLeft, Eraser, Trash } from '@phosphor-icons/react'
import { BarraSuperior, Pantalla } from './piezas'

const COLORES = ['#1C1A1A', '#C8102E', '#6E1022', '#8C8481', '#FFFFFF'] as const
const NOMBRES: Record<string, string> = {
  '#1C1A1A': 'Negro',
  '#C8102E': 'Rojo',
  '#6E1022': 'Vino',
  '#8C8481': 'Gris',
  '#FFFFFF': 'Blanco',
}
const GROSORES = [6, 13, 24] as const

interface Trazo {
  puntos: number[][]
  color: string
  grosor: number
}

function caminoDe(puntos: number[][], grosor: number): Path2D {
  const contorno = getStroke(puntos, {
    size: grosor,
    thinning: 0.55,
    smoothing: 0.55,
    streamline: 0.45,
    simulatePressure: true,
  })
  const camino = new Path2D()
  if (contorno.length < 2) return camino
  camino.moveTo(contorno[0][0], contorno[0][1])
  for (let i = 1; i < contorno.length; i++) {
    const [x0, y0] = contorno[i - 1]
    const [x1, y1] = contorno[i]
    camino.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
  }
  camino.closePath()
  return camino
}

export default function Lienzo({
  alGuardar,
  alSalir,
  dibujoPrevio,
}: {
  alGuardar: (blob: Blob) => void
  alSalir: () => void
  dibujoPrevio?: string | null
}) {
  const refLienzo = useRef<HTMLCanvasElement>(null)
  const refCaja = useRef<HTMLDivElement>(null)
  const trazos = useRef<Trazo[]>([])
  const actual = useRef<Trazo | null>(null)
  const fondo = useRef<HTMLImageElement | null>(null)

  const [color, setColor] = useState<string>(COLORES[0])
  const [grosor, setGrosor] = useState<number>(GROSORES[1])
  const [borrando, setBorrando] = useState(false)
  const [hayAlgo, setHayAlgo] = useState(false)

  const pintar = useCallback(() => {
    const lienzo = refLienzo.current
    if (!lienzo) return
    const ctx = lienzo.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, lienzo.width / dpr, lienzo.height / dpr)

    if (fondo.current) {
      ctx.drawImage(fondo.current, 0, 0, lienzo.width / dpr, lienzo.height / dpr)
    }

    const todos = actual.current ? [...trazos.current, actual.current] : trazos.current
    for (const t of todos) {
      ctx.fillStyle = t.color
      ctx.fill(caminoDe(t.puntos, t.grosor))
    }
    ctx.restore()
  }, [])

  // tamaño real del lienzo, con la densidad de la pantalla
  useEffect(() => {
    const ajustar = () => {
      const lienzo = refLienzo.current
      const caja = refCaja.current
      if (!lienzo || !caja) return
      const dpr = window.devicePixelRatio || 1
      lienzo.width = Math.round(caja.clientWidth * dpr)
      lienzo.height = Math.round(caja.clientHeight * dpr)
      lienzo.style.width = `${caja.clientWidth}px`
      lienzo.style.height = `${caja.clientHeight}px`
      pintar()
    }
    ajustar()
    window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [pintar])

  // si venía con un dibujo hecho, se arranca encima de él
  useEffect(() => {
    if (!dibujoPrevio) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      fondo.current = img
      setHayAlgo(true)
      pintar()
    }
    img.src = dibujoPrevio
  }, [dibujoPrevio, pintar])

  const punto = (e: React.PointerEvent<HTMLCanvasElement>): number[] => {
    const r = refLienzo.current!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top, e.pressure > 0 ? e.pressure : 0.5]
  }

  const empezar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    actual.current = {
      puntos: [punto(e)],
      color: borrando ? '#FFFFFF' : color,
      grosor: borrando ? Math.max(grosor * 2.2, 26) : grosor,
    }
    pintar()
  }

  const seguir = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!actual.current) return
    actual.current.puntos.push(punto(e))
    pintar()
  }

  const terminar = () => {
    if (!actual.current) return
    trazos.current = [...trazos.current, actual.current]
    actual.current = null
    setHayAlgo(true)
    pintar()
  }

  const deshacer = () => {
    trazos.current = trazos.current.slice(0, -1)
    setHayAlgo(trazos.current.length > 0 || !!fondo.current)
    pintar()
  }

  const limpiar = () => {
    trazos.current = []
    fondo.current = null
    setHayAlgo(false)
    pintar()
  }

  const guardar = () => {
    const lienzo = refLienzo.current
    if (!lienzo) return
    lienzo.toBlob(
      (blob) => {
        if (blob) alGuardar(blob)
      },
      'image/webp',
      0.82,
    )
  }

  return (
    <Pantalla>
      <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col">
        <BarraSuperior
          titulo="Dale vida a tu nota"
          volver={alSalir}
          derecha={
            <button
              type="button"
              onClick={guardar}
              disabled={!hayAlgo}
              className={`min-h-11 rounded-papel px-4 text-[15px] font-extrabold ${
                hayAlgo ? 'bg-rojo text-white' : 'bg-[#524745] text-[#c9bfbc]'
              }`}
            >
              Listo
            </button>
          }
        />

        <div ref={refCaja} className="mx-2.5 min-h-[320px] flex-1 overflow-hidden rounded-papel bg-white shadow-papel">
          <canvas
            ref={refLienzo}
            className="lienzo-dibujo block h-full w-full"
            onPointerDown={empezar}
            onPointerMove={seguir}
            onPointerUp={terminar}
            onPointerLeave={terminar}
            onPointerCancel={terminar}
            aria-label="Lienzo para dibujar con el dedo"
          />
        </div>

        <div className="px-2.5 pt-3 pb-4">
          <div className="mb-3 flex justify-center gap-2.5">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={NOMBRES[c]}
                aria-pressed={!borrando && color === c}
                onClick={() => {
                  setColor(c)
                  setBorrando(false)
                }}
                style={{ background: c }}
                className={`size-10 rounded-full border-2 transition ${
                  !borrando && color === c ? 'border-transparent ring-[3px] ring-white' : 'border-white/40'
                }`}
              />
            ))}
          </div>

          <div className="mb-3 flex items-center justify-center gap-2">
            {GROSORES.map((g) => (
              <button
                key={g}
                type="button"
                aria-label={`Grosor ${g === GROSORES[0] ? 'fino' : g === GROSORES[1] ? 'medio' : 'grueso'}`}
                aria-pressed={grosor === g}
                onClick={() => setGrosor(g)}
                className={`grid size-12 place-items-center rounded-papel border ${
                  grosor === g ? 'border-white bg-white' : 'border-sobre-pared/30 bg-white/5'
                }`}
              >
                <span
                  className={`block rounded-full ${grosor === g ? 'bg-tinta' : 'bg-sobre-pared'}`}
                  style={{ width: g + 10, height: Math.max(g / 2, 4) }}
                />
              </button>
            ))}
          </div>

          <div className="flex gap-1.5">
            <Util icono={<Eraser size={20} />} texto="Borrador" puesta={borrando} onClick={() => setBorrando((b) => !b)} />
            <Util icono={<ArrowUUpLeft size={20} />} texto="Deshacer" onClick={deshacer} />
            <Util icono={<Trash size={20} />} texto="Limpiar" onClick={limpiar} />
          </div>
        </div>
      </div>
    </Pantalla>
  )
}

function Util({
  icono,
  texto,
  puesta = false,
  onClick,
}: {
  icono: React.ReactNode
  texto: string
  puesta?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={puesta}
      className={`grid min-h-12 flex-1 place-items-center gap-0.5 rounded-papel border px-1 py-1.5 text-[11px] font-bold tracking-wide uppercase ${
        puesta ? 'border-white bg-white text-tinta' : 'border-sobre-pared/30 bg-white/5 text-sobre-pared'
      }`}
    >
      {icono}
      {texto}
    </button>
  )
}
