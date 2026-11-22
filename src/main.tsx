import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App'
import { ProveedorSesion } from './sesion'
import './estilos.css'

const cliente = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 15_000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={cliente}>
      <HashRouter>
        <ProveedorSesion>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#ffffff',
                color: '#1a1514',
                border: 'none',
                borderRadius: '3px',
                boxShadow: '0 9px 20px -8px rgb(0 0 0 / 0.75)',
                fontFamily: 'Karla, system-ui, sans-serif',
                fontWeight: 600,
              },
            }}
          />
        </ProveedorSesion>
      </HashRouter>
    </QueryClientProvider>
  </StrictMode>,
)
