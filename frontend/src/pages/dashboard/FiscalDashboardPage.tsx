import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, MapPin, Activity, ShieldAlert, FileText,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Bus, UserCheck, CalendarDays
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

import api from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { Report, ReportStatus, Trip, TripStatus, PaginatedResponse } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Spinner } from '../../components/ui/spinner';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/table';
import { formatDate } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  activeTrips:   number;
  fatigueAlerts: number;
  sanctionsToday: number;
  reportsToday:  number;
}

interface AlertItem {
  id:      string;
  type:    string;
  message: string;
  ts:      number;
  fresh?:  boolean;
}

interface SanctionBar  { level: string; count: number }
interface DriverPie    { name: string; value: number; color: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const DRIVER_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const STATUS_STYLES: Record<TripStatus, { label: string; variant: 'success'|'warning'|'muted'|'destructive'|'default' }> = {
  [TripStatus.EN_CURSO]:    { label: 'En curso',   variant: 'success' },
  [TripStatus.REGISTRADO]:  { label: 'Registrado', variant: 'default' },
  [TripStatus.FINALIZADO]:  { label: 'Finalizado', variant: 'muted' },
  [TripStatus.CANCELADO]:   { label: 'Cancelado',  variant: 'destructive' },
  [TripStatus.CERRADO_AUTO]:{ label: 'Auto-cierre',variant: 'warning' },
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  CONDUCTOR_DIFERENTE:  'Conductor diferente',
  CONDUCCION_PELIGROSA: 'Conducción peligrosa',
  EXCESO_VELOCIDAD:     'Exceso velocidad',
  CONDICION_VEHICULO:   'Condición vehículo',
  OTRO:                 'Otro',
};

// ─── Main component ───────────────────────────────────────────────────────────

export function FiscalDashboardPage() {
  const { on } = useSocket();

  const [stats, setStats]           = useState<DashboardStats>({ activeTrips: 0, fatigueAlerts: 0, sanctionsToday: 0, reportsToday: 0 });
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const [sanctionBars, setSanctionBars]     = useState<SanctionBar[]>([]);
  const [driverPie, setDriverPie]           = useState<DriverPie[]>([]);
  const [alerts, setAlerts]                 = useState<AlertItem[]>([]);
  const [loading, setLoading]               = useState(true);
  const [validating, setValidating]         = useState<string | null>(null);
  const alertsRef = useRef<AlertItem[]>([]);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [tripsRes, reportsRes, sanctionsRes, driversRes] = await Promise.all([
        api.get<PaginatedResponse<Trip>>('/api/trips?status=EN_CURSO&limit=20'),
        api.get<PaginatedResponse<Report>>('/api/reports?status=EN_REVISION&limit=20'),
        api.get<{ total: number; today: number; by_level: Record<string, number>; pending_appeals: number }>('/api/sanctions/stats'),
        api.get<PaginatedResponse<{ status: string }>>('/api/drivers?limit=200'),
      ]);

      setActiveTrips(tripsRes.data ?? []);
      setPendingReports(reportsRes.data ?? []);

      // KPIs
      const activeCount  = tripsRes.total ?? 0;
      const reviewCount  = reportsRes.total ?? 0;
      const sanctToday   = sanctionsRes.today ?? 0;
      const fatAlerts    = (driversRes.data ?? []).filter((d) => d.status === 'RIESGO').length;

      setStats({ activeTrips: activeCount, fatigueAlerts: fatAlerts, sanctionsToday: sanctToday, reportsToday: reviewCount });

      // Charts
      const bl = sanctionsRes.by_level ?? {};
      setSanctionBars([
        { level: 'Nivel 1', count: bl[1] ?? 0 },
        { level: 'Nivel 2', count: bl[2] ?? 0 },
        { level: 'Nivel 3', count: bl[3] ?? 0 },
        { level: 'Nivel 4', count: bl[4] ?? 0 },
      ]);

      const drivers = driversRes.data ?? [];
      const apto   = drivers.filter((d) => d.status === 'APTO').length;
      const riesgo = drivers.filter((d) => d.status === 'RIESGO').length;
      const noApto = drivers.filter((d) => d.status === 'NO_APTO').length;
      setDriverPie([
        { name: 'APTO',    value: apto,   color: DRIVER_COLORS[0] },
        { name: 'RIESGO',  value: riesgo, color: DRIVER_COLORS[1] },
        { name: 'NO_APTO', value: noApto, color: DRIVER_COLORS[2] },
      ]);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── WebSocket real-time updates ─────────────────────────────────────────────
  useEffect(() => {
    const pushAlert = (type: string, message: string) => {
      const item: AlertItem = { id: crypto.randomUUID(), type, message, ts: Date.now(), fresh: true };
      const next = [item, ...alertsRef.current].slice(0, 20);
      alertsRef.current = next;
      setAlerts([...next]);
      // Remove fresh flag after animation
      setTimeout(() => {
        setAlerts((prev) => prev.map((a) => a.id === item.id ? { ...a, fresh: false } : a));
      }, 1_500);
    };

    const offDashboard = on<{ message?: string }>('dashboard:update', () => loadData());
    const offTrip      = on<{ tripId: string; status: string }>('trip:status_changed', (d) => {
      pushAlert('viaje', `Viaje ${d.tripId.slice(0, 8)} → ${d.status}`);
      loadData();
    });
    const offFatigue   = on<{ driverName: string; result: string }>('fatigue:alert', (d) => {
      pushAlert('fatiga', `${d.driverName}: ${d.result}`);
      setStats((s) => ({ ...s, fatigueAlerts: s.fatigueAlerts + 1 }));
    });
    const offNotif     = on<{ title: string; type: string }>('notification:new', (d) => {
      pushAlert(d.type, d.title);
    });

    return () => { offDashboard(); offTrip(); offFatigue(); offNotif(); };
  }, [on, loadData]);

  // ── Validate report ────────────────────────────────────────────────────────
  const validateReport = async (id: string, status: ReportStatus) => {
    setValidating(id);
    try {
      await api.patch(`/api/reports/${id}/validate`, { status });
      setPendingReports((prev) => prev.filter((r) => r.id !== id));
      setStats((s) => ({ ...s, reportsToday: Math.max(0, s.reportsToday - 1) }));
    } catch {
      // keep in list
    } finally {
      setValidating(null);
    }
  };

  // ── KPI cards ─────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Viajes Activos',      value: stats.activeTrips,   Icon: MapPin,       color: 'text-blue-600',   bg: 'bg-blue-50/50' },
    { label: 'Alertas Fatiga',      value: stats.fatigueAlerts, Icon: Activity,     color: 'text-amber-600',  bg: 'bg-amber-50/50' },
    { label: 'Sanciones (Hoy)',     value: stats.sanctionsToday,Icon: ShieldAlert,  color: 'text-rose-600',   bg: 'bg-rose-50/50' },
    { label: 'Reportes Pendientes', value: stats.reportsToday,  Icon: FileText,   color: 'text-purple-600', bg: 'bg-purple-50/50' },
  ];

  if (loading) return <div className="flex items-center justify-center py-20 h-[50vh]"><Spinner size="lg" /></div>;

  return (
    <div className="flex-1 space-y-6 md:space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl flex items-center gap-2">
            <LayoutDashboard className="size-7 text-[#1B4F72]" />
            Panel Fiscal / Central
          </h2>
          <p className="text-sm text-gray-500 mt-1">Monitoreo en tiempo real de operaciones y sanciones.</p>
        </div>
        <Button variant="outline" onClick={loadData} className="gap-2 shrink-0 self-start sm:self-auto h-10">
          <RefreshCw className="size-4" /> 
          <span className="hidden sm:inline">Actualizar</span>
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, Icon, color, bg }) => (
          <Card key={label} className={`border-none shadow-sm hover:shadow-md transition-shadow ${bg}`}>
            <CardContent className="flex items-center gap-4 p-4 sm:p-6">
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm`}>
                <Icon className={`size-6 ${color}`} />
              </div>
              <div className="space-y-1">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-none">{value}</p>
                <p className="text-xs sm:text-sm font-medium text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Active trips table */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-gray-200/60 shadow-sm overflow-hidden flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gray-50/30 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-lg">Viajes en Curso</CardTitle>
                <CardDescription>Monitoreo de unidades desplazándose actualmente</CardDescription>
              </div>
              <Link to="/dashboard/trips" className="text-sm font-medium text-[#2E86C1] hover:text-[#1B4F72] hover:underline">
                Ver todos
              </Link>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {activeTrips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Bus className="size-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Sin viajes activos en este momento.</p>
                </div>
              ) : (
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Vehículo</Th>
                      <Th>Ruta Asignada</Th>
                      <Th>Hora Inicio</Th>
                      <Th>Estado</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {activeTrips.map((t) => (
                      <Tr key={t.id}>
                        <Td className="font-mono font-bold text-gray-900">{t.vehicle?.plate ?? '—'}</Td>
                        <Td className="text-xs text-gray-600 max-w-[150px] truncate" title={t.route ? `${t.route.origin} → ${t.route.destination}` : ''}>
                          {t.route ? `${t.route.origin} → ${t.route.destination}` : '—'}
                        </Td>
                        <Td className="text-xs text-gray-500 whitespace-nowrap">
                          {t.start_time ? formatDate(t.start_time) : '—'}
                        </Td>
                        <Td>
                          <Badge variant={STATUS_STYLES[t.status]?.variant ?? 'default'} className="whitespace-nowrap">
                            {STATUS_STYLES[t.status]?.label ?? t.status}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Real-time alert feed */}
        <div className="space-y-6">
          <Card className="border-gray-200/60 shadow-sm flex flex-col h-full">
            <CardHeader className="border-b border-gray-100 bg-gray-50/30 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2.5 bg-red-500" />
                </span>
                Feed de Alertas
              </CardTitle>
              <CardDescription>Eventos en tiempo real</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 max-h-[300px] xl:max-h-[400px] overflow-y-auto">
              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                    <CheckCircle2 className="size-8 text-gray-300" />
                    Sin alertas recientes.
                  </div>
                ) : (
                  alerts.map((a) => (
                    <div
                      key={a.id}
                      className={[
                        'rounded-xl border p-3 text-sm transition-all duration-700 shadow-sm',
                        a.fresh
                          ? 'border-amber-300 bg-amber-50 scale-[1.02] ring-4 ring-amber-500/10'
                          : 'border-gray-100 bg-white hover:border-gray-200',
                      ].join(' ')}
                    >
                      <p className="font-semibold text-gray-800 line-clamp-2">{a.message}</p>
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 uppercase text-gray-500 bg-gray-50 border-gray-200">{a.type}</Badge>
                        <p className="text-[10px] text-gray-400 font-medium">{new Date(a.ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second:'2-digit' })}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reports EN_REVISION */}
      <Card className="border-gray-200/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gray-50/30 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Reportes Ciudadanos por Validar
            </CardTitle>
            <CardDescription>Revisa la evidencia para convertirlos en sanciones</CardDescription>
          </div>
          <Link to="/dashboard/reports" className="text-sm font-medium text-[#2E86C1] hover:text-[#1B4F72] hover:underline">Ver panel completo</Link>
        </CardHeader>
        <CardContent className="p-0">
          {pendingReports.length === 0 ? (
            <div className="py-10 flex flex-col items-center text-gray-400">
              <UserCheck className="size-10 mb-2 opacity-30" />
              <p className="text-sm">Bandeja limpia. No hay reportes pendientes.</p>
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Tipo</Th>
                  <Th>Descripción</Th>
                  <Th>Score de Fiabilidad</Th>
                  <Th>Fecha</Th>
                  <Th className="text-right">Acciones</Th>
                </Tr>
              </Thead>
              <Tbody>
                {pendingReports.map((r) => (
                  <Tr key={r.id}>
                    <Td>
                      <Badge variant="warning" className="whitespace-nowrap">
                        {REPORT_TYPE_LABELS[r.type] ?? r.type}
                      </Badge>
                    </Td>
                    <Td className="max-w-[200px] truncate text-xs text-gray-600" title={r.description || ''}>
                      {r.description ?? 'Sin descripción'}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${(r.validation_score ?? 0) >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                            style={{ width: `${Math.min(100, r.validation_score ?? 0)}%` }}
                          />
                        </div>
                        <span className={[
                          'font-bold text-xs',
                          (r.validation_score ?? 0) >= 70 ? 'text-emerald-600' : 'text-amber-600',
                        ].join(' ')}>
                          {r.validation_score ?? '0'}
                        </span>
                      </div>
                    </Td>
                    <Td className="text-xs text-gray-500 whitespace-nowrap">{formatDate(r.created_at)}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={validating === r.id}
                          onClick={() => validateReport(r.id, ReportStatus.VALIDO)}
                          className="h-8 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                        >
                          {validating === r.id ? <Spinner className="size-3 mr-1" /> : <CheckCircle2 className="size-3 mr-1" />}
                          Validar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={validating === r.id}
                          onClick={() => validateReport(r.id, ReportStatus.INVALIDO)}
                          className="h-8 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                        >
                          <XCircle className="size-3 mr-1" /> Descartar
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sanciones por nivel */}
        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="border-b border-gray-100 bg-gray-50/30 pb-4">
            <CardTitle className="text-lg">Sanciones por Nivel (Hoy)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sanctionBars} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="level" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill="#2E86C1" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Estado conductores */}
        <Card className="border-gray-200/60 shadow-sm">
          <CardHeader className="border-b border-gray-100 bg-gray-50/30 pb-4">
            <CardTitle className="text-lg">Estado Operativo de Conductores</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-6">
            {driverPie.every((d) => d.value === 0) ? (
              <p className="py-16 text-sm text-gray-400">Sin conductores registrados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie 
                    data={driverPie} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={70} 
                    outerRadius={90} 
                    paddingAngle={3} 
                    dataKey="value"
                    stroke="none"
                  >
                    {driverPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick nav blocks */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 pt-4">
        {[
          { to: '/dashboard/sanctions', label: 'Gestión Sanciones',  Icon: ShieldAlert },
          { to: '/dashboard/drivers',   label: 'Directorio Choferes',Icon: Activity    },
          { to: '/dashboard/reports',   label: 'Archivo Reportes',   Icon: FileText    },
          { to: '/dashboard/routes',    label: 'Catálogo de Rutas',  Icon: MapPin      },
          { to: '/dashboard/companies', label: 'Empresas Transp.',   Icon: LayoutDashboard },
          { to: '/dashboard/analytics', label: 'Reportes y Data',    Icon: CalendarDays},
        ].map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 text-center hover:border-[#2E86C1] hover:bg-blue-50/20 hover:shadow-sm transition-all"
          >
            <div className="p-3 bg-gray-50 rounded-full group-hover:bg-blue-100 transition-colors">
              <Icon className="size-6 text-[#1B4F72] group-hover:text-[#2E86C1]" />
            </div>
            <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
