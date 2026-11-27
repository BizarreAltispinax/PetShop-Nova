import React from 'react';
import { ArrowRight, BarChart3, PackageX, ShoppingBag, TrendingUp } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Dashboard } from '../../types';
import { formatCRC, formatDate, MESES_CORTOS } from '../../utils/format';
import { AlertBanner, Button, OrderStatusBadge, TableSkeleton } from '../../components/ui/DesignSystemKit';

interface AdminDashboardPageProps {
  onGoInventoryLow: () => void;
  onSelectOrder: (orderId: number) => void;
  onGoOrders: () => void;
}

const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

// Indicadores: sp_Dashboard_Indicadores (ventas del mes sin cancelados, últimos 6 meses,
// pedidos recientes y productos bajo mínimo).
export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onGoInventoryLow, onSelectOrder, onGoOrders }) => {
  const { datos, cargando, error } = useApi<Dashboard>('/admin/dashboard');

  if (error) return <AlertBanner variant="error">{error}</AlertBanner>;
  if (cargando || !datos) return <TableSkeleton rows={6} cols={4} />;

  const k = datos.indicadores;
  const mesActual = k ? new Date(k.mes) : new Date();
  const etiquetaMes = `${MESES_LARGOS[mesActual.getMonth()]} ${mesActual.getFullYear()}`;
  const maxMes = Math.max(1, ...datos.ventasMensuales.map((m) => m.ventas));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Resumen operativo de PetShop Nova · {etiquetaMes}</p>
      </div>

      {datos.bajoMinimo.length > 0 && (
        <AlertBanner
          variant="error"
          title={`Alerta de inventario: ${datos.bajoMinimo.length} productos bajo mínimo`}
          action={
            <Button variant="danger" size="sm" onClick={onGoInventoryLow}>
              Ver en Inventario <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          }
        >
          <span>{datos.bajoMinimo.map((p) => `${p.nombreProducto} (${p.existencia}/${p.stockMinimo})`).join(' · ')}</span>
        </AlertBanner>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <Tarjeta titulo="Ventas del mes" icono={<TrendingUp className="w-4 h-4 text-[#0F8B8D]" />} valor={formatCRC(k?.ventasMes ?? 0)} nota="Excluye pedidos cancelados y envío" />
        <Tarjeta titulo="Pedidos del mes" icono={<ShoppingBag className="w-4 h-4 text-[#0F8B8D]" />} valor={String(k?.pedidosMes ?? 0)} nota={etiquetaMes} />
        <Tarjeta titulo="Ticket promedio" icono={<BarChart3 className="w-4 h-4 text-[#F28C28]" />} valor={formatCRC(k?.ticketPromedio ?? 0)} nota="Promedio por pedido válido" />
        <Tarjeta titulo="Productos bajo mínimo" icono={<PackageX className="w-4 h-4 text-red-600" />} valor={String(k?.productosBajoMinimo ?? 0)} nota="Requieren reposición" rojo />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white rounded-[12px] border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Ventas de los últimos 6 meses</h2>
            <span className="text-xs text-slate-500">En colones (₡)</span>
          </div>
          <div className="h-56 flex items-end justify-between gap-3 pt-6 border-b border-slate-200 pb-2">
            {datos.ventasMensuales.map((m) => {
              const alto = Math.max(4, Math.round((m.ventas / maxMes) * 100));
              const etiqueta = MESES_CORTOS[m.mes - 1];
              return (
                <div key={`${m.anio}-${m.mes}`} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="text-[11px] font-mono-num text-slate-600">{m.ventas > 0 ? `${Math.round(m.ventas / 1000)}k` : '₡0'}</div>
                  <div className="w-full max-w-[44px] rounded-t-md bg-[#0F8B8D] hover:bg-[#0B7072] transition-colors" style={{ height: `${alto}%` }} title={`${etiqueta} ${m.anio}: ${formatCRC(m.ventas)}`} />
                  <span className="text-xs font-medium text-slate-600">{etiqueta}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-[12px] border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">5 pedidos más recientes</h2>
            <Button variant="ghost" size="sm" onClick={onGoOrders}>
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">N.º</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.pedidosRecientes.map((o) => (
                  <tr key={o.idPedido} onClick={() => onSelectOrder(o.idPedido)} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3 font-mono-num font-bold text-[#0F8B8D]">#{o.idPedido}</td>
                    <td className="px-4 py-3 font-mono-num text-slate-600">{formatDate(o.fechaPedido)}</td>
                    <td className="px-4 py-3 text-slate-800">{o.cliente}</td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.nombreEstadoPedido} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num font-semibold">{formatCRC(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const Tarjeta: React.FC<{ titulo: string; icono: React.ReactNode; valor: string; nota: string; rojo?: boolean }> = ({ titulo, icono, valor, nota, rojo }) => (
  <div className="bg-white rounded-[12px] border border-slate-200 p-5 space-y-2">
    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
      <span>{titulo}</span>
      {icono}
    </div>
    <div className={`text-2xl font-extrabold font-mono-num ${rojo ? 'text-red-600' : 'text-slate-900'}`}>{valor}</div>
    <div className="text-xs text-slate-500">{nota}</div>
  </div>
);
