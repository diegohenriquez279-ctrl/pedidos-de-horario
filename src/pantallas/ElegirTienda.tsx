import { useState } from 'react'
import { Check } from '@phosphor-icons/react'
import { useSesion } from '../sesion'
import { salir, unirmeATienda, verificarCodigo } from '../lib/api'
import { mensajeDeError } from '../lib/errores'
import { normalizarCodigo } from '../lib/supabase'
import { Boton, Contenido, Pantalla, Papel } from '../componentes/piezas'
import { Campo } from '../componentes/campos'

/**
 * Para quien tiene cuenta pero no tiene restaurante: alguien que la gerente
 * sacó, o que llegó a otra tienda. La cuenta y el historial se quedan; lo
 * único que hace falta es el código del lugar donde va a trabajar.
 */
export default function ElegirTienda() {
  const { refrescar, perfil } = useSesion()
  const [codigo, setCodigo] = useState('')
  const [tienda, setTienda] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  async function revisar(valor: string) {
    setCodigo(valor)
    setError(null)
    const limpio = normalizarCodigo(valor)
    if (limpio.length < 6) {
      setTienda(null)
      return
    }
    try {
      setTienda(await verificarCodigo(limpio))
    } catch {
      setTienda(null)
    }
  }

  async function entrar() {
    setError(null)
    setEntrando(true)
    try {
      await unirmeATienda(codigo)
      await refrescar()
    } catch (e) {
      setError(mensajeDeError(e))
      setEntrando(false)
    }
  }

  return (
    <Pantalla>
      <Contenido className="flex flex-col">
        <div className="px-4 pt-9">
          <div className="rotulo-cinta relative rounded-papel border border-vino-hondo bg-vino px-4 pt-5 pb-4.5 text-center text-white shadow-papel">
            <p className="text-[27px] leading-tight font-extrabold tracking-[-0.03em]">
              Elegí tu restaurante
            </p>
            <p className="mt-2.5 text-[13.5px] leading-snug text-[#ffd5db]">
              Tu cuenta sigue siendo tuya{perfil ? `, ${perfil.nombre_completo.split(' ')[0]}` : ''}.
              Lo único que falta es decir en qué tienda estás trabajando.
            </p>
          </div>
        </div>

        <div className="px-4 pt-8">
          <Papel>
            <div className="-mb-4">
              <Campo
                etiqueta="Código de la tienda"
                value={codigo}
                onChange={(e) => void revisar(e.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={14}
                placeholder="RRML0000"
                className="w-full min-h-[58px] rounded-papel border-[1.5px] border-borde bg-white px-3.5 py-3 text-center text-[23px] font-extrabold tracking-[0.42em] text-tinta uppercase placeholder:tracking-[0.2em] placeholder:text-[#c9c1be] focus:border-rojo focus:outline-none focus:ring-[3px] focus:ring-rojo/20"
                ayuda="Te lo da la gerente del lugar donde vas a trabajar."
              />
              {tienda && (
                <p className="mano -mt-2 mb-4 flex items-start gap-2 text-[18.5px] font-bold text-rojo">
                  <Check size={18} weight="bold" className="mt-1 flex-none" />
                  Te estás uniendo a {tienda}
                </p>
              )}
            </div>
          </Papel>
        </div>

        {error && (
          <p className="mx-4 mt-4 rounded-papel border-[1.5px] border-rojo bg-[#fff4f5] px-3 py-2.5 text-[13.5px] leading-snug font-semibold text-rojo-hondo">
            {error}
          </p>
        )}

        <div className="px-4 pt-5">
          <Boton
            onClick={entrar}
            disabled={!tienda || entrando}
            variante={tienda ? 'rojo' : 'apagado'}
            className="justify-center"
          >
            <span className="w-full text-center text-[17.5px] font-extrabold tracking-tight">
              {entrando ? 'Entrando…' : 'Entrar a esta tienda'}
            </span>
          </Boton>
        </div>

        <div className="mt-auto px-4 pt-10 pb-6 text-center">
          <p className="mb-2 text-[13px] leading-relaxed text-sobre-pared-2">
            Si ya no trabajás en ninguno de estos lugares, podés dejar la cuenta cerrada y listo.
          </p>
          <button
            type="button"
            onClick={() => void salir()}
            className="min-h-11 py-2.5 text-[14px] font-bold text-[#ff9fac] underline underline-offset-[3px]"
          >
            Salir de mi cuenta
          </button>
        </div>
      </Contenido>
    </Pantalla>
  )
}
