import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Drawer } from 'vaul'
import { toast } from 'sonner'
import { UserMinus } from '@phosphor-icons/react'
import { useSesion } from '../../sesion'
import { genteDeLaTienda, quitarDelRestaurante } from '../../lib/api'
import { mensajeDeError } from '../../lib/errores'
import { ETIQUETA_AREA, ETIQUETA_CONTRATO_CORTA, type Area, type Perfil } from '../../lib/tipos'
import {
  BarraSuperior,
  Boton,
  Cargando,
  Chip,
  Contenido,
  ErrorPantalla,
  Pantalla,
  Papel,
  Pestanas,
} from '../../componentes/piezas'

export default function MiGente() {
  const qc = useQueryClient()
  const { perfil } = useSesion()
  const [aQuitar, setAQuitar] = useState<Perfil | null>(null)

  const gente = useQuery({ queryKey: ['gente'], queryFn: genteDeLaTienda })

  const quitar = useMutation({
    mutationFn: (id: string) => quitarDelRestaurante(id),
    onSuccess: async () => {
      const nombre = aQuitar?.nombre_completo ?? 'La persona'
      setAQuitar(null)
      await qc.invalidateQueries()
      toast(`${nombre} ya no está en el restaurante`)
    },
    onError: (e) => {
      setAQuitar(null)
      toast(mensajeDeError(e))
    },
  })

  const todos = gente.data ?? []
  const porArea = (area: Area) => todos.filter((p) => p.area === area)

  return (
    <Pantalla>
      <Contenido className="flex flex-col">
        <BarraSuperior
          titulo="La gente de la tienda"
          volver="/mi-cuenta"
          derecha={
            todos.length > 0 ? (
              <span className="text-[12px] text-sobre-pared-2">{todos.length} personas</span>
            ) : undefined
          }
        />

        {gente.isLoading && <Cargando cuantos={2} />}
        {gente.isError && <ErrorPantalla alReintentar={() => void gente.refetch()} />}

        {gente.data && (
          <div className="px-4 pt-3 pb-2">
            {(['cocina', 'servicio'] as Area[]).map((area) => {
              const dela = porArea(area)
              if (dela.length === 0) return null
              return (
                <div key={area} className="mb-5">
                  <h2 className="mb-3 text-[15px] font-extrabold tracking-tight text-sobre-pared">
                    {ETIQUETA_AREA[area]}
                    <span className="ml-1.5 font-medium text-sobre-pared-2">· {dela.length}</span>
                  </h2>

                  {dela.map((p, i) => (
                    <div key={p.id} className={i % 2 === 0 ? 'gira-1 mb-3.5' : 'gira-2 mb-3.5'}>
                      <Papel cinta={i === 0} cintaIzq className="px-3.5 py-3">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[15.5px] leading-snug font-extrabold tracking-tight">
                              {p.nombre_completo}
                            </h3>
                            <p className="mt-0.5 text-[12.5px] text-suave">{p.usuario}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Chip>{ETIQUETA_CONTRATO_CORTA[p.contrato]}</Chip>
                              {p.rol === 'gerente' && <Chip>Gerente</Chip>}
                              {p.id === perfil?.id && <Chip>Vos</Chip>}
                            </div>
                          </div>
                          {p.id !== perfil?.id && (
                            <button
                              type="button"
                              onClick={() => setAQuitar(p)}
                              aria-label={`Quitar a ${p.nombre_completo} del restaurante`}
                              className="grid size-11 flex-none place-items-center rounded-papel border border-[#e6b9bf] text-rojo-hondo"
                            >
                              <UserMinus size={19} weight="bold" />
                            </button>
                          )}
                        </div>
                      </Papel>
                    </div>
                  ))}
                </div>
              )
            })}

            <p className="px-1 pb-2 text-[12.5px] leading-relaxed text-sobre-pared-3">
              Quitar a alguien no borra su cuenta: la suelta del restaurante. Si vuelve, entra otra vez
              con el código de la tienda y conserva su usuario.
            </p>
          </div>
        )}

        <Drawer.Root open={!!aQuitar} onOpenChange={(o) => !o && setAQuitar(null)}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60" />
            <Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 mx-auto max-w-[520px] rounded-t-2xl bg-white px-4.5 pt-2.5 pb-5 shadow-hoja">
              <div className="mx-auto mb-3.5 h-1 w-11 rounded-full bg-linea" />
              <Drawer.Title className="mb-2 text-[19px] leading-snug font-extrabold tracking-tight">
                ¿Sacar a {aQuitar?.nombre_completo.split(' ')[0]} del restaurante?
              </Drawer.Title>
              <Drawer.Description className="mb-4 text-[14.5px] leading-relaxed text-grafito">
                Su cuenta no se borra, pero deja de ser de esta tienda: no va a poder pedir nada y sus
                papelitos que estaban en la fila se quitan. Lo que ya respondiste se queda en Resueltas.
                Si vuelve, entra de nuevo con el código.
              </Drawer.Description>
              <div className="grid gap-2.5">
                <Boton
                  onClick={() => aQuitar && quitar.mutate(aQuitar.id)}
                  disabled={quitar.isPending}
                  className="justify-center"
                >
                  <span className="w-full text-center text-[17px] font-extrabold">
                    {quitar.isPending ? 'Sacando…' : 'Sí, sacarla del restaurante'}
                  </span>
                </Boton>
                <button
                  type="button"
                  onClick={() => setAQuitar(null)}
                  className="min-h-[50px] w-full rounded-papel border border-borde text-[15px] font-bold text-grafito"
                >
                  Mejor no
                </button>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        <Pestanas rol="gerente" activa="/mi-cuenta" />
      </Contenido>
    </Pantalla>
  )
}
