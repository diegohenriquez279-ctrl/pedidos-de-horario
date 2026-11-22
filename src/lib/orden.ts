import type { Area, PeticionDeLaGerente } from './tipos'

const antesQue = (a: PeticionDeLaGerente, b: PeticionDeLaGerente) => {
  if (a.prioridad !== b.prioridad) return a.prioridad === 'emergencia'
  return a.en_fila_desde < b.en_fila_desde
}

const comparten = (a: PeticionDeLaGerente, b: PeticionDeLaGerente) =>
  a.peticion_dias.some((d) => b.peticion_dias.some((e) => e.fecha === d.fecha))

/**
 * Qué lugar lleva cada petición en la fila de su área, contando solo las que
 * se pisan en algún día. Es el mismo criterio que usa `mi_posicion` en la
 * base de datos: emergencias primero y después por orden de llegada.
 */
export function posicionesPorArea(lista: PeticionDeLaGerente[]): Map<string, number> {
  const mapa = new Map<string, number>()
  for (const p of lista) {
    const area = p.perfiles?.area
    if (!area) continue
    const delante = lista.filter(
      (o) => o.id !== p.id && o.perfiles?.area === area && comparten(o, p) && antesQue(o, p),
    ).length
    mapa.set(p.id, delante + 1)
  }
  return mapa
}

export interface CeldaDia {
  fecha: string
  cocina: number
  servicio: number
}

export function cuentaPorDia(lista: PeticionDeLaGerente[], dias: string[]): CeldaDia[] {
  return dias.map((fecha) => {
    let cocina = 0
    let servicio = 0
    for (const p of lista) {
      if (!p.peticion_dias.some((d) => d.fecha === fecha)) continue
      const area: Area | undefined = p.perfiles?.area
      if (area === 'cocina') cocina++
      else if (area === 'servicio') servicio++
    }
    return { fecha, cocina, servicio }
  })
}

export const hayChoque = (c: CeldaDia) => c.cocina >= 2 || c.servicio >= 2

/**
 * Qué semana enseñar en el tablero. Normalmente es la semana objetivo de la
 * ventana, pero el fin de semana —cuando la gerente arma el horario— esa
 * cuenta ya avanzó y las peticiones que tiene en la mano son de la semana
 * anterior. Así que manda la semana de las peticiones que hay.
 */
export function semanaDominante(lista: PeticionDeLaGerente[], porDefecto: string): string {
  const cuentas = new Map<string, number>()
  for (const p of lista) {
    if (p.prioridad === 'emergencia') continue
    cuentas.set(p.semana_inicio, (cuentas.get(p.semana_inicio) ?? 0) + 1)
  }
  if (cuentas.size === 0) return porDefecto
  return [...cuentas.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
}
