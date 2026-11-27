import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, CreditCard, MapPin, Plus, Printer, ShoppingBag, Trash2 } from 'lucide-react';
import { useDb } from '../../store/db';
import { useApi } from '../../hooks/useApi';
import { api, mensajeError } from '../../api/client';
import { Carrito, Direccion, PedidoDetalle } from '../../types';
import { formatCRC, formatDateTime } from '../../utils/format';
import { AlertBanner, Button, EmptyState, OrderStatusBadge, QuantityStepper, SafeImage } from '../../components/ui/DesignSystemKit';
import { AddressModal } from '../../components/AddressModal';

const AvisoSesion: React.FC<{ onGoLogin: () => void; mensaje: string }> = ({ onGoLogin, mensaje }) => (
  <div className="max-w-[700px] mx-auto px-6 py-12">
    <AlertBanner
      variant="info"
      title="Inicie sesión como cliente"
      action={
        <Button variant="primary" size="sm" onClick={onGoLogin}>
          Iniciar sesión
        </Button>
      }
    >
      {mensaje}
    </AlertBanner>
  </div>
);

/* ======================== CARRITO ======================== */
// El carrito vive en SQL Server (Carrito y DetalleCarrito). Los precios, descuentos,
// costo de envío y totales los calcula sp_Carrito_Ver.
interface CartPageProps {
  onGoCatalog: () => void;
  onGoCheckout: () => void;
  onSelectProduct: (id: number) => void;
  onGoLogin: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onGoCatalog, onGoCheckout, onSelectProduct, onGoLogin }) => {
  const { esCliente, carrito, recargarCarrito, addToast } = useDb();
  const [ocupado, setOcupado] = useState<number | null>(null);

  if (!esCliente) {
    return <AvisoSesion onGoLogin={onGoLogin} mensaje="El carrito se guarda en su cuenta de cliente para que no se pierda." />;
  }

  const lineas = carrito?.lineas ?? [];
  const resumen = carrito?.resumen;

  const cambiarCantidad = async (idProducto: number, cantidad: number) => {
    setOcupado(idProducto);
    try {
      await api.put(`/mi/carrito/${idProducto}`, { cantidad });
      await recargarCarrito();
    } catch (err) {
      addToast('error', 'No se pudo cambiar la cantidad', mensajeError(err));
    } finally {
      setOcupado(null);
    }
  };

  const eliminar = async (idProducto: number) => {
    setOcupado(idProducto);
    try {
      await api.delete(`/mi/carrito/${idProducto}`);
      await recargarCarrito();
    } catch (err) {
      addToast('error', 'No se pudo quitar el producto', mensajeError(err));
    } finally {
      setOcupado(null);
    }
  };

  if (lineas.length === 0) {
    return (
      <div className="max-w-[1000px] mx-auto px-6 py-12">
        <EmptyState
          title="Su carrito está vacío"
          description="Explore nuestro catálogo de alimentos, accesorios y hábitats para todas sus mascotas."
          action={
            <Button variant="primary" size="lg" onClick={onGoCatalog}>
              <ShoppingBag className="w-4 h-4" /> Ver catálogo
            </Button>
          }
        />
      </div>
    );
  }

  const hayAviso = lineas.some((l) => !l.disponible || l.cantidad > l.existencia);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Carrito de compras</h1>
        <Button variant="ghost" onClick={onGoCatalog}>
          <ArrowLeft className="w-4 h-4" /> Seguir comprando
        </Button>
      </div>

      {hayAviso && (
        <AlertBanner variant="warning" title="Verifique las cantidades de su carrito">
          Uno o más productos superan la existencia actual o ya no están disponibles. Si confirma así, SQL Server rechazará el pedido completo.
        </AlertBanner>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-white rounded-[12px] border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Producto</th>
                  <th className="px-4 py-3.5 text-right">Precio</th>
                  <th className="px-4 py-3.5 text-right">Descuento</th>
                  <th className="px-4 py-3.5 text-right">Final</th>
                  <th className="px-4 py-3.5 text-center">Cantidad</th>
                  <th className="px-4 py-3.5 text-right">Subtotal</th>
                  <th className="px-4 py-3.5 text-center">Quitar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineas.map((l) => {
                  const excede = !l.disponible || l.cantidad > l.existencia;
                  return (
                    <tr key={l.idProducto} className={excede ? 'bg-amber-50/90' : 'hover:bg-slate-50/60'}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <SafeImage src={l.urlImagen ?? undefined} alt={l.nombreProducto} className="w-14 h-12 rounded-lg object-cover shrink-0 border border-slate-200" />
                          <div className="min-w-0">
                            <button type="button" onClick={() => onSelectProduct(l.idProducto)} className="font-semibold text-slate-900 hover:text-[#0F8B8D] text-left cursor-pointer">
                              {l.nombreProducto}
                            </button>
                            <div className="text-xs font-mono-num text-slate-500">
                              SKU: {l.sku} · Stock: {l.existencia}
                            </div>
                            {l.nombrePromocion && <div className="text-xs text-[#F28C28]">{l.nombrePromocion}</div>}
                            {excede && (
                              <div className="text-xs text-amber-800 font-medium flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {l.existencia === 0 ? 'Sin existencia' : `Supera la existencia disponible (${l.existencia})`}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono-num text-slate-600">{formatCRC(l.precioVigente)}</td>
                      <td className="px-4 py-4 text-right font-mono-num text-[#F28C28]">
                        {l.descuentoUnitario > 0 ? `-${formatCRC(l.descuentoUnitario)}` : '₡0'}
                      </td>
                      <td className="px-4 py-4 text-right font-mono-num font-semibold text-slate-900">{formatCRC(l.precioFinal)}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <QuantityStepper
                            size="sm"
                            value={l.cantidad}
                            min={1}
                            max={Math.max(l.cantidad, l.existencia)}
                            disabled={ocupado === l.idProducto}
                            onChange={(val) => cambiarCantidad(l.idProducto, val)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono-num font-bold text-slate-900">{formatCRC(l.subtotalLinea)}</td>
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          disabled={ocupado === l.idProducto}
                          onClick={() => eliminar(l.idProducto)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-40"
                          aria-label={`Eliminar ${l.nombreProducto}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="lg:col-span-4 bg-white rounded-[12px] border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Resumen de compra</h2>
          {resumen && <ResumenMontos resumen={resumen} etiquetaTotal="Total estimado" />}
          <Button variant="accent" size="lg" onClick={onGoCheckout} className="w-full">
            Continuar al pago <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-xs text-slate-500 text-center">
            El envío se calcula con la tarifa de su dirección principal. Podrá elegir otra dirección en el siguiente paso.
          </p>
        </aside>
      </div>
    </div>
  );
};

const ResumenMontos: React.FC<{ resumen: NonNullable<Carrito['resumen']>; etiquetaTotal: string }> = ({ resumen, etiquetaTotal }) => (
  <div className="space-y-2.5 text-sm">
    <div className="flex justify-between text-slate-600">
      <span>Subtotal</span>
      <span className="font-mono-num font-medium text-slate-900">{formatCRC(resumen.subtotal)}</span>
    </div>
    <div className="flex justify-between text-slate-600">
      <span>Descuento total</span>
      <span className="font-mono-num font-medium text-[#F28C28]">-{formatCRC(resumen.descuentoTotal)}</span>
    </div>
    <div className="flex justify-between text-slate-600">
      <span>Costo de envío</span>
      <span className="font-mono-num font-medium text-slate-900">{formatCRC(resumen.costoEnvio)}</span>
    </div>
    <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
      <span className="text-base font-bold text-slate-900">{etiquetaTotal}</span>
      <span className="text-2xl font-extrabold font-mono-num text-[#0F8B8D]">{formatCRC(resumen.total)}</span>
    </div>
  </div>
);

/* ======================== CHECKOUT ======================== */
interface CheckoutPageProps {
  onBackToCart: () => void;
  onGoLogin: () => void;
  onOrderConfirmed: (idPedido: number) => void;
}

// Confirmar compra: sp_Pedido_Confirmar (transacción atómica en SQL Server).
export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBackToCart, onGoLogin, onOrderConfirmed }) => {
  const { esCliente, metodosPago, recargarCarrito } = useDb();
  const direcciones = useApi<Direccion[]>(esCliente ? '/mi/direcciones' : null);
  const lista = direcciones.datos ?? [];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [idDireccion, setIdDireccion] = useState<number>(0);
  const [idMetodoPago, setIdMetodoPago] = useState<number>(0);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dirección por defecto: la principal
  useEffect(() => {
    if (lista.length > 0 && !lista.some((d) => d.idDireccion === idDireccion)) {
      setIdDireccion((lista.find((d) => d.esPrincipal) ?? lista[0]).idDireccion);
    }
  }, [lista, idDireccion]);

  useEffect(() => {
    if (!idMetodoPago && metodosPago.length > 0) setIdMetodoPago(metodosPago[0].idMetodoPago);
  }, [metodosPago, idMetodoPago]);

  // Resumen con el costo de envío de la dirección elegida (lo calcula sp_Carrito_Ver)
  const carrito = useApi<Carrito>(esCliente && idDireccion ? '/mi/carrito' : null, { idDireccion });

  if (!esCliente) {
    return <AvisoSesion onGoLogin={onGoLogin} mensaje="Necesita una cuenta de cliente para elegir su dirección y registrar el pedido." />;
  }

  const direccion = lista.find((d) => d.idDireccion === idDireccion);
  const metodo = metodosPago.find((m) => m.idMetodoPago === idMetodoPago);
  const lineas = carrito.datos?.lineas ?? [];
  const resumen = carrito.datos?.resumen;

  const handleConfirmOrder = async () => {
    setError(null);
    setConfirmando(true);
    try {
      const r = await api.post<{ idPedido: number }>('/mi/pedidos', { idDireccion, idMetodoPago });
      await recargarCarrito();
      onOrderConfirmed(r.idPedido);
    } catch (err) {
      // Si falla, SQL Server hizo ROLLBACK: no se creó el pedido ni se tocó el inventario
      setError(mensajeError(err));
      await carrito.recargar();
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Finalizar compra</h1>
        <Button variant="ghost" onClick={onBackToCart}>
          <ArrowLeft className="w-4 h-4" /> Volver al carrito
        </Button>
      </div>

      <div className="bg-white rounded-[12px] border border-slate-200 p-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { num: 1, label: '1. Dirección de entrega', icon: MapPin },
            { num: 2, label: '2. Método de pago', icon: CreditCard },
            { num: 3, label: '3. Resumen y confirmación', icon: CheckCircle2 },
          ].map((s) => {
            const Icon = s.icon;
            const active = step === s.num;
            const done = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (s.num < step) setStep(s.num as 1 | 2 | 3);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-[10px] text-xs sm:text-sm font-semibold transition-colors ${
                  active ? 'bg-[#0F8B8D] text-white' : done ? 'bg-teal-50 text-[#0F8B8D] cursor-pointer' : 'bg-slate-50 text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <AlertBanner variant="error" title="No se pudo confirmar el pedido">
          {error}
        </AlertBanner>
      )}

      {step === 1 && (
        <div className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Seleccione la dirección de entrega</h2>
            <Button variant="secondary" size="sm" onClick={() => setAddressModalOpen(true)}>
              <Plus className="w-4 h-4" /> Agregar dirección
            </Button>
          </div>

          {direcciones.error && <AlertBanner variant="error">{direcciones.error}</AlertBanner>}
          {!direcciones.cargando && lista.length === 0 ? (
            <AlertBanner variant="warning">No tiene direcciones activas. Agregue una para calcular el envío.</AlertBanner>
          ) : (
            <div className="space-y-3">
              {lista.map((d) => {
                const selected = d.idDireccion === idDireccion;
                return (
                  <label
                    key={d.idDireccion}
                    className={`flex items-start justify-between gap-4 p-4 rounded-[12px] border cursor-pointer transition-colors ${
                      selected ? 'border-[#0F8B8D] bg-teal-50/40' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input type="radio" name="address" checked={selected} onChange={() => setIdDireccion(d.idDireccion)} className="mt-1 accent-[#0F8B8D]" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{d.lineaDireccion}</span>
                          {d.esPrincipal && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-[#0F8B8D]">Principal</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {d.ciudad}, {d.provincia}
                          {d.codigoPostal ? ` · CP ${d.codigoPostal}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-slate-700">{d.nombreZonaEnvio}</div>
                      <div className="text-sm font-mono-num font-bold text-[#0F8B8D]">{formatCRC(d.tarifa)}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-3">
            <Button variant="primary" size="lg" disabled={!direccion} onClick={() => setStep(2)}>
              Continuar a método de pago <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">Método de pago</h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">Pago simulado</span>
          </div>
          <AlertBanner variant="info">
            Pago simulado: al confirmar, SQL Server registra el pago aprobado con su referencia y descuenta el inventario en la misma transacción.
          </AlertBanner>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metodosPago.map((m) => {
              const selected = m.idMetodoPago === idMetodoPago;
              return (
                <label
                  key={m.idMetodoPago}
                  className={`flex items-start gap-3 p-4 rounded-[12px] border cursor-pointer transition-colors ${
                    selected ? 'border-[#0F8B8D] bg-teal-50/40' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input type="radio" name="paymentMethod" checked={selected} onChange={() => setIdMetodoPago(m.idMetodoPago)} className="mt-1 accent-[#0F8B8D]" />
                  <div className="font-semibold text-sm text-slate-900">{m.nombreMetodoPago}</div>
                </label>
              );
            })}
          </div>
          <div className="flex justify-between pt-3">
            <Button variant="secondary" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4" /> Atrás
            </Button>
            <Button variant="primary" size="lg" disabled={!metodo} onClick={() => setStep(3)}>
              Revisar resumen <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Resumen del pedido</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 rounded-[12px] border border-slate-200 p-4">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">Dirección de entrega</div>
              <div className="font-bold text-slate-900 mt-1">{direccion?.lineaDireccion}</div>
              <div className="text-slate-500 text-xs">
                {direccion?.ciudad}, {direccion?.provincia} · Zona: {direccion?.nombreZonaEnvio}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">Método de pago</div>
              <div className="font-bold text-slate-900 mt-1">{metodo?.nombreMetodoPago}</div>
              <div className="text-xs text-slate-500">Pago simulado (aprobación automática)</div>
            </div>
          </div>

          {carrito.error && <AlertBanner variant="error">{carrito.error}</AlertBanner>}
          {lineas.length === 0 && !carrito.cargando ? (
            <AlertBanner variant="warning">El carrito está vacío.</AlertBanner>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-[10px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 text-center">Cant.</th>
                    <th className="px-4 py-3 text-right">Precio final unit.</th>
                    <th className="px-4 py-3 text-right">Subtotal línea</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineas.map((l) => (
                    <tr key={l.idProducto}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{l.nombreProducto}</div>
                        <div className="text-xs font-mono-num text-slate-500">{l.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{l.cantidad}</td>
                      <td className="px-4 py-3 text-right font-mono-num">{formatCRC(l.precioFinal)}</td>
                      <td className="px-4 py-3 text-right font-mono-num font-semibold">{formatCRC(l.subtotalLinea)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {resumen && (
            <div className="flex justify-end border-t border-slate-200 pt-4">
              <div className="w-full max-w-xs">
                <ResumenMontos resumen={resumen} etiquetaTotal="Total a pagar" />
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-3 pt-2">
            <Button variant="secondary" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4" /> Atrás
            </Button>
            <Button variant="accent" size="lg" loading={confirmando} disabled={lineas.length === 0} onClick={handleConfirmOrder}>
              Confirmar pedido
            </Button>
          </div>
        </div>
      )}

      <AddressModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSaved={async (id) => {
          await direcciones.recargar();
          setIdDireccion(id);
        }}
      />
    </div>
  );
};

/* ======================== PEDIDO CONFIRMADO ======================== */
interface OrderConfirmedPageProps {
  orderId: number;
  onViewOrderDetail: (orderId: number) => void;
  onPrintInvoice: (orderId: number) => void;
  onGoCatalog: () => void;
}

export const OrderConfirmedPage: React.FC<OrderConfirmedPageProps> = ({ orderId, onViewOrderDetail, onPrintInvoice, onGoCatalog }) => {
  const { datos, error } = useApi<PedidoDetalle>(`/mi/pedidos/${orderId}`);
  const p = datos?.pedido;

  return (
    <div className="max-w-[680px] mx-auto px-6 py-12">
      <div className="bg-white rounded-[12px] border border-slate-200 shadow-sm p-8 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">¡Pedido confirmado!</h1>
          <p className="text-sm text-slate-600">Gracias por su compra en PetShop Nova. Ya estamos alistando los productos para su mascota.</p>
        </div>

        {error && <AlertBanner variant="error">{error}</AlertBanner>}
        {p && (
          <div className="bg-slate-50 rounded-[12px] border border-slate-200 p-5 text-sm space-y-3 text-left">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Número de pedido</span>
              <span className="font-mono-num font-bold text-slate-900">#{p.idPedido}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Estado actual</span>
              <OrderStatusBadge status={p.nombreEstadoPedido} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Fecha y hora</span>
              <span className="font-mono-num text-slate-900">{formatDateTime(p.fechaPedido)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Referencia de pago</span>
              <span className="font-mono-num font-semibold text-slate-900">{p.referenciaPago ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-900">Total pagado</span>
              <span className="text-xl font-extrabold font-mono-num text-[#0F8B8D]">{formatCRC(p.total)}</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button variant="primary" onClick={() => onViewOrderDetail(orderId)}>
            Ver detalle del pedido
          </Button>
          <Button variant="secondary" onClick={() => onPrintInvoice(orderId)}>
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </Button>
          <Button variant="ghost" onClick={onGoCatalog}>
            Seguir comprando
          </Button>
        </div>
      </div>
    </div>
  );
};
