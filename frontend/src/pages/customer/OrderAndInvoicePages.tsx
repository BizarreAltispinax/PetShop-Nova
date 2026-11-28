import React, { useState } from 'react';
import { ArrowLeft, Eye, PawPrint, Printer, XCircle } from 'lucide-react';
import { useDb } from '../../store/db';
import { useApi } from '../../hooks/useApi';
import { api, mensajeError } from '../../api/client';
import { EstadoDestino, PedidoCliente, PedidoDetalle } from '../../types';
import { formatCRC, formatDate, formatDateTime } from '../../utils/format';
import {
  AlertBanner,
  Button,
  ConfirmModal,
  EmptyState,
  OrderStatusBadge,
  PaymentStatusBadge,
  Select,
  Textarea,
  VerticalTimeline,
} from '../../components/ui/DesignSystemKit';

/* ======================== MIS PEDIDOS ======================== */
interface MyOrdersPageProps {
  onSelectOrder: (orderId: number) => void;
  onGoCatalog: () => void;
}

// Historial del cliente: sp_Pedido_ListarPorCliente. "sePuedeCancelar" lo calcula la BD.
export const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ onSelectOrder, onGoCatalog }) => {
  const { sesion, esCliente, addToast } = useDb();
  const { datos, cargando, error, recargar } = useApi<PedidoCliente[]>(esCliente ? '/mi/pedidos' : null);
  const [cancelTarget, setCancelTarget] = useState<PedidoCliente | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  if (!esCliente) return null;
  const pedidos = datos ?? [];

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    const id = cancelTarget.idPedido;
    setCancelTarget(null);
    try {
      await api.post(`/mi/pedidos/${id}/cancelar`, { motivo: cancelReason.trim() || undefined });
      addToast('success', `Pedido #${id} cancelado`, 'Las unidades se devolvieron al inventario.');
      await recargar();
    } catch (err) {
      addToast('error', 'No se pudo cancelar', mensajeError(err));
    }
    setCancelReason('');
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Mis pedidos</h1>
          <p className="text-sm text-slate-500">Historial de compras y seguimiento de envíos de {sesion?.nombreCompleto}</p>
        </div>
        <Button variant="secondary" onClick={onGoCatalog}>
          Ir al catálogo
        </Button>
      </div>

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {!cargando && pedidos.length === 0 ? (
        <EmptyState
          title="Aún no tiene pedidos registrados"
          description="Cuando realice su primera compra en PetShop Nova podrá consultar aquí su estado y factura."
          action={
            <Button variant="primary" onClick={onGoCatalog}>
              Explorar productos
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">N.º de pedido</th>
                  <th className="px-5 py-3.5">Fecha</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-center">Líneas</th>
                  <th className="px-5 py-3.5 text-right">Total</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidos.map((p) => (
                  <tr key={p.idPedido} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-mono-num font-bold text-slate-900">#{p.idPedido}</td>
                    <td className="px-5 py-4 font-mono-num text-slate-600">{formatDate(p.fechaPedido)}</td>
                    <td className="px-5 py-4">
                      <OrderStatusBadge status={p.nombreEstadoPedido} />
                    </td>
                    <td className="px-5 py-4 text-center tabular-nums text-slate-700">{p.cantidadLineas}</td>
                    <td className="px-5 py-4 text-right font-mono-num font-bold text-slate-900">{formatCRC(p.total)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => onSelectOrder(p.idPedido)}>
                          <Eye className="w-3.5 h-3.5" /> Ver detalle
                        </Button>
                        {p.sePuedeCancelar && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setCancelReason('');
                              setCancelTarget(p);
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Cancelar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        title={`Cancelar pedido #${cancelTarget?.idPedido ?? ''}`}
        message="Esta acción cancelará el pedido y devolverá las unidades al inventario. ¿Desea continuar?"
        confirmLabel="Sí, cancelar pedido"
        variant="danger"
      >
        <Textarea
          label="Motivo de cancelación (opcional)"
          rows={2}
          maxLength={100}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Ej. Cambio en dirección de entrega o error en cantidad"
        />
      </ConfirmModal>
    </div>
  );
};

/* ======================== DETALLE DE PEDIDO (cliente y administrador) + FACTURA ======================== */
interface OrderDetailPageProps {
  orderId: number;
  isAdminView?: boolean;
  initialPrintMode?: boolean;
  onBack: () => void;
}

// Detalle: sp_Pedido_ObtenerDetalle (encabezado, líneas con precio histórico, historial).
// Administrador: estados posibles desde sp_Pedido_TransicionesValidas y cambio con sp_Pedido_CambiarEstado.
export const OrderDetailPage: React.FC<OrderDetailPageProps> = ({ orderId, isAdminView = false, initialPrintMode = false, onBack }) => {
  const { addToast } = useDb();
  const base = isAdminView ? '/admin/pedidos' : '/mi/pedidos';
  const detalle = useApi<PedidoDetalle>(`${base}/${orderId}`);
  const transiciones = useApi<EstadoDestino[]>(isAdminView ? `/admin/pedidos/${orderId}/transiciones` : null);

  const [printMode, setPrintMode] = useState(initialPrintMode);
  const [nextStatus, setNextStatus] = useState<number | ''>('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [aplicando, setAplicando] = useState(false);

  const recargarTodo = async () => {
    await Promise.all([detalle.recargar(), transiciones.recargar()]);
  };

  const aplicarEstado = async (idEstado: number) => {
    setStatusError(null);
    setAplicando(true);
    try {
      await api.patch(`/admin/pedidos/${orderId}/estado`, { idEstado });
      addToast('success', 'Estado actualizado', `El pedido #${orderId} cambió de estado.`);
      setNextStatus('');
      await recargarTodo();
    } catch (err) {
      setStatusError(mensajeError(err));
    } finally {
      setAplicando(false);
    }
  };

  // Demostración: un segundo intento de cancelación lo rechaza la BD y no devuelve stock otra vez
  const probarSegundaCancelacion = async () => {
    try {
      await api.post(`${base}/${orderId}/cancelar`, {});
      await recargarTodo();
    } catch (err) {
      addToast('error', 'No se pudo cancelar el pedido', mensajeError(err));
    }
  };

  if (detalle.cargando && !detalle.datos) {
    return <div className="max-w-[1000px] mx-auto px-6 py-12 text-sm text-slate-500">Cargando pedido...</div>;
  }

  const p = detalle.datos?.pedido;
  if (detalle.error || !p) {
    return (
      <div className="max-w-[1000px] mx-auto px-6 py-12 space-y-4">
        <AlertBanner variant="error">{detalle.error ?? `Pedido #${orderId} no encontrado.`}</AlertBanner>
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>
      </div>
    );
  }

  const lineas = detalle.datos?.lineas ?? [];
  const historial = (detalle.datos?.historial ?? []).map((h) => ({ estado: h.nombreEstadoPedido, fechaHora: h.fecha }));
  const destinos = transiciones.datos ?? [];
  const estadoElegido = destinos.find((d) => d.idEstado === nextStatus);

  /* ---- Factura imprimible (blanco y negro) ---- */
  if (printMode) {
    return (
      <div className="max-w-[850px] mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between no-print">
          <Button variant="secondary" onClick={() => setPrintMode(false)}>
            <ArrowLeft className="w-4 h-4" /> Volver al detalle del pedido
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
          </Button>
        </div>

        <div className="print-only-container bg-white text-black border border-black p-10 space-y-8 shadow-sm">
          <div className="flex justify-between items-start border-b-2 border-black pb-6">
            <div>
              <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <PawPrint className="w-6 h-6" />
                PETSHOP NOVA
              </div>
              <p className="text-xs mt-1">Tienda ficticia · Proyecto académico · San José, Costa Rica</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold uppercase">Comprobante de pedido</div>
              <div className="font-mono-num text-base font-bold mt-1">N.º #{p.idPedido}</div>
              <div className="text-xs mt-1">Fecha: {formatDateTime(p.fechaPedido)}</div>
              <div className="text-xs">Estado: {p.nombreEstadoPedido}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-xs border-b border-black pb-5">
            <div className="space-y-1">
              <div className="font-bold uppercase">Datos del cliente</div>
              <div><strong>Nombre:</strong> {p.cliente}</div>
              <div><strong>Correo:</strong> {p.correo}</div>
              <div><strong>Teléfono:</strong> {p.telefono || 'No registrado'}</div>
            </div>
            <div className="space-y-1">
              <div className="font-bold uppercase">Entrega y pago</div>
              <div><strong>Dirección:</strong> {p.direccionEntrega}</div>
              <div><strong>Zona:</strong> {p.nombreZonaEnvio}</div>
              <div><strong>Pago:</strong> {p.nombreMetodoPago ?? '—'} · Ref: {p.referenciaPago ?? '—'}</div>
            </div>
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="py-2">SKU</th>
                <th className="py-2">Producto</th>
                <th className="py-2 text-center">Cant.</th>
                <th className="py-2 text-right">Precio hist.</th>
                <th className="py-2 text-right">Desc. unit.</th>
                <th className="py-2 text-right">Total línea</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-300">
              {lineas.map((l) => (
                <tr key={l.idProducto}>
                  <td className="py-2.5 font-mono-num">{l.sku}</td>
                  <td className="py-2.5">
                    <div>{l.nombreProducto}</div>
                    {l.nombrePromocion && <div className="text-[10px]">Promo: {l.nombrePromocion}</div>}
                  </td>
                  <td className="py-2.5 text-center font-mono-num">{l.cantidad}</td>
                  <td className="py-2.5 text-right font-mono-num">{formatCRC(l.precioUnitario)}</td>
                  <td className="py-2.5 text-right font-mono-num">{l.descuentoUnitario > 0 ? `-${formatCRC(l.descuentoUnitario)}` : '₡0'}</td>
                  <td className="py-2.5 text-right font-mono-num font-bold">{formatCRC(l.totalLinea)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end pt-4 border-t-2 border-black">
            <div className="w-64 text-xs space-y-1.5">
              <div className="flex justify-between"><span>Subtotal:</span><span className="font-mono-num">{formatCRC(p.subtotal)}</span></div>
              <div className="flex justify-between"><span>Descuento total:</span><span className="font-mono-num">-{formatCRC(p.descuentoTotal)}</span></div>
              <div className="flex justify-between"><span>Envío ({p.nombreZonaEnvio}):</span><span className="font-mono-num">{formatCRC(p.costoEnvio)}</span></div>
              <div className="flex justify-between text-base font-bold border-t border-black pt-2"><span>TOTAL:</span><span className="font-mono-num">{formatCRC(p.total)}</span></div>
            </div>
          </div>

          <div className="text-[11px] text-center border-t border-neutral-300 pt-4">
            Documento generado por PetShop Nova · Transportista: {p.transportista ?? '—'}
            {p.numeroGuia ? ` · Guía: ${p.numeroGuia}` : ''}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0F8B8D] cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> {isAdminView ? 'Volver a Pedidos' : 'Volver a Mis pedidos'}
        </button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setPrintMode(true)}>
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </Button>
          {p.nombreEstadoPedido === 'Cancelado' && (
            <Button variant="ghost" size="sm" onClick={probarSegundaCancelacion} title="La BD rechaza una segunda cancelación">
              Probar 2.ª cancelación
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900">Pedido #{p.idPedido}</h1>
              <OrderStatusBadge status={p.nombreEstadoPedido} />
            </div>
            <p className="text-sm text-slate-500 mt-1 font-mono-num">Registrado el {formatDateTime(p.fechaPedido)}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Total del pedido</div>
            <div className="text-2xl font-extrabold font-mono-num text-[#0F8B8D]">{formatCRC(p.total)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Cliente</div>
            <div className="font-semibold text-slate-900">{p.cliente}</div>
            <div className="text-slate-600">{p.correo}</div>
            <div className="text-slate-500">Tel: {p.telefono || 'No registrado'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Dirección de entrega</div>
            <div className="text-slate-700">{p.direccionEntrega}</div>
            <div className="text-slate-500 text-xs mt-0.5">Zona: {p.nombreZonaEnvio}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Resumen</div>
            <div className="text-slate-600">
              {lineas.length} líneas · Envío {formatCRC(p.costoEnvio)}
            </div>
          </div>
        </div>
      </div>

      {isAdminView && (
        <div className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Gestión de estado del pedido</h2>
              <p className="text-xs text-slate-500">
                Solo se muestran los estados a los que puede pasar este pedido. Al marcarlo como Enviado se genera el número de guía.
              </p>
            </div>
            {destinos.length === 0 && p.nombreEstadoPedido !== 'Pendiente' && (
              <Button variant="ghost" size="sm" onClick={() => aplicarEstado(1)}>
                Probar transición inválida a Pendiente
              </Button>
            )}
          </div>

          {statusError && <AlertBanner variant="error">{statusError}</AlertBanner>}

          {destinos.length === 0 ? (
            <AlertBanner variant="info">El pedido está en un estado final ({p.nombreEstadoPedido}) y no admite más cambios.</AlertBanner>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-64">
                <Select label="Cambiar estado a" value={nextStatus} onChange={(e) => setNextStatus(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Seleccione un estado...</option>
                  {destinos.map((d) => (
                    <option key={d.idEstado} value={d.idEstado}>
                      {d.nombreEstadoPedido}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                variant={estadoElegido?.nombreEstadoPedido === 'Cancelado' ? 'danger' : 'primary'}
                disabled={!nextStatus}
                loading={aplicando}
                onClick={() => {
                  if (!nextStatus) return;
                  if (estadoElegido?.nombreEstadoPedido === 'Cancelado') setConfirmCancelOpen(true);
                  else void aplicarEstado(nextStatus);
                }}
              >
                Actualizar estado
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-3 text-sm">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Pago</h2>
          <div className="flex justify-between">
            <span className="text-slate-500">Método</span>
            <span className="font-medium text-slate-900">{p.nombreMetodoPago ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Estado</span>
            {p.estadoPago ? <PaymentStatusBadge status={p.estadoPago} /> : <span>—</span>}
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Referencia</span>
            <span className="font-mono-num text-xs font-semibold text-slate-800">{p.referenciaPago ?? '—'}</span>
          </div>
        </div>

        <div className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-3 text-sm">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Envío</h2>
          <div className="flex justify-between">
            <span className="text-slate-500">Transportista</span>
            <span className="font-medium text-slate-900">{p.transportista ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Número de guía</span>
            <span className="font-mono-num font-semibold text-slate-900">{p.numeroGuia ?? 'Pendiente'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Fecha de envío</span>
            <span className="font-mono-num text-slate-700">{p.fechaEnvio ? formatDateTime(p.fechaEnvio) : 'Pendiente'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Fecha de entrega</span>
            <span className="font-mono-num text-slate-700">{p.fechaEntrega ? formatDateTime(p.fechaEntrega) : 'Pendiente'}</span>
          </div>
        </div>

        <div className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Historial de estados</h2>
          <VerticalTimeline entries={historial} />
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Detalle de productos (precios históricos)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3">SKU</th>
                <th className="px-5 py-3 text-center">Cantidad</th>
                <th className="px-5 py-3 text-right">Precio histórico</th>
                <th className="px-5 py-3 text-right">Desc. unitario</th>
                <th className="px-5 py-3">Promoción</th>
                <th className="px-5 py-3 text-right">Total línea</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineas.map((l) => (
                <tr key={l.idProducto}>
                  <td className="px-5 py-3.5 font-medium text-slate-900">{l.nombreProducto}</td>
                  <td className="px-5 py-3.5 font-mono-num text-xs text-slate-500">{l.sku}</td>
                  <td className="px-5 py-3.5 text-center tabular-nums">{l.cantidad}</td>
                  <td className="px-5 py-3.5 text-right font-mono-num">{formatCRC(l.precioUnitario)}</td>
                  <td className="px-5 py-3.5 text-right font-mono-num text-[#F28C28]">{l.descuentoUnitario > 0 ? `-${formatCRC(l.descuentoUnitario)}` : '₡0'}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">{l.nombrePromocion ?? '—'}</td>
                  <td className="px-5 py-3.5 text-right font-mono-num font-bold text-slate-900">{formatCRC(l.totalLinea)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-50/70 border-t border-slate-200 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-mono-num">{formatCRC(p.subtotal)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Descuento total</span><span className="font-mono-num text-[#F28C28]">-{formatCRC(p.descuentoTotal)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Costo de envío</span><span className="font-mono-num">{formatCRC(p.costoEnvio)}</span></div>
            <div className="flex justify-between text-lg font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total</span>
              <span className="font-mono-num text-[#0F8B8D]">{formatCRC(p.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={() => {
          setConfirmCancelOpen(false);
          if (nextStatus) void aplicarEstado(nextStatus);
        }}
        title={`Cancelar pedido #${p.idPedido}`}
        message="Al cancelar este pedido, sus productos vuelven al inventario y el pago se marca como reembolsado. ¿Confirmar?"
        confirmLabel="Confirmar cancelación"
        variant="danger"
      />
    </div>
  );
};
