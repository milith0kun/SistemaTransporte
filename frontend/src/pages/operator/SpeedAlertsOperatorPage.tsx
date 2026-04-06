import { useEffect, useState, useCallback } from 'react';
import { Gauge, AlertTriangle, Eye } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { SpeedAlertDetailModal } from '../dashboard/speed/SpeedAlertDetailModal';

interface SpeedAlert {
  id: string;
  vehicle?: { plate: string };
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

const SEVERITY_BADGE: Record<string, string> = {
  ADVERTENCIA: 'bg-yellow-100 text-yellow-800',
  MODERADO:    'bg-orange-100 text-orange-800',
  GRAVE:       'bg-red-100 text-red-800',
  CRITICO:     'bg-red-200 text-red-900 font-bold',
};

export function SpeedAlertsOperatorPage() {
  const { on } = useSocket();
  const [alerts, setAlerts] = useState<SpeedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SpeedAlert | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/api/speed-alerts?limit=50');
      setAlerts(res.data ?? res);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const off = on<any>('speed:alert', () => load());
    return off;
  }, [on, load]);

  const markSeen = async (id: string) => {
    await api.patch(`/api/speed-alerts/${id}/seen`);
    load();
  };

  const active = alerts.filter(a => a.estado === 'ACTIVA');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gauge className="h-6 w-6 text-red-600" />
          Alertas de Velocidad
        </h1>
        {active.length > 0 && (
          <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1 rounded-full">
            {active.length} activa{active.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando…</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl text-gray-500">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p>No hay alertas de velocidad para tus vehículos</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Vehículo</th>
                  <th className="px-4 py-3 text-center">Velocidad</th>
                  <th className="px-4 py-3 text-center">Exceso</th>
                  <th className="px-4 py-3 text-center">Severidad</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alerts.map(a => (
                  <tr key={a.id} className={`hover:bg-gray-50 ${a.estado === 'ACTIVA' ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(a.created_at).toLocaleString('es-PE')}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{a.vehicle?.plate ?? '—'}</td>
                    <td className="px-4 py-3 text-center font-bold text-red-600">
                      {Math.round(Number(a.velocidad_detectada_kmh))} km/h
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-red-700">+{a.exceso_kmh} km/h</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_BADGE[a.severidad] ?? 'bg-gray-100'}`}>
                        {a.severidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.estado === 'ACTIVA' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                        {a.estado.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => { markSeen(a.id); setSelected(a); }}
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
