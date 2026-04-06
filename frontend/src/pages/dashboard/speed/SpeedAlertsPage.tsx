import { useEffect, useState, useCallback } from 'react';
import { Gauge, AlertTriangle, Eye } from 'lucide-react';
import api from '../../../services/api';
import { useSocket } from '../../../hooks/useSocket';
import { SpeedAlertDetailModal } from './SpeedAlertDetailModal';

interface SpeedAlert {
  id: string;
  vehicle?: { plate: string; company?: { name: string } };
  driver?: { nombres: string; apellidos: string };
  velocidad_detectada_kmh: number;
  velocidad_limite_kmh: number;
  exceso_kmh: number;
  duracion_exceso_segundos: number;
  velocidad_maxima_registrada_kmh?: number;
  latitud: number;
  longitud: number;
  ubicacion_descripcion?: string;
  severidad: string;
  estado: string;
  notas_resolucion?: string;
  reporter?: { name: string };
  trip?: { route?: { origin: string; destination: string } };
  created_at: string;
}

interface Stats {
  alertas_hoy: number;
  alertas_semana: number;
  velocidad_maxima_registrada: number;
  por_severidad: Record<string, number>;
}

const SEVERITY_BADGE: Record<string, string> = {
  ADVERTENCIA: 'bg-yellow-100 text-yellow-800',
  MODERADO:    'bg-orange-100 text-orange-800',
  GRAVE:       'bg-red-100 text-red-800',
  CRITICO:     'bg-red-200 text-red-900 font-bold animate-pulse',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVA:          'bg-red-100 text-red-700',
  VISTA_FISCAL:    'bg-blue-100 text-blue-700',
  VISTA_OPERADOR:  'bg-indigo-100 text-indigo-700',
  RESUELTA:        'bg-green-100 text-green-700',
  FALSO_POSITIVO:  'bg-gray-100 text-gray-500',
};

export function SpeedAlertsPage() {
  const { on } = useSocket();
  const [alerts, setAlerts] = useState<SpeedAlert[]>([]);
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SpeedAlert | null>(null);
  const [filterSev, setFilterSev] = useState('');
  const [filterEst, setFilterEst] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: '50' });
    if (filterSev) params.set('severidad', filterSev);
    if (filterEst) params.set('estado', filterEst);

    const [alertsRes, statsRes] = await Promise.all([
      api.get<any>(`/api/speed-alerts?${params}`),
      api.get<Stats>('/api/speed-alerts/stats/overview'),
    ]);
    setAlerts(alertsRes.data ?? alertsRes);
    setStats(statsRes);
    setLoading(false);
  }, [filterSev, filterEst]);

  useEffect(() => { load(); }, [load]);

  // Escuchar alertas en tiempo real
  useEffect(() => {
    const off = on<any>('speed:alert', () => load());
    return off;
  }, [on, load]);

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Gauge className="h-6 w-6 text-red-600" />
        Alertas de Velocidad
      </h1>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`rounded-2xl p-4 ${(stats.alertas_hoy ?? 0) > 0 ? 'bg-red-50 border-2 border-red-200' : 'bg-white border border-gray-100'}`}>
            <p className="text-xs text-gray-500">Alertas hoy</p>
            <p className={`text-3xl font-bold ${stats.alertas_hoy > 0 ? 'text-red-600' : 'text-gray-700'}`}>{stats.alertas_hoy}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500">Esta semana</p>
            <p className="text-3xl font-bold text-gray-700">{stats.alertas_semana}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500">Vel. máx. registrada</p>
            <p className="text-3xl font-bold text-orange-600">{Math.round(stats.velocidad_maxima_registrada)} km/h</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500">Críticas</p>
            <p className="text-3xl font-bold text-red-900">{stats.por_severidad?.CRITICO ?? 0}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm">
          <option value="">Todas las severidades</option>
          <option value="ADVERTENCIA">Advertencia</option>
          <option value="MODERADO">Moderado</option>
          <option value="GRAVE">Grave</option>
          <option value="CRITICO">Crítico</option>
        </select>
        <select value={filterEst} onChange={e => setFilterEst(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm">
          <option value="">Todos los estados</option>
          <option value="ACTIVA">Activa</option>
          <option value="VISTA_FISCAL">Vista por Fiscal</option>
          <option value="RESUELTA">Resuelta</option>
          <option value="FALSO_POSITIVO">Falso Positivo</option>
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando…</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl text-gray-500">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p>No hay alertas de velocidad</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha/Hora</th>
                  <th className="px-4 py-3 text-left">Vehículo</th>
                  <th className="px-4 py-3 text-center">Velocidad</th>
                  <th className="px-4 py-3 text-center">Exceso</th>
                  <th className="px-4 py-3 text-center">Duración</th>
                  <th className="px-4 py-3 text-center">Severidad</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alerts.map(a => (
                  <tr key={a.id} className={`hover:bg-gray-50 ${a.estado === 'ACTIVA' ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {new Date(a.created_at).toLocaleString('es-PE')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{a.vehicle?.plate ?? '—'}</p>
                      <p className="text-xs text-gray-400">{a.vehicle?.company?.name ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-red-600">
                      {Math.round(Number(a.velocidad_detectada_kmh))} km/h
                      <div className="text-xs text-gray-400 font-normal">límite: {a.velocidad_limite_kmh}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-red-700">+{a.exceso_kmh}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">
                      {formatSecs(a.duracion_exceso_segundos)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_BADGE[a.severidad] ?? 'bg-gray-100'}`}>
                        {a.severidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[a.estado] ?? 'bg-gray-100'}`}>
                        {a.estado.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelected(a)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {selected && (
        <SpeedAlertDetailModal
          alert={selected}
          onClose={() => setSelected(null)}
          onResolved={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
