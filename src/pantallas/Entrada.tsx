import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { entrar } from '../lib/api'
import { mensajeDeError } from '../lib/errores'
import { Boton, Contenido, Pantalla, Papel } from '../componentes/piezas'
import { Campo, CampoClave } from '../componentes/campos'

export default function Entrada() {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function alEnviar(e: FormEvent) {
    e.preventDefault()
    if (enviando) return
    setError(null)

    if (!usuario.trim() || !clave) {
      setError('Escribí tu usuario y tu contraseña.')
      return
    }

    setEnviando(true)
    try {
      await entrar(usuario, clave)
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Pantalla>
      <Contenido className="flex flex-col">
        <div className="px-4 pt-9">
          <div className="rotulo-cinta relative rounded-papel border border-vino-hondo bg-vino px-4 pt-5 pb-4.5 text-center text-white shadow-papel">
            <p className="text-[34px] leading-none font-extrabold tracking-[-0.035em]">
              El <span className="text-[#ff9fac]">Papelito</span>
            </p>
            <p className="mt-2.5 text-[13.5px] leading-snug text-[#ffd5db]">
              Las peticiones de horario de la tienda, sin pegar nada en la pared.
            </p>
          </div>
        </div>

        <form onSubmit={alEnviar} className="px-4 pt-8" noValidate>
          <Papel>
            <Campo
              etiqueta="Usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              placeholder="kevin.a"
            />
            <div className="-mb-2">
              <CampoClave
                etiqueta="Contraseña"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                autoComplete="current-password"
                error={error}
              />
            </div>
          </Papel>

          <div className="pt-5">
            <Boton type="submit" disabled={enviando} className="justify-center">
              <span className="w-full text-center text-[17.5px] font-extrabold tracking-tight">
                {enviando ? 'Entrando…' : 'Entrar'}
              </span>
            </Boton>
          </div>
        </form>

        <div className="mt-auto px-4 pt-10 pb-6 text-center">
          <p className="mb-0.5 text-[14px] text-sobre-pared-2">¿Todavía no tenés cuenta?</p>
          <Link
            to="/registro"
            className="inline-block min-h-11 py-2.5 text-[14px] font-bold text-[#ff9fac] underline underline-offset-[3px]"
          >
            Crear mi cuenta con el código de la tienda
          </Link>
          <p className="mt-2 text-[12.5px] leading-snug text-sobre-pared-3">
            ¿Se te olvidó la contraseña? Hablá con tu gerente.
          </p>
        </div>
      </Contenido>
    </Pantalla>
  )
}
