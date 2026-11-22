import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { Eye, EyeSlash } from '@phosphor-icons/react'

export const CLASE_CAMPO =
  'w-full min-h-[50px] rounded-papel border-[1.5px] border-borde bg-white px-3.5 py-3 text-[16px] leading-snug text-tinta placeholder:text-[#8c8481] focus:border-rojo focus:outline-none focus:ring-[3px] focus:ring-rojo/20'

export function Campo({
  etiqueta,
  ayuda,
  error,
  children,
  ...resto
}: {
  etiqueta: string
  ayuda?: ReactNode
  error?: string | null
} & InputHTMLAttributes<HTMLInputElement> & { children?: ReactNode }) {
  const id = useId()
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-extrabold tracking-[0.09em] text-grafito uppercase">
        {etiqueta}
      </label>
      <div className="relative">
        <input id={id} {...resto} className={`${CLASE_CAMPO} ${error ? 'border-rojo' : ''}`} />
        {children}
      </div>
      {error ? (
        <p className="mt-1.5 text-[12.5px] leading-snug font-semibold text-rojo-hondo">{error}</p>
      ) : ayuda ? (
        <p className="mt-1.5 text-[12.5px] leading-snug text-suave">{ayuda}</p>
      ) : null}
    </div>
  )
}

export function CampoClave({
  etiqueta,
  ayuda,
  error,
  ...resto
}: { etiqueta: string; ayuda?: ReactNode; error?: string | null } & InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda} error={error} type={visible ? 'text' : 'password'} {...resto}>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Esconder la contraseña' : 'Ver la contraseña'}
        className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-papel text-suave"
      >
        {visible ? <EyeSlash size={20} /> : <Eye size={20} />}
      </button>
    </Campo>
  )
}

export function CampoTexto({
  etiqueta,
  ayuda,
  manuscrita = false,
  ...resto
}: {
  etiqueta?: string
  ayuda?: ReactNode
  manuscrita?: boolean
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <div>
      {etiqueta && (
        <label htmlFor={id} className="mb-1.5 block text-[11px] font-bold tracking-[0.14em] text-suave uppercase">
          {etiqueta}
        </label>
      )}
      <textarea
        id={id}
        {...resto}
        className={`${CLASE_CAMPO} resize-none ${manuscrita ? 'mano text-[19.5px] text-lapicero' : ''}`}
      />
      {ayuda && <p className="mt-1.5 text-right text-[12.5px] leading-snug text-suave">{ayuda}</p>}
    </div>
  )
}

export function Opcion({
  puesta,
  titulo,
  bajada,
  ...resto
}: { puesta: boolean; titulo: string; bajada?: string } & InputHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={puesta}
      {...(resto as object)}
      className={`flex min-h-[60px] w-full items-center gap-2.5 rounded-papel border-[1.5px] bg-white px-3 py-3.5 text-left transition ${
        puesta ? 'border-rojo shadow-[inset_0_0_0_1px_var(--color-rojo)]' : 'border-borde'
      }`}
    >
      <span
        className={`grid size-[22px] flex-none place-items-center rounded-full border-[1.5px] ${
          puesta ? 'border-rojo bg-rojo text-white' : 'border-borde'
        }`}
      >
        {puesta && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[15.5px] font-extrabold tracking-tight">{titulo}</span>
        {bajada && <span className="mt-0.5 block text-[12.5px] leading-snug text-suave">{bajada}</span>}
      </span>
    </button>
  )
}
