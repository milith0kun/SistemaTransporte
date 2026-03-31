import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, QrCode, FileText, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const tabs = [
  { to: '/citizen',          label: 'Inicio',      Icon: Home,     exact: true },
  { to: '/citizen/scan',     label: 'Escanear',    Icon: QrCode    },
  { to: '/citizen/reports',  label: 'Reportes',    Icon: FileText  },
  { to: '/citizen/profile',  label: 'Perfil',      Icon: UserIcon  },
];

export function CitizenLayout() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar is hidden natively by its own styles on small screens unless isOpen is true */}
      <Sidebar
        role={user.role}
        municipalityName={user.municipality?.name}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Mobile Header (hidden on md+) */}
        <header className="md:hidden sticky top-0 z-40 bg-[#1B4F72] text-white px-4 py-3 flex items-center justify-between shadow">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-wide">SFIT</span>
            <span className="text-xs text-blue-200 hidden sm:inline">Ciudadano</span>
          </div>
          {user && (
            <button
              onClick={() => navigate('/citizen/profile')}
              className="flex items-center gap-2 text-sm text-blue-100 hover:text-white transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </button>
          )}
        </header>

        {/* Desktop Header (hidden on mobile) */}
        <div className="hidden md:block">
          <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6 md:p-6 p-4">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation (hidden on md+) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
          <div className="flex">
            {tabs.map(({ to, label, Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                    isActive
                      ? 'text-[#1B4F72] font-semibold'
                      : 'text-gray-400 hover:text-gray-600'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-6 w-6 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`}
                    />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
