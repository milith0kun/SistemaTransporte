import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  CheckCircle, AlertTriangle, XCircle, Car, User, FileText,
  ClipboardPlus, ArrowLeft, RefreshCw, ShieldAlert, Clock, QrCode
} from 'lucide-react';
import { inspectorApi, type ScanQrResult } from '../../services/inspectorApi';

const STATUS_COLOR: Record<string, string> = {
  ACTIVO: 'bg-green-100 text-green-800',
  INACTIVO: 'bg-gray-100 text-gray-600',
  APTO: 'bg-green-100 text-green-800',
  RIESGO: 'bg-yellow-100 text-yellow-800',
  NO_APTO: 'bg-red-100 text-red-800',
};

function DocBadge({ vigente, label, vencimiento }: { vigente: boolean; label: string; vencimiento?: string | null }) {
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${vigente ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
      {vigente ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
      <div>
        <span className="font-medium">{label}</span>
        {vencimiento && <span className="text-xs ml-1 opacity-75">· {fmtDate(vencimiento)}</span>}
      </div>
    </div>
  );
}

export function InspectorScanResultPage() {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const { state: navState } = useLocation();
  const navigate = useNavigate();

  const [result, setResult] = useState<ScanQrResult | null>(navState?.scanResult ?? null);
  const [loading, setLoading] = useState(!navState?.scanResult);

  useEffect(() => {
    if (!result && inspectionId) {
      // Reload the inspection to recover state after page refresh
      inspectorApi.getInspection(inspectionId)
        .then(insp => {
          // Best-effort: build a minimal result from the inspection
          if (insp.vehicle) {
            setResult({
              qr_valido: true,
              inspection_id: insp.id,
              vehiculo: {
                id: insp.vehicle.id,
                placa: insp.vehicle.plate,
                marca: insp.vehicle.brand,
                modelo: insp.vehicle.model,
                color: insp.vehicle.color,
                year: insp.vehicle.year,
                foto_url: insp.vehicle.photo_url ?? null,
                estado: insp.vehicle.status,
                soat_vigente: insp.vehicle.soat_expires_at ? new Date(insp.vehicle.soat_expires_at) > new Date() : false,
                soat_vencimiento: insp.vehicle.soat_expires_at ?? null,
                revision_tecnica_vigente: insp.vehicle.inspection_expires_at ? new Date(insp.vehicle.inspection_expires_at) > new Date() : false,
                revision_tecnica_vencimiento: insp.vehicle.inspection_expires_at ?? null,
                empresa: { nombre: insp.vehicle.company?.name ?? '', ruc: insp.vehicle.company?.ruc ?? '' },
              },
              viaje_activo: null,
              conductores: [],
              alertas: [],
              requiere_accion: false,
            } as any);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
    </div>
  );

  if (!result || !result.vehiculo) return (
    <div className="text-center py-16 text-gray-500">
      <p>Resultado no disponible</p>
      <button onClick={() => navigate('/inspector/scan')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
        Volver a escanear
      </button>
    </div>
  );

  const { vehiculo, viaje_activo, conductores, alertas, inspection_id } = result;

  return (
    <div className="max-w-2xl mx-auto space-y-5 p-4">
      {/* Nav */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1B4F72]/10 rounded-lg">
              <QrCode className="w-6 h-6 text-[#1B4F72]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Resultado de Escaneo</h2>
              <p className="text-sm text-gray-500">Datos obtenidos de la lectura QR</p>
            </div>
          </div>
        </div>
        {result.qr_valido
          ? <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-3 py-1.5 rounded-full shadow-sm"><CheckCircle className="h-4 w-4" /> QR Válido</span>
          : <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-3 py-1.5 rounded-full shadow-sm"><XCircle className="h-4 w-4" /> QR Inválido</span>}
      </div>

      {/* Alerts Banner */}
      {alertas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <p className="text-sm font-semibold text-red-800">Se detectaron {alertas.length} alerta{alertas.length > 1 ? 's' : ''}</p>
          </div>
          <ul className="space-y-1">
            {alertas.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                <span className="shrink-0">•</span>{a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vehicle Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-md">
            <Car className="h-4 w-4 text-blue-600" />
          </div>
          Datos del Vehículo
        </h2>
        <div className="flex flex-col sm:flex-row gap-5">
          {vehiculo.foto_url
            ? <img src={vehiculo.foto_url} alt={vehiculo.placa} className="w-full sm:w-32 h-32 rounded-xl object-cover border border-gray-200 shrink-0" />
            : <div className="w-full sm:w-32 h-32 rounded-xl bg-gray-50 flex items-center justify-center border border-dashed border-gray-300 shrink-0"><Car className="h-10 w-10 text-gray-300" /></div>}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-3xl font-bold font-mono text-gray-900 tracking-widest">{vehiculo.placa}</p>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${STATUS_COLOR[vehiculo.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                {vehiculo.estado}
              </span>
            </div>
            <p className="text-base text-gray-700 font-medium">{[vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')} {vehiculo.year && <span className="text-gray-500 font-normal">({vehiculo.year})</span>}</p>
            {vehiculo.color && <p className="text-sm text-gray-500 flex items-center gap-1">Color: <span className="font-medium text-gray-700">{vehiculo.color}</span></p>}
            <p className="text-sm text-gray-500 flex items-center gap-1">Empresa: <span className="font-medium text-gray-900">{vehiculo.empresa.nombre}</span></p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5 border-t border-gray-100">
          <DocBadge vigente={vehiculo.soat_vigente} label="SOAT" vencimiento={vehiculo.soat_vencimiento} />
          <DocBadge vigente={vehiculo.revision_tecnica_vigente} label="Rev. Técnica" vencimiento={vehiculo.revision_tecnica_vencimiento} />
        </div>
      </div>

      {/* Active Trip */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-md">
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </div>
          Viaje Activo
        </h2>
        {viaje_activo ? (
          <div className="space-y-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-900 truncate">{viaje_activo.ruta.origen}</span>
              <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180 shrink-0" />
              <span className="text-sm font-bold text-gray-900 truncate">{viaje_activo.ruta.destino}</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
              <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-gray-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Inicio: {new Date(viaje_activo.hora_inicio).toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'})}
              </span>
              <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-gray-200">
                Transcurrido: {Math.floor(viaje_activo.tiempo_transcurrido_minutos / 60)}h {viaje_activo.tiempo_transcurrido_minutos % 60}min
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-start sm:items-center gap-3 p-4 bg-yellow-50/80 rounded-xl border border-yellow-200">
            <div className="p-2 bg-yellow-100 rounded-lg shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-yellow-900">Sin viaje activo registrado</p>
              <p className="text-xs text-yellow-800 mt-0.5">El vehículo está operando sin un viaje válido en el sistema. Posible irregularidad.</p>
            </div>
          </div>
        )}
      </div>

      {/* Drivers */}
      {conductores.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            Conductor{conductores.length > 1 ? 'es' : ''}
          </h2>
          <div className="space-y-4">
            {conductores.map(c => (
              <div key={c.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
                {c.foto_url
                  ? <img src={c.foto_url} alt={c.nombre} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white shadow-sm shrink-0" />
                  : <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white flex items-center justify-center border-4 border-gray-100 shadow-sm shrink-0"><User className="h-8 w-8 text-gray-400" /></div>}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900 truncate">{c.nombre}</p>
                      <p className="text-sm text-gray-600 font-medium">DNI: <span className="font-mono text-gray-800">{c.dni}</span> · <span className="capitalize">{c.rol}</span></p>
                    </div>
                    <div className="text-right">
                       <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 shadow-sm">
                         ★ {c.reputation_score}/100
                       </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase shadow-sm border ${STATUS_COLOR[c.fatiga.estado]?.replace('bg-', 'border-').replace('100', '200') ?? 'border-gray-200'} ${STATUS_COLOR[c.fatiga.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                      Fatiga: {c.fatiga.estado}
                    </span>
                    {c.licencia.vigente === false && (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase shadow-sm bg-red-100 text-red-800 border border-red-200">Licencia Vencida</span>
                    )}
                    {c.sanciones_activas > 0 && (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase shadow-sm bg-orange-100 text-orange-800 border border-orange-200">{c.sanciones_activas} Sanciones</span>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      Tiempo conducido (24h): <span className="font-bold text-gray-900">{c.fatiga.horas_conducidas_24h.toFixed(1)}h</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {inspection_id && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm sticky bottom-24 sm:static z-10">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ClipboardPlus className="h-4 w-4" /> Acciones de Inspección
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link to={`/inspector/inspections/${inspection_id}`}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-blue-600 text-blue-700 text-sm font-bold hover:bg-blue-50 transition-colors">
              <FileText className="h-4 w-4" /> Ver Detalles
            </Link>
            <Link to={`/inspector/inspections/${inspection_id}?action=finalize`}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white text-sm font-bold shadow-sm hover:bg-green-700 hover:shadow-md transition-all">
              <CheckCircle className="h-4 w-4" /> Conforme ✓
            </Link>
            <Link to={`/inspector/inspections/${inspection_id}?action=observe`}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-yellow-500 text-yellow-950 text-sm font-bold shadow-sm hover:bg-yellow-400 hover:shadow-md transition-all">
              <ClipboardPlus className="h-4 w-4" /> Observación
            </Link>
            <Link to={`/inspector/inspections/${inspection_id}?action=infraccion`}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 text-white text-sm font-bold shadow-sm hover:bg-red-700 hover:shadow-md transition-all">
              <ShieldAlert className="h-4 w-4" /> Infracción
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
