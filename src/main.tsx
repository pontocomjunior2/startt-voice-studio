import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from './components/theme-provider';
import './index.css'
import { StagewiseToolbar } from '@stagewise/toolbar-react';

// Importações do React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
    </QueryClientProvider>
  </React.StrictMode>,
)

// Inicializa o Stagewise Toolbar em modo de desenvolvimento
if (process.env.NODE_ENV === 'development') {
  const toolbarRootEl = document.createElement('div');
  toolbarRootEl.id = 'stagewise-toolbar-root';
  document.body.appendChild(toolbarRootEl);
  
  const toolbarRoot = ReactDOM.createRoot(toolbarRootEl);
  toolbarRoot.render(
    <React.StrictMode>
      <StagewiseToolbar />
    </React.StrictMode>
  );
}
