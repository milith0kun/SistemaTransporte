import { Outlet, NavLink } from 'react-router-dom';
import { Home, QrCode, ClipboardList, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const tabs = [
  { to: '/inspector',              label: 'Inicio',      Icon: Home,           exact: true },
  { to: '/inspector/scan',         label: 'Escanear',    Icon: QrCode          },
  { to: '/inspector/inspections',  label: 'Historial',   Icon: ClipboardList   },
  { to: '/inspector/stats',        label: 'Estadísticas',Icon: BarChart3       },
];

export function InspectorLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-[#1B4F72] text-white px-4 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg tracking-wide">SFIT</span>
          <span className="text-xs text-blue-200 hidden sm:inline">Inspector</span>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs text-blue-200">{user.email}</span>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <button 
              onClick={logout}
              className="text-blue-200 hover:text-white transition-colors p-1"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </header>

      {/* Page content — extra bottom padding so content isn't hidden under nav */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
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
  );
}
