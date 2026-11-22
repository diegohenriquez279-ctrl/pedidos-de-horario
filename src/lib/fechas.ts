import { addDays, differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

/** 'YYYY-MM-DD' -> Date local (sin saltos de día por zona horaria). */
export const aFecha = (iso: string) => parseISO(iso)

export const aISO = (d: Date) => format(d, 'yyyy-MM-dd')

export interface DiaDeSemana {
  iso: string
  abreviatura: string
  nombre: string
  numero: string
  largo: string
}

/** Los siete días de la semana que empieza en `lunesISO`. */
export function diasDeSemana(lunesISO: string): DiaDeSemana[] {
  const lunes = aFecha(lunesISO)
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(lunes, i)
    return {
      iso: aISO(d),
      abreviatura: format(d, 'EEE', { locale: es }).replace('.', ''),
      nombre: format(d, 'EEEE', { locale: es }),
      numero: format(d, 'd'),
      largo: format(d, "EEEE d 'de' MMMM", { locale: es }),
    }
  })
}

/** Del día de hoy hasta `hastaISO`, para la emergencia. */
export function diasDesdeHoy(hoyISO: string, hastaISO: string, maximo = 14): DiaDeSemana[] {
  const hoy = aFecha(hoyISO)
  const total = Math.min(differenceInCalendarDays(aFecha(hastaISO), hoy) + 1, maximo)
  return Array.from({ length: Math.max(total, 1) }, (_, i) => {
    const d = addDays(hoy, i)
    return {
      iso: aISO(d),
      abreviatura: i === 0 ? 'Hoy' : format(d, 'EEE', { locale: es }).replace('.', ''),
      nombre: format(d, 'EEEE', { locale: es }),
      numero: format(d, 'd'),
      largo: format(d, "EEEE d 'de' MMMM", { locale: es }),
    }
  })
}

/** 'Mié 2' */
export const diaCorto = (iso: string) => {
  const d = aFecha(iso)
  return `${format(d, 'EEE', { locale: es }).replace('.', '')} ${format(d, 'd')}`
}

/** 'Jue 3 dic' */
export const diaConMes = (iso: string) => {
  const d = aFecha(iso)
  return `${format(d, 'EEE', { locale: es }).replace('.', '')} ${format(d, 'd')} ${format(d, 'MMM', { locale: es }).replace('.', '')}`
}

/** '30 nov al 6 dic' */
export const rangoSemana = (inicioISO: string, finISO: string) => {
  const a = aFecha(inicioISO)
  const b = aFecha(finISO)
  const mes = (d: Date) => format(d, 'MMM', { locale: es }).replace('.', '')
  return `${format(a, 'd')} ${mes(a)} al ${format(b, 'd')} ${mes(b)}`
}

/** 'Lun 30 nov' */
export const diaTitulo = (iso: string) => {
  const d = aFecha(iso)
  const abrev = format(d, 'EEE', { locale: es }).replace('.', '')
  return `${abrev.charAt(0).toUpperCase()}${abrev.slice(1)} ${format(d, 'd')} ${format(d, 'MMM', { locale: es }).replace('.', '')}`
}

/** 'hace 2 h', o 'recién' si acaba de pasar */
export const hace = (iso: string) => {
  const segundos = (Date.now() - new Date(iso).getTime()) / 1000
  if (segundos < 60) return 'recién'
  return `hace ${formatDistanceToNowStrict(new Date(iso), { locale: es })}`
}

export const horaCorta = (iso: string) => {
  const d = new Date(iso)
  const meridiano = d.getHours() < 12 ? 'a. m.' : 'p. m.'
  return `${format(d, "d 'de' MMMM", { locale: es })}, ${format(d, 'h:mm')} ${meridiano}`
}

export const conMayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
