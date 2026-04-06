import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Gauge, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import api from '../../../services/api';

interface Route { id: string; origin: string; destination: string }

const ZONAS = [
  { value: 'GENERAL',      label: 'General' },
  { value: 'CARRETERA',    label: 'Carretera' },
  { value: 'URBANA',       label: 'Urbana' },
  { value: 'ZONA_ESCOLAR', label: 'Zona Escolar' },
  { value: 'CURVAS',       label: 'Zona de Curvas' },
];

export function SpeedConfigFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [routes, setRoutes] = useState<Route[]>([]);
  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    route_id:                 '',
    velocidad_alerta_kmh:     70,
    velocidad_maxima_kmh:     80,
    velocidad_critica_kmh:    100,
    tolerancia_kmh:           5,
    duracion_minima_segundos: 10,
    tipo_zona:                'GENERAL',
    descripcion:              '',
  });

  useEffect(() => {
    api.get<any>('/api/routes?limit=100').then(r => setRoutes(r.data ?? r)).catch(() => {});
    if (isEdit) {
      setLoading(true);
      api.get<any>(`/api/speed-config/${id}`)
        .then(c => setForm({
          route_id:                 c.route_id ?? '',
          velocidad_alerta_kmh:     c.velocidad_alerta_kmh,
          velocidad_maxima_kmh:     c.velocidad_maxima_kmh,
          velocidad_critica_kmh:    c.velocidad_critica_kmh,
          tolerancia_kmh:           c.tolerancia_kmh,
          duracion_minima_segundos: c.duracion_minima_segundos,
          tipo_zona:                c.tipo_zona,
          descripcion:              c.descripcion ?? '',
        }))
        .catch(() => setError('No se pudo cargar la configuración'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const validate = (): string => {
    if (form.velocidad_alerta_kmh >= form.velocidad_maxima_kmh)
      return 'La velocidad de alerta debe ser menor que la máxima';
    if (form.velocidad_maxima_kmh >= form.velocidad_critica_kmh)
      return 'La velocidad máxima debe ser menor que la crítica';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, route_id: form.route_id || undefined };
      if (isEdit) {
        await api.put(`/api/speed-config/${id}`, payload);
      } else {
        await api.post('/api/speed-config', payload);
      }
      navigate('/admin/speed-config');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm(prev => ({ ...prev, [field]: val }));
  };

  // Calcular porcentajes para la barra de preview
  const previewScale = form.velocidad_critica_kmh + 20;
  const alertPct   = (form.velocidad_alerta_kmh   / previewScale) * 100;
  const maxPct     = (form.velocidad_maxima_kmh    / previewScale) * 100;
  const critPct    = (form.velocidad_critica_kmh   / previewScale) * 100;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/speed-config')} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-blue-600" />
            {isEdit ? 'Editar Configuración de Velocidad' : 'Nueva Configuración de Velocidad'}
          </h1>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

        {/* Ruta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ruta</label>
          <select value={form.route_id} onChange={f('route_id')} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm">
            <option value="">General (aplica a todas las rutas)</option>
            {routes.map(r => (
              <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>
            ))}
          </select>
        </div>

        {/* Tipo de zona */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de zona</label>
          <select value={form.tipo_zona} onChange={f('tipo_zona')} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm">
            {ZONAS.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
          </select>
        </div>

        {/* Velocidades */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vel. Alerta
              <span className="ml-1 text-xs text-gray-400">(km/h)</span>
            </label>
            <input type="number" min={20} max={120} value={form.velocidad_alerta_kmh} onChange={f('velocidad_alerta_kmh')}
              className="w-full border border-yellow-300 bg-yellow-50 rounded-xl px-3 py-2 text-sm font-bold text-yellow-700" />
            <p className="text-xs text-gray-400 mt-1">Advertencia al ciudadano</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vel. Máxima
              <span className="ml-1 text-xs text-gray-400">(km/h)</span>
            </label>
            <input type="number" min={20} max={120} value={form.velocidad_maxima_kmh} onChange={f('velocidad_maxima_kmh')}
              className="w-full border border-red-300 bg-red-50 rounded-xl px-3 py-2 text-sm font-bold text-red-700" />
            <p className="text-xs text-gray-400 mt-1">Notifica al Fiscal</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vel. Crítica
              <span className="ml-1 text-xs text-gray-400">(km/h)</span>
            </label>
            <input type="number" min={50} max={200} value={form.velocidad_critica_kmh} onChange={f('velocidad_critica_kmh')}
              className="w-full border border-red-600 bg-red-100 rounded-xl px-3 py-2 text-sm font-bold text-red-900" />
            <p className="text-xs text-gray-400 mt-1">Alerta máxima prioridad</p>
          </div>
        </div>

        {/* Preview visual */}
        <div>
          <p className="text-xs text-gray-500 mb-1 font-medium">Vista previa de zonas:</p>
          <div className="h-5 w-full rounded-full overflow-hidden flex">
            <div style={{ width: `${alertPct}%` }} className="bg-green-400" />
            <div style={{ width: `${maxPct - alertPct}%` }} className="bg-yellow-400" />
            <div style={{ width: `${critPct - maxPct}%` }} className="bg-red-400" />
            <div style={{ width: `${100 - critPct}%` }} className="bg-red-900" />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span>
            <span className="text-yellow-600">{form.velocidad_alerta_kmh}</span>
            <span className="text-red-600">{form.velocidad_maxima_kmh}</span>
            <span className="text-red-900">{form.velocidad_critica_kmh}+</span>
          </div>
        </div>

        {/* Tolerancia y duración */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tolerancia GPS (km/h)
            </label>
            <input type="number" min={0} max={20} value={form.tolerancia_kmh} onChange={f('tolerancia_kmh')}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Margen de error del GPS</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duración mínima (seg)
            </label>
            <input type="number" min={5} max={60} value={form.duracion_minima_segundos} onChange={f('duracion_minima_segundos')}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Evita falsos positivos</p>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
          <textarea value={form.descripcion} onChange={f('descripcion')} rows={2}
            placeholder="Ej: Zona de curvas km 30-45 ruta Arequipa-Challhuahuacho"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none" />
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/admin/speed-config')}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
