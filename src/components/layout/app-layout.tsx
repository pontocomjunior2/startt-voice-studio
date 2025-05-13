import { cn } from '@/lib/utils'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/useAuth.hook'
import {
  Home,
  Users,
  User,
  Briefcase,
  Settings,
  PanelLeft,
  Search,
  Bell,
  LogOut,
  Palette,
  ChevronDown,
  Music4,
  Headphones,
  ListMusic,
  Info,
  UserCog,
  LayoutDashboard,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  roles?: string[]
  isSectionTitle?: boolean
  isBottom?: boolean
  hash?: boolean
}

const AppLayout = () => {
  const { user, logout } = useAuth()
  const location = useLocation()

  const sidebarNavItems: NavItem[] = [
    ...(user?.role === 'ADMIN'
      ? [
          {
            to: '/admin/dashboard',
            icon: LayoutDashboard,
            label: 'Dashboard Admin',
          },
          { to: '/admin/usuarios', icon: UserCog, label: 'Gerenciar Usuários' },
          {
            to: '/admin/locutores',
            icon: Headphones,
            label: 'Gerenciar Locutores',
          },
        ]
      : []),
    ...(user?.role === 'CLIENTE'
      ? [
          { to: '/dashboard', icon: LayoutDashboard, label: 'Meu Painel' },
          { to: '/dashboard#meus-audios', icon: ListMusic, label: 'Meus Áudios', hash: true },
          { to: '/dashboard#meu-perfil', icon: User, label: 'Meu Perfil', hash: true },
          { to: '/novo-pedido', icon: Music4, label: 'Novo Pedido' },
        ]
      : []),
    ...(user?.role === 'LOCUTOR'
      ? [
          { to: '/locutor/dashboard', icon: LayoutDashboard, label: 'Painel Locutor' },
          { to: '/locutor/pedidos', icon: ListMusic, label: 'Pedidos Atribuídos' },
          { to: '/locutor/perfil', icon: User, label: 'Meu Perfil' },
        ]
      : []),
    { isSectionTitle: true, label: 'Informações', to: '', icon: Info },
    { to: '/ajuda', icon: Info, label: 'Ajuda', isBottom: true },
    { to: '/settings', icon: Settings, label: 'Configurações', isBottom: true },
  ].filter(Boolean) as NavItem[]

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 transition-all hover:text-white hover:bg-slate-800',
      isActive && 'text-primary-orange-500 bg-slate-800 border-l-4 border-primary-orange-500 font-semibold'
    )

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-4 px-2.5 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md',
      isActive && 'text-primary-orange-500 bg-slate-800 font-semibold'
    )

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[256px_1fr]">
      {/* Sidebar para Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 text-white fixed inset-y-0 z-50">
        <ScrollArea className="flex-1">
          <div className="flex flex-col p-4 space-y-4">
            <div className="flex items-center justify-center mb-6 mt-2">
              <Link to={user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}>
                <img src="/logo.png" alt="Logo PontoComAudio" className="h-16" /> {/* ALTURA SUGESTÃO: 40-60px, original ~120-180px */}
              </Link>
            </div>
            <nav className="flex-1 space-y-1">
              {sidebarNavItems
                .filter((item) => !item.isBottom && !item.isSectionTitle)
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={navLinkClass}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </NavLink>
                ))}
            </nav>
            <div className="mt-auto">
              <Separator className="my-4 bg-slate-700" />
              <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Informações
              </p>
              <nav className="space-y-1">
                {sidebarNavItems
                  .filter((item) => item.isBottom)
                  .map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={navLinkClass}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </NavLink>
                  ))}
              </nav>
            </div>
          </div>
        </ScrollArea>
      </aside>

      <div className="flex flex-col lg:ml-64">
        {/* Header com Menu Mobile e Ações */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
          {/* Botão do Menu Mobile */}
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="lg:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="lg:hidden sm:max-w-xs bg-slate-900 text-white border-r-slate-800 p-0">
              <ScrollArea className="h-full">
                <div className="flex flex-col p-4 space-y-4">
                  <div className="flex items-center justify-center mb-6 mt-2">
                     <Link to={user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}>
                       <img src="/logo.png" alt="Logo PontoComAudio" className="h-12" /> {/* ALTURA SUGESTÃO: ~40px */}
                     </Link>
                  </div>
                  <nav className="grid gap-2 text-base font-medium">
                    {sidebarNavItems
                      .filter((item) => !item.isBottom && !item.isSectionTitle)
                      .map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={mobileNavLinkClass}
                        >
                          <item.icon className="h-5 w-5 mr-2" />
                          {item.label}
                        </NavLink>
                      ))}
                  </nav>
                  <div className="mt-auto">
                    <Separator className="my-4 bg-slate-700" />
                    <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Informações
                    </p>
                    <nav className="space-y-1">
                      {sidebarNavItems
                        .filter((item) => item.isBottom)
                        .map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            className={mobileNavLinkClass}
                          >
                            <item.icon className="h-5 w-5 mr-2" />
                            {item.label}
                          </NavLink>
                        ))}
                    </nav>
                  </div>
                </div>
              </ScrollArea>
               <div className="border-t border-slate-700 p-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-slate-300 hover:text-white hover:bg-slate-800"
                  onClick={() => {
                    logout()
                    // navigate('/login', { replace: true }) // O useAuth já redireciona
                  }}
                >
                  <LogOut className="h-5 w-5" />
                  Sair
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Breadcrumbs ou Título da Página (Opcional) */}
          <div className="flex-1">
            {/* <h1 className="font-semibold text-xl">Dashboard</h1> */}
          </div>

          {/* Ações do Header: Busca, Notificações, User Dropdown, ThemeToggle */}
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            {/* <Button variant="ghost" size="icon" className="rounded-full">
              <Search className="h-5 w-5" />
              <span className="sr-only">Buscar</span>
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notificações</span>
            </Button> */}
            <ThemeToggle />
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="overflow-hidden rounded-full w-8 h-8 sm:w-9 sm:h-9"
                  >
                    {/* Idealmente, usar uma imagem de avatar aqui */}
                    <User className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.nome_completo || user.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard#meu-perfil">
                      <User className="mr-2 h-4 w-4" />
                      Meu Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Configurações
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout()
                      // navigate('/login', { replace: true }) // O useAuth já redireciona
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Conteúdo Principal da Página */}
        <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:gap-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout 