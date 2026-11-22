import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Con dominio propio (peticion.xyz) la app vive en la raíz, igual que en local.
// Si algún día se vuelve a servir desde diegohenriquez279-ctrl.github.io,
// hay que poner base: '/pedidos-de-horario/' para las compilaciones.
export default defineConfig(() => ({
  base: '/',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
}))
