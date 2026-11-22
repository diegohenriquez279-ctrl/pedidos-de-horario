import { Navigate, Route, Routes } from 'react-router-dom'
import { useSesion } from './sesion'
import { salir } from './lib/api'
import { Boton, Cargando, Centro, Pantalla } from './componentes/piezas'
import Entrada from './pantallas/Entrada'
import Registro from './pantallas/Registro'
import ElegirTienda from './pantallas/ElegirTienda'
import Inicio from './pantallas/Inicio'
import NuevaPeticion from './pantallas/NuevaPeticion'
import MisPapelitos from './pantallas/MisPapelitos'
import MiCuenta from './pantallas/MiCuenta'
import Pendientes from './pantallas/gerente/Pendientes'
import Detalle from './pantallas/gerente/Detalle'
import Resueltas from './pantallas/gerente/Resueltas'
import Semana from './pantallas/gerente/Semana'
import MiGente from './pantallas/gerente/MiGente'

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Pantalla>
      <Centro>
        <div>
          <h1 className="mb-2 text-[21px] font-extrabold tracking-tight text-sobre-pared">{titulo}</h1>
          <p className="mx-auto mb-6 max-w-[32ch] text-[14.5px] leading-relaxed text-sobre-pared-2">{texto}</p>
          <Boton variante="papel" className="justify-center" onClick={() => void salir()}>
            <span className="w-full text-center text-[17px] font-extrabold">Salir</span>
          </Boton>
        </div>
      </Centro>
    </Pantalla>
  )
}

export default function App() {
  const { perfil, cargando, haySesion } = useSesion()

  if (cargando) {
    return (
      <Pantalla>
        <Cargando cuantos={2} />
      </Pantalla>
    )
  }

  if (!haySesion) {
    return (
      <Routes>
        <Route path="/registro" element={<Registro />} />
        <Route path="*" element={<Entrada />} />
      </Routes>
    )
  }

  if (!perfil) {
    return (
      <Aviso
        titulo="No encontramos tu cuenta"
        texto="Tu sesión está abierta pero no tiene un perfil en esta tienda. Salí y volvé a entrar; si sigue igual, hablá con tu gerente."
      />
    )
  }

  // Tiene cuenta pero nadie la tiene en su tienda: la gerente la sacó, o
  // todavía no entró a ninguna.
  if (!perfil.tienda_id) {
    return <ElegirTienda />
  }

  if (!perfil.activo) {
    return (
      <Aviso
        titulo="Tu cuenta está desactivada"
        texto="Ya no podés mandar peticiones desde aquí. Si creés que es un error, hablá con tu gerente."
      />
    )
  }

  if (perfil.rol === 'gerente') {
    return (
      <Routes>
        <Route path="/gerente" element={<Pendientes />} />
        <Route path="/gerente/semana" element={<Semana />} />
        <Route path="/gerente/resueltas" element={<Resueltas />} />
        <Route path="/gerente/peticion/:id" element={<Detalle />} />
        <Route path="/gerente/gente" element={<MiGente />} />
        <Route path="/mi-cuenta" element={<MiCuenta />} />
        <Route path="*" element={<Navigate to="/gerente" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/nueva" element={<NuevaPeticion prioridad="normal" />} />
      <Route path="/emergencia" element={<NuevaPeticion prioridad="emergencia" />} />
      <Route path="/papelito/:id" element={<NuevaPeticion prioridad="normal" editando />} />
      <Route path="/mis-papelitos" element={<MisPapelitos />} />
      <Route path="/mi-cuenta" element={<MiCuenta />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
