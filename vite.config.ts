import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// En GitHub Pages la app vive en /<nombre-del-repo>/.
// En local, en la raíz.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/pedidos-de-horario/' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
}))
