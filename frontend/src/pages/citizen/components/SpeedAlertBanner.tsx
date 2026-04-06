import type { SpeedStatus } from '../../../services/speedMonitor';

interface Props {
  status:      SpeedStatus;
  speed:       number;
  limit:       number;
  excessSecs:  number;
}

const STATUS_CONFIG: Record<SpeedStatus, {
  bg: string; border: string; text: string; icon: string; label: string; blink: boolean;
}> = {
  NORMAL: {
    bg: 'bg-green-900/80', border: 'border-green-500', text: 'text-green-300',
    icon: '✅', label: 'VELOCIDAD NORMAL', blink: false,
  },
  ADVERTENCIA: {
    bg: 'bg-yellow-900/80', border: 'border-yellow-400', text: 'text-yellow-300',
    icon: '⚠️', label: 'ACERCÁNDOSE AL LÍMITE', blink: false,
  },
  EXCESO: {
    bg: 'bg-red-900/80', border: 'border-red-500', text: 'text-red-300',
    icon: '🚨', label: 'EXCESO DE VELOCIDAD', blink: false,
  },
  CRITICO: {
    bg: 'bg-red-950/90', border: 'border-red-600', text: 'text-red-200',
    icon: '🚨', label: '¡VELOCIDAD CRÍTICA — REDUZCA INMEDIATAMENTE!', blink: true,
  },
};

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function SpeedAlertBanner({ status, speed, limit, excessSecs }: Props) {
  const cfg = STATUS_CONFIG[status];
  const excess = Math.max(0, Math.round(speed - limit));

  return (
    <div className={`rounded-2xl border-2 p-4 ${cfg.bg} ${cfg.border} ${cfg.blink ? 'animate-pulse' : ''}`}>
      <div className={`text-center font-bold text-base ${cfg.text}`}>
        <span className="mr-1">{cfg.icon}</span>
        {cfg.label}
      </div>

      {(status === 'EXCESO' || status === 'CRITICO') && (
        <div className="mt-2 flex justify-around text-sm">
          <div className="text-center">
            <div className="font-bold text-white text-lg">{Math.round(speed)}</div>
            <div className="text-gray-400 text-xs">km/h actual</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-red-300 text-lg">+{excess}</div>
            <div className="text-gray-400 text-xs">sobre el límite</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-orange-300 text-lg">{formatTime(excessSecs)}</div>
            <div className="text-gray-400 text-xs">tiempo en exceso</div>
          </div>
        </div>
      )}

      {status === 'ADVERTENCIA' && (
        <p className="text-center text-xs text-yellow-400 mt-1">
          Límite: {limit} km/h — Reduce la velocidad
        </p>
      )}
    </div>
  );
}
