/**
 * Traduce lo que devuelve la base de datos a algo que una persona entienda.
 * Nunca se le enseña a nadie un código ni un mensaje de Postgres.
 */
const MENSAJES: Record<string, string> = {
  // registro
  CODIGO_INVALIDO: 'Ese código no es de ninguna tienda. Pedíselo a tu gerente.',
  USUARIO_INVALIDO: 'El usuario lleva de 3 a 20 caracteres: letras, números, punto y guion bajo.',
  USUARIO_OCUPADO: 'Ese usuario ya lo tiene alguien. Probá con otro.',
  NOMBRE_INVALIDO: 'Escribí tu nombre completo.',
  AREA_INVALIDA: 'Elegí tu área.',
  CONTRATO_INVALIDO: 'Elegí tu contrato.',
  CLAVE_CORTA: 'La contraseña necesita al menos 6 caracteres.',

  // peticiones
  SIN_PERFIL: 'No encontramos tu cuenta. Cerrá sesión y volvé a entrar.',
  SIN_TIENDA: 'No estás en ningún restaurante. Poné el código del tuyo para entrar.',
  YA_TENES_TIENDA: 'Ya estás en un restaurante.',
  NO_TE_PODES_QUITAR: 'No te podés sacar a vos misma del restaurante.',
  CUENTA_INACTIVA: 'Tu cuenta está desactivada. Hablá con tu gerente.',
  VENTANA_CERRADA: 'Las peticiones ya cerraron esta semana. Volvé el lunes.',
  TEXTO_VACIO: 'Escribí qué querés pedir.',
  SIN_DIAS: 'Elegí al menos un día.',
  EMERGENCIA_UN_SOLO_DIA: 'Una emergencia es para un solo día.',
  FECHA_FUERA_DE_SEMANA: 'Esos días no son de la semana que estás pidiendo.',
  FECHA_FUERA_DE_RANGO: 'Esa fecha queda fuera de lo que se puede pedir.',
  NO_EXISTE: 'Ese papelito ya no está.',
  NO_ES_TUYA: 'Ese papelito no es tuyo.',
  YA_RESUELTA: 'Ese papelito ya lo respondió tu gerente, ya no se puede cambiar.',
  SOLO_GERENTE: 'Solo la gerente puede responder peticiones.',
  OTRA_TIENDA: 'Esa petición es de otra tienda.',
  ESTADO_INVALIDO: 'Esa respuesta no vale.',

  // sesión
  INVALID_LOGIN: 'Usuario o contraseña incorrectos.',
}

const PISTAS: [RegExp, string][] = [
  [/invalid login credentials/i, MENSAJES.INVALID_LOGIN],
  [/email.*invalid/i, 'No pudimos crear la cuenta con ese usuario. Probá con otro.'],
  [/already registered|duplicate key.*usuario|perfiles_usuario_key/i, MENSAJES.USUARIO_OCUPADO],
  [/password.*at least|should be at least/i, MENSAJES.CLAVE_CORTA],
  [/rate limit/i, 'Probá otra vez en un momento.'],
  [/failed to fetch|networkerror|load failed/i, 'Puede ser la señal. Revisá que tengás internet.'],
]

export function mensajeDeError(e: unknown): string {
  const crudo =
    typeof e === 'string'
      ? e
      : e instanceof Error
        ? e.message
        : typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : ''

  for (const clave of Object.keys(MENSAJES)) {
    if (crudo.includes(clave)) return MENSAJES[clave]
  }
  for (const [patron, mensaje] of PISTAS) {
    if (patron.test(crudo)) return mensaje
  }
  return 'Algo no salió. Probá otra vez en un momento.'
}
