import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Pencil, Trash2, Search, RefreshCw, QrCode,
  Download, Upload, Car,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Modal, ModalBody, ModalFooter } from '../../components/ui/modal';
import { Spinner } from '../../components/ui/spinner';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/table';
import { Select } from '../../components/ui/select';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface Company { id: string; name: string; ruc: string }

type VehicleStatus = 'ACTIVO' | 'INACTIVO' | 'MANTENIMIENTO';

interface Vehicle {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  capacity?: number;
  photo_url?: string;
  soat_expires_at?: string;
  inspection_expires_at?: string;
  status: VehicleStatus;
  qr_code?: string;
  company: { id: string; name: string };
  created_at: string;
}

interface VehiclePage {
  data: Vehicle[];
  total: number;
  page: number;
  limit: number;
}

/* ── Zod schema ─────────────────────────────────────────────────────────── */
const vehicleSchema = z.object({
  plate:               z.string().regex(/^[A-Z0-9]{3}-[0-9]{3}$/, 'Formato: ABC-123'),
  brand:               z.string().max(100).optional().or(z.literal('')),
  model:               z.string().max(100).optional().or(z.literal('')),
  year:                z.union([z.number().int().min(1990).max(new Date().getFullYear() + 1), z.nan()]).optional(),
  color:               z.string().max(50).optional().or(z.literal('')),
  capacity:            z.union([z.number().int().min(1).max(100), z.nan()]).optional(),
  photo_url:           z.string().optional().or(z.literal('')),
  soat_expires_at:     z.string().optional().or(z.literal('')),
  inspection_expires_at: z.string().optional().or(z.literal('')),
  company_id:          z.string().uuid('Seleccione una empresa'),
  status:              z.enum(['ACTIVO', 'INACTIVO', 'MANTENIMIENTO']).optional(),
});
type VehicleFormData = z.infer<typeof vehicleSchema>;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const STATUS_COLORS: Record<VehicleStatus, string> = {
  ACTIVO:       'bg-green-100 text-green-800',
  INACTIVO:     'bg-gray-100 text-gray-600',
  MANTENIMIENTO:'bg-amber-100 text-amber-800',
};

function statusLabel(s: VehicleStatus) {
  return s === 'MANTENIMIENTO' ? 'Mantenim.' : s.charAt(0) + s.slice(1).toLowerCase();
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function expiryClass(d?: string) {
  if (!d) return '';
  const diff = (new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000;
  if (diff < 0)  return 'text-red-600 font-semibold';
  if (diff < 30) return 'text-amber-600 font-semibold';
  return 'text-gray-600';
}

/* ── PhotoUpload component ───────────────────────────────────────────────── */
function PhotoUpload({ value, onChange }: { value?: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuthStore();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads/vehicles', { method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const j = await res.json(); throw new Error(j.message ?? 'Error al subir'); }
      const { url } = await res.json();
      onChange(url);
    } catch (err: any) {
      setError(err.message ?? 'Error al subir foto');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200 shrink-0">
        {value
          ? <img src={value} alt="Vehículo" className="w-full h-full object-cover" />
          : <Car className="h-7 w-7 text-gray-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <label className="cursor-pointer">
          <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border font-medium
            ${uploading ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
            {uploading
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Subiendo…</>
              : <><Upload className="h-3.5 w-3.5" /> {value ? 'Cambiar foto' : 'Subir foto'}</>}
          </span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            disabled={uploading} onChange={handleFile} />
        </label>
        {value && !uploading && (
          <button type="button" onClick={() => onChange('')}
            className="ml-2 text-xs text-red-500 hover:text-red-700">Quitar</button>
        )}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        <p className="text-xs text-gray-400 mt-0.5">JPG, PNG o WEBP · máx. 5 MB</p>
      </div>
    </div>
  );
}

/* ── QR Modal ────────────────────────────────────────────────────────────── */
function QrModal({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuthStore();

  const loadQr = useCallback(async () => {
    setLoading(true);
    setError('');
    setQrData(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return null; });
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}/qr`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('No se pudo cargar el QR');
      const blob = await res.blob();
      setQrData(URL.createObjectURL(blob));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [vehicle.id, token]);

  useEffect(() => { loadQr(); }, [loadQr]);

  async function handleRegenerate() {
    setRegenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}/regenerate-qr`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Error al regenerar QR');
      await loadQr();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  }

  async function handleDownload() {
    if (!qrData) return;
    const res = await fetch(`/api/vehicles/${vehicle.id}/qr`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${vehicle.plate}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Modal open={true} onClose={onClose} title="Código QR" size="sm">
      <ModalBody className="flex flex-col items-center gap-4">
        <p className="text-sm text-gray-500 w-full text-center border-b pb-4 mb-2">{vehicle.plate} — {vehicle.brand} {vehicle.model}</p>
        {loading ? (
          <div className="h-56 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 text-[#2E86C1] animate-spin" />
          </div>
        ) : error ? (
          <div className="h-56 flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="link" onClick={loadQr}>Reintentar</Button>
          </div>
        ) : qrData ? (
          <img src={qrData} alt="QR Code" className="w-56 h-56 rounded-lg border border-gray-200" />
        ) : (
          <div className="h-56 flex items-center justify-center">
            <p className="text-sm text-gray-500">QR no disponible</p>
          </div>
        )}
      </ModalBody>
      <ModalFooter className="flex gap-2 w-full justify-center sm:justify-between">
        <Button variant="outline" className="flex-1" onClick={handleDownload} disabled={!qrData || loading}>
          <Download className="h-4 w-4 mr-1.5" /> Descargar
        </Button>
        <Button className="flex-1" onClick={handleRegenerate} disabled={regenerating || loading}>
          {regenerating ? <><Spinner className="h-4 w-4 mr-1.5" /> Regenerando…</> : <><RefreshCw className="h-4 w-4 mr-1.5" /> Regenerar QR</>}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export function VehiclesManagement() {
  const { user, token } = useAuthStore();
  const canEdit = user?.role === UserRole.ADMIN_MUNICIPAL || user?.role === UserRole.OPERADOR_EMPRESA;

  const [vehicles, setVehicles]     = useState<Vehicle[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [companies, setCompanies]   = useState<Company[]>([]);

  // Filters
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCompany, setFilterCompany] = useState('');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);
  const [qrVehicle, setQrVehicle]   = useState<Vehicle | null>(null);
  const [deleting, setDeleting]     = useState(false);

  const LIMIT = 15;

  /* Load companies once */
  useEffect(() => {
    fetch('/api/companies?limit=100', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(j => setCompanies(j.data ?? []))
      .catch(() => {});
  }, [token]);

  /* Load vehicles */
  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(LIMIT),
        ...(search        && { search }),
        ...(filterStatus  && { status: filterStatus }),
        ...(filterCompany && { company_id: filterCompany }),
      });
      const res = await fetch(`/api/vehicles?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const j: VehiclePage = await res.json();
      setVehicles(j.data ?? []);
      setTotal(j.total ?? 0);
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterCompany, token]);

  useEffect(() => { load(); }, [load]);

  /* ── Delete ── */
  async function confirmDelete() {
    if (!deleteVehicle) return;
    setDeleting(true);
    try {
      await fetch(`/api/vehicles/${deleteVehicle.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setDeleteVehicle(null);
      load();
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="h-6 w-6 text-[#1B4F72]" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gestión de Vehículos</h2>
            <p className="text-sm text-gray-500">Administra el parque automotor y sus estados</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Nuevo Vehículo
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-5 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por placa, marca o modelo…"
              className="pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="min-w-[160px]">
            <option value="">Todos los estados</option>
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
            <option value="MANTENIMIENTO">MANTENIMIENTO</option>
          </Select>
          <Select value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setPage(1); }} className="min-w-[180px]">
            <option value="">Todas las empresas</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
             <div className="flex justify-center py-12"><Spinner /></div>
          ) : (
            <>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Vehículo</Th>
                    <Th>Placa</Th>
                    <Th>Empresa</Th>
                    <Th>Capacidad</Th>
                    <Th>SOAT</Th>
                    <Th>Rev. Técnica</Th>
                    <Th>Estado</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {vehicles.length === 0 ? (
                    <Tr><Td colSpan={8} className="py-12 text-center text-gray-400">Sin vehículos registrados.</Td></Tr>
                  ) : vehicles.map(v => (
                    <Tr key={v.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200 shrink-0">
                            {v.photo_url
                              ? <img src={v.photo_url} alt={v.plate} className="w-full h-full object-cover" />
                              : <Car className="h-5 w-5 text-gray-400" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {[v.brand, v.model].filter(Boolean).join(' ') || '—'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {v.year ?? ''}{v.color ? ` · ${v.color}` : ''}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td className="font-mono font-semibold text-gray-800 tracking-wider">{v.plate}</Td>
                      <Td className="text-gray-600">{v.company?.name ?? '—'}</Td>
                      <Td className="text-gray-600">{v.capacity ? `${v.capacity} pas.` : '—'}</Td>
                      <Td><span className={`text-sm ${expiryClass(v.soat_expires_at)}`}>{fmtDate(v.soat_expires_at)}</span></Td>
                      <Td><span className={`text-sm ${expiryClass(v.inspection_expires_at)}`}>{fmtDate(v.inspection_expires_at)}</span></Td>
                      <Td><Badge className={`${STATUS_COLORS[v.status]} text-xs`}>{statusLabel(v.status)}</Badge></Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setQrVehicle(v)} title="Ver QR" className="p-1.5 rounded hover:bg-blue-50 text-blue-600">
                            <QrCode className="h-4 w-4" />
                          </button>
                          {canEdit && (
                            <>
                              <button onClick={() => setEditVehicle(v)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => setDeleteVehicle(v)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                  <p className="text-sm text-gray-500">{total} vehículo{total !== 1 ? 's' : ''} · pág. {page}/{totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1}     onClick={() => setPage(p => p - 1)}>Anterior</Button>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {qrVehicle && <QrModal vehicle={qrVehicle} onClose={() => setQrVehicle(null)} />}
      
      {showCreate && (
        <VehicleFormModal mode="create" companies={companies} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load(); }} />
      )}

      {editVehicle && (
        <VehicleFormModal mode="edit" vehicle={editVehicle} companies={companies} onClose={() => setEditVehicle(null)} onSaved={() => { setEditVehicle(null); load(); }} />
      )}

      <Modal open={!!deleteVehicle} onClose={() => setDeleteVehicle(null)} title="Eliminar Vehículo" size="sm">
        <ModalBody>
          <p className="text-sm text-gray-700">
            ¿Eliminar <strong>{deleteVehicle?.plate}</strong>? Esta acción no se puede deshacer.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteVehicle(null)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDelete} disabled={deleting}>
            {deleting ? <Spinner className="h-4 w-4" /> : 'Eliminar'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

/* ── VehicleFormModal ─────────────────────────────────────────────────────── */
function VehicleFormModal({
  mode, vehicle, companies, onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  vehicle?: Vehicle;
  companies: Company[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { token } = useAuthStore();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate:               vehicle?.plate ?? '',
      brand:               vehicle?.brand ?? '',
      model:               vehicle?.model ?? '',
      year:                vehicle?.year,
      color:               vehicle?.color ?? '',
      capacity:            vehicle?.capacity,
      photo_url:           vehicle?.photo_url ?? '',
      soat_expires_at:     vehicle?.soat_expires_at?.slice(0, 10) ?? '',
      inspection_expires_at: vehicle?.inspection_expires_at?.slice(0, 10) ?? '',
      company_id:          vehicle?.company?.id ?? '',
      status:              vehicle?.status ?? 'ACTIVO',
    },
  });

  const photoUrl = watch('photo_url');

  async function onSubmit(data: VehicleFormData) {
    const clean: Record<string, any> = {
      plate:      data.plate,
      company_id: data.company_id,
      ...(data.brand               && { brand: data.brand }),
      ...(data.model               && { model: data.model }),
      ...(data.year                && !isNaN(data.year) && { year: data.year }),
      ...(data.color               && { color: data.color }),
      ...(data.capacity            && !isNaN(data.capacity) && { capacity: data.capacity }),
      ...(data.photo_url           && { photo_url: data.photo_url }),
      ...(data.soat_expires_at     && { soat_expires_at: data.soat_expires_at }),
      ...(data.inspection_expires_at && { inspection_expires_at: data.inspection_expires_at }),
      ...(mode === 'edit' && data.status && { status: data.status }),
    };

    const url    = mode === 'create' ? '/api/vehicles' : `/api/vehicles/${vehicle!.id}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(clean),
    });
    if (res.ok) { onSaved(); } else {
      const j = await res.json();
      alert(j.message ?? 'Error al guardar');
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={mode === 'create' ? 'Nuevo Vehículo' : `Editar ${vehicle?.plate}`} size="lg">
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody className="space-y-5">
          <div>
            <Label className="mb-2 block">Fotografía del Vehículo</Label>
            <PhotoUpload value={photoUrl || undefined} onChange={url => setValue('photo_url', url)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Placa *</Label>
              <Input {...register('plate')} placeholder="ABC-123" className="uppercase" />
              {errors.plate && <p className="text-xs text-red-500">{errors.plate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Empresa *</Label>
              <Select {...register('company_id')}>
                <option value="">Seleccionar empresa…</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              {errors.company_id && <p className="text-xs text-red-500">{errors.company_id.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input {...register('brand')} placeholder="Toyota, Mercedes…" />
            </div>
            <div className="space-y-1.5">
              <Label>Modelo</Label>
              <Input {...register('model')} placeholder="Coaster, Sprinter…" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Año</Label>
              <Input {...register('year', { valueAsNumber: true })} type="number" min={1990} max={new Date().getFullYear() + 1} placeholder="2020" />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Input {...register('color')} placeholder="Blanco" />
            </div>
            <div className="space-y-1.5">
              <Label>Capacidad</Label>
              <Input {...register('capacity', { valueAsNumber: true })} type="number" min={1} max={100} placeholder="20" />
              {errors.capacity && <p className="text-xs text-red-500">{errors.capacity.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Vencimiento SOAT</Label>
              <Input {...register('soat_expires_at')} type="date" />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimiento Rev. Técnica</Label>
              <Input {...register('inspection_expires_at')} type="date" />
            </div>
            {mode === 'edit' && (
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select {...register('status')}>
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                </Select>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner className="h-4 w-4 mr-1.5" /> : null}
            {mode === 'create' ? 'Crear Vehículo' : 'Guardar Cambios'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

