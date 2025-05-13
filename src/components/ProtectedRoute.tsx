import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Ajuste o caminho se necessário

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { session, profile, isLoading } = useAuth(); // Pegar profile também

  console.log('ProtectedRoute Check:', { isLoading, session, profile: profile ? {role: profile.role} : null, requiredRole }); // Log simplificado do perfil

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div>Carregando Aplicação...</div>
        </div>
      );
  }

  if (!session) {
    console.log('ProtectedRoute: No session, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // Verifica a role se for necessária
  if (requiredRole && (!profile || profile.role !== requiredRole)) {
    console.log(`ProtectedRoute: Role mismatch or profile not loaded (required: ${requiredRole}, user has: ${profile?.role}), redirecting to /dashboard`);
    // Redireciona para uma página não autorizada ou para o dashboard do cliente
    return <Navigate to="/dashboard" replace />; // Ou para uma página /unauthorized
  }

  console.log('ProtectedRoute: Access granted.');
  // Se chegou aqui, está autenticado e tem a role (se exigida)
  return children ? <>{children}</> : <Outlet />; // Renderiza children ou Outlet
};

export default ProtectedRoute; 