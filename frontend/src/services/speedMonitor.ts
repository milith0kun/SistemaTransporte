/**
 * SpeedMonitorService
 * Gestiona GPS tracking, WakeLock y envío periódico al backend.
 * Expone eventos via CustomEvent('speed-update') y CustomEvent('speed-status').
 */

export interface SpeedConfig {
  velocidad_alerta_kmh: number;
  velocidad_maxima_kmh: number;
  velocidad_critica_kmh: number;
  tolerancia_kmh: number;
  duracion_minima_segundos: number;
}

export type SpeedStatus = 'NORMAL' | 'ADVERTENCIA' | 'EXCESO' | 'CRITICO';

export interface SpeedUpdateEvent {
  speed_kmh: number;
  lat: number;
  lng: number;
  status: SpeedStatus;
  excess_kmh: number;
  excess_duration_s: number;
}

interface GpsPoint {
  lat: number; lng: number; speed_kmh: number; timestamp: string;
}

const DEFAULT_CONFIG: SpeedConfig = {
  velocidad_alerta_kmh:     70,
  velocidad_maxima_kmh:     80,
  velocidad_critica_kmh:   100,
  tolerancia_kmh:            5,
  duracion_minima_segundos: 10,
};

class SpeedMonitorService {
  private watchId: number | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reportInterval: ReturnType<typeof setInterval> | null = null;

  private tripId = '';
  private config: SpeedConfig = DEFAULT_CONFIG;
  private token = '';

  // Estado de exceso acumulado
  private excessStartTime: number | null = null;
  private excessDuration  = 0;
  private maxSpeedInExcess = 0;
  private gpsTrail: GpsPoint[] = [];

  // Última posición conocida
  private lastLat = 0;
  private lastLng = 0;
  private lastSpeed = 0;

  async start(tripId: string, config: SpeedConfig, authToken: string): Promise<void> {
    this.tripId = tripId;
    this.config = config;
    this.token  = authToken;

    // Solicitar WakeLock para mantener pantalla encendida
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
      } catch {
        console.warn('[SpeedMonitor] WakeLock no disponible');
      }
    }

    // Iniciar GPS
    if (!navigator.geolocation) {
      throw new Error('Geolocalización no disponible en este dispositivo');
    }

    this.watchId = navigator.geolocation.watchPosition(
      pos => this.onPosition(pos),
      err => this.onGpsError(err),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
    );

    // Ping periódico de posición cada 30 segundos
    this.pingInterval = setInterval(() => this.sendPing(), 30_000);

    // Enviar reporte si hay exceso activo cada 30 segundos (para excesos muy largos)
    this.reportInterval = setInterval(() => {
      if (this.excessDuration >= this.config.duracion_minima_segundos) {
        this.sendReport(this.lastSpeed, this.lastLat, this.lastLng, false);
      }
    }, 30_000);
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.wakeLock = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
    this.resetExcess();
  }

  // ── GPS callback ──────────────────────────────────────────────────────────

  private onPosition(pos: GeolocationPosition): void {
    const rawSpeed = pos.coords.speed ?? 0; // metros/segundo
    const speed    = Math.max(0, rawSpeed * 3.6); // → km/h
    const lat      = pos.coords.latitude;
    const lng      = pos.coords.longitude;

    this.lastLat   = lat;
    this.lastLng   = lng;
    this.lastSpeed = speed;

    const status = this.evaluateSpeed(speed);
    const excess = Math.max(0, speed - this.config.velocidad_maxima_kmh);

    if (status === 'EXCESO' || status === 'CRITICO') {
      const now = Date.now();
      if (!this.excessStartTime) this.excessStartTime = now;
      this.excessDuration = Math.round((now - this.excessStartTime) / 1000);
      if (speed > this.maxSpeedInExcess) this.maxSpeedInExcess = speed;
      this.gpsTrail.push({ lat, lng, speed_kmh: speed, timestamp: new Date().toISOString() });
      if (this.gpsTrail.length > 20) this.gpsTrail.shift();

      // Si duración supera el mínimo → enviar reporte
      if (this.excessDuration >= this.config.duracion_minima_segundos) {
        // Vibrar según severidad
        this.vibrate(status);
      }
    } else {
      // El exceso terminó → enviar reporte final si hubo exceso
      if (this.excessDuration >= this.config.duracion_minima_segundos) {
        this.sendReport(this.maxSpeedInExcess, lat, lng, true);
      }
      this.resetExcess();
    }

    // Emitir evento para que SpeedometerPage actualice la UI
    window.dispatchEvent(
      new CustomEvent<SpeedUpdateEvent>('speed-update', {
        detail: { speed_kmh: speed, lat, lng, status, excess_kmh: excess, excess_duration_s: this.excessDuration },
      }),
    );
  }

  private onGpsError(err: GeolocationPositionError): void {
    console.error('[SpeedMonitor] GPS error:', err.message);
    window.dispatchEvent(new CustomEvent('speed-error', { detail: { message: err.message } }));
  }

  // ── Evaluación de velocidad ───────────────────────────────────────────────

  private evaluateSpeed(speed: number): SpeedStatus {
    const limite = this.config.velocidad_maxima_kmh + this.config.tolerancia_kmh;
    if (speed >= this.config.velocidad_critica_kmh) return 'CRITICO';
    if (speed > limite)                              return 'EXCESO';
    if (speed > this.config.velocidad_alerta_kmh)   return 'ADVERTENCIA';
    return 'NORMAL';
  }

  // ── Envío al backend ─────────────────────────────────────────────────────

  private async sendReport(speed: number, lat: number, lng: number, final: boolean): Promise<void> {
    if (!this.tripId || !this.token) return;
    try {
      const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
      await fetch(`${API}/api/speed-monitor/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body: JSON.stringify({
          trip_id:                 this.tripId,
          velocidad_kmh:           speed,
          latitud:                 lat,
          longitud:                lng,
          duracion_exceso_segundos: this.excessDuration,
          velocidad_maxima_kmh:    this.maxSpeedInExcess,
          gps_trail:               [...this.gpsTrail],
        }),
      });
    } catch (e) {
      console.error('[SpeedMonitor] Error enviando reporte:', e);
    }
    if (final) this.resetExcess();
  }

  private async sendPing(): Promise<void> {
    if (!this.tripId || !this.token || !this.lastLat) return;
    try {
      const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
      await fetch(`${API}/api/speed-monitor/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body: JSON.stringify({
          trip_id:   this.tripId,
          lat:       this.lastLat,
          lng:       this.lastLng,
          speed_kmh: this.lastSpeed,
        }),
      });
    } catch { /* silent */ }
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  private resetExcess(): void {
    this.excessStartTime  = null;
    this.excessDuration   = 0;
    this.maxSpeedInExcess = 0;
    this.gpsTrail         = [];
  }

  private vibrate(status: SpeedStatus): void {
    if (!('vibrate' in navigator)) return;
    if (status === 'CRITICO') navigator.vibrate([300, 100, 300, 100, 300]);
    else                      navigator.vibrate([200, 100, 200]);
  }

  private handleVisibilityChange = async (): Promise<void> => {
    if (document.visibilityState === 'visible' && !this.wakeLock) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch { /* ignore */ }
    }
  };
}

export const speedMonitor = new SpeedMonitorService();
