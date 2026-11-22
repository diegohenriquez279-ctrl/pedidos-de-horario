import { Link } from 'react-router-dom'
import { CaretRight, SignOut, Users } from '@phosphor-icons/react'
import { useSesion } from '../sesion'
import { salir } from '../lib/api'
import { ETIQUETA_AREA, ETIQUETA_CONTRATO } from '../lib/tipos'
import { BarraSuperior, Boton, Contenido, Pantalla, Papel, Pestanas } from '../componentes/piezas'

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-linea py-2.5 last:border-0">
      <span className="text-[12px] font-extrabold tracking-[0.09em] text-suave uppercase">{titulo}</span>
      <span className="text-right text-[15px] font-bold">{valor}</span>
    </div>
  )
}

export default function MiCuenta() {
  const { perfil } = useSesion()
  if (!perfil) return null

  return (
    <Pantalla>
      <Contenido className="flex flex-col">
        <BarraSuperior titulo="Mi cuenta" />

        <div className="px-4 pt-4">
          <Papel>
            <Dato titulo="Nombre" valor={perfil.nombre_completo} />
            <Dato titulo="Usuario" valor={perfil.usuario} />
            <Dato titulo="Área" valor={ETIQUETA_AREA[perfil.area]} />
            <Dato titulo="Contrato" valor={ETIQUETA_CONTRATO[perfil.contrato]} />
            {perfil.rol === 'gerente' && <Dato titulo="Rol" valor="Gerente" />}
          </Papel>

          {perfil.rol === 'gerente' && (
            <Link
              to="/gerente/gente"
              className="mt-5 flex min-h-[60px] items-center gap-3 rounded-papel bg-papel px-4 py-3.5 shadow-papel transition active:translate-y-px"
            >
              <Users size={25} className="flex-none text-vino" />
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] leading-tight font-extrabold tracking-tight text-vino">
                  La gente de la tienda
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-grafito">
                  Ver quién está y sacar a quien ya se fue
                </span>
              </span>
              <CaretRight size={19} className="flex-none text-grafito opacity-70" />
            </Link>
          )}

          <p className="mt-4 px-1 text-[13px] leading-relaxed text-sobre-pared-2">
            {perfil.rol === 'gerente'
              ? 'Los motivos y los dibujos de cada papelito solo los ves vos. Nadie más de la tienda puede leerlos.'
              : 'Si algo de esto está mal, o se te olvidó la contraseña, hablá con tu gerente. Los motivos que escribís en tus papelitos solo los lee ella.'}
          </p>
        </div>

        <div className="px-4 pt-6">
          <Boton variante="fantasma" className="justify-center" onClick={() => void salir()}>
            <span className="flex w-full items-center justify-center gap-2 text-[16px] font-extrabold">
              <SignOut size={20} weight="bold" />
              Salir de mi cuenta
            </span>
          </Boton>
        </div>

        <Pestanas rol={perfil.rol} activa="/mi-cuenta" />
      </Contenido>
    </Pantalla>
  )
}
