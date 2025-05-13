import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx';
import { Toaster as Sonner } from "@/components/ui/sonner";
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Sonner />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
