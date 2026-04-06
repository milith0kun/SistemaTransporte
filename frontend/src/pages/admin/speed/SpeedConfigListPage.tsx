import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge, Plus, Edit, PowerOff } from 'lucide-react';
import api from '../../../services/api';

interface SpeedConfig {
  id: string;
  route_id: string | null;
  route?: { origin: string; destination: string };
  velocidad_alerta_kmh: number;
  velocidad_maxima_kmh: number;
  velocidad_critica_kmh: number;
  tolerancia_kmh: number;
  duracion_minima_segundos: number;
  tipo_zona: string;
  descripcion?: string;
  activo: boolean;
  created_at: string;
}

const ZONA_LABELS: Record<string, string> = {
  URBANA: 'Urbana', CARRETERA: 'Carretera', ZONA_ESCOLAR: 'Zona Escolar',
  CURVAS: 'Curvas', GENERAL: 'General',
};

export function SpeedConfigListPage() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<SpeedConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get<SpeedConfig[]>('/api/speed-config')
      .then(setConfigs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deactivate = async (id: string) => {
    if (!window.confirm('¿Desactivar esta configuración?')) return;
    await api.patch(`/api/speed-config/${id}/deactivate`);
    load();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gauge className="h-6 w-6 text-blue-600" />
            Control de Velocidad
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure los límites de velocidad para cada ruta o de forma general.
            Cuando un ciudadano detecta un exceso, se notifica automáticamente al Fiscal y Operador.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/speed-config/new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium"
        >
          <Plus className="h-4 w-4" />
          Nueva Configuración
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando…</div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl text-gray-500">
          <Gauge className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Sin configuraciones</p>
          <p className="text-sm">Crea una configuración para que el tacómetro del ciudadano tenga límites definidos.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-4 py-3 text-left">Ruta / Ámbito</th>
                <th className="px-4 py-3 text-center">Alerta</th>
                <th className="px-4 py-3 text-center">Máximo</th>
                <th className="px-4 py-3 text-center">Crítico</th>
                <th className="px-4 py-3 text-center">Zona</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {configs.map(c => (
                <tr key={c.id} className={`hover:bg-gray-50 ${!c.activo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    {c.route ? (
                      <div>
                        <p className="font-medium text-gray-900">{c.route.origin} → {c.route.destination}</p>
                        {c.descripcion && <p className="text-xs text-gray-400">{c.descripcion}</p>}
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-blue-700">General (todas las rutas)</p>
                        {c.descripcion && <p className="text-xs text-gray-400">{c.descripcion}</p>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-yellow-600 font-bold">{c.velocidad_alerta_kmh} km/h</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-red-600 font-bold">{c.velocidad_maxima_kmh} km/h</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-red-900 font-bold">{c.velocidad_critica_kmh} km/h</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {ZONA_LABELS[c.tipo_zona] ?? c.tipo_zona}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/admin/speed-config/${c.id}/edit`)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {c.activo && (
                        <button
                          onClick={() => deactivate(c.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Desactivar"
                        >
                          <PowerOff className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
