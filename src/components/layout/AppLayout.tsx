import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { 
  Bell,
  Home, 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Menu as MenuIcon, 
  ShieldCheck, 
  Voicemail,
  PlusCircle,
  ListMusic,
  User as UserIcon
} from 'lucide-react';
import { ThemeToggle } from '../theme-toggle';
import { cn } from '@/lib/utils';

// Tipo para os itens de navegação
interface NavItem {
  href: string;
  label: string;
  icon: React.ReactElement; // Ou JSX.Element
  roles: string[];
}

const AppLayout: React.FC = () => {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login'); 
    } catch (error) {
      console.error("Erro ao fazer logout (AppLayout):", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  let navItems: NavItem[] = []; // Tipagem explícita
  if (profile?.role === 'admin') {
    navItems = [
      { href: '/admin', label: 'Dashboard Admin', icon: <ShieldCheck className="h-5 w-5" />, roles: ['admin'] },
      { href: '/admin/locutores', label: 'Gerenciar Locutores', icon: <Voicemail className="h-5 w-5" />, roles: ['admin'] },
      { href: '/admin/usuarios', label: 'Gerenciar Usuários', icon: <Users className="h-5 w-5" />, roles: ['admin'] },
    ];
  } else if (profile?.role === 'cliente') {
    navItems = [
      { href: '/dashboard', label: 'Novo Pedido', icon: <PlusCircle className="h-5 w-5" />, roles: ['cliente'] },
      { href: '/dashboard#meus-audios', label: 'Meus Áudios', icon: <ListMusic className="h-5 w-5" />, roles: ['cliente'] },
      { href: '/dashboard#meu-perfil', label: 'Meu Perfil', icon: <UserIcon className="h-5 w-5" />, roles: ['cliente'] },
    ];
  }

  const NavLinks: React.FC<{isMobile?: boolean}> = ({isMobile}) => (
    <nav className={`flex flex-col gap-1 ${isMobile ? 'p-4' : 'px-2 py-4'}`}>
      {profile?.role === 'admin' && (
         <Button 
           variant="ghost"
           className={cn(
            "w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
            location.pathname === '/dashboard' && "bg-primary-foreground/10"
           )}
           asChild
          >
           <Link to="/dashboard">
             <LayoutDashboard className="h-5 w-5 mr-3" />
             <span>Painel Cliente</span>
           </Link>
         </Button>
      )}
      {navItems.map((item) => {
        const isActive = location.pathname === item.href || (item.href.includes('#') && location.pathname + location.hash === item.href);
        // Assegurar que o ícone é um elemento React válido antes de clonar
        const iconElement = React.isValidElement(item.icon) ? item.icon : <LayoutDashboard className="h-5 w-5" />;
        return (
          <Button
            key={item.href} 
            variant="ghost"
            className={cn(
              "w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground rounded-md", // Adicionado rounded-md
              isActive && "bg-primary-foreground/10"
            )}
            asChild
          >
            <Link to={item.href} className="px-3 py-2"> {/* Ajuste de padding no Link */}
              {React.cloneElement(iconElement as React.ReactElement<any>, { className: `${iconElement.props.className || ''} mr-3` })}
              <span>{item.label}</span>
            </Link>
          </Button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden md:flex md:w-72 flex-col border-r bg-primary text-primary-foreground p-2"> {/* Aumentado largura e adicionado padding */}
        <div className="flex h-16 items-center border-b border-primary-foreground/20 px-4 mb-2"> {/* Ajustado padding e margem */}
          <Link to="/" className="flex items-center gap-3 font-semibold text-primary-foreground truncate">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 18a1 1 0 0 1-1.7.7l-4.37-4.37a1 1 0 1 1 1.41-1.41L18.3 16.9A1 1 0 0 1 19 18Z"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.82-.13 2.67-.35a1 1 0 0 0 .84-1.28 1 1 0 0 0-1.28-.84C13.56 19.72 12.8 19.86 12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8c0 .8-.14 1.56-.35 2.27a1 1 0 0 0 .84 1.28 1 1 0 0 0 1.28-.84A9.91 9.91 0 0 0 22 12c0-5.5-4.5-10-10-10Z"/><path d="M10 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z"/><path d="M12 18a6 6 0 0 0 5.66-4H6.34A6 6 0 0 0 12 18Z"/></svg> {/* Placeholder Logo SVG */}
            <span className="text-lg">Painel Áudio</span>
          </Link>
        </div>
        <NavLinks />
      </aside>

      <div className="flex flex-1 flex-col bg-background">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card text-card-foreground px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="icon" variant="outline">
                    <MenuIcon className="h-6 w-6" />
                    <span className="sr-only">Abrir menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 flex flex-col bg-primary text-primary-foreground">
                  <div className="flex h-16 items-center border-b border-primary-foreground/20 px-6">
                      <Link to="/" className="flex items-center gap-2 font-semibold text-primary-foreground truncate">
                        <LayoutDashboard className="h-6 w-6" />
                        <span>Painel Áudio</span>
                      </Link>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <SheetClose asChild>
                        <NavLinks isMobile />
                      </SheetClose>
                    </div>
                    <div className="p-4 border-t border-primary-foreground/20 mt-auto">
                      <SheetClose asChild>
                        <Button variant="ghost" className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10" onClick={handleLogout} disabled={isLoggingOut}>
                          <LogOut className="mr-3 h-5 w-5" /> {isLoggingOut ? 'Saindo...' : 'Sair'}
                        </Button>
                      </SheetClose>
                    </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className='text-sm text-muted-foreground'>
              <span>Olá, {profile?.full_name || user?.email || 'Usuário'}!</span>
              <span className='hidden sm:inline'> Todos os nossos serviços estão operando!</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 ml-auto">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className='text-muted-foreground hover:text-foreground'>
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notificações</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut} className="hidden md:inline-flex">
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout; 