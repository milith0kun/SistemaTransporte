import { useState } from 'react';
import { X, MapPin, Clock, Car, User, CheckCircle } from 'lucide-react';
import api from '../../../services/api';

interface SpeedAlert {
  id: string;
  vehicle?: { plate: string; company?: { name: string } };
  driver?: { nombres: string; apellidos: string };
  reporter?: { name: string };
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
  trip?: { route?: { origin: string; destination: string } };
  created_at: string;
}

interface Props {
  alert: SpeedAlert;
  onClose: () => void;
  onResolved: () => void;
}

const SEVERITY_BADGE: Record<string, string> = {
  ADVERTENCIA: 'bg-yellow-100 text-yellow-800',
  MODERADO:    'bg-orange-100 text-orange-800',
  GRAVE:       'bg-red-100 text-red-800',
  CRITICO:     'bg-red-200 text-red-900 font-bold',
};

export function SpeedAlertDetailModal({ alert, onClose, onResolved }: Props) {
  const [notas, setNotas] = useState('');
  const [derivar, setDerivar] = useState(false);
  const [resolving, setResolving] = useState(false);

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const resolve = async (estado: 'RESUELTA' | 'FALSO_POSITIVO') => {
    setResolving(true);
    try {
      await api.patch(`/api/speed-alerts/${alert.id}/resolve`, {
        estado, notas_resolucion: notas || undefined, derivo_sancion: derivar,
      });
      onResolved();
    } catch (e) {
      console.error(e);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-gray-900">Detalle de Alerta</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_BADGE[alert.severidad] ?? 'bg-gray-100'}`}>
              {alert.severidad}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Velocidad */}
          <div className="bg-red-50 rounded-2xl p-4 text-center">
            <p className="text-4xl font-bold text-red-600">{Math.round(Number(alert.velocidad_detectada_kmh))} km/h</p>
            <p className="text-sm text-gray-600 mt-1">
              Límite: <span className="font-bold">{alert.velocidad_limite_kmh} km/h</span>
              {' · '}Exceso: <span className="font-bold text-red-600">+{alert.exceso_kmh} km/h</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Duración del exceso: {formatSecs(alert.duracion_exceso_segundos)}
              {alert.velocidad_maxima_registrada_kmh && (
                <> · Pico: {Math.round(Number(alert.velocidad_maxima_registrada_kmh))} km/h</>
              )}
            </p>
          </div>

          {/* Vehículo y conductor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Car className="h-4 w-4 text-gray-500" />
                <span className="text-xs text-gray-500">Vehículo</span>
              </div>
              <p className="font-bold text-gray-900">{alert.vehicle?.plate ?? '—'}</p>
              <p className="text-xs text-gray-400">{alert.vehicle?.company?.name ?? ''}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-xs text-gray-500">Conductor</span>
              </div>
              <p className="font-medium text-gray-900 text-sm">
                {alert.driver ? `${alert.driver.nombres} ${alert.driver.apellidos}` : 'Sin asignar'}
              </p>
            </div>
          </div>

          {/* Ruta */}
          {alert.trip?.route && (
            <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-3 text-sm">
              <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span>{alert.trip.route.origin} → {alert.trip.route.destination}</span>
            </div>
          )}

          {/* Ubicación GPS */}
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">Ubicación</span>
            </div>
            <p className="text-gray-700 mt-1">
              {alert.ubicacion_descripcion ?? `${alert.latitud}, ${alert.longitud}`}
            </p>
            <p className="text-xs text-gray-400">GPS: {Number(alert.latitud).toFixed(6)}, {Number(alert.longitud).toFixed(6)}</p>
          </div>

          {/* Reportado por */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            Reportado por ciudadano: <span className="font-medium">{alert.reporter?.name ?? '—'}</span>
          </div>

          {/* Tiempo */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            {new Date(alert.created_at).toLocaleString('es-PE')}
          </div>

          {/* Acciones de resolución (solo si está activa) */}
          {(alert.estado === 'ACTIVA' || alert.estado === 'VISTA_FISCAL' || alert.estado === 'VISTA_OPERADOR') && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Resolver alerta</p>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Notas de resolución (opcional)"
                rows={2}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none"
              />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={derivar} onChange={e => setDerivar(e.target.checked)} className="rounded" />
                Marcar como que derivó en sanción
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => resolve('FALSO_POSITIVO')}
                  disabled={resolving}
                  className="py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                >
                  Falso positivo
                </button>
                <button
                  onClick={() => resolve('RESUELTA')}
                  disabled={resolving}
                  className="py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-60"
                >
                  <CheckCircle className="h-4 w-4" />
                  Resolver
                </button>
              </div>
            </div>
          )}

          {/* Estado resuelto */}
          {(alert.estado === 'RESUELTA' || alert.estado === 'FALSO_POSITIVO') && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Alerta {alert.estado === 'RESUELTA' ? 'resuelta' : 'marcada como falso positivo'}
              </p>
              {alert.notas_resolucion && (
                <p className="text-xs text-gray-500 mt-1">{alert.notas_resolucion}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
