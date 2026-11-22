import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CaretLeft,
  Check,
  Checks,
  Clock,
  House,
  CalendarBlank,
  FileText,
  ListBullets,
  User,
  Warning,
  X,
} from '@phosphor-icons/react'
import type { Estado } from '../lib/tipos'

/* --------------------------------------------------------------- pantalla */

export function Pantalla({ children }: { children: ReactNode }) {
  return <div className="pared flex min-h-dvh flex-col">{children}</div>
}

export function Contenido({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[520px] flex-1 ${className}`}>{children}</div>
}

/* ----------------------------------------------------------- barra de arriba */

export function BarraSuperior({
  titulo,
  volver,
  cerrar,
  derecha,
}: {
  titulo: ReactNode
  volver?: string | (() => void)
  cerrar?: string | (() => void)
  derecha?: ReactNode
}) {
  const navegar = useNavigate()
  const accion = volver ?? cerrar
  const alTocar = () => {
    if (typeof accion === 'function') accion()
    else if (typeof accion === 'string') navegar(accion)
  }

  return (
    <div className="flex items-center gap-2.5 px-4 pt-2.5 pb-3 text-sobre-pared">
      {accion && (
        <button
          type="button"
          onClick={alTocar}
          aria-label={cerrar ? 'Cerrar' : 'Volver'}
          className="grid size-11 flex-none place-items-center rounded-full border border-sobre-pared/30 transition active:scale-95"
        >
          {cerrar ? <X size={21} weight="bold" /> : <CaretLeft size={21} weight="bold" />}
        </button>
      )}
      <h1 className="min-w-0 flex-1 text-[18px] leading-tight font-bold tracking-tight">{titulo}</h1>
      {derecha}
    </div>
  )
}

/* ------------------------------------------------------------------- rótulo */

export function Rotulo({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rotulo-cinta relative mx-4 rounded-papel border border-vino-hondo bg-vino px-3.5 pt-3 pb-3.5 text-white shadow-papel ${className}`}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------- papel */

export function Papel({
  children,
  cinta = true,
  cintaIzq = false,
  rayado = false,
  gira,
  className = '',
}: {
  children: ReactNode
  cinta?: boolean
  cintaIzq?: boolean
  rayado?: boolean
  gira?: 1 | 2 | 3
  className?: string
}) {
  const clases = [
    'papel',
    cinta ? 'papel-cinta' : '',
    cinta && cintaIzq ? 'papel-cinta-izq' : '',
    rayado ? 'papel-rayado' : '',
    gira ? `gira-${gira}` : '',
    'px-[15px] py-[15px]',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <div className={clases}>{children}</div>
}

/* ------------------------------------------------------------------ botones */

type Variante = 'rojo' | 'papel' | 'fantasma' | 'apagado'

const VARIANTES: Record<Variante, string> = {
  rojo: 'bg-rojo text-white shadow-papel',
  papel: 'bg-papel text-vino shadow-papel',
  fantasma: 'bg-transparent text-sobre-pared border border-sobre-pared/35',
  apagado: 'bg-[#524745] text-[#c9bfbc] cursor-not-allowed',
}

export function Boton({
  variante = 'rojo',
  children,
  className = '',
  ...resto
}: { variante?: Variante } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...resto}
      className={`flex min-h-14 w-full items-center gap-3 rounded-papel px-4 py-3.5 text-left font-bold transition duration-200 ease-[cubic-bezier(.2,.8,.2,1)] active:translate-y-px disabled:cursor-not-allowed ${VARIANTES[variante]} ${className}`}
    >
      {children}
    </button>
  )
}

export function BotonGrande({
  icono,
  titulo,
  bajada,
  variante = 'rojo',
  ...resto
}: {
  icono: ReactNode
  titulo: string
  bajada: string
  variante?: Variante
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Boton variante={variante} className="min-h-[60px]" {...resto}>
      <span className="flex-none">{icono}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] leading-tight font-extrabold tracking-tight">{titulo}</span>
        <span
          className={`mt-0.5 block text-[13px] leading-snug ${
            variante === 'rojo'
              ? 'text-white/85'
              : variante === 'apagado'
                ? 'text-[#d6cfcd]'
                : variante === 'fantasma'
                  ? 'text-sobre-pared-2'
                  : 'text-grafito'
          }`}
        >
          {bajada}
        </span>
      </span>
    </Boton>
  )
}

/* -------------------------------------------------------------- etiquetitas */

export function Chip({ children, oscuro = false }: { children: ReactNode; oscuro?: boolean }) {
  return (
    <span
      className={
        oscuro
          ? 'inline-flex items-center gap-1 rounded-full border border-white/60 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase'
          : 'inline-flex items-center gap-1 rounded-full border border-[#9e9693] bg-white/85 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[#443c3a] uppercase'
      }
    >
      {children}
    </span>
  )
}

export function Etiqueta({ children, claro = false }: { children: ReactNode; claro?: boolean }) {
  return (
    <p
      className={`mb-1.5 text-[11px] font-bold tracking-[0.14em] uppercase ${claro ? 'text-sobre-pared-2' : 'text-suave'}`}
    >
      {children}
    </p>
  )
}

export function Ayuda({ children, claro = false }: { children: ReactNode; claro?: boolean }) {
  return (
    <p className={`mt-1.5 text-[12.5px] leading-snug ${claro ? 'text-sobre-pared-2' : 'text-suave'}`}>
      {children}
    </p>
  )
}

export function Sello({ estado, texto }: { estado: Estado; texto?: string }) {
  const mapa = {
    pendiente: { texto: 'En la fila', color: 'text-suave border-dashed', icono: <Clock size={13} weight="bold" /> },
    aprobada: { texto: 'Aprobado', color: 'text-vino', icono: <Check size={13} weight="bold" /> },
    rechazada: { texto: 'No esta vez', color: 'text-[#6b6361]', icono: <X size={13} weight="bold" /> },
  }[estado]

  return (
    <span
      className={`inline-flex -rotate-[2.5deg] items-center gap-1.5 rounded-papel border-2 px-2.5 py-1 text-[11.5px] font-extrabold tracking-[0.11em] uppercase ${mapa.color}`}
    >
      {mapa.icono}
      {texto ?? mapa.texto}
    </span>
  )
}

export function MarcaEmergencia() {
  return (
    <span className="mb-2 inline-flex -rotate-2 items-center gap-1.5 rounded-papel bg-rojo px-2.5 py-1 text-[11.5px] font-extrabold tracking-[0.11em] text-white uppercase">
      <Warning size={13} weight="bold" />
      Emergencia
    </span>
  )
}

export function NotaRoja({ children }: { children: ReactNode }) {
  return (
    <p className="mano flex items-start gap-2 rounded-papel bg-papel px-3 py-2.5 text-[18px] text-rojo-hondo shadow-[0_5px_12px_-6px_rgb(0_0_0/0.8)]">
      <Warning size={18} weight="bold" className="mt-0.5 flex-none" />
      <span>{children}</span>
    </p>
  )
}

export function Comentario({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex gap-2">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="mt-1 size-[17px] flex-none text-rojo">
        <path d="M4 18.5V15L15.5 3.5l4 4L8 19H4.5z" />
        <path d="M13.5 5.5l4 4" />
      </svg>
      <p className="mano m-0 text-[18px] font-bold text-rojo">{children}</p>
    </div>
  )
}

/* -------------------------------------------------------------- estados */

export function Cargando({ cuantos = 3 }: { cuantos?: number }) {
  return (
    <div className="px-4 pt-4" aria-live="polite" aria-busy="true">
      <span className="sr-only">Cargando</span>
      {Array.from({ length: cuantos }, (_, i) => (
        <div
          key={i}
          className={`papel papel-cinta mb-[17px] px-[15px] py-3.5 ${i % 2 ? 'gira-2' : 'gira-1'}`}
          style={{ opacity: i === cuantos - 1 ? 0.55 : 1 }}
        >
          <div className="flex gap-3">
            <span className="hueso size-[34px] flex-none rounded-full" />
            <div className="flex-1 space-y-2.5">
              <div className="hueso h-3 w-2/5" />
              <div className="hueso h-3 w-full" />
              <div className="hueso h-3 w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function Centro({ children }: { children: ReactNode }) {
  return <div className="grid flex-1 place-items-center px-6 py-8 text-center">{children}</div>
}

export function Vacio({
  titulo,
  texto,
  accion,
}: {
  titulo: string
  texto: string
  accion?: ReactNode
}) {
  return (
    <Centro>
      <div>
        <svg
          viewBox="0 0 120 92"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinejoin="round"
          className="mx-auto h-[92px] w-[120px] text-sobre-pared/40"
          aria-hidden="true"
        >
          <rect x="14" y="16" width="92" height="66" rx="3" strokeDasharray="7 7" />
          <path d="M44 10h32l-3 11H47z" fill="currentColor" opacity="0.35" stroke="none" />
          <path d="M34 44h52M34 58h34" strokeLinecap="round" strokeDasharray="6 8" />
        </svg>
        <h2 className="mt-4 mb-1.5 text-[19px] leading-snug font-extrabold tracking-tight text-sobre-pared">
          {titulo}
        </h2>
        <p className="mx-auto mb-5 max-w-[30ch] text-[14.5px] leading-relaxed text-sobre-pared-2">{texto}</p>
        {accion}
      </div>
    </Centro>
  )
}

export function ErrorPantalla({ alReintentar }: { alReintentar: () => void }) {
  return (
    <Centro>
      <div>
        <svg
          viewBox="0 0 120 92"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinejoin="round"
          className="mx-auto h-[92px] w-[120px] text-rojo-claro"
          aria-hidden="true"
        >
          <rect x="14" y="16" width="92" height="66" rx="3" />
          <path d="M44 10h32l-3 11H47z" fill="currentColor" opacity="0.3" stroke="none" />
          <path d="M44 40l32 24M76 40L44 64" strokeLinecap="round" />
        </svg>
        <h2 className="mt-4 mb-1.5 text-[19px] leading-snug font-extrabold tracking-tight text-sobre-pared">
          No se pudo cargar
        </h2>
        <p className="mx-auto mb-5 max-w-[30ch] text-[14.5px] leading-relaxed text-sobre-pared-2">
          Puede ser la señal. Revisá que tengás internet y probá otra vez.
        </p>
        <Boton variante="papel" className="justify-center" onClick={alReintentar}>
          <span className="w-full text-center text-[17px] font-extrabold">Probar otra vez</span>
        </Boton>
      </div>
    </Centro>
  )
}

/* ------------------------------------------------------------- pestañas */

export function Pestanas({ rol, activa }: { rol: 'empleado' | 'gerente'; activa: string }) {
  const items =
    rol === 'gerente'
      ? [
          { a: '/gerente', icono: ListBullets, texto: 'La fila' },
          { a: '/gerente/semana', icono: CalendarBlank, texto: 'La semana' },
          { a: '/gerente/resueltas', icono: Checks, texto: 'Resueltas' },
          { a: '/mi-cuenta', icono: User, texto: 'Mi cuenta' },
        ]
      : [
          { a: '/', icono: House, texto: 'Inicio' },
          { a: '/mis-papelitos', icono: FileText, texto: 'Mis papelitos' },
          { a: '/mi-cuenta', icono: User, texto: 'Mi cuenta' },
        ]

  return (
    <nav className="sticky bottom-0 z-10 mt-auto flex border-t border-black/40 bg-[#171111]">
      {items.map(({ a, icono: Icono, texto }) => {
        const puesta = a === activa
        return (
          <Link
            key={a}
            to={a}
            aria-current={puesta ? 'page' : undefined}
            className={`grid min-h-14 flex-1 place-items-center gap-0.5 px-1 pt-2 pb-2.5 text-[11px] font-bold tracking-wide uppercase transition ${
              puesta ? 'text-white shadow-[inset_0_3px_0_var(--color-rojo)]' : 'text-sobre-pared/60'
            }`}
          >
            <Icono size={23} weight={puesta ? 'fill' : 'regular'} />
            {texto}
          </Link>
        )
      })}
    </nav>
  )
}
