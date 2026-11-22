import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Drawer } from 'vaul'
import { toast } from 'sonner'
import { eliminarPeticion, estadoVentana, misPeticiones } from '../lib/api'
import { mensajeDeError } from '../lib/errores'
import {
  BarraSuperior,
  Boton,
  Cargando,
  Contenido,
  ErrorPantalla,
  Pantalla,
  Pestanas,
  Vacio,
} from '../componentes/piezas'
import { Papelito } from '../componentes/Papelito'

export default function MisPapelitos() {
  const navegar = useNavigate()
  const qc = useQueryClient()
  const [aBorrar, setABorrar] = useState<string | null>(null)

  const ventana = useQuery({ queryKey: ['ventana'], queryFn: estadoVentana })
  const mias = useQuery({ queryKey: ['mis-peticiones'], queryFn: misPeticiones })

  const borrar = useMutation({
    mutationFn: (id: string) => eliminarPeticion(id),
    onSuccess: async () => {
      setABorrar(null)
      await qc.invalidateQueries()
      toast('Lo quitamos de la pared')
    },
    onError: (e) => {
      setABorrar(null)
      toast(mensajeDeError(e))
    },
  })

  const abierta = ventana.data?.abierta ?? false

  return (
    <Pantalla>
      <Contenido className="flex flex-col">
        <BarraSuperior titulo="Mis papelitos" />

        {mias.isLoading && <Cargando />}
        {mias.isError && <ErrorPantalla alReintentar={() => void mias.refetch()} />}

        {mias.data && mias.data.length === 0 && (
          <Vacio
            titulo="Todavía no has pedido nada"
            texto="Cuando escribás tu primer papelito, te va a aparecer aquí con el lugar que te tocó en la fila."
            accion={
              abierta ? (
                <Boton className="justify-center" onClick={() => navegar('/nueva')}>
                  <span className="w-full text-center text-[17px] font-extrabold">Escribir un papelito</span>
                </Boton>
              ) : undefined
            }
          />
        )}

        {mias.data && mias.data.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            {mias.data.map((p, i) => (
              <Papelito
                key={p.id}
                peticion={p}
                gira={((i % 3) + 1) as 1 | 2 | 3}
                alEditar={
                  abierta && p.estado === 'pendiente' ? () => navegar(`/papelito/${p.id}`) : undefined
                }
                alBorrar={abierta && p.estado === 'pendiente' ? () => setABorrar(p.id) : undefined}
              />
            ))}
            {!abierta && (
              <p className="px-1 pb-2 text-center text-[12.5px] leading-snug text-sobre-pared-3">
                El fin de semana no se pueden cambiar ni quitar. El lunes se vuelve a abrir.
              </p>
            )}
          </div>
        )}

        <Drawer.Root open={!!aBorrar} onOpenChange={(o) => !o && setABorrar(null)}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60" />
            <Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 mx-auto max-w-[520px] rounded-t-2xl bg-white px-4.5 pt-2.5 pb-5 shadow-hoja">
              <div className="mx-auto mb-3.5 h-1 w-11 rounded-full bg-linea" />
              <Drawer.Title className="mb-2 text-[19px] leading-snug font-extrabold tracking-tight">
                ¿Quitar este papelito?
              </Drawer.Title>
              <Drawer.Description className="mb-4 text-[14.5px] leading-relaxed text-grafito">
                Se borra de verdad, con su dibujo, y pierde el lugar que tenía en la fila. Esto no se puede
                deshacer.
              </Drawer.Description>
              <div className="grid gap-2.5">
                <Boton
                  onClick={() => aBorrar && borrar.mutate(aBorrar)}
                  disabled={borrar.isPending}
                  className="justify-center"
                >
                  <span className="w-full text-center text-[17px] font-extrabold">
                    {borrar.isPending ? 'Quitando…' : 'Sí, quitarlo'}
                  </span>
                </Boton>
                <button
                  type="button"
                  onClick={() => setABorrar(null)}
                  className="min-h-[50px] w-full rounded-papel border border-borde text-[15px] font-bold text-grafito"
                >
                  Mejor no
                </button>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        <Pestanas rol="empleado" activa="/mis-papelitos" />
      </Contenido>
    </Pantalla>
  )
}
