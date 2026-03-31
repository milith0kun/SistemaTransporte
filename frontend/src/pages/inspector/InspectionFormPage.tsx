import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, MapPin, ClipboardPlus, CheckCircle, RefreshCw,
} from 'lucide-react';
import { inspectorApi } from '../../services/inspectorApi';

const TIPO_OPTIONS = [
  { value: 'VERIFICACION_QR',        label: 'Verificación QR' },
  { value: 'VERIFICACION_CONDUCTOR', label: 'Verificación de Conductor' },
  { value: 'INSPECCION_VEHICULO',    label: 'Inspección de Vehículo' },
  { value: 'CONTROL_RUTA',           label: 'Control de Ruta' },
  { value: 'FISCALIZACION_GENERAL',  label: 'Fiscalización General' },
];

export function InspectionFormPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const [tipo, setTipo]           = useState('FISCALIZACION_GENERAL');
  const [ubicacion, setUbicacion] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [driverDni, setDriverDni]       = useState('');
  const [latitud, setLatitud]   = useState('');
  const [longitud, setLongitud] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);

  // Resolved IDs
  const [vehicleId, setVehicleId] = useState<string | undefined>();
  const [driverId, setDriverId]   = useState<string | undefined>();
  const [vehicleErr, setVehicleErr] = useState('');
  const [driverErr, setDriverErr]   = useState('');

  useEffect(() => {
    useGeo();
  }, []);

  async function resolveVehicle() {
    if (!vehiclePlate.trim()) return;
    setVehicleErr('');
    try {
      const v = await inspectorApi.lookupVehicle(vehiclePlate.trim().toUpperCase());
      setVehicleId(v.id);
    } catch {
      setVehicleErr('Vehículo no encontrado en tu municipalidad');
      setVehicleId(undefined);
    }
  }

  async function resolveDriver() {
    if (!driverDni.trim()) return;
    setDriverErr('');
    try {
      const d = await inspectorApi.lookupDriver(driverDni.trim());
      setDriverId(d.id);
    } catch {
      setDriverErr('Conductor no encontrado en tu municipalidad');
      setDriverId(undefined);
    }
  }

  function useGeo() {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatitud(String(pos.coords.latitude));
        setLongitud(String(pos.coords.longitude));
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ubicacion.trim()) { setError('La ubicación es requerida'); return; }
    setSaving(true);
    setError('');
    try {
      const insp = await inspectorApi.createInspection({
        tipo,
        ubicacion_descripcion: ubicacion,
        vehicle_id: vehicleId,
        driver_id: driverId,
        latitud: latitud ? parseFloat(latitud) : undefined,
        longitud: longitud ? parseFloat(longitud) : undefined,
      });
      navigate(`/inspector/inspections/${insp.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al crear inspección');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 pb-24 sm:pb-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1B4F72]/10 rounded-lg">
            <ClipboardPlus className="w-6 h-6 text-[#1B4F72]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Nueva Inspección</h2>
            <p className="text-sm text-gray-500">Registre los datos de la fiscalización</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700">Tipo de Inspección</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TIPO_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setTipo(opt.value)}
                className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#2E86C1] ${
                  tipo === opt.value ? 'border-[#1B4F72] bg-[#1B4F72]/5 text-[#1B4F72] shadow-sm' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ubicación */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md">
              <MapPin className="h-4 w-4 text-blue-600" />
            </div>
            Ubicación de Fiscalización
          </h2>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Descripción de la ubicación *</label>
            <input
              value={ubicacion} onChange={e => setUbicacion(e.target.value)}
              placeholder="Ej: Terminal Terrestre Tambobamba, Km 45 ruta Arequipa"
              className={`w-full px-4 py-2.5 text-sm border-2 rounded-xl outline-none transition-colors ${!ubicacion && !!error ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-[#2E86C1] focus:ring-2 focus:ring-[#2E86C1]'}`}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-end bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex-1 w-full">
              <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase tracking-wider">Latitud</label>
              <input value={latitud} onChange={e => setLatitud(e.target.value)} placeholder="-13.123456"
                className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg outline-none focus:border-[#2E86C1] transition-colors" />
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase tracking-wider">Longitud</label>
              <input value={longitud} onChange={e => setLongitud(e.target.value)} placeholder="-72.654321"
                className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg outline-none focus:border-[#2E86C1] transition-colors" />
            </div>
            <button type="button" onClick={useGeo} disabled={geoLoading}
              className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2E86C1]">
              {geoLoading ? <RefreshCw className="h-4 w-4 animate-spin text-[#1B4F72]" /> : <MapPin className="h-4 w-4 text-[#1B4F72]" />}
              Capturar GPS
            </button>
          </div>
        </div>

        {/* Vehículo y Conductor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Vehículo */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700">Vehículo <span className="text-xs text-gray-400 font-normal ml-1">(Opcional)</span></h2>
            <div className="flex gap-2">
              <input value={vehiclePlate} onChange={e => { setVehiclePlate(e.target.value.toUpperCase()); setVehicleId(undefined); }}
                placeholder="Placa: ABC-123"
                className={`flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none transition-colors uppercase font-mono ${vehicleErr ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'focus:border-[#2E86C1] focus:ring-1 focus:ring-[#2E86C1]'}`} />
              <button type="button" onClick={resolveVehicle}
                className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2E86C1]">
                Buscar
              </button>
            </div>
            {vehicleErr && <p className="text-xs text-red-600 font-medium px-1">{vehicleErr}</p>}
            {vehicleId && <div className="p-2.5 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /><p className="text-sm font-medium text-green-800">Vehículo vinculado</p></div>}
          </div>

          {/* Conductor */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700">Conductor <span className="text-xs text-gray-400 font-normal ml-1">(Opcional)</span></h2>
            <div className="flex gap-2">
              <input value={driverDni} onChange={e => { setDriverDni(e.target.value); setDriverId(undefined); }}
                placeholder="DNI del conductor"
                className={`flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none transition-colors font-mono ${driverErr ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'focus:border-[#2E86C1] focus:ring-1 focus:ring-[#2E86C1]'}`} />
              <button type="button" onClick={resolveDriver}
                className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2E86C1]">
                Buscar
              </button>
            </div>
            {driverErr && <p className="text-xs text-red-600 font-medium px-1">{driverErr}</p>}
            {driverId && <div className="p-2.5 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /><p className="text-sm font-medium text-green-800">Conductor vinculado</p></div>}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-sm font-medium text-red-800 flex items-start gap-2">
            <div className="mt-0.5"><CheckCircle className="h-4 w-4 text-red-500 opacity-0" /></div>
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-4 sticky bottom-24 sm:static z-10 bg-gray-50/80 sm:bg-transparent p-4 sm:p-0 backdrop-blur-sm sm:backdrop-blur-none -mx-4 sm:mx-0 border-t border-gray-200 sm:border-0">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 py-3 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-white hover:border-gray-400 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2E86C1]">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-[#1B4F72] text-white rounded-lg text-sm font-bold hover:bg-[#154360] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2E86C1]">
            {saving ? <RefreshCw className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            {saving ? 'Creando…' : 'Crear Inspección'}
          </button>
        </div>
      </form>
    </div>
  );
}
