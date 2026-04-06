import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Gauge, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';
import { speedMonitor, type SpeedConfig, type SpeedStatus, type SpeedUpdateEvent } from '../../services/speedMonitor';
import { SpeedometerGauge } from './components/SpeedometerGauge';
import { SpeedAlertBanner } from './components/SpeedAlertBanner';

export function SpeedometerPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate   = useNavigate();
  const { token } = useAuthStore();

  const [config, setConfig]               = useState<SpeedConfig | null>(null);
  const [isTracking, setIsTracking]       = useState(false);
  const [gpsError, setGpsError]           = useState('');
  const [loading, setLoading]             = useState(true);

  const [currentSpeed, setCurrentSpeed]   = useState(0);
  const [maxSpeed, setMaxSpeed]           = useState(0);
  const [status, setStatus]               = useState<SpeedStatus>('NORMAL');
  const [excessSecs, setExcessSecs]       = useState(0);

  const monitoringRef = useRef(false);

  // ── Cargar configuración de velocidad ─────────────────────────────────────

  useEffect(() => {
    if (!tripId) return;
    api.get<SpeedConfig>(`/api/speed-monitor/config/${tripId}`)
      .then(setConfig)
      .catch(() => {
        setConfig({
          velocidad_alerta_kmh: 70, velocidad_maxima_kmh: 80,
          velocidad_critica_kmh: 100, tolerancia_kmh: 5, duracion_minima_segundos: 10,
        });
      })
      .finally(() => setLoading(false));
  }, [tripId]);

  // ── Escuchar eventos del SpeedMonitorService ──────────────────────────────

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const { speed_kmh, status: st, excess_duration_s } = (e as CustomEvent<SpeedUpdateEvent>).detail;
      setCurrentSpeed(speed_kmh);
      setStatus(st);
      setExcessSecs(excess_duration_s);
      setMaxSpeed(prev => Math.max(prev, speed_kmh));
    };
    const onError = (e: Event) => {
      setGpsError((e as CustomEvent<{ message: string }>).detail.message);
      setIsTracking(false);
    };
    window.addEventListener('speed-update', onUpdate);
    window.addEventListener('speed-error', onError);
    return () => {
      window.removeEventListener('speed-update', onUpdate);
      window.removeEventListener('speed-error', onError);
    };
  }, []);

  // ── Limpiar al desmontar ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (monitoringRef.current) {
        speedMonitor.stop();
        monitoringRef.current = false;
      }
    };
  }, []);

  // ── Activar tacómetro ─────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    if (!config || !tripId || !token) return;
    setGpsError('');
    try {
      await speedMonitor.start(tripId, config, token);
      monitoringRef.current = true;
      setIsTracking(true);
    } catch (e: any) {
      setGpsError(e.message ?? 'Error al iniciar el GPS');
    }
  }, [config, tripId, token]);

  // ── Desactivar tacómetro ──────────────────────────────────────────────────

  const handleStop = useCallback(() => {
    if (!window.confirm('¿Desactivar el tacómetro? Dejarás de monitorear la velocidad.')) return;
    speedMonitor.stop();
    monitoringRef.current = false;
    setIsTracking(false);
    setCurrentSpeed(0);
    setStatus('NORMAL');
    setExcessSecs(0);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-white text-center">
          <Gauge className="h-12 w-12 mx-auto mb-3 animate-spin text-blue-400" />
          <p>Cargando configuración…</p>
        </div>
      </div>
    );
  }

  // ── UI: fondo oscuro (modo noche) ─────────────────────────────────────────

  const bgClass = status === 'CRITICO' ? 'bg-red-950'
                : status === 'EXCESO'  ? 'bg-gray-950'
                : 'bg-gray-950';

  return (
    <div className={`min-h-screen ${bgClass} text-white flex flex-col px-4 py-4 gap-4`}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg flex items-center gap-2">
            <Gauge className="h-5 w-5 text-blue-400" />
            Tacómetro
          </h1>
          {isTracking && (
            <p className="text-xs text-green-400">● GPS activo — monitoreando velocidad</p>
          )}
        </div>
      </div>

      {/* Gauge SVG */}
      <div className="bg-gray-900 rounded-3xl p-4">
        <SpeedometerGauge
          currentSpeed={currentSpeed}
          alertSpeed={config?.velocidad_alerta_kmh ?? 70}
          maxSpeed={config?.velocidad_maxima_kmh ?? 80}
          criticalSpeed={config?.velocidad_critica_kmh ?? 100}
        />
        <div className="text-center mt-1 text-xs text-gray-400">
          Límite: <span className="font-bold text-white">{config?.velocidad_maxima_kmh ?? 80} km/h</span>
          {' · '}Alerta: <span className="text-yellow-400">{config?.velocidad_alerta_kmh ?? 70} km/h</span>
          {' · '}Crítico: <span className="text-red-400">{config?.velocidad_critica_kmh ?? 100} km/h</span>
        </div>
      </div>

      {/* Banner de estado */}
      <SpeedAlertBanner
        status={status}
        speed={currentSpeed}
        limit={config?.velocidad_maxima_kmh ?? 80}
        excessSecs={excessSecs}
      />

      {/* Info adicional */}
      {isTracking && (
        <div className="bg-gray-900 rounded-2xl p-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs">Vel. máxima registrada</p>
            <p className="font-bold text-orange-300 text-lg">{Math.round(maxSpeed)} km/h</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Estado GPS</p>
            <p className="font-bold text-green-400 text-sm">Activo ✓</p>
          </div>
        </div>
      )}

      {/* Error GPS */}
      {gpsError && (
        <div className="bg-red-900/50 border border-red-500 rounded-2xl p-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{gpsError}</p>
        </div>
      )}

      {/* Botones */}
      <div className="space-y-3 mt-auto pb-6">
        {!isTracking ? (
          <button
            onClick={handleStart}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white
                       rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all"
          >
            <Gauge className="h-6 w-6" />
            ACTIVAR TACÓMETRO
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="w-full py-4 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white
                       rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all"
          >
            DESACTIVAR TACÓMETRO
          </button>
        )}
      </div>

      {/* Aviso de uso */}
      {!isTracking && (
        <p className="text-center text-xs text-gray-500 -mt-2 pb-2">
          Al activar el tacómetro, el GPS de tu dispositivo monitoreará la velocidad.
          Si se detecta un exceso se notificará automáticamente al Fiscal y Operador.
        </p>
      )}
    </div>
  );
}
