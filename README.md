# El Papelito

Una app web para pedir días libres y cambios de turno en un restaurante, pensada para el celular.

En la tienda, las peticiones de horario llegaban en **papelitos pegados en la pared**, cerca de la
oficina. La gerente los recogía, los leía uno por uno y los cruzaba de cabeza con sus dos planes de
trabajo —cocina y servicio— para que no le descuadrara ningún día. Y, de paso, cualquiera que pasara
podía leer los motivos de los demás.

Esta app es esa pared, pero ordenada y privada.

## Qué resuelve

- **Una fila justa y visible.** Cada petición ocupa un lugar por día y por área, por orden de llegada.
  Las emergencias van arriba. Cambiar los días te manda al final de esa fila, para que la edición no
  sirva para ganarle el turno a nadie.
- **Los motivos son privados.** El texto y el dibujo de cada petición solo los ven quien la escribió y
  la gerente de su tienda. No lo decide la interfaz: lo garantiza Postgres con RLS.
- **Los choques saltan a la vista.** La gerente ve la semana por día y por área, con los días apretados
  marcados, antes de responder nada.
- **La app no decide.** No arma el horario ni rechaza sola. Ordena, avisa y deja la decisión a la
  gerente.

## Cómo funciona

| | |
|---|---|
| **Entrar** | Usuario y contraseña. No se pide correo a nadie. |
| **Crear cuenta** | Hace falta el código de la tienda, que nunca se puede leer desde la página: solo se comprueba. |
| **Ventana** | Se puede pedir de lunes 00:00 a viernes 11:59 p. m., hora de la tienda. El fin de semana cierra, porque es cuando se arma el horario. Lo valida el servidor, no el navegador. |
| **Normal** | Texto libre, uno o más días de la semana siguiente, tipo opcional y dibujo opcional. |
| **Emergencia** | Un solo día, de hoy al domingo de la otra semana, con una confirmación antes de mandarla. |
| **Dibujo** | Lienzo para el dedo, con trazo de marcador. Se guarda en un bucket privado. |

## Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4** con tokens propios
- **Supabase**: Postgres con RLS, Auth, Storage y una Edge Function
- **Radix UI** (controles accesibles), **Vaul** (hojas inferiores), **Sonner** (avisos),
  **Motion**, **Phosphor Icons**, **TanStack Query**, **date-fns**, **perfect-freehand**
- **GitHub Pages** con GitHub Actions

Sin servidor propio y con costo $0.

## Decisiones que vale la pena contar

**Escribir solo pasa por funciones.** No hay políticas de `insert`, `update` ni `delete` sobre
`peticiones`. Todo entra por funciones `security definer` que validan la ventana, el dueño, el estado y
el rango de fechas. Un cliente con el token de un empleado no puede insertar una fila a mano: lo
comprobamos, y devuelve `42501`.

**Los ayudantes internos no son API.** `soy_gerente()`, `mi_tienda()` y compañía viven en el esquema
`app`, que PostgREST no publica. Las políticas los llaman con nombre completo; desde fuera no existen.

**El registro no manda correos.** Supabase necesita un correo por usuario, así que se arma uno interno
con un dominio reservado que nunca puede existir. Una Edge Function crea la cuenta ya confirmada con la
llave de servicio, que vive en Supabase y nunca entra al repositorio ni al navegador.

**La letra manuscrita se usa con regla.** Solo para lo que escribió una persona: el motivo de la
petición y el comentario de la gerente. Todo lo demás es tipografía limpia.

## Cómo correrlo

```bash
npm install
cp .env.example .env.local   # poné la URL y la llave publishable de tu proyecto
npm run dev
```

Las migraciones están en `supabase/migrations/`, en orden. Se aplican con la CLI de Supabase o
pegándolas en el editor de SQL. Lo que **no** está aquí, a propósito: la tienda, su código de acceso y
cualquier dato de personas.

Para publicar, el repositorio necesita dos *variables* (no secretos, son públicas por diseño):
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Qué queda fuera

Generar el horario, validar las reglas de contrato, notificaciones y recuperar la contraseña sin ayuda.
La app hace una cosa: recoger las peticiones y ordenarlas.
