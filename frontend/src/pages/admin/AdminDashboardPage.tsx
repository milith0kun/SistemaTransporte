import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Bus, Users, Route, ShieldAlert, Building2,
  Settings, UserCog, MapPin, ClipboardList, ChevronRight, Map as MapIcon,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Spinner } from '../../components/ui/spinner';
import { useAuthStore } from '../../stores/authStore';
import { MapWidget, type MapPoint } from '../../components/MapWidget';

interface DashboardStats {
  routes:    number;
  vehicles:  number;
  drivers:   number;
  sanctions: number;
  companies: number;
  users:     number;
}

interface AuditEntry {
  id:         string;
  user_name:  string;
  action:     string;
  entity:     string;
  created_at: string;
}

const quickLinks = [
  { to: '/admin/users',     label: 'Gestionar usuarios',  Icon: UserCog,     color: 'bg-blue-100 text-blue-700' },
  { to: '/admin/routes',    label: 'Gestionar rutas',     Icon: MapPin,      color: 'bg-indigo-100 text-indigo-700' },
  { to: '/admin/companies', label: 'Ver empresas',        Icon: Building2,   color: 'bg-emerald-100 text-emerald-700' },
  { to: '/admin/config',    label: 'Configuración',       Icon: Settings,    color: 'bg-amber-100 text-amber-700' },
  { to: '/admin/audit',     label: 'Auditoría',           Icon: ClipboardList, color: 'bg-purple-100 text-purple-700' },
];

export function AdminDashboardPage() {
  const { token, user } = useAuthStore();
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [audit, setAudit]   = useState<AuditEntry[]>([]);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/routes?limit=1',    { headers }).then(r => r.json()).catch(() => ({ total: 0 })),
      fetch('/api/vehicles?limit=1',  { headers }).then(r => r.json()).catch(() => ({ total: 0 })),
      fetch('/api/drivers?limit=1',   { headers }).then(r => r.json()).catch(() => ({ total: 0 })),
      fetch('/api/sanctions/stats',   { headers }).then(r => r.json()).catch(() => ({ active: 0 })),
      fetch('/api/companies?limit=1', { headers }).then(r => r.json()).catch(() => ({ total: 0 })),
      fetch('/api/users?limit=1',     { headers }).then(r => r.json()).catch(() => ({ total: 0 })),
      fetch('/api/audit?limit=5',     { headers }).then(r => r.json()).catch(() => ({ items: [] })),
      fetch('/api/reports?limit=10',  { headers }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/sanctions?limit=10', { headers }).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([routes, vehicles, drivers, sanctions, companies, users, auditRes, reportsRes, sanctionsRes]) => {
      setStats({
        routes:    routes.total    ?? 0,
        vehicles:  vehicles.total  ?? 0,
        drivers:   drivers.total   ?? 0,
        sanctions: sanctions.active ?? 0,
        companies: companies.total  ?? 0,
        users:     users.total      ?? 0,
      });
      setAudit(auditRes.data ?? []);
      
      const points: MapPoint[] = [];
      if (reportsRes.data && Array.isArray(reportsRes.data)) {
        reportsRes.data.forEach((r: any) => {
          if (r.latitude && r.longitude) {
            points.push({ id: r.id, lat: r.latitude, lng: r.longitude, title: `Reporte: ${r.type}`, type: 'report' });
          }
        });
      }
      if (sanctionsRes.data && Array.isArray(sanctionsRes.data)) {
        sanctionsRes.data.forEach((s: any) => {
          if (s.latitude && s.longitude) {
            points.push({ id: s.id, lat: s.latitude, lng: s.longitude, title: `Sanción Nivel ${s.level}`, type: 'sanction' });
          }
        });
      }
      setMapPoints(points);
    }).finally(() => setLoading(false));
  }, [token]);

  const statCards = [
    { label: 'Rutas activas',     value: stats?.routes    ?? '—', Icon: Route,      color: 'text-blue-600',   bg: 'bg-blue-50/50' },
    { label: 'Vehículos',         value: stats?.vehicles  ?? '—', Icon: Bus,         color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
    { label: 'Conductores',       value: stats?.drivers   ?? '—', Icon: Users,       color: 'text-emerald-600',  bg: 'bg-emerald-50/50' },
    { label: 'Sanciones activas', value: stats?.sanctions ?? '—', Icon: ShieldAlert, color: 'text-rose-600',    bg: 'bg-rose-50/50' },
    { label: 'Empresas',          value: stats?.companies ?? '—', Icon: Building2,   color: 'text-amber-600',  bg: 'bg-amber-50/50' },
    { label: 'Usuarios',          value: stats?.users     ?? '—', Icon: UserCog,     color: 'text-purple-600', bg: 'bg-purple-50/50' },
  ];

  return (
    <div className="flex-1 space-y-6 md:space-y-8 pb-8">
      {/* Header Section */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl flex items-center gap-2">
            <LayoutDashboard className="size-7 text-[#1B4F72]" />
            Dashboard Administrativo
          </h2>
          <p className="text-sm text-gray-500 mt-1">Visión general de la {user?.municipality?.name ?? 'Municipalidad'}</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-2 text-sm font-medium text-[#2E86C1] bg-blue-50 px-4 py-2 rounded-full w-fit">
          <Activity className="size-4" />
          <span>Sistema Operativo</span>
        </div>
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {statCards.map(({ label, value, Icon, color, bg }) => (
            <Card key={label} className={`border-none shadow-sm ${bg} hover:shadow-md transition-shadow`}>
              <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center gap-2">
                <div className={`flex size-10 items-center justify-center rounded-full bg-white shadow-sm`}>
                  <Icon className={`size-5 ${color}`} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content Area - Span 2 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map Section */}
          <Card className="overflow-hidden border-gray-200/60 shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50/30 pb-4">
              <div className="flex items-center gap-2">
                <MapIcon className="size-5 text-[#2E86C1]" />
                <CardTitle className="text-lg">Mapa de Incidencias en Tiempo Real</CardTitle>
              </div>
              <CardDescription>
                Ubicación de reportes ciudadanos y sanciones recientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[300px] sm:h-[400px] w-full">
                <MapWidget points={mapPoints} />
              </div>
            </CardContent>
          </Card>

          {/* Recent Audit */}
          <Card className="border-gray-200/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gray-50/30 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-lg">Actividad del Sistema</CardTitle>
                <CardDescription>Últimas acciones registradas en auditoría</CardDescription>
              </div>
              <Link to="/admin/audit" className="text-sm font-medium text-[#2E86C1] hover:text-[#1B4F72] hover:underline">
                Ver historial
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {audit.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">No hay actividad reciente registrada.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {audit.map(entry => (
                    <div key={entry.id} className="flex items-start justify-between p-4 sm:px-6 hover:bg-gray-50/50 transition-colors">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-medium text-gray-700">{entry.user_name}</span>
                          <span>•</span>
                          <span>{entry.entity}</span>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400 bg-gray-100/50 px-2 py-1 rounded-md">
                        {new Date(entry.created_at).toLocaleString('es-PE', { 
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Area - Span 1 */}
        <div className="space-y-6">
          <Card className="border-gray-200/60 shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50/30 pb-4">
              <CardTitle className="text-lg">Accesos Rápidos</CardTitle>
              <CardDescription>Atajos a las funciones principales</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                {quickLinks.map(({ to, label, Icon, color }) => (
                  <Link
                    key={to}
                    to={to}
                    className="group flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 hover:border-[#2E86C1]/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex size-10 items-center justify-center rounded-lg ${color}`}>
                        <Icon className="size-5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">{label}</span>
                    </div>
                    <ChevronRight className="size-4 text-gray-400 group-hover:text-[#2E86C1] transition-colors" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-gray-200/60 shadow-sm overflow-hidden bg-gradient-to-br from-[#1B4F72] to-[#2E86C1] text-white">
            <CardContent className="p-6 relative">
              <div className="absolute right-0 top-0 opacity-10 size-32 translate-x-8 -translate-y-8">
                <Bus className="size-full" />
              </div>
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-2">Plataforma SFIT</h3>
                <p className="text-sm text-blue-100 mb-4 line-clamp-3 leading-relaxed">
                  Asegúrate de mantener actualizado el registro de inspectores y rutas para un óptimo control vehicular en toda la jurisdicción.
                </p>
                <Link to="/admin/config" className="inline-flex items-center justify-center rounded-md bg-white text-[#1B4F72] px-4 py-2 text-sm font-semibold hover:bg-blue-50 transition-colors">
                  Ajustes del Sistema
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
