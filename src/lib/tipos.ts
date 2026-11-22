export type Area = 'cocina' | 'servicio'
export type Contrato = 'tiempo_completo' | 'por_hora'
export type Rol = 'empleado' | 'gerente'
export type Prioridad = 'normal' | 'emergencia'
export type Tipo = 'dia_libre' | 'turno' | 'otro'
export type Estado = 'pendiente' | 'aprobada' | 'rechazada'

export interface Perfil {
  id: string
  /** null cuando la gerente lo sacó del restaurante: la cuenta vive, la tienda no. */
  tienda_id: string | null
  usuario: string
  nombre_completo: string
  area: Area
  contrato: Contrato
  rol: Rol
  activo: boolean
  creado_en: string
}

export interface Peticion {
  id: string
  tienda_id: string
  empleado_id: string
  prioridad: Prioridad
  tipo: Tipo | null
  semana_inicio: string
  texto: string
  dibujo_path: string | null
  estado: Estado
  creada_en: string
  en_fila_desde: string
  editada_en: string | null
  comentario_gerente: string | null
  resuelta_en: string | null
  resuelta_por: string | null
}

export interface PeticionConDias extends Peticion {
  peticion_dias: { fecha: string }[]
}

export interface PeticionDeLaGerente extends PeticionConDias {
  perfiles: {
    nombre_completo: string
    area: Area
    contrato: Contrato
  } | null
}

export interface EstadoVentana {
  abierta: boolean
  hoy: string
  semana_inicio: string
  semana_fin: string
  zona: string
}

export interface Choque {
  fecha: string
  cuantas: number
}

/** Mínimo para que `createClient` tipe lo que usamos sin generar todo el esquema. */
export interface Database {
  public: {
    Tables: {
      perfiles: { Row: Perfil; Insert: never; Update: Partial<Perfil> }
      peticiones: { Row: Peticion; Insert: never; Update: never }
      peticion_dias: { Row: { peticion_id: string; fecha: string }; Insert: never; Update: never }
      tiendas: {
        Row: { id: string; nombre: string; zona_horaria: string; creada_en: string }
        Insert: never
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      area_t: Area
      contrato_t: Contrato
      rol_t: Rol
      prioridad_t: Prioridad
      tipo_t: Tipo
      estado_t: Estado
    }
    CompositeTypes: Record<string, never>
  }
}

export const ETIQUETA_AREA: Record<Area, string> = {
  cocina: 'Cocina',
  servicio: 'Servicio',
}

export const ETIQUETA_CONTRATO: Record<Contrato, string> = {
  tiempo_completo: 'Tiempo completo',
  por_hora: 'Por hora',
}

export const ETIQUETA_CONTRATO_CORTA: Record<Contrato, string> = {
  tiempo_completo: 'T. completo',
  por_hora: 'Por hora',
}

// `turno` es *pedir* un turno, no cambiar uno ya asignado: cuando se pide,
// el horario de esa semana todavía no existe.
export const ETIQUETA_TIPO: Record<Tipo, string> = {
  dia_libre: 'Día libre',
  turno: 'Petición de turno',
  otro: 'Otra cosa',
}
