import { diasDeSemana } from '../lib/fechas'
import { cuentaPorDia, hayChoque } from '../lib/orden'
import type { PeticionDeLaGerente } from '../lib/tipos'
import { Etiqueta, NotaRoja } from './piezas'

export default function TableroSemana({
  peticiones,
  semanaInicio,
  detallado = false,
}: {
  peticiones: PeticionDeLaGerente[]
  semanaInicio: string
  detallado?: boolean
}) {
  const dias = diasDeSemana(semanaInicio)
  const celdas = cuentaPorDia(
    peticiones,
    dias.map((d) => d.iso),
  )
  const apretados = celdas.filter(hayChoque)

  return (
    <div className="px-4 pt-5">
      <Etiqueta claro>La semana en la pared</Etiqueta>

      <div className="grid grid-cols-7 gap-1">
        {dias.map((d, i) => {
          const c = celdas[i]
          const choca = hayChoque(c)
          const total = c.cocina + c.servicio
          return (
            <div key={d.iso} className="text-center">
              <span className="block text-[11px] font-bold tracking-wide text-sobre-pared-2 uppercase">
                {d.abreviatura}
              </span>
              <span
                className={`relative mb-1 inline-block px-1.5 text-[15px] leading-tight font-extrabold ${
                  choca ? 'rounded-full bg-white/95 text-[#8e0c1e]' : 'text-sobre-pared'
                }`}
              >
                {d.numero}
                {choca && (
                  <span className="pointer-events-none absolute -inset-x-0.5 -inset-y-[3px] -rotate-6 scale-x-110 rounded-full border-2 border-rojo-claro" />
                )}
              </span>
              <div className="grid min-h-[58px] content-start gap-[3px]">
                {Array.from({ length: c.cocina }, (_, k) => (
                  <span
                    key={`c${k}`}
                    className="grid min-h-[18px] place-items-center rounded-[2px] bg-[#f6dfe2] text-[10px] font-extrabold text-[#8e0c1e] shadow-[0_2px_5px_-2px_rgb(0_0_0/0.8)]"
                  >
                    C
                  </span>
                ))}
                {Array.from({ length: c.servicio }, (_, k) => (
                  <span
                    key={`s${k}`}
                    className="grid min-h-[18px] place-items-center rounded-[2px] bg-[#ede7e4] text-[10px] font-extrabold text-[#2b2322] shadow-[0_2px_5px_-2px_rgb(0_0_0/0.8)]"
                  >
                    S
                  </span>
                ))}
                {total === 0 && <span className="sr-only">Sin peticiones</span>}
              </div>
            </div>
          )
        })}
      </div>

      {apretados.length > 0 && (
        <div className="mt-3.5">
          <NotaRoja>
            Ojo:{' '}
            {apretados
              .map((c) => `el ${dias.find((d) => d.iso === c.fecha)?.nombre ?? ''}`)
              .join(' y ')}{' '}
            se te juntan las peticiones.
          </NotaRoja>
        </div>
      )}

      {detallado && (
        <div className="mt-5 grid gap-2.5">
          {dias.map((d, i) => {
            const c = celdas[i]
            return (
              <div
                key={d.iso}
                className="flex items-center gap-3 rounded-papel bg-white/5 px-3 py-2.5 text-sobre-pared"
              >
                <span className="w-[72px] flex-none text-[13.5px] font-bold">
                  {d.abreviatura} {d.numero}
                </span>
                <span className="flex-1 text-[13px] text-sobre-pared-2">
                  Cocina {c.cocina} · Servicio {c.servicio}
                </span>
                {hayChoque(c) && (
                  <span className="rounded-full bg-rojo px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-white uppercase">
                    Se juntan
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
