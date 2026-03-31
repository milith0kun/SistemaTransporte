import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, RefreshCw, AlertTriangle, User, ClipboardPlus } from 'lucide-react';
import { inspectorApi, type ActiveTrip } from '../../services/inspectorApi';
import { useInspectorSocket } from '../../hooks/useInspectorSocket';

const FATIGA_COLOR: Record<string, string> = {
  APTO:    'bg-green-100 text-green-800',
  RIESGO:  'bg-yellow-100 text-yellow-800',
  NO_APTO: 'bg-red-100 text-red-800',
  INACTIVO:'bg-gray-100 text-gray-600',
};

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function ActiveTripsPage() {
  const navigate = useNavigate();
  const [trips, setTrips]     = useState<ActiveTrip[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await inspectorApi.getActiveTrips();
      setTrips(data);
    } catch {
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useInspectorSocket({
    'trip:status_changed': () => load(),
    'fatigue:alert':       () => load(),
    'dashboard:update':    () => load(),
  });

  async function startInspection(trip: ActiveTrip) {
    try {
      const insp = await inspectorApi.createInspection({
        tipo: 'CONTROL_RUTA',
        ubicacion_descripcion: `Inspección de viaje: ${trip.ruta.origen} → ${trip.ruta.destino}`,
        vehicle_id: trip.vehiculo.id,
        trip_id: trip.id,
      });
      navigate(`/inspector/inspections/${insp.id}`);
    } catch {
      alert('Error al crear inspección');
    }
  }

  const riesgoCount   = trips.filter(t => t.tiene_conductor_riesgo && !t.tiene_conductor_bloqueado).length;
  const bloqueadoCount = trips.filter(t => t.tiene_conductor_bloqueado).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1B4F72]/10 rounded-lg">
            <Truck className="w-6 h-6 text-[#1B4F72]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Viajes Activos</h2>
            <p className="text-sm text-gray-500">{trips.length} viaje{trips.length !== 1 ? 's' : ''} EN CURSO en tu jurisdicción</p>
          </div>
        </div>
        <button onClick={load} className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-white text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 focus:ring-2 focus:ring-[#2E86C1] focus:outline-none transition-colors shadow-sm">
          <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Summary badges */}
      {(riesgoCount + bloqueadoCount) > 0 && (
        <div className="flex gap-3 flex-wrap">
          {bloqueadoCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-100 text-red-800 border border-red-200 rounded-xl text-sm font-bold shadow-sm">
              <AlertTriangle className="h-4 w-4" /> {bloqueadoCount} con conductor NO_APTO
            </div>
          )}
          {riesgoCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-xl text-sm font-bold shadow-sm">
              <AlertTriangle className="h-4 w-4" /> {riesgoCount} con conductor en RIESGO
            </div>
          )}
        </div>
      )}

      {loading && trips.length === 0 ? (
        <div className="flex justify-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-gray-50/80 rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
          <Truck className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium">No hay viajes activos en este momento</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {trips.map(trip => {
            const isAlert = trip.tiene_conductor_bloqueado || trip.tiene_conductor_riesgo;
            const rowBg = trip.tiene_conductor_bloqueado
              ? 'border-red-200 bg-red-50'
              : trip.tiene_conductor_riesgo
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-gray-200 bg-white hover:border-blue-200 transition-colors';

            return (
              <div key={trip.id} className={`rounded-xl border shadow-sm ${rowBg} p-5 flex flex-col justify-between`}>
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                      {trip.vehiculo.foto_url
                        ? <img src={trip.vehiculo.foto_url} alt={trip.vehiculo.placa} className="w-16 h-14 rounded-lg object-cover border-2 border-white shadow-sm shrink-0" />
                        : <div className="w-16 h-14 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm shrink-0"><Truck className="h-6 w-6 text-gray-400" /></div>}
                      <div>
                        <p className="font-mono font-bold text-gray-900 text-lg tracking-wider leading-none">{trip.vehiculo.placa}</p>
                        <p className="text-xs font-medium text-gray-500 mt-1 line-clamp-1">{trip.vehiculo.empresa.nombre}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`mt-4 p-3 rounded-lg border ${isAlert ? 'bg-white/60 border-gray-200/50' : 'bg-gray-50 border-gray-100'} grid grid-cols-2 gap-3 text-sm`}>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Ruta</p>
                      <p className="font-bold text-gray-800 text-xs truncate" title={`${trip.ruta.origen} → ${trip.ruta.destino}`}>{trip.ruta.origen} <span className="text-gray-400 font-normal">→</span> {trip.ruta.destino}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Tiempo</p>
                      <p className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        {formatDuration(trip.minutos_transcurridos)}
                      </p>
                    </div>
                  </div>

                  {trip.conductores.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Conductores</p>
                      <div className="flex flex-wrap gap-2">
                        {trip.conductores.map(c => (
                          <div key={c.id} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-gray-200 shadow-sm">
                            {c.foto_url
                              ? <img src={c.foto_url} alt={c.nombre} className="w-6 h-6 rounded-full object-cover border border-gray-100 shrink-0" />
                              : <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><User className="h-3.5 w-3.5 text-gray-400" /></div>}
                            <span className="text-xs font-bold text-gray-800">{c.nombre.split(' ')[0]}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border ${FATIGA_COLOR[c.estado_fatiga]?.replace('bg-', 'border-').replace('100', '200')} ${FATIGA_COLOR[c.estado_fatiga] ?? 'bg-gray-100 text-gray-600'}`}>
                              {c.estado_fatiga}
                            </span>
                            {c.horas_conducidas > 0 && (
                              <span className="text-xs font-medium text-gray-400 ml-1">{c.horas_conducidas.toFixed(1)}h</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-gray-200/60">
                  <button
                    onClick={() => startInspection(trip)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-sm hover:bg-blue-700 hover:shadow-md transition-all">
                    <ClipboardPlus className="h-4 w-4" /> Iniciar Inspección
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
