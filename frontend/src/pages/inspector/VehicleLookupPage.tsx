import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Car, AlertTriangle, CheckCircle, RefreshCw, ClipboardPlus, User, XCircle } from 'lucide-react';
import { inspectorApi, type VehicleLookup } from '../../services/inspectorApi';

const STATUS_COLOR: Record<string, string> = {
  ACTIVO: 'bg-green-100 text-green-800',
  INACTIVO: 'bg-gray-100 text-gray-600',
  EN_MANTENIMIENTO: 'bg-yellow-100 text-yellow-800',
  SUSPENDIDO: 'bg-red-100 text-red-800',
  FUERA_DE_CIRCULACION: 'bg-red-200 text-red-900',
  DADO_DE_BAJA: 'bg-gray-200 text-gray-700',
};

const FATIGA_COLOR: Record<string, string> = {
  APTO:    'bg-green-100 text-green-800',
  RIESGO:  'bg-yellow-100 text-yellow-800',
  NO_APTO: 'bg-red-100 text-red-800',
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function VehicleLookupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialResult = (location.state as any)?.vehicleResult ?? null;

  const [plate, setPlate]   = useState('');
  const [result, setResult] = useState<VehicleLookup | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function handleSearch() {
    const p = plate.trim().toUpperCase();
    if (!p) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await inspectorApi.lookupVehicle(p);
      setResult(r);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? `Vehículo ${p} no encontrado`);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartInspection() {
    if (!result) return;
    try {
      const insp = await inspectorApi.createInspection({
        tipo: 'INSPECCION_VEHICULO',
        ubicacion_descripcion: 'Inspección iniciada desde búsqueda por placa',
        vehicle_id: result.id,
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
            <Car className="w-6 h-6 text-[#1B4F72]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Búsqueda de Vehículo</h2>
            <p className="text-sm text-gray-500">Consulta rápida de estado y documentos por placa</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={plate}
            onChange={e => setPlate(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Ej: ABC-123"
            maxLength={10}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-lg font-bold font-mono uppercase focus:border-[#2E86C1] focus:ring-2 focus:ring-[#2E86C1] outline-none transition-all placeholder:font-sans placeholder:font-normal placeholder:text-base"
          />
          <button onClick={handleSearch} disabled={loading || !plate.trim()}
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
        <div className="space-y-4">
          {/* Alerts */}
          {(['SUSPENDIDO','FUERA_DE_CIRCULACION','DADO_DE_BAJA'].includes(result.estado) ||
            !result.documentos.soat_vigente || !result.documentos.revision_tecnica_vigente) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> Alertas detectadas
              </h3>
              <ul className="space-y-1">
                {['SUSPENDIDO','FUERA_DE_CIRCULACION','DADO_DE_BAJA'].includes(result.estado) && (
                  <li className="text-sm text-red-700">• Vehículo en estado: {result.estado}</li>
                )}
                {!result.documentos.soat_vigente && (
                  <li className="text-sm text-red-700">• SOAT vencido ({fmtDate(result.documentos.soat_vencimiento)})</li>
                )}
                {!result.documentos.revision_tecnica_vigente && (
                  <li className="text-sm text-red-700">• Revisión técnica vencida ({fmtDate(result.documentos.revision_tecnica_vencimiento)})</li>
                )}
              </ul>
            </div>
          )}

          {/* Vehicle Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-5">
              {result.foto_url
                ? <img src={result.foto_url} alt={result.placa} className="w-full sm:w-32 h-32 rounded-xl object-cover border border-gray-200 shrink-0" />
                : <div className="w-full sm:w-32 h-32 rounded-xl bg-gray-50 flex items-center justify-center border border-dashed border-gray-300 shrink-0"><Car className="h-10 w-10 text-gray-300" /></div>}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-3xl font-bold font-mono text-gray-900 tracking-widest">{result.placa}</p>
                  <span className={`inline-flex px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide border shadow-sm ${STATUS_COLOR[result.estado]?.replace('bg-', 'border-').replace('100', '200') ?? 'border-gray-200'} ${STATUS_COLOR[result.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                    {result.estado}
                  </span>
                </div>
                <p className="text-base text-gray-700 font-medium">{[result.marca, result.modelo].filter(Boolean).join(' ')} {result.year && <span className="text-gray-500 font-normal">({result.year})</span>}</p>
                {result.color && <p className="text-sm text-gray-500">Color: <span className="font-medium text-gray-700">{result.color}</span></p>}
                <p className="text-sm text-gray-500">Empresa: <span className="font-medium text-gray-900">{result.empresa.nombre}</span></p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5 border-t border-gray-100">
              {[
                { label: 'SOAT', vigente: result.documentos.soat_vigente, venc: result.documentos.soat_vencimiento },
                { label: 'Rev. Técnica', vigente: result.documentos.revision_tecnica_vigente, venc: result.documentos.revision_tecnica_vencimiento },
              ].map(doc => (
                <div key={doc.label} className={`flex items-center gap-3 p-3.5 rounded-xl border ${doc.vigente ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                  {doc.vigente ? <CheckCircle className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
                  <div>
                    <span className="font-bold text-sm">{doc.label}</span>
                    <p className="text-xs font-medium mt-0.5 opacity-80">{doc.vigente ? 'Vigente hasta' : 'Vencido el'} {fmtDate(doc.venc)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Trip */}
          {result.viaje_activo ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-md">
                   <Car className="h-4 w-4 text-blue-600" />
                </div>
                Viaje Activo
              </h3>
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 mb-4">
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  {result.viaje_activo.ruta?.origen} <span className="text-gray-400">→</span> {result.viaje_activo.ruta?.destino}
                </p>
                <p className="text-xs font-medium text-gray-600 mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Inicio: {new Date(result.viaje_activo.hora_inicio).toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
              
              {result.viaje_activo.conductores?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Conductores Asignados:</p>
                  <div className="grid grid-cols-1 gap-3">
                    {result.viaje_activo.conductores.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                        {c.foto_url
                          ? <img src={c.foto_url} alt={c.nombre} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm shrink-0" />
                          : <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border-2 border-gray-100 shadow-sm shrink-0"><User className="h-5 w-5 text-gray-400" /></div>}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{c.nombre}</p>
                          <span className={`inline-flex mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase border shadow-sm ${FATIGA_COLOR[c.estado_fatiga]?.replace('bg-', 'border-').replace('100', '200')} ${FATIGA_COLOR[c.estado_fatiga] ?? 'bg-gray-100 text-gray-600'}`}>
                            Fatiga: {c.estado_fatiga}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 shadow-sm">
              <div className="flex items-center gap-3 text-sm text-yellow-800">
                <div className="p-2 bg-yellow-100 rounded-lg shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-bold">Sin viaje activo</p>
                  <p className="text-xs text-yellow-700 mt-0.5">No hay un viaje registrado en curso para este vehículo.</p>
                </div>
              </div>
            </div>
          )}

          <div className="sticky bottom-24 sm:static z-10 pt-2">
            <button onClick={handleStartInspection}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2">
              <ClipboardPlus className="h-5 w-5" /> Iniciar Inspección
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
