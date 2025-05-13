import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from './components/theme-provider';
import './index.css'

// Importações do React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Opcional, mas útil

// Crie uma instância do QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos, por exemplo
      refetchOnWindowFocus: false, // Ajuste conforme necessidade
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Sonner />
      </AuthProvider>
    </BrowserRouter>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
)
