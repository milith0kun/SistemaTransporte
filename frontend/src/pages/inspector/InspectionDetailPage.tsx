import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ClipboardCheck, Car, User, MapPin, Camera,
  Plus, CheckCircle, AlertTriangle, XCircle, RefreshCw, ShieldAlert,
} from 'lucide-react';
import { inspectorApi, type Inspection } from '../../services/inspectorApi';

const RESULT_COLOR: Record<string, string> = {
  EN_PROCESO:          'bg-blue-100 text-blue-800',
  CONFORME:            'bg-green-100 text-green-800',
  CON_OBSERVACIONES:   'bg-yellow-100 text-yellow-800',
  INFRACCION_DETECTADA:'bg-red-100 text-red-800',
};

const GRAVEDAD_COLOR: Record<string, string> = {
  LEVE:     'bg-yellow-100 text-yellow-800',
  MODERADA: 'bg-orange-100 text-orange-800',
  GRAVE:    'bg-red-100 text-red-800',
};

export function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action');

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Observation form
  const [showObsForm, setShowObsForm] = useState(action === 'observe');
  const [obsDesc, setObsDesc]   = useState('');
  const [obsTipo, setObsTipo]   = useState('OTRO');
  const [obsGrav, setObsGrav]   = useState<'LEVE'|'MODERADA'|'GRAVE'>('LEVE');
  const [savingObs, setSavingObs] = useState(false);

  // Finalize form
  const [showFinalizeForm, setShowFinalizeForm] = useState(action === 'finalize' || action === 'infraccion');
  const [finResultado, setFinResultado] = useState(action === 'infraccion' ? 'INFRACCION_DETECTADA' : 'CONFORME');
  const [finNotas, setFinNotas]   = useState('');
  const [finDerivar, setFinDerivar] = useState(action === 'infraccion');
  const [finalizing, setFinalizing] = useState(false);

  // Photo upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const insp = await inspectorApi.getInspection(id);
      setInspection(insp);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo cargar la inspección');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleAddObs() {
    if (!id || !obsDesc.trim()) return;
    setSavingObs(true);
    try {
      const updated = await inspectorApi.addObservacion(id, { descripcion: obsDesc, tipo: obsTipo, gravedad: obsGrav });
      setInspection(updated);
      setShowObsForm(false);
      setObsDesc('');
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Error al guardar observación');
    } finally {
      setSavingObs(false);
    }
  }

  async function handleFinalize() {
    if (!id) return;
    setFinalizing(true);
    try {
      const updated = await inspectorApi.finalizeInspection(id, {
        resultado: finResultado,
        notas_adicionales: finNotas || undefined,
        derivar_sancion: finDerivar,
      });
      setInspection(updated);
      setShowFinalizeForm(false);
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Error al finalizar');
    } finally {
      setFinalizing(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingPhoto(true);
    try {
      const updated = await inspectorApi.addFoto(id, file);
      setInspection(updated);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Error al subir foto');
    } finally {
      setUploadingPhoto(false);
      e.target.value = ''; // Reset input
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="text-center py-16">
      <p className="text-red-600 mb-3">{error}</p>
      <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Volver</button>
    </div>
  );

  if (!inspection) return null;

  const isOpen = inspection.resultado === 'EN_PROCESO';

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1B4F72]/10 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-[#1B4F72]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Inspección</h2>
              <p className="text-sm text-gray-500 capitalize">{inspection.tipo.replace(/_/g, ' ').toLowerCase()} · {new Date(inspection.created_at).toLocaleString('es-PE', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
            </div>
          </div>
        </div>
        <div className="sm:ml-auto flex">
          <span className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase shadow-sm border ${RESULT_COLOR[inspection.resultado]?.replace('bg-', 'border-').replace('100', '200') ?? 'border-gray-200'} ${RESULT_COLOR[inspection.resultado] ?? 'bg-gray-100 text-gray-600'}`}>
            {inspection.resultado.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-3 mb-3">Detalles Generales</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {inspection.ubicacion_descripcion && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <MapPin className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Ubicación</p>
                <p className="text-sm font-medium text-gray-800">{inspection.ubicacion_descripcion}</p>
              </div>
            </div>
          )}
          {(inspection as any).vehicle && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <Car className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Vehículo</p>
                <p className="text-sm font-bold font-mono text-gray-900 tracking-wider">{(inspection as any).vehicle.plate}</p>
                <p className="text-xs text-gray-600 mt-0.5">{(inspection as any).vehicle.brand} {(inspection as any).vehicle.model}</p>
              </div>
            </div>
          )}
          {(inspection as any).driver && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 sm:col-span-2">
              <User className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Conductor</p>
                <p className="text-sm font-bold text-gray-800">{(inspection as any).driver.name}</p>
                <p className="text-xs text-gray-600 mt-0.5 font-mono">DNI: {(inspection as any).driver.dni}</p>
              </div>
            </div>
          )}
        </div>
        {inspection.notas_adicionales && (
          <div className="mt-4 p-4 bg-yellow-50/50 rounded-lg border border-yellow-100">
            <p className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-1">Notas Adicionales</p>
            <p className="text-sm text-gray-700">{inspection.notas_adicionales}</p>
          </div>
        )}
      </div>

      {/* Verificacion Conductor */}
      {inspection.verificacion_conductor && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md"><User className="h-4 w-4 text-blue-600" /></div>
            Verificación de Conductor
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              ['Conductor coincide', inspection.verificacion_conductor.conductor_coincide],
              ['Licencia vigente', inspection.verificacion_conductor.licencia_vigente],
              ['Categoría correcta', inspection.verificacion_conductor.licencia_categoria_correcta],
            ].map(([label, val]) => (
              <div key={String(label)} className={`flex items-center gap-3 p-3 rounded-xl border ${val ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                {val ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0" /> : <XCircle className="h-5 w-5 text-red-600 shrink-0" />}
                <span className={`font-medium ${val ? 'text-green-800' : 'text-red-800'}`}>{String(label)}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="h-5 w-5 flex items-center justify-center shrink-0">👁️</div>
              <div>
                <p className="text-xs text-gray-500 font-medium leading-none mb-1">Fatiga visual</p>
                <span className="font-bold text-gray-800 leading-none">{inspection.verificacion_conductor.estado_fatiga_visual}</span>
              </div>
            </div>
          </div>
          {inspection.verificacion_conductor.observaciones_conductor && (
            <div className="mt-4 text-sm text-gray-700 bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
              <p>{inspection.verificacion_conductor.observaciones_conductor}</p>
            </div>
          )}
        </div>
      )}

      {/* Verificacion Vehiculo */}
      {inspection.verificacion_vehiculo && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md"><Car className="h-4 w-4 text-blue-600" /></div>
            Verificación de Vehículo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              ['Luces funcionan', inspection.verificacion_vehiculo.luces_funcionan],
              ['Documentos vigentes', inspection.verificacion_vehiculo.documentos_vigentes],
              ['SOAT vigente', inspection.verificacion_vehiculo.soat_vigente],
              ['Rev. técnica vigente', inspection.verificacion_vehiculo.revision_tecnica_vigente],
            ].map(([label, val]) => (
              <div key={String(label)} className={`flex items-center gap-3 p-3 rounded-xl border ${val ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                {val ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0" /> : <XCircle className="h-5 w-5 text-red-600 shrink-0" />}
                <span className={`font-medium ${val ? 'text-green-800' : 'text-red-800'}`}>{String(label)}</span>
              </div>
            ))}
          </div>
          {inspection.verificacion_vehiculo.capacidad_excedida && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-bold">
              <AlertTriangle className="h-5 w-5 text-red-600" /> Capacidad excedida de pasajeros
            </div>
          )}
        </div>
      )}

      {/* Observations */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md"><ClipboardCheck className="h-4 w-4 text-blue-600" /></div>
            Observaciones ({inspection.observaciones?.length ?? 0})
          </h2>
          {isOpen && (
            <button onClick={() => setShowObsForm(!showObsForm)}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
              <Plus className="h-4 w-4" /> Agregar
            </button>
          )}
        </div>

        {showObsForm && (
          <div className="mb-5 p-4 sm:p-5 bg-blue-50/50 rounded-xl border-2 border-blue-100 space-y-4">
            <h3 className="text-sm font-bold text-blue-900 mb-1">Nueva Observación</h3>
            <textarea
              value={obsDesc} onChange={e => setObsDesc(e.target.value)}
              placeholder="Descripción detallada de la observación…"
              rows={3}
              className="w-full text-sm border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-[#2E86C1] focus:border-[#2E86C1] transition-colors outline-none bg-white"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                 <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Tipo</label>
                 <select value={obsTipo} onChange={e => setObsTipo(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2E86C1] focus:border-[#2E86C1] bg-white transition-colors">
                  {['DOCUMENTOS','ESTADO_VEHICULO','CONDUCTOR','RUTA','PASAJEROS','OTRO'].map(t =>
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="flex-1">
                 <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Gravedad</label>
                 <select value={obsGrav} onChange={e => setObsGrav(e.target.value as any)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2E86C1] focus:border-[#2E86C1] bg-white transition-colors">
                  <option value="LEVE">LEVE</option>
                  <option value="MODERADA">MODERADA</option>
                  <option value="GRAVE">GRAVE</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-blue-100">
              <button onClick={() => setShowObsForm(false)} className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
              <button onClick={handleAddObs} disabled={savingObs || !obsDesc.trim()}
                className="px-6 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 hover:shadow disabled:opacity-50 transition-all flex items-center gap-2">
                {savingObs ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {savingObs ? 'Guardando…' : 'Guardar Observación'}
              </button>
            </div>
          </div>
        )}

        {(!inspection.observaciones || inspection.observaciones.length === 0) && !showObsForm ? (
          <div className="flex flex-col items-center justify-center py-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
             <ClipboardCheck className="h-8 w-8 text-gray-300 mb-2" />
             <p className="text-sm font-medium text-gray-500 text-center">Sin observaciones registradas</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {(inspection.observaciones ?? []).map((obs, i) => (
              <li key={i} className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/80 hover:bg-gray-50 transition-colors">
                <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm shrink-0">
                  <AlertTriangle className={`h-5 w-5 ${obs.gravedad === 'GRAVE' ? 'text-red-500' : obs.gravedad === 'MODERADA' ? 'text-orange-500' : 'text-yellow-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-relaxed">{obs.descripcion}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">{obs.tipo.replace(/_/g,' ')}</span>
                    <span className={`text-xs px-2 py-1 rounded-md font-bold tracking-wide shadow-sm border ${GRAVEDAD_COLOR[obs.gravedad]?.replace('bg-', 'border-').replace('100', '200')} ${GRAVEDAD_COLOR[obs.gravedad]}`}>{obs.gravedad}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Photos */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md"><Camera className="h-4 w-4 text-blue-600" /></div>
            Fotos de Evidencia ({inspection.fotos_evidencia?.length ?? 0})
          </h2>
          {isOpen && (
            <label className={`flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploadingPhoto ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 
              {uploadingPhoto ? 'Subiendo...' : 'Agregar Foto'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
            </label>
          )}
        </div>
        {(inspection.fotos_evidencia?.length ?? 0) > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {inspection.fotos_evidencia.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="block group aspect-square">
                <div className="w-full h-full rounded-xl overflow-hidden border-2 border-gray-100 group-hover:border-blue-400 group-hover:shadow-md transition-all">
                  <img src={url} alt={`Evidencia ${i+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
             <Camera className="h-8 w-8 text-gray-300 mb-2" />
             <p className="text-sm font-medium text-gray-500 text-center">Sin fotos registradas</p>
          </div>
        )}
      </div>

      {/* Finalize Section */}
      {isOpen && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm sticky bottom-24 sm:static z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" /> Finalizar Inspección
            </h2>
            {!showFinalizeForm && (
              <button onClick={() => setShowFinalizeForm(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">Abrir formulario</button>
            )}
          </div>

          {showFinalizeForm && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Resultado *</label>
                <select value={finResultado} onChange={e => { setFinResultado(e.target.value); setFinDerivar(e.target.value === 'INFRACCION_DETECTADA'); }}
                  className={`w-full text-sm border rounded-lg px-4 py-2.5 outline-none font-medium transition-colors focus:ring-2 focus:ring-offset-1 focus:ring-[#2E86C1] ${finResultado === 'CONFORME' ? 'border-green-300 bg-green-50 text-green-800' : finResultado === 'INFRACCION_DETECTADA' ? 'border-red-300 bg-red-50 text-red-800' : 'border-gray-300'}`}>
                  <option value="CONFORME">CONFORME</option>
                  <option value="CON_OBSERVACIONES">CON OBSERVACIONES</option>
                  <option value="INFRACCION_DETECTADA">INFRACCIÓN DETECTADA</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Notas adicionales</label>
                <textarea value={finNotas} onChange={e => setFinNotas(e.target.value)} rows={3}
                  className="w-full text-sm border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-[#2E86C1] focus:border-[#2E86C1] transition-colors outline-none"
                  placeholder="Observaciones finales…" />
              </div>
              {finResultado === 'INFRACCION_DETECTADA' && (
                <label className="flex items-center gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100 cursor-pointer hover:bg-red-50 transition-colors">
                  <input type="checkbox" checked={finDerivar} onChange={e => setFinDerivar(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                  <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-red-500" /> Derivar a proceso de sanción
                  </span>
                </label>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <button onClick={() => setShowFinalizeForm(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2E86C1]">
                  Cancelar
                </button>
                <button onClick={handleFinalize} disabled={finalizing}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    finResultado === 'INFRACCION_DETECTADA' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' :
                    finResultado === 'CONFORME' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
                  }`}>
                  {finalizing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {finalizing ? 'Guardando…' : 'Finalizar Inspección'}
                </button>
              </div>
            </div>
          )}

          {!showFinalizeForm && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => { setFinResultado('CONFORME'); setShowFinalizeForm(true); }}
                className="w-full py-3 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                <CheckCircle className="h-4 w-4" /> Todo Conforme
              </button>
              <button onClick={() => { setFinResultado('INFRACCION_DETECTADA'); setFinDerivar(true); setShowFinalizeForm(true); }}
                className="w-full py-3 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                <ShieldAlert className="h-4 w-4" /> Infracción Detectada
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
