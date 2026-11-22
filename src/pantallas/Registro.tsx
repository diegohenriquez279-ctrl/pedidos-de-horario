import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Info } from '@phosphor-icons/react'
import { registrarse, verificarCodigo } from '../lib/api'
import { mensajeDeError } from '../lib/errores'
import { normalizarCodigo } from '../lib/supabase'
import type { Area, Contrato } from '../lib/tipos'
import { BarraSuperior, Boton, Contenido, Etiqueta, Pantalla, Papel } from '../componentes/piezas'
import { Campo, CampoClave, Opcion } from '../componentes/campos'

const USUARIO_VALIDO = /^[a-z0-9._]{3,20}$/

export default function Registro() {
  const navegar = useNavigate()
  const [paso, setPaso] = useState(1)

  const [codigo, setCodigo] = useState('')
  const [tienda, setTienda] = useState<string | null>(null)
  const [revisandoCodigo, setRevisandoCodigo] = useState(false)

  const [nombre, setNombre] = useState('')
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')

  const [area, setArea] = useState<Area | null>(null)
  const [contrato, setContrato] = useState<Contrato | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Comprueba el código mientras se escribe, sin pedir botón.
  useEffect(() => {
    const limpio = normalizarCodigo(codigo)
    if (limpio.length < 6) {
      setTienda(null)
      return
    }
    let vivo = true
    setRevisandoCodigo(true)
    const t = setTimeout(async () => {
      try {
        const nombreTienda = await verificarCodigo(limpio)
        if (vivo) setTienda(nombreTienda)
      } catch {
        if (vivo) setTienda(null)
      } finally {
        if (vivo) setRevisandoCodigo(false)
      }
    }, 350)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [codigo])

  const usuarioLimpio = usuario.trim().toLowerCase()

  function siguiente() {
    setError(null)
    if (paso === 1) {
      if (!tienda) {
        setError('Ese código no es de ninguna tienda. Pedíselo a tu gerente.')
        return
      }
      setPaso(2)
      return
    }
    if (paso === 2) {
      if (nombre.trim().length < 3) return setError('Escribí tu nombre completo.')
      if (!USUARIO_VALIDO.test(usuarioLimpio))
        return setError('El usuario lleva de 3 a 20 caracteres: letras, números, punto y guion bajo.')
      if (clave.length < 6) return setError('La contraseña necesita al menos 6 caracteres.')
      setPaso(3)
    }
  }

  async function crear() {
    setError(null)
    if (!area) return setError('Elegí tu área.')
    if (!contrato) return setError('Elegí tu contrato.')

    setEnviando(true)
    try {
      await registrarse({
        codigo,
        usuario: usuarioLimpio,
        clave,
        nombre_completo: nombre,
        area,
        contrato,
      })
      // al entrar, App cambia solo de pantalla
    } catch (err) {
      setError(mensajeDeError(err))
      setEnviando(false)
    }
  }

  return (
    <Pantalla>
      <Contenido className="flex flex-col">
        <BarraSuperior
          titulo={paso === 1 ? 'Crear mi cuenta' : paso === 2 ? 'Tus datos' : 'Dónde trabajás'}
          volver={() => (paso === 1 ? navegar('/') : setPaso(paso - 1))}
        />

        <p className="px-4 pb-1.5 text-[11.5px] font-bold tracking-[0.12em] text-sobre-pared-2 uppercase">
          Paso {paso} de 3
        </p>
        <div className="flex gap-1.5 px-4 pb-3">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`h-1 flex-1 rounded-full ${n <= paso ? 'bg-rojo' : 'bg-sobre-pared/20'}`}
            />
          ))}
        </div>

        <div className="px-4 pt-3.5">
          <Papel>
            {paso === 1 && (
              <div className="-mb-4">
                <Campo
                  etiqueta="Código de la tienda"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={14}
                  placeholder="RRML0000"
                  className="w-full min-h-[58px] rounded-papel border-[1.5px] border-borde bg-white px-3.5 py-3 text-center text-[23px] font-extrabold tracking-[0.42em] text-tinta uppercase placeholder:tracking-[0.2em] placeholder:text-[#c9c1be] focus:border-rojo focus:outline-none focus:ring-[3px] focus:ring-rojo/20"
                  ayuda="Te lo da tu gerente. Es el mismo para toda la tienda."
                />
                {tienda && (
                  <p className="mano -mt-2 mb-4 flex items-start gap-2 text-[18.5px] font-bold text-rojo">
                    <Check size={18} weight="bold" className="mt-1 flex-none" />
                    Te estás uniendo a {tienda}
                  </p>
                )}
                {!tienda && !revisandoCodigo && normalizarCodigo(codigo).length >= 6 && (
                  <p className="-mt-2 mb-4 text-[12.5px] font-semibold text-rojo-hondo">
                    Ese código no es de ninguna tienda. Revisalo con tu gerente.
                  </p>
                )}
              </div>
            )}

            {paso === 2 && (
              <div className="-mb-4">
                <Campo
                  etiqueta="Tu nombre completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoComplete="name"
                  placeholder="Kevin Alvarado"
                  ayuda="Así te va a ver tu gerente en su lista."
                />
                <Campo
                  etiqueta="Usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  placeholder="kevin.a"
                  ayuda="De 3 a 20 caracteres: letras, números, punto y guion bajo."
                />
                <CampoClave
                  etiqueta="Contraseña"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  autoComplete="new-password"
                  ayuda="Mínimo 6 caracteres. Apuntala en algún lado."
                />
              </div>
            )}

            {paso === 3 && (
              <>
                <Etiqueta>Tu área</Etiqueta>
                <div className="mb-4 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Tu área">
                  <Opcion puesta={area === 'cocina'} titulo="Cocina" onClick={() => setArea('cocina')} />
                  <Opcion puesta={area === 'servicio'} titulo="Servicio" onClick={() => setArea('servicio')} />
                </div>
                <Etiqueta>Tu contrato</Etiqueta>
                <div className="grid gap-2.5" role="radiogroup" aria-label="Tu contrato">
                  <Opcion
                    puesta={contrato === 'tiempo_completo'}
                    titulo="Tiempo completo"
                    bajada="44 horas: un día de descanso y uno de 4 horas."
                    onClick={() => setContrato('tiempo_completo')}
                  />
                  <Opcion
                    puesta={contrato === 'por_hora'}
                    titulo="Por hora"
                    bajada="Sin mínimo de días."
                    onClick={() => setContrato('por_hora')}
                  />
                </div>
                <p className="mt-3.5 text-[12.5px] leading-snug text-suave">
                  Esto solo le sirve a tu gerente para cuadrar el horario.
                </p>
              </>
            )}
          </Papel>
        </div>

        {error && (
          <p className="mx-4 mt-4 rounded-papel border-[1.5px] border-rojo bg-[#fff4f5] px-3 py-2.5 text-[13.5px] leading-snug font-semibold text-rojo-hondo">
            {error}
          </p>
        )}

        <div className="px-4 pt-5">
          {paso < 3 ? (
            <Boton
              onClick={siguiente}
              disabled={paso === 1 && !tienda}
              variante={paso === 1 && !tienda ? 'apagado' : 'rojo'}
              className="justify-center"
            >
              <span className="w-full text-center text-[17.5px] font-extrabold tracking-tight">Siguiente</span>
            </Boton>
          ) : (
            <Boton onClick={crear} disabled={enviando} className="justify-center">
              <span className="w-full text-center text-[17.5px] font-extrabold tracking-tight">
                {enviando ? 'Creando…' : 'Crear mi cuenta'}
              </span>
            </Boton>
          )}
        </div>

        {paso === 1 && (
          <div className="mt-auto px-4 pt-8 pb-6">
            <p className="mano flex items-start gap-2 rounded-papel bg-papel px-3 py-2.5 text-[18px] text-rojo-hondo shadow-[0_5px_12px_-6px_rgb(0_0_0/0.8)]">
              <Info size={18} weight="bold" className="mt-0.5 flex-none" />
              El código nunca se muestra en la app. Solo se comprueba.
            </p>
          </div>
        )}
      </Contenido>
    </Pantalla>
  )
}
