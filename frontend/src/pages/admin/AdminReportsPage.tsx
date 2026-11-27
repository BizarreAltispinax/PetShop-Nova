import React, { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useDb } from '../../store/db';
import { useApi } from '../../hooks/useApi';
import { ESTADOS_PEDIDO, OrderStatus } from '../../types';
import { exportToCSV, formatCRC, formatDate, MESES_CORTOS } from '../../utils/format';
import { AlertBanner, Button, Input, OrderStatusBadge, Select, TableSkeleton } from '../../components/ui/DesignSystemKit';

// Cada reporte se calcula en SQL Server con su procedimiento (sql/06_reportes.sql).
// Esta pantalla solo envía los parámetros, muestra las filas y las exporta tal cual.

type ReportId = 'R01' | 'R02' | 'R03' | 'R04' | 'R05' | 'R06' | 'R07' | 'R08' | 'R09' | 'R10';

const REPORT_MENU: { id: ReportId; title: string; subtitle: string; sp: string }[] = [
  { id: 'R01', title: 'R1. Top 5 clientes', subtitle: 'Mayor monto comprado', sp: 'sp_R01_TopClientes' },
  { id: 'R02', title: 'R2. Matriz cliente × categoría', subtitle: 'Total por cliente y categoría', sp: 'sp_R02_MatrizClienteCategoria' },
  { id: 'R03', title: 'R3. Ventas mensuales por marca', subtitle: 'Incluye meses sin ventas', sp: 'sp_R03_VentasMensualesMarca' },
  { id: 'R04', title: 'R4. Evolución mensual', subtitle: 'Ventas, pedidos y ticket', sp: 'sp_R04_EvolucionMensual' },
  { id: 'R05', title: 'R5. Productos más vendidos', subtitle: 'Top 10 por unidades e ingresos', sp: 'sp_R05_ProductosMasVendidos' },
  { id: 'R06', title: 'R6. Inventario crítico', subtitle: 'Bajo mínimo y reposición', sp: 'sp_R06_InventarioCritico' },
  { id: 'R07', title: 'R7. Rentabilidad', subtitle: 'Ingresos vs. costo histórico', sp: 'sp_R07_Rentabilidad' },
  { id: 'R08', title: 'R8. Clientes sin compras', subtitle: 'NOT EXISTS por rango de fechas', sp: 'sp_R08_ClientesSinCompras' },
  { id: 'R09', title: 'R9. Comparación mensual', subtitle: 'Variación con LAG', sp: 'sp_R09_ComparacionMensual' },
  { id: 'R10', title: 'R10. Resumen de pedidos', subtitle: 'Filtros parametrizados', sp: 'sp_R10_ResumenPedidos' },
];

type Fila = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Celda = string | number;
interface Tabla {
  encabezados: string[];
  filas: Celda[][];
  alinear?: ('left' | 'right' | 'center')[];
}

const pct = (v: number | null) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${v}%`);

export const AdminReportsPage: React.FC = () => {
  const { addToast } = useDb();
  const [activo, setActivo] = useState<ReportId>('R01');
  const anioActual = new Date().getFullYear();
  const [anio, setAnio] = useState(anioActual);
  const [r7Modo, setR7Modo] = useState<'P' | 'C'>('P');
  const [r8Desde, setR8Desde] = useState('');
  const [r8Hasta, setR8Hasta] = useState('');
  const [r10Estado, setR10Estado] = useState('');
  const [r10Desde, setR10Desde] = useState('');
  const [r10Hasta, setR10Hasta] = useState('');
  const [r10Cliente, setR10Cliente] = useState('');

  const parametros: Record<ReportId, Record<string, string | number>> = {
    R01: {},
    R02: {},
    R03: { anio },
    R04: { anio },
    R05: {},
    R06: {},
    R07: { agrupacion: r7Modo },
    R08: { desde: r8Desde, hasta: r8Hasta },
    R09: { anio },
    R10: { idEstado: r10Estado, desde: r10Desde, hasta: r10Hasta, cliente: r10Cliente.trim() },
  };

  const { datos, cargando, error } = useApi<Fila[] | Fila[][]>(`/admin/reportes/${activo}`, parametros[activo]);
  const filas = (activo === 'R05' ? [] : (datos as Fila[] | null)) ?? [];
  const r5 = activo === 'R05' ? ((datos as Fila[][] | null) ?? [[], []]) : [[], []];

  /* ---------- Tablas (las mismas se exportan) ---------- */
  const tablaR2 = (): Tabla => {
    const categorias: string[] = [];
    const clientes = new Map<number, { cliente: string; total: number; celdas: Map<string, number> }>();
    for (const f of filas) {
      if (!categorias.includes(f.nombreCategoria)) categorias.push(f.nombreCategoria);
      if (!clientes.has(f.idCliente)) clientes.set(f.idCliente, { cliente: f.cliente, total: f.totalCliente, celdas: new Map() });
      clientes.get(f.idCliente)!.celdas.set(f.nombreCategoria, f.total);
    }
    categorias.sort((a, b) => a.localeCompare(b));
    const totalesCat = categorias.map((c) => filas.find((f) => f.nombreCategoria === c)?.totalCategoria ?? 0);
    const cuerpo: Celda[][] = [...clientes.values()].map((c) => [c.cliente, ...categorias.map((cat) => c.celdas.get(cat) ?? 0), c.total]);
    if (cuerpo.length > 0) cuerpo.push(['Total categoría', ...totalesCat, filas[0]?.totalGeneral ?? 0]);
    return { encabezados: ['Cliente', ...categorias, 'Total'], filas: cuerpo, alinear: ['left', ...categorias.map(() => 'right' as const), 'right'] };
  };

  const tablas: Record<Exclude<ReportId, 'R05'>, () => Tabla> = {
    R01: () => ({
      encabezados: ['Cliente', 'Correo', 'Monto comprado', 'Pedidos', 'Productos distintos'],
      filas: filas.map((f) => [f.cliente, f.correo, f.montoComprado, f.cantidadPedidos, f.productosDistintos]),
      alinear: ['left', 'left', 'right', 'center', 'center'],
    }),
    R02: tablaR2,
    R03: () => ({
      encabezados: ['Marca', ...MESES_CORTOS, 'Total'],
      filas: filas.map((f) => [f.nombreMarca, f.ene, f.feb, f.mar, f.abr, f.may, f.jun, f.jul, f.ago, f.sep, f.oct, f.nov, f.dic, f.total]),
      alinear: ['left', ...MESES_CORTOS.map(() => 'right' as const), 'right'],
    }),
    R04: () => ({
      encabezados: ['Mes', 'Ventas', 'Pedidos', 'Ticket promedio'],
      filas: filas.map((f) => [MESES_CORTOS[f.mes - 1], f.ventas, f.pedidos, f.ticketPromedio]),
      alinear: ['left', 'right', 'center', 'right'],
    }),
    R06: () => ({
      encabezados: ['SKU', 'Producto', 'Existencia', 'Mínimo', 'Faltantes', 'Venta prom. mensual', 'Reposición sugerida'],
      filas: filas.map((f) => [f.sku, f.nombreProducto, f.existencia, f.stockMinimo, f.unidadesFaltantes, f.ventaPromedioMensual, f.reposicionSugerida]),
      alinear: ['left', 'left', 'right', 'right', 'right', 'right', 'right'],
    }),
    R07: () => ({
      encabezados: [r7Modo === 'P' ? 'Producto' : 'Categoría', 'Ingresos', 'Costo histórico', 'Utilidad bruta', 'Margen %'],
      filas: filas.map((f) => [f.nombre, f.ingresos, f.costoHistorico, f.utilidadBruta, `${f.margenPorcentaje}%`]),
      alinear: ['left', 'right', 'right', 'right', 'right'],
    }),
    R08: () => ({
      encabezados: ['Cliente', 'Correo', 'Fecha de registro', 'Última compra', 'Activo'],
      filas: filas.map((f) => [f.cliente, f.correo, formatDate(f.fechaRegistro), f.ultimaCompra ? formatDate(f.ultimaCompra) : 'Nunca ha comprado', f.activo ? 'Sí' : 'No']),
    }),
    R09: () => ({
      encabezados: ['Mes', 'Ventas', 'Mes anterior', 'Variación absoluta', 'Variación %'],
      filas: filas.map((f) => [MESES_CORTOS[f.mes - 1], f.ventas, f.ventasMesAnterior ?? 0, f.variacionAbsoluta ?? 0, pct(f.variacionPorcentual)]),
      alinear: ['left', 'right', 'right', 'right', 'right'],
    }),
    R10: () => ({
      encabezados: ['Pedido', 'Fecha', 'Cliente', 'Estado', 'Líneas', 'Unidades', 'Total'],
      filas: filas.map((f) => [`#${f.idPedido}`, formatDate(f.fechaPedido), f.cliente, f.nombreEstadoPedido, f.cantidadLineas, f.cantidadUnidades, f.total]),
      alinear: ['left', 'left', 'left', 'left', 'center', 'center', 'right'],
    }),
  };

  const tablaR5 = (lista: Fila[]): Tabla => ({
    encabezados: ['#', 'Producto', 'Categoría', 'Marca', 'Unidades', 'Ingresos'],
    filas: lista.map((f) => [f.ranking, f.nombreProducto, f.nombreCategoria, f.nombreMarca, f.unidades, f.ingresos]),
    alinear: ['center', 'left', 'left', 'left', 'right', 'right'],
  });

  const handleExport = (formato: 'csv' | 'excel') => {
    let t: Tabla;
    if (activo === 'R05') {
      const a = tablaR5(r5[0]);
      const b = tablaR5(r5[1]);
      t = { encabezados: ['Lista', ...a.encabezados], filas: [...a.filas.map((f) => ['Por unidades', ...f]), ...b.filas.map((f) => ['Por ingresos', ...f])] };
    } else {
      t = tablas[activo]();
    }
    const ext = formato === 'csv' ? 'csv' : 'xls.csv';
    exportToCSV(`PetShopNova_${activo}_${new Date().toISOString().slice(0, 10)}.${ext}`, t.encabezados, t.filas);
    addToast('success', `Reporte ${activo} exportado`, `Archivo ${formato.toUpperCase()} generado con ${t.filas.length} filas.`);
  };

  const menu = REPORT_MENU.find((m) => m.id === activo)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Reportes gerenciales</h1>
        <p className="text-sm text-slate-500">Consultas analíticas ejecutadas en SQL Server (10 reportes oficiales)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-3 bg-white rounded-[12px] border border-slate-200 p-2 space-y-1">
          {REPORT_MENU.map((rep) => {
            const on = activo === rep.id;
            return (
              <button
                key={rep.id}
                type="button"
                onClick={() => setActivo(rep.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-[9px] transition-colors cursor-pointer ${on ? 'bg-[#0F8B8D] text-white' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <div className="text-xs font-bold">{rep.title}</div>
                <div className={`text-[11px] ${on ? 'text-teal-100' : 'text-slate-500'}`}>{rep.subtitle}</div>
              </button>
            );
          })}
        </aside>

        <div className="lg:col-span-9 space-y-5 min-w-0">
          <div className="bg-white rounded-[12px] border border-slate-200 p-4 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-4">
              {(activo === 'R03' || activo === 'R04' || activo === 'R09') && (
                <div className="w-36">
                  <Select label="Año" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
                    {[anioActual, anioActual - 1].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </Select>
                </div>
              )}
              {activo === 'R07' && (
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-[10px]">
                  {(['P', 'C'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setR7Modo(m)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-[8px] cursor-pointer ${r7Modo === m ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                    >
                      {m === 'P' ? 'Por producto' : 'Por categoría'}
                    </button>
                  ))}
                </div>
              )}
              {activo === 'R08' && (
                <>
                  <Input label="Desde (opcional)" type="date" value={r8Desde} onChange={(e) => setR8Desde(e.target.value)} />
                  <Input label="Hasta (opcional)" type="date" value={r8Hasta} onChange={(e) => setR8Hasta(e.target.value)} />
                </>
              )}
              {activo === 'R10' && (
                <>
                  <Select label="Estado" value={r10Estado} onChange={(e) => setR10Estado(e.target.value)}>
                    <option value="">Todos</option>
                    {ESTADOS_PEDIDO.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </Select>
                  <Input label="Desde" type="date" value={r10Desde} onChange={(e) => setR10Desde(e.target.value)} />
                  <Input label="Hasta" type="date" value={r10Hasta} onChange={(e) => setR10Hasta(e.target.value)} />
                  <Input label="Cliente" placeholder="Nombre o correo..." value={r10Cliente} onChange={(e) => setR10Cliente(e.target.value)} />
                </>
              )}
              {['R01', 'R02', 'R05', 'R06'].includes(activo) && <div className="text-sm font-bold text-slate-900 py-1.5">{menu.title}</div>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm" disabled={cargando || Boolean(error)} onClick={() => handleExport('csv')}>
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </Button>
              <Button variant="primary" size="sm" disabled={cargando || Boolean(error)} onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Excel
              </Button>
            </div>
          </div>

          <AlertBanner variant="info">
            Procedimiento: <span className="font-mono-num">dbo.{menu.sp}</span>
            {activo === 'R10' ? ' · Lista pedidos en todos los estados.' : activo === 'R06' || activo === 'R08' ? '' : ' · Excluye pedidos cancelados y usa los importes históricos.'}
          </AlertBanner>

          {error ? (
            <AlertBanner variant="error">{error}</AlertBanner>
          ) : cargando ? (
            <TableSkeleton rows={8} cols={5} />
          ) : activo === 'R05' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {[
                { titulo: 'Top 10 por unidades', t: tablaR5(r5[0]) },
                { titulo: 'Top 10 por ingresos', t: tablaR5(r5[1]) },
              ].map((b) => (
                <div key={b.titulo} className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 font-bold text-sm text-slate-900">{b.titulo}</div>
                  <TablaReporte tabla={b.t} columnasMoneda={[5]} compacta />
                </div>
              ))}
            </div>
          ) : (
            <>
              {activo === 'R04' && <GraficoR4 filas={filas} />}
              {activo === 'R10' ? (
                <TablaR10 filas={filas} />
              ) : (
                <TablaReporte
                  tabla={tablas[activo]()}
                  columnasMoneda={
                    {
                      R01: [2],
                      R02: tablas.R02().encabezados.map((_, i) => i).slice(1),
                      R03: Array.from({ length: 13 }, (_, i) => i + 1),
                      R04: [1, 3],
                      R06: [],
                      R07: [1, 2, 3],
                      R08: [],
                      R09: [1, 2, 3],
                    }[activo as Exclude<ReportId, 'R05' | 'R10'>]
                  }
                  ultimaFilaTotal={activo === 'R02'}
                  colorear={activo === 'R09' ? 3 : undefined}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const TablaReporte: React.FC<{ tabla: Tabla; columnasMoneda: number[]; compacta?: boolean; ultimaFilaTotal?: boolean; colorear?: number }> = ({
  tabla,
  columnasMoneda,
  compacta,
  ultimaFilaTotal,
  colorear,
}) => (
  <div className="bg-white rounded-[12px] border border-slate-200 overflow-x-auto">
    <table className={`w-full text-left ${compacta || tabla.encabezados.length > 7 ? 'text-xs' : 'text-sm'}`}>
      <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b border-slate-200">
        <tr>
          {tabla.encabezados.map((h, i) => (
            <th key={h + i} className={`px-3 py-3 whitespace-nowrap text-${tabla.alinear?.[i] ?? 'left'}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {tabla.filas.length === 0 ? (
          <tr>
            <td colSpan={tabla.encabezados.length} className="px-4 py-8 text-center text-slate-500">Sin resultados.</td>
          </tr>
        ) : (
          tabla.filas.map((fila, r) => {
            const esTotal = ultimaFilaTotal && r === tabla.filas.length - 1;
            return (
              <tr key={r} className={esTotal ? 'bg-slate-100 font-bold' : ''}>
                {fila.map((v, i) => {
                  const moneda = columnasMoneda.includes(i) && typeof v === 'number';
                  const n = typeof v === 'number' ? v : 0;
                  const color = colorear === i ? (n > 0 ? 'text-emerald-700' : n < 0 ? 'text-red-600' : 'text-slate-500') : '';
                  return (
                    <td key={i} className={`px-3 py-2.5 whitespace-nowrap text-${tabla.alinear?.[i] ?? 'left'} ${i === 0 ? 'font-semibold text-slate-900' : ''} ${typeof v === 'number' ? 'font-mono-num' : ''} ${moneda && n === 0 ? 'text-slate-400' : ''} ${color}`}>
                      {moneda ? formatCRC(n) : v}
                    </td>
                  );
                })}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
);

const GraficoR4: React.FC<{ filas: Fila[] }> = ({ filas }) => {
  const max = Math.max(1, ...filas.map((f) => f.ventas));
  return (
    <div className="bg-white rounded-[12px] border border-slate-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Ventas por mes (barras) y cantidad de pedidos</h3>
        <span className="text-xs text-slate-600">Colones (₡)</span>
      </div>
      <div className="relative h-48 flex items-end justify-between gap-2 pt-4 border-b border-slate-200 pb-2">
        {filas.map((f) => (
          <div key={f.mes} className="flex-1 flex flex-col items-center h-full justify-end gap-1">
            <span className="text-[10px] font-mono-num text-[#F28C28] font-bold">{f.pedidos > 0 ? `${f.pedidos}p` : ''}</span>
            <div className="w-full max-w-[32px] bg-[#0F8B8D] rounded-t-xs" style={{ height: `${Math.max(3, Math.round((f.ventas / max) * 100))}%` }} title={`${MESES_CORTOS[f.mes - 1]}: ${formatCRC(f.ventas)} · ${f.pedidos} pedidos`} />
            <span className="text-[11px] text-slate-600">{MESES_CORTOS[f.mes - 1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TablaR10: React.FC<{ filas: Fila[] }> = ({ filas }) => (
  <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
    <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-100">{filas.length} pedidos</div>
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b border-slate-200">
        <tr>
          <th className="px-5 py-3.5">Pedido</th>
          <th className="px-5 py-3.5">Fecha</th>
          <th className="px-5 py-3.5">Cliente</th>
          <th className="px-5 py-3.5">Estado</th>
          <th className="px-5 py-3.5 text-center">Líneas</th>
          <th className="px-5 py-3.5 text-right">Total</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {filas.map((o) => (
          <tr key={o.idPedido}>
            <td className="px-5 py-3 font-mono-num font-bold text-[#0F8B8D]">#{o.idPedido}</td>
            <td className="px-5 py-3 font-mono-num text-slate-600">{formatDate(o.fechaPedido)}</td>
            <td className="px-5 py-3 text-slate-900">{o.cliente}</td>
            <td className="px-5 py-3"><OrderStatusBadge status={o.nombreEstadoPedido as OrderStatus} /></td>
            <td className="px-5 py-3 text-center font-mono-num">{o.cantidadLineas}</td>
            <td className="px-5 py-3 text-right font-mono-num font-bold">{formatCRC(o.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
