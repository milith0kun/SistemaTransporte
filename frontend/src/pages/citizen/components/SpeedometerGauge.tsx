interface Props {
  currentSpeed: number;
  alertSpeed:    number;
  maxSpeed:      number;
  criticalSpeed: number;
}

/**
 * Indicador visual SVG semicircular de velocidad.
 * Zonas: verde (0–alerta), amarillo (alerta–max), rojo (max–critico), rojo oscuro (critico+)
 */
export function SpeedometerGauge({ currentSpeed, alertSpeed, maxSpeed, criticalSpeed }: Props) {
  const SCALE_MAX = Math.max(criticalSpeed + 20, 160);
  const CX = 120, CY = 120, R = 90;

  // Convierte km/h a ángulo en el semicírculo (de 180° a 0°, es decir –180° a 0°)
  // El gauge va de -180° (lado izq) a 0° (lado der), se mapea a 0–SCALE_MAX
  const speedToAngle = (s: number) => {
    const clamped = Math.min(s, SCALE_MAX);
    return -180 + (clamped / SCALE_MAX) * 180;
  };

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Función para dibujar un arco
  const arc = (startKmh: number, endKmh: number) => {
    const startAngle = speedToAngle(startKmh);
    const endAngle   = speedToAngle(endKmh);
    const x1 = CX + R * Math.cos(toRad(startAngle));
    const y1 = CY + R * Math.sin(toRad(startAngle));
    const x2 = CX + R * Math.cos(toRad(endAngle));
    const y2 = CY + R * Math.sin(toRad(endAngle));
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
  };

  // Posición de la aguja
  const needleAngle = speedToAngle(Math.min(currentSpeed, SCALE_MAX));
  const needleX = CX + (R - 10) * Math.cos(toRad(needleAngle));
  const needleY = CY + (R - 10) * Math.sin(toRad(needleAngle));

  // Marcas de velocidad (cada 20 km/h)
  const ticks = [];
  for (let s = 0; s <= SCALE_MAX; s += 20) {
    const angle = speedToAngle(s);
    const outerX = CX + R       * Math.cos(toRad(angle));
    const outerY = CY + R       * Math.sin(toRad(angle));
    const innerX = CX + (R - 8) * Math.cos(toRad(angle));
    const innerY = CY + (R - 8) * Math.sin(toRad(angle));
    const labelX = CX + (R - 22) * Math.cos(toRad(angle));
    const labelY = CY + (R - 22) * Math.sin(toRad(angle));
    ticks.push({ outerX, outerY, innerX, innerY, labelX, labelY, label: String(s), angle });
  }

  return (
    <svg viewBox="0 0 240 140" className="w-full max-w-xs mx-auto select-none">
      {/* Arco zona verde (0 → alerta) */}
      <path d={arc(0, alertSpeed)} fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round" />
      {/* Arco zona amarilla (alerta → max) */}
      <path d={arc(alertSpeed, maxSpeed)} fill="none" stroke="#eab308" strokeWidth="12" />
      {/* Arco zona roja (max → critica) */}
      <path d={arc(maxSpeed, criticalSpeed)} fill="none" stroke="#ef4444" strokeWidth="12" />
      {/* Arco zona crítica (critica → SCALE_MAX) */}
      <path d={arc(criticalSpeed, SCALE_MAX)} fill="none" stroke="#7f1d1d" strokeWidth="12" />

      {/* Marcas */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={t.innerX} y1={t.innerY} x2={t.outerX} y2={t.outerY} stroke="#94a3b8" strokeWidth="1.5" />
          {i % 2 === 0 && (
            <text x={t.labelX} y={t.labelY} fontSize="7" fill="#64748b" textAnchor="middle" dominantBaseline="middle">
              {t.label}
            </text>
          )}
        </g>
      ))}

      {/* Aguja */}
      <line
        x1={CX}
        y1={CY}
        x2={needleX}
        y2={needleY}
        stroke={currentSpeed >= criticalSpeed ? '#7f1d1d' : currentSpeed > maxSpeed ? '#ef4444' : currentSpeed > alertSpeed ? '#eab308' : '#22c55e'}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx={CX} cy={CY} r="6" fill="#1e293b" />

      {/* Número central */}
      <text x={CX} y={CY + 28} fontSize="28" fontWeight="bold" fill="white" textAnchor="middle">
        {Math.round(currentSpeed)}
      </text>
      <text x={CX} y={CY + 42} fontSize="9" fill="#94a3b8" textAnchor="middle">
        km/h
      </text>
    </svg>
  );
}
