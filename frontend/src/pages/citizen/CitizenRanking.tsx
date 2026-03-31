import { useEffect, useState } from 'react';
import { Trophy, Medal } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

interface RankingEntry {
  position:      number;
  user_id:       string;
  name:          string;
  total_points:  number;
  valid_reports: number;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ''}`} />;
}

const MEDAL: Record<number, { icon: string; bg: string; text: string }> = {
  1: { icon: '🥇', bg: 'bg-amber-50',  text: 'text-amber-700' },
  2: { icon: '🥈', bg: 'bg-gray-100',  text: 'text-gray-600'  },
  3: { icon: '🥉', bg: 'bg-orange-50', text: 'text-orange-700' },
};

export function CitizenRanking() {
  const { user } = useAuthStore();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    api.get<RankingEntry[]>('/api/incentives/ranking')
      .then((data) => setRanking(data.slice(0, 20)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const myPosition = ranking.find((r) => r.user_id === user?.id);

  return (
    <div className="px-4 py-5 md:py-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shadow-sm">
            <Trophy className="h-6 w-6 md:h-7 md:w-7 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Ranking municipal</h1>
            <p className="text-sm md:text-base text-gray-500 mt-1">Top ciudadanos más activos</p>
          </div>
        </div>
      </div>

      {/* My position highlight */}
      {myPosition && (
        <div className="bg-gradient-to-r from-[#1B4F72] to-[#2E86C1] text-white rounded-3xl p-5 md:p-6 flex items-center gap-5 shadow-md">
          <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 border-2 border-white/30">
            <span className="font-bold text-xl md:text-2xl">#{myPosition.position}</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg md:text-xl">Tu posición actual</p>
            <p className="text-blue-100 text-sm md:text-base mt-0.5">{myPosition.total_points} pts · {myPosition.valid_reports} reportes válidos</p>
          </div>
          <Medal className="h-8 w-8 md:h-10 md:w-10 text-amber-300 opacity-90" />
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 flex gap-4 border border-gray-100">
              <Skeleton className="h-10 w-10 md:h-12 md:w-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-6 w-16 flex-shrink-0 my-auto" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm text-gray-400">
          <p className="text-base font-medium">No se pudo cargar el ranking.</p>
          <p className="text-sm mt-1">Verifica tu conexión e intenta de nuevo.</p>
        </div>
      ) : ranking.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm text-gray-400">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium">Nadie ha participado aún.</p>
          <p className="text-sm mt-1">¡Sé el primero en reportar!</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {ranking.map((entry) => {
              const isMe    = entry.user_id === user?.id;
              const medal   = MEDAL[entry.position];
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 p-4 md:p-5 transition-colors ${
                    isMe
                      ? 'bg-blue-50/50'
                      : 'hover:bg-gray-50/80'
                  }`}
                >
                  {/* Position */}
                  <div className={`h-10 w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center flex-shrink-0 text-base md:text-lg font-bold
                    ${medal ? `${medal.bg} ${medal.text} shadow-sm border border-${medal.bg.split('-')[1]}-100` : 'bg-gray-100 text-gray-500'}`}>
                    {medal ? medal.icon : `#${entry.position}`}
                  </div>

                  {/* Name + stats */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-base md:text-lg font-semibold truncate ${isMe ? 'text-[#1B4F72]' : 'text-gray-900'}`}>
                      {entry.name} {isMe && <span className="text-xs md:text-sm font-medium text-[#2E86C1] ml-2 px-2 py-0.5 bg-blue-100 rounded-md">Tú</span>}
                    </p>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5">{entry.valid_reports} reportes válidos</p>
                  </div>

                  {/* Points */}
                  <div className="text-right flex-shrink-0 bg-amber-50 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-amber-100/50">
                    <p className="text-base md:text-xl font-bold text-amber-600 leading-none">{entry.total_points}</p>
                    <p className="text-[10px] md:text-xs text-amber-500/80 font-medium uppercase tracking-wider mt-1">pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
