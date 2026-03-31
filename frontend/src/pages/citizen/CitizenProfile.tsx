import { useEffect, useState } from 'react';
import { User, Star, FileText, TrendingUp, Award } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import type { Report, IncentivePoint, PaginatedResponse } from '../../types';
import { ReportStatus, ReportType } from '../../types';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ''}`} />;
}

const STATUS_LABEL: Record<ReportStatus, string> = {
  [ReportStatus.EN_REVISION]: 'En revisión',
  [ReportStatus.VALIDO]:      'Válido',
  [ReportStatus.INVALIDO]:    'Inválido',
};
const STATUS_COLOR: Record<ReportStatus, string> = {
  [ReportStatus.EN_REVISION]: 'bg-amber-100 text-amber-700',
  [ReportStatus.VALIDO]:      'bg-green-100 text-green-700',
  [ReportStatus.INVALIDO]:    'bg-red-100 text-red-700',
};
const TYPE_LABEL: Record<ReportType, string> = {
  [ReportType.CONDUCTOR_DIFERENTE]:  'Conductor diferente',
  [ReportType.CONDICION_VEHICULO]:   'Condición del vehículo',
  [ReportType.CONDUCCION_PELIGROSA]: 'Conducción peligrosa',
  [ReportType.EXCESO_VELOCIDAD]:     'Exceso de velocidad',
  [ReportType.OTRO]:                 'Otro',
};

type Tab = 'reportes' | 'puntos';

export function CitizenProfile() {
  const { user, logout } = useAuth();
  const [tab, setTab]           = useState<Tab>('reportes');
  const [reports, setReports]   = useState<Report[]>([]);
  const [points, setPoints]     = useState<IncentivePoint[]>([]);
  const [loading, setLoading]   = useState(true);

  // Counts by status
  const [counts, setCounts] = useState({ valid: 0, invalid: 0, review: 0 });

  useEffect(() => {
    Promise.all([
      api.get<PaginatedResponse<Report>>('/api/reports?page=1&limit=20'),
      api.get<{ data: IncentivePoint[]; total: number; page: number; lastPage: number }>('/api/incentives/history?page=1&limit=20'),
    ])
      .then(([rRes, pRes]) => {
        const rs = rRes.data;
        setReports(rs);
        setPoints(pRes.data as unknown as IncentivePoint[]);
        setCounts({
          valid:   rs.filter((r) => r.status === ReportStatus.VALIDO).length,
          invalid: rs.filter((r) => r.status === ReportStatus.INVALIDO).length,
          review:  rs.filter((r) => r.status === ReportStatus.EN_REVISION).length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const reputationPct = Math.min(100, Math.max(0, user?.reputation_score ?? 0));
  const repColor = reputationPct >= 80 ? 'bg-green-500' : reputationPct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="px-4 py-5 md:py-8 max-w-5xl mx-auto space-y-6 md:space-y-8">
      {/* Header Profile Section */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50" />
        
        <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-gradient-to-br from-[#1B4F72] to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg border-4 border-white">
          <span className="text-white text-3xl md:text-4xl font-bold">{user?.name?.charAt(0) ?? '?'}</span>
        </div>
        
        <div className="flex-1 text-center md:text-left z-10 w-full">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">{user?.name}</h1>
          <p className="text-base text-gray-500 truncate mt-1">{user?.email}</p>
          
          <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">DNI: {user?.dni ? `****${user.dni.slice(-4)}` : '—'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <Star className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Tel: {user?.phone ?? '—'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="md:self-start px-5 py-2.5 text-red-500 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-50 active:scale-95 transition-all w-full md:w-auto mt-2 md:mt-0 flex-shrink-0"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Col: Stats & Rep */}
        <div className="lg:col-span-4 space-y-6">
          {/* Points total */}
          <div className="bg-gradient-to-br from-[#1B4F72] to-[#2E86C1] rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-md relative overflow-hidden">
            <Award className="h-24 w-24 text-white/10 absolute -right-4 -bottom-4" />
            <Award className="h-12 w-12 text-blue-200 mb-3" />
            <p className="text-blue-100 text-sm font-medium">Total de puntos</p>
            <p className="text-white text-5xl font-extrabold mt-1">{user?.total_points ?? 0}</p>
          </div>

          {/* Reputation */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#1B4F72]" />
                <span className="text-base font-semibold text-gray-800">Reputación</span>
              </div>
              <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-md">{reputationPct}/100</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${repColor}`} style={{ width: `${reputationPct}%` }} />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-400">Min: 30</span>
              <span className="text-xs text-gray-500 font-medium">
                {reputationPct >= 80 ? 'Excelente' : reputationPct >= 50 ? 'Buena' : 'Baja'}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
              <p className="text-xl md:text-2xl font-bold text-green-700">{counts.valid}</p>
              <p className="text-[10px] md:text-xs text-green-600 mt-1 uppercase tracking-wider font-semibold">Válidos</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 text-center border border-amber-100">
              <p className="text-xl md:text-2xl font-bold text-amber-700">{counts.review}</p>
              <p className="text-[10px] md:text-xs text-amber-600 mt-1 uppercase tracking-wider font-semibold">Revisión</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-4 text-center border border-red-100">
              <p className="text-xl md:text-2xl font-bold text-red-700">{counts.invalid}</p>
              <p className="text-[10px] md:text-xs text-red-600 mt-1 uppercase tracking-wider font-semibold">Inválidos</p>
            </div>
          </div>
        </div>

        {/* Right Col: Tabs and Lists */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-100 shadow-sm p-5 md:p-6 lg:min-h-[600px] flex flex-col">
          <div className="flex border-b border-gray-100 mb-6 gap-6">
            {(['reportes', 'puntos'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-3 px-2 text-sm md:text-base font-semibold capitalize transition-all relative ${
                  tab === t
                    ? 'text-[#1B4F72]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'reportes' ? 'Mis reportes' : 'Historial de puntos'}
                {tab === t && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1B4F72] rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <Skeleton className="h-5 w-1/3 mb-3" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            ) : tab === 'reportes' ? (
              reports.length > 0 ? (
                <div className="space-y-4">
                  {reports.map((r) => (
                    <div key={r.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-gray-900">{TYPE_LABEL[r.type]}</p>
                          <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-1.5">
                            <FileText className="h-4 w-4" />
                            {new Date(r.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider border flex-shrink-0 ${STATUS_COLOR[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </div>
                      {r.description && (
                        <p className="text-sm text-gray-600 mt-4 leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                          "{r.description}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400 flex flex-col items-center">
                  <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-gray-300" />
                  </div>
                  <p className="text-base font-medium text-gray-900">Sin reportes aún</p>
                  <p className="text-sm mt-1">Los reportes que envíes aparecerán aquí.</p>
                </div>
              )
            ) : (
              points.length > 0 ? (
                <div className="space-y-3">
                  {points.map((p) => (
                    <div key={p.id} className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm flex items-center gap-4 hover:bg-gray-50 transition-colors">
                      <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Star className="h-6 w-6 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-gray-900 truncate">{p.description}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(p.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex-shrink-0 bg-green-50 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-green-100">
                        <span className="text-green-700 font-bold text-lg md:text-xl">+{p.points}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400 flex flex-col items-center">
                  <div className="h-16 w-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                    <Star className="h-8 w-8 text-amber-300" />
                  </div>
                  <p className="text-base font-medium text-gray-900">Sin historial de puntos</p>
                  <p className="text-sm mt-1">Gana puntos realizando reportes válidos.</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
