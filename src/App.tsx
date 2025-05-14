import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/admin/admin-dashboard-page.tsx';
import AdminLocutoresPage from './pages/admin/AdminLocutoresPage';
import AdminUsuariosPage from './pages/admin/AdminUsuariosPage';
import ProtectedRoute from './components/ProtectedRoute';
import AuthRedirector from './components/AuthRedirector';
import AppLayout from './components/layout/AppLayout';
import { useAuth } from './contexts/AuthContext';
import NotFoundPage from './pages/NotFoundPage';

// Novas páginas do cliente
import GravarLocucaoPage from './pages/cliente/GravarLocucaoPage';
import MeusAudiosPage from './pages/cliente/MeusAudiosPage';
import MeuPerfilPage from './pages/cliente/MeuPerfilPage';

function App() {
  // Remover useAuth daqui, pois AuthRedirector cuidará da lógica inicial
  // const { session, isLoading } = useAuth(); 

  // Não precisamos mais do loader aqui, AuthRedirector tem o seu
  // if (isLoading) { ... }

  return (
    <Routes>
      <Route 
        path="/" 
        element={<AuthRedirector />}
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      
      {/* Rotas Protegidas DENTRO do Layout */}
      <Route element={<AppLayout />}>
        {/* Rota para Dashboard Cliente */}
        <Route 
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Novas rotas do cliente */}
        <Route 
          path="/gravar-locucao"
          element={
            <ProtectedRoute>
              <GravarLocucaoPage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/meus-audios"
          element={
            <ProtectedRoute>
              <MeusAudiosPage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/meu-perfil"
          element={
            <ProtectedRoute>
              <MeuPerfilPage />
            </ProtectedRoute>
          }
        />

        {/* Rota para Admin Dashboard */}
        <Route 
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Nova rota para gerenciar locutores */}
        <Route 
          path="/admin/locutores"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLocutoresPage />
            </ProtectedRoute>
          }
        />

        {/* Nova rota para gerenciar clientes */}
        <Route 
          path="/admin/usuarios"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminUsuariosPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Rota para Not Found (Opcional) */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
