import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Star, FileText, TrendingUp, Award, Clock } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';
import type { Report, PaginatedResponse } from '../../types';
import { ReportStatus, ReportType } from '../../types';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ''}`} />;
}

// ─── Fatigue badge colors ──────────────────────────────────────────────────────
const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  [ReportStatus.EN_REVISION]: 'En revisión',
  [ReportStatus.VALIDO]:      'Válido',
  [ReportStatus.INVALIDO]:    'Inválido',
};

const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  [ReportType.CONDUCTOR_DIFERENTE]:  'Conductor diferente',
  [ReportType.CONDICION_VEHICULO]:   'Condición del vehículo',
  [ReportType.CONDUCCION_PELIGROSA]: 'Conducción peligrosa',
  [ReportType.EXCESO_VELOCIDAD]:     'Exceso de velocidad',
  [ReportType.OTRO]:                 'Otro',
};

export function CitizenPage() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const [lastReport, setLastReport] = useState<Report | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    api.get<PaginatedResponse<Report>>('/api/reports?page=1&limit=1')
      .then((res) => setLastReport(res.data[0] ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const reputationPct = Math.min(100, Math.max(0, user?.reputation_score ?? 0));
  const repLabel = reputationPct >= 80 ? 'Excelente' : reputationPct >= 50 ? 'Buena' : 'Baja';
  const repColor = reputationPct >= 80 ? 'bg-green-500' : reputationPct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="px-4 py-5 md:py-8 space-y-6 max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-gray-500 text-sm md:text-base">Bienvenido de vuelta</p>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Hola, {user?.name?.split(' ')[0] ?? 'ciudadano'} 👋
          </h1>
        </div>
        {/* Primary CTA — Scan QR (Desktop placed on right, Mobile on top) */}
        <button
          onClick={() => navigate('/citizen/scan')}
          className="md:w-auto bg-blue-700 hover:bg-blue-800 active:scale-95 transition-all
                     text-white rounded-2xl p-5 md:px-8 flex items-center gap-4 shadow-lg group"
        >
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
            <QrCode className="h-6 w-6" />
          </div>
          <div className="text-left flex-1 md:pr-4">
            <p className="text-lg md:text-xl font-bold tracking-wide">ESCANEAR QR</p>
            <p className="text-blue-100 text-xs md:text-sm mt-0.5">Verificar vehículo y reportar</p>
          </div>
          <span className="text-white/70 text-2xl group-hover:translate-x-1 transition-transform">›</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Stats & Reputation */}
        <div className="md:col-span-7 lg:col-span-8 space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Points */}
            <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
                <span className="text-sm md:text-base text-gray-600 font-medium">Mis puntos</span>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-gray-900">{user?.total_points ?? 0}</p>
              <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium uppercase tracking-wider">acumulados</p>
            </div>

            {/* Reports today */}
            <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-sm md:text-base text-gray-600 font-medium">Hoy</span>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-gray-900">
                {user?.reports_today ?? 0}
                <span className="text-lg md:text-xl font-medium text-gray-400">/3</span>
              </p>
              <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium uppercase tracking-wider">reportes</p>
            </div>
          </div>

          {/* Reputation bar */}
          <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-slate-700" />
                </div>
                <span className="text-sm md:text-base font-semibold text-gray-800">Nivel de reputación</span>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xl md:text-2xl font-bold text-gray-900">{reputationPct}</span>
                <span className={`text-xs md:text-sm px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${
                  reputationPct >= 80 ? 'bg-green-100 text-green-700 border border-green-200' :
                  reputationPct >= 50 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                  'bg-red-100 text-red-700 border border-red-200'
                }`}>{repLabel}</span>
              </div>
            </div>
            <div className="h-3 md:h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${repColor}`}
                style={{ width: `${reputationPct}%` }}
              />
            </div>
            <p className="text-xs md:text-sm text-gray-500 mt-3 flex items-start gap-1.5">
              {reputationPct < 30 ? (
                <>
                  <span className="text-red-500 text-base leading-none">⚠️</span>
                  <span>Reputación baja — no podrás reportar si baja de 30</span>
                </>
              ) : (
                'Sigue reportando con veracidad para mantener tu reputación alta'
              )}
            </p>
          </div>

          {/* Ranking teaser */}
          <button
            onClick={() => navigate('/citizen/ranking')}
            className="w-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200
                       rounded-xl p-5 md:p-6 flex items-center gap-4 hover:shadow-md transition-all group text-left"
          >
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Award className="h-6 w-6 md:h-7 md:w-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-base md:text-lg font-bold text-gray-900">Ver ranking municipal</p>
              <p className="text-sm md:text-base text-gray-600 mt-0.5">Compara tus puntos con otros ciudadanos</p>
            </div>
            <span className="text-amber-500 text-2xl md:text-3xl group-hover:translate-x-1 transition-transform">›</span>
          </button>
        </div>

        {/* Right Column: Last Report */}
        <div className="md:col-span-5 lg:col-span-4 flex flex-col">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex-1 flex flex-col">
            <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm md:text-base font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-gray-500" />
                Último reporte
              </h2>
              <button 
                onClick={() => navigate('/citizen/reports')}
                className="text-xs md:text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                Ver todos
              </button>
            </div>

            <div className="p-5 flex-1 flex flex-col">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : lastReport ? (
                <div className="group cursor-pointer hover:bg-gray-50 -m-5 p-5 transition-colors flex-1" onClick={() => navigate('/citizen/reports')}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className="text-base md:text-lg font-semibold text-gray-900 leading-tight">
                        {REPORT_TYPE_LABEL[lastReport.type]}
                      </p>
                      <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(lastReport.created_at).toLocaleDateString('es-PE', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className={`text-xs md:text-sm px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider border whitespace-nowrap ${
                      lastReport.status === ReportStatus.VALIDO ? 'bg-green-50 text-green-700 border-green-200' :
                      lastReport.status === ReportStatus.INVALIDO ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {REPORT_STATUS_LABEL[lastReport.status]}
                    </span>
                  </div>
                  {lastReport.description && (
                    <p className="text-sm md:text-base text-gray-600 mt-4 line-clamp-3 leading-relaxed">{lastReport.description}</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 md:py-10 m-auto flex flex-col items-center justify-center">
                  <div className="h-12 w-12 md:h-16 md:w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                    <FileText className="h-6 w-6 md:h-8 md:w-8 text-gray-400" />
                  </div>
                  <p className="text-sm md:text-base font-medium text-gray-900">Aún no has realizado ningún reporte.</p>
                  <p className="text-sm md:text-base text-gray-500 mt-1">¡Escanea un QR para comenzar!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
