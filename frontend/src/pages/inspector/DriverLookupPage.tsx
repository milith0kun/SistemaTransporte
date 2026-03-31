import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, AlertTriangle, CheckCircle, RefreshCw, ClipboardPlus } from 'lucide-react';
import { inspectorApi, type DriverLookup } from '../../services/inspectorApi';

const FATIGA_COLOR: Record<string, string> = {
  APTO:     'bg-green-100 text-green-800',
  RIESGO:   'bg-yellow-100 text-yellow-800',
  NO_APTO:  'bg-red-100 text-red-800',
  INACTIVO: 'bg-gray-100 text-gray-600',
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function DriverLookupPage() {
  const navigate = useNavigate();
  const [dni, setDni]       = useState('');
  const [result, setResult] = useState<DriverLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function handleSearch() {
    const d = dni.trim();
    if (!d) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await inspectorApi.lookupDriver(d);
      setResult(r);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? `Conductor con DNI ${d} no encontrado`);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartInspection() {
    if (!result) return;
    try {
      const insp = await inspectorApi.createInspection({
        tipo: 'VERIFICACION_CONDUCTOR',
        ubicacion_descripcion: 'Inspección iniciada desde búsqueda por DNI',
        driver_id: result.id,
      });
      navigate(`/inspector/inspections/${insp.id}`);
    } catch {
      alert('Error al crear inspección');
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 pb-24 sm:pb-8">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[#1B4F72]/10 rounded-lg">
            <User className="w-6 h-6 text-[#1B4F72]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Búsqueda de Conductor</h2>
            <p className="text-sm text-gray-500">Consulta rápida de estado y licencia por DNI</p>
          </div>
        </div>

        {/* Search Box */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={dni}
            onChange={e => setDni(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Ingrese DNI del conductor"
            maxLength={15}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-lg font-bold font-mono focus:border-[#2E86C1] focus:ring-2 focus:ring-[#2E86C1] outline-none transition-all placeholder:font-sans placeholder:font-normal placeholder:text-base"
          />
          <button onClick={handleSearch} disabled={loading || !dni.trim()}
            className="px-6 py-3 bg-[#1B4F72] text-white rounded-lg font-bold hover:bg-[#154360] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-[#2E86C1]">
            {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            Buscar
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl border border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-5">
          {/* Main card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-5">
              {result.foto_url
                ? <img src={result.foto_url} alt={result.nombre} className="w-full sm:w-28 h-28 rounded-xl object-cover border-2 border-gray-200 shrink-0" />
                : <div className="w-full sm:w-28 h-28 rounded-xl bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-200 shrink-0"><User className="h-10 w-10 text-gray-400" /></div>}
              <div className="flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{result.nombre}</h2>
                    <p className="text-sm font-medium text-gray-600 mt-0.5">DNI: <span className="font-mono text-gray-800">{result.dni}</span></p>
                  </div>
                  <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase border shadow-sm ${FATIGA_COLOR[result.fatiga.estado]?.replace('bg-', 'border-').replace('100', '200') ?? 'border-gray-200'} ${FATIGA_COLOR[result.fatiga.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                    Fatiga: {result.fatiga.estado}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">Empresa: <span className="font-bold text-gray-800">{result.empresa.nombre}</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Licencia */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                 <div className="p-1.5 bg-blue-100 rounded-md"><CheckCircle className="h-4 w-4 text-blue-600" /></div>
                 Licencia de Conducir
              </h3>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 font-medium">Número: <span className="font-mono font-bold text-gray-900 ml-1">{result.licencia.numero ?? '—'}</span></p>
                  {result.licencia.vigente !== null && (
                    result.licencia.vigente
                      ? <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-green-700 bg-green-100 px-2.5 py-1 rounded-md border border-green-200 shadow-sm"><CheckCircle className="h-3.5 w-3.5" /> VIGENTE</span>
                      : <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-red-700 bg-red-100 px-2.5 py-1 rounded-md border border-red-200 shadow-sm"><AlertTriangle className="h-3.5 w-3.5" /> VENCIDA</span>
                  )}
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Vencimiento</p>
                  <p className="text-sm font-bold text-gray-800">{fmtDate(result.licencia.vencimiento)}</p>
                </div>
                {result.licencia.dias_para_vencer !== null && result.licencia.dias_para_vencer > 0 && result.licencia.dias_para_vencer < 30 && (
                  <p className="text-xs font-bold text-yellow-800 bg-yellow-100/50 border border-yellow-200 px-3 py-2 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" /> Vence en {result.licencia.dias_para_vencer} días
                  </p>
                )}
              </div>
            </div>

            {/* Fatiga */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                 <div className="p-1.5 bg-blue-100 rounded-md"><User className="h-4 w-4 text-blue-600" /></div>
                 Estadísticas del Conductor
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Conducido (24h)</p>
                  <p className="text-xl font-bold text-gray-900">{result.fatiga.horas_conducidas_24h.toFixed(1)}h</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Reputación</p>
                  <p className="text-xl font-bold text-gray-900">{result.reputation_score}<span className="text-sm text-gray-400 font-medium">/100</span></p>
                </div>
              </div>
              {result.fatiga.ultima_pausa && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                   <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                     Última pausa: {new Date(result.fatiga.ultima_pausa).toLocaleString('es-PE', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}
                   </p>
                </div>
              )}
            </div>
          </div>

          {/* Active Trip */}
          {result.viaje_activo && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                 Viaje Activo Actual
              </h3>
              <div className="flex flex-col gap-1">
                 <p className="text-base font-bold text-blue-800 flex items-center gap-2">
                   {result.viaje_activo.ruta?.origen} <span className="text-blue-300">→</span> {result.viaje_activo.ruta?.destino}
                 </p>
                 <p className="text-sm font-medium text-blue-700">Vehículo: <span className="font-mono font-bold">{result.viaje_activo.vehiculo?.placa}</span></p>
              </div>
            </div>
          )}

          {/* Action */}
          <div className="sticky bottom-24 sm:static z-10 pt-2">
            <button onClick={handleStartInspection}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all">
              <ClipboardPlus className="h-5 w-5" /> Iniciar Inspección
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
