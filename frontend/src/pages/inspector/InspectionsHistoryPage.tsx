import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Search, X, RefreshCw, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { inspectorApi, type Inspection } from '../../services/inspectorApi';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';

const RESULT_COLOR: Record<string, string> = {
  EN_PROCESO:          'bg-blue-100 text-blue-800',
  CONFORME:            'bg-green-100 text-green-800',
  CON_OBSERVACIONES:   'bg-yellow-100 text-yellow-800',
  INFRACCION_DETECTADA:'bg-red-100 text-red-800',
};

const TIPO_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'VERIFICACION_QR',        label: 'Verificación QR' },
  { value: 'VERIFICACION_CONDUCTOR', label: 'Verificación Conductor' },
  { value: 'INSPECCION_VEHICULO',    label: 'Inspección Vehículo' },
  { value: 'CONTROL_RUTA',           label: 'Control de Ruta' },
  { value: 'FISCALIZACION_GENERAL',  label: 'Fiscalización General' },
];

const RESULTADO_OPTIONS = [
  { value: '', label: 'Todos los resultados' },
  { value: 'EN_PROCESO',           label: 'En Proceso' },
  { value: 'CONFORME',             label: 'Conforme' },
  { value: 'CON_OBSERVACIONES',    label: 'Con Observaciones' },
  { value: 'INFRACCION_DETECTADA', label: 'Infracción Detectada' },
];

export function InspectionsHistoryPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);

  const [tipo, setTipo]             = useState('');
  const [resultado, setResultado]   = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [search, setSearch]         = useState('');

  const LIMIT = 20;

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p), limit: String(LIMIT) };
      if (tipo)       params.tipo        = tipo;
      if (resultado)  params.resultado   = resultado;
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      if (search)     params.vehicle_plate = search;

      const r = await inspectorApi.getInspections(params);
      setInspections(r.data);
      setTotal(r.total);
    } catch {
      setInspections([]);
    } finally {
      setLoading(false);
    }
  }, [page, tipo, resultado, fechaDesde, fechaHasta, search]);

  useEffect(() => { load(); }, [load]);

  function applyFilters() { setPage(1); load(1); }
  function clearFilters() {
    setTipo(''); setResultado(''); setFechaDesde(''); setFechaHasta(''); setSearch('');
    setPage(1);
  }

  const totalPages = Math.ceil(total / LIMIT);

  function fmtDate(d: string) {
    return new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1B4F72]/10 rounded-lg">
            <ClipboardList className="w-6 h-6 text-[#1B4F72]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Mis Inspecciones</h2>
            <p className="text-sm text-gray-500">{total} inspección{total !== 1 ? 'es' : ''} registrada{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Link to="/inspector/inspections/new"
          className="px-4 py-2 bg-[#1B4F72] text-white text-sm font-medium rounded-lg hover:bg-[#154360] transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-[#2E86C1] flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end shadow-sm">
        <div className="w-36">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)}
            className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E86C1] focus:border-[#2E86C1] outline-none">
            {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="w-40">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Resultado</label>
          <select value={resultado} onChange={e => setResultado(e.target.value)}
            className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E86C1] focus:border-[#2E86C1] outline-none">
            {RESULTADO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
            className="py-2 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E86C1] focus:border-[#2E86C1] outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
            className="py-2 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E86C1] focus:border-[#2E86C1] outline-none" />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Buscar placa</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyFilters()}
              placeholder="ABC-123" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E86C1] focus:border-[#2E86C1] outline-none" />
          </div>
        </div>
        <button onClick={applyFilters} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-[#2E86C1] border border-gray-300 transition-colors">
          Filtrar
        </button>
        {(tipo || resultado || fechaDesde || fechaHasta || search) && (
          <button onClick={clearFilters} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500 focus:ring-2 focus:ring-[#2E86C1]">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Tr>
                <Th>Fecha/Hora</Th>
                <Th>Tipo</Th>
                <Th>Vehículo</Th>
                <Th>Ubicación</Th>
                <Th>Resultado</Th>
                <Th className="text-right">Acción</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={6} className="text-center py-12">
                  <RefreshCw className="h-6 w-6 text-[#1B4F72] animate-spin mx-auto" />
                </Td></Tr>
              ) : inspections.length === 0 ? (
                <Tr><Td colSpan={6} className="text-center py-12 text-gray-400">No hay inspecciones con los filtros seleccionados</Td></Tr>
              ) : inspections.map(i => (
                <Tr key={i.id} className="hover:bg-gray-50 cursor-pointer">
                  <Td className="text-gray-600 whitespace-nowrap">{fmtDate(i.created_at)}</Td>
                  <Td className="text-gray-700 text-xs">{i.tipo.replace(/_/g, ' ')}</Td>
                  <Td className="font-mono font-semibold text-gray-800">
                    {(i as any).vehicle?.plate ?? '—'}
                  </Td>
                  <Td className="text-gray-500 text-xs max-w-[160px] truncate" title={i.ubicacion_descripcion ?? undefined}>
                    {i.ubicacion_descripcion ?? '—'}
                  </Td>
                  <Td>
                    <Badge className={RESULT_COLOR[i.resultado] ?? 'bg-gray-100 text-gray-600 hover:bg-gray-100'}>
                      {i.resultado.replace(/_/g, ' ')}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <Link to={`/inspector/inspections/${i.id}`} className="text-xs font-medium text-[#2E86C1] hover:text-[#1B4F72] hover:underline">
                      Ver detalle
                    </Link>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">Página {page} de {totalPages} · {total} inspecciones</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-white bg-transparent transition-colors focus:ring-2 focus:ring-[#2E86C1]">
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-white bg-transparent transition-colors focus:ring-2 focus:ring-[#2E86C1]">
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
