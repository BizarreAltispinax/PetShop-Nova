import React, { useEffect, useState } from 'react';
import { ArrowDownUp, Edit2, Eye, History, UserPlus } from 'lucide-react';
import { useDb } from '../../store/db';
import { useApi } from '../../hooks/useApi';
import { api, mensajeError } from '../../api/client';
import {
  Cliente,
  ClienteBusqueda,
  Direccion,
  ESTADOS_PEDIDO,
  InventarioFila,
  InventoryMovementType,
  MovimientoKardex,
  PedidoCliente,
  PedidoResumen,
} from '../../types';
import { formatCRC, formatDate, formatDateTime, toYmd } from '../../utils/format';
import {
  AlertBanner,
  Button,
  ConfirmModal,
  Input,
  Modal,
  OrderStatusBadge,
  Select,
  SideDrawer,
  StockStatusBadge,
  TableSkeleton,
  Textarea,
  Toggle,
} from '../../components/ui/DesignSystemKit';

function useDebounce<T>(valor: T, ms = 400) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

/* ======================== INVENTARIO ======================== */
// sp_Inventario_Listar, sp_Inventario_RegistrarMovimiento (impide existencia negativa)
// y sp_Inventario_Movimientos (kardex con saldo acumulado).
export const AdminInventoryPage: React.FC<{ initialLowOnly?: boolean }> = ({ initialLowOnly = false }) => {
  const { addToast } = useDb();
  const [onlyLow, setOnlyLow] = useState(initialLowOnly);
  const [texto, setTexto] = useState('');
  const textoBuscado = useDebounce(texto.trim());
  const inventario = useApi<InventarioFila[]>('/admin/inventario', { texto: textoBuscado, bajoMinimo: onlyLow });
  const filas = (inventario.datos ?? []).filter((p) => p.activo);

  const [movModalOpen, setMovModalOpen] = useState(false);
  const [movProdId, setMovProdId] = useState<number>(0);
  const [movTipo, setMovTipo] = useState<InventoryMovementType>('ENTRADA');
  const [movCantidad, setMovCantidad] = useState('5');
  const [movMotivo, setMovMotivo] = useState('');
  const [movError, setMovError] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState(false);

  const [kardexProd, setKardexProd] = useState<InventarioFila | null>(null);
  const [kardexFrom, setKardexFrom] = useState('');
  const [kardexTo, setKardexTo] = useState('');
  const kardex = useApi<MovimientoKardex[]>(kardexProd ? `/admin/inventario/${kardexProd.idProducto}/movimientos` : null, {
    desde: kardexFrom,
    hasta: kardexTo,
  });

  // Lista completa para el selector del modal (sin filtros)
  const todos = useApi<InventarioFila[]>(movModalOpen ? '/admin/inventario' : null);

  const openMovementModal = (idProducto?: number) => {
    setMovProdId(idProducto ?? filas[0]?.idProducto ?? 0);
    setMovTipo('ENTRADA');
    setMovCantidad('5');
    setMovMotivo('');
    setMovError(null);
    setMovModalOpen(true);
  };

  const handleSaveMovement = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setMovError(null);
    setRegistrando(true);
    try {
      await api.post('/admin/inventario/movimientos', { idProducto: movProdId, tipo: movTipo, cantidad: Number(movCantidad), motivo: movMotivo.trim() });
      addToast('success', 'Movimiento registrado', 'La existencia se actualizó en SQL Server.');
      setMovModalOpen(false);
      await Promise.all([inventario.recargar(), kardexProd ? kardex.recargar() : Promise.resolve()]);
    } catch (err) {
      setMovError(mensajeError(err));
    } finally {
      setRegistrando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-500">Control de existencias, alertas de mínimo y kardex de movimientos</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-56">
            <Input placeholder="Buscar producto o SKU..." value={texto} onChange={(e) => setTexto(e.target.value)} />
          </div>
          <Toggle checked={onlyLow} onChange={setOnlyLow} label="Solo bajo mínimo" />
          <Button variant="primary" onClick={() => openMovementModal()}>
            <ArrowDownUp className="w-4 h-4" /> Registrar movimiento
          </Button>
        </div>
      </div>

      {inventario.error && <AlertBanner variant="error">{inventario.error}</AlertBanner>}

      {inventario.cargando && filas.length === 0 ? (
        <TableSkeleton rows={8} cols={8} />
      ) : (
        <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">SKU</th>
                  <th className="px-4 py-3.5">Producto</th>
                  <th className="px-4 py-3.5">Marca</th>
                  <th className="px-4 py-3.5">Categoría</th>
                  <th className="px-4 py-3.5 text-right">Existencia</th>
                  <th className="px-4 py-3.5 text-right">Mínimo</th>
                  <th className="px-4 py-3.5 text-right">Faltantes</th>
                  <th className="px-4 py-3.5">Alerta</th>
                  <th className="px-4 py-3.5">Últ. actualización</th>
                  <th className="px-4 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((p) => (
                  <tr key={p.idProducto} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 font-mono-num text-xs text-slate-600">{p.sku}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{p.nombreProducto}</td>
                    <td className="px-4 py-3.5 text-slate-700">{p.nombreMarca}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">{p.nombreCategoria}</td>
                    <td className={`px-4 py-3.5 text-right font-mono-num font-bold ${p.bajoMinimo ? 'text-red-600' : 'text-slate-900'}`}>{p.existencia}</td>
                    <td className="px-4 py-3.5 text-right font-mono-num text-slate-500">{p.stockMinimo}</td>
                    <td className="px-4 py-3.5 text-right font-mono-num font-semibold text-red-600">{p.unidadesFaltantes > 0 ? p.unidadesFaltantes : '—'}</td>
                    <td className="px-4 py-3.5">
                      <StockStatusBadge status={p.existencia === 0 ? 'Agotado' : p.bajoMinimo ? 'Bajo mínimo' : 'Disponible'} />
                    </td>
                    <td className="px-4 py-3.5 font-mono-num text-xs text-slate-500">{formatDateTime(p.fechaActualizacion)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setKardexFrom('');
                            setKardexTo('');
                            setKardexProd(p);
                          }}
                        >
                          <History className="w-3.5 h-3.5" /> Ver kardex
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openMovementModal(p.idProducto)}>
                          Mover
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={movModalOpen}
        onClose={() => setMovModalOpen(false)}
        title="Registrar movimiento de inventario"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMovModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={registrando} onClick={() => handleSaveMovement()}>Registrar</Button>
          </>
        }
      >
        <form onSubmit={handleSaveMovement} className="space-y-4">
          {movError && <AlertBanner variant="error">{movError}</AlertBanner>}
          <Select label="Producto" value={movProdId} onChange={(e) => setMovProdId(Number(e.target.value))}>
            {(todos.datos ?? filas).filter((p) => p.activo).map((p) => (
              <option key={p.idProducto} value={p.idProducto}>
                {p.sku} — {p.nombreProducto} (Actual: {p.existencia})
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Tipo de movimiento" value={movTipo} onChange={(e) => setMovTipo(e.target.value as InventoryMovementType)}>
              <option value="ENTRADA">ENTRADA (+)</option>
              <option value="SALIDA">SALIDA (-)</option>
              <option value="AJUSTE">AJUSTE (+/-)</option>
            </Select>
            <Input
              label="Cantidad"
              type="number"
              value={movCantidad}
              onChange={(e) => setMovCantidad(e.target.value)}
              hint={movTipo === 'AJUSTE' ? 'Positivo suma, negativo resta' : 'Número positivo'}
              required
            />
          </div>
          <Textarea label="Motivo" rows={3} maxLength={200} value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} placeholder="Ej. Compra a proveedor / Daño en bodega / Conteo físico" required />
        </form>
      </Modal>

      <SideDrawer
        open={Boolean(kardexProd)}
        onClose={() => setKardexProd(null)}
        title={`Kardex · ${kardexProd?.nombreProducto ?? ''}`}
        subtitle={`SKU: ${kardexProd?.sku ?? ''}`}
        widthClass="max-w-3xl"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-[10px] border border-slate-200">
            <Input label="Fecha desde" type="date" value={kardexFrom} onChange={(e) => setKardexFrom(e.target.value)} />
            <Input label="Fecha hasta" type="date" value={kardexTo} onChange={(e) => setKardexTo(e.target.value)} />
          </div>
          {kardex.error && <AlertBanner variant="error">{kardex.error}</AlertBanner>}
          <div className="border border-slate-200 rounded-[10px] overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Tipo</th>
                  <th className="px-3 py-2.5 text-right">Cant.</th>
                  <th className="px-3 py-2.5 text-right">Efecto</th>
                  <th className="px-3 py-2.5 text-right">Saldo</th>
                  <th className="px-3 py-2.5">Motivo</th>
                  <th className="px-3 py-2.5">Pedido</th>
                  <th className="px-3 py-2.5">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(kardex.datos ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      {kardex.cargando ? 'Cargando...' : 'No hay movimientos para los filtros seleccionados.'}
                    </td>
                  </tr>
                ) : (
                  (kardex.datos ?? []).map((m) => (
                    <tr key={m.idMovimiento}>
                      <td className="px-3 py-2.5 font-mono-num text-slate-600">{formatDateTime(m.fecha)}</td>
                      <td className="px-3 py-2.5 font-semibold">{m.tipo}</td>
                      <td className="px-3 py-2.5 text-right font-mono-num">{m.cantidad}</td>
                      <td className={`px-3 py-2.5 text-right font-mono-num font-bold ${m.efecto >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {m.efecto >= 0 ? `+${m.efecto}` : m.efecto}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-num font-bold text-slate-900">{m.saldo}</td>
                      <td className="px-3 py-2.5 text-slate-700">{m.motivo}</td>
                      <td className="px-3 py-2.5 font-mono-num text-[#0F8B8D]">{m.idPedido ? `#${m.idPedido}` : '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{m.usuario}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SideDrawer>
    </div>
  );
};

/* ======================== PEDIDOS (ADMIN) ======================== */
// Lista con filtros parametrizados: sp_R10_ResumenPedidos.
export const AdminOrdersPage: React.FC<{ onSelectOrder: (id: number) => void }> = ({ onSelectOrder }) => {
  const [idEstado, setIdEstado] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [cliente, setCliente] = useState('');
  const clienteBuscado = useDebounce(cliente.trim());
  const { datos, cargando, error } = useApi<PedidoResumen[]>('/admin/pedidos', { idEstado, desde, hasta, cliente: clienteBuscado });
  const pedidos = datos ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Pedidos</h1>
        <p className="text-sm text-slate-500">Gestione los pedidos, sus cambios de estado y las guías de envío</p>
      </div>

      <div className="bg-white rounded-[12px] border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select label="Estado" value={idEstado} onChange={(e) => setIdEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS_PEDIDO.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </Select>
        <Input label="Fecha desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <Input label="Fecha hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        <Input label="Cliente" placeholder="Nombre o correo..." value={cliente} onChange={(e) => setCliente(e.target.value)} />
      </div>

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {cargando && pedidos.length === 0 ? (
        <TableSkeleton rows={8} cols={8} />
      ) : (
        <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
          <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-100">{pedidos.length} pedidos</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">N.º</th>
                  <th className="px-4 py-3.5">Fecha</th>
                  <th className="px-4 py-3.5">Cliente</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5 text-center">Líneas</th>
                  <th className="px-4 py-3.5 text-center">Unidades</th>
                  <th className="px-4 py-3.5 text-right">Subtotal</th>
                  <th className="px-4 py-3.5 text-right">Descuento</th>
                  <th className="px-4 py-3.5 text-right">Envío</th>
                  <th className="px-4 py-3.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidos.map((o) => (
                  <tr key={o.idPedido} onClick={() => onSelectOrder(o.idPedido)} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3.5 font-mono-num font-bold text-[#0F8B8D]">#{o.idPedido}</td>
                    <td className="px-4 py-3.5 font-mono-num text-slate-600">{formatDate(o.fechaPedido)}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">{o.cliente}</td>
                    <td className="px-4 py-3.5"><OrderStatusBadge status={o.nombreEstadoPedido} /></td>
                    <td className="px-4 py-3.5 text-center font-mono-num">{o.cantidadLineas}</td>
                    <td className="px-4 py-3.5 text-center font-mono-num">{o.cantidadUnidades}</td>
                    <td className="px-4 py-3.5 text-right font-mono-num">{formatCRC(o.subtotal)}</td>
                    <td className="px-4 py-3.5 text-right font-mono-num text-[#F28C28]">-{formatCRC(o.descuentoTotal)}</td>
                    <td className="px-4 py-3.5 text-right font-mono-num">{formatCRC(o.costoEnvio)}</td>
                    <td className="px-4 py-3.5 text-right font-mono-num font-bold text-slate-900">{formatCRC(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

/* ======================== CLIENTES (ADMIN) ======================== */
// sp_Cliente_Buscar, sp_Cliente_Obtener, sp_Cliente_CambiarEstado (también activa/desactiva el usuario).
export const AdminCustomersPage: React.FC<{ onSelectOrder: (id: number) => void }> = ({ onSelectOrder }) => {
  const { addToast } = useDb();
  const [search, setSearch] = useState('');
  const textoBuscado = useDebounce(search.trim());
  const clientes = useApi<ClienteBusqueda[]>('/admin/clientes', { texto: textoBuscado });

  const [drawerId, setDrawerId] = useState<number | null>(null);
  const ficha = useApi<Cliente>(drawerId ? `/admin/clientes/${drawerId}` : null);
  const direcciones = useApi<Direccion[]>(drawerId ? `/admin/clientes/${drawerId}/direcciones` : null);
  const pedidos = useApi<PedidoCliente[]>(drawerId ? `/admin/clientes/${drawerId}/pedidos` : null);
  const [confirmTarget, setConfirmTarget] = useState<ClienteBusqueda | null>(null);
  // Formulario: null = cerrado, 'nuevo' = alta, Cliente = edición
  const [formulario, setFormulario] = useState<Cliente | 'nuevo' | null>(null);

  const cambiarEstado = async (c: ClienteBusqueda, activo: boolean) => {
    try {
      await api.patch(`/admin/clientes/${c.idCliente}/estado`, { activo });
      addToast('success', activo ? 'Cliente activado' : 'Cliente desactivado');
      await clientes.recargar();
    } catch (err) {
      addToast('error', 'No se pudo cambiar el estado', mensajeError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">Directorio de clientes registrados, direcciones e historial de pedidos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-72">
            <Input placeholder="Buscar por nombre o correo..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="primary" onClick={() => setFormulario('nuevo')}>
            <UserPlus className="w-4 h-4" /> Nuevo cliente
          </Button>
        </div>
      </div>

      {clientes.error && <AlertBanner variant="error">{clientes.error}</AlertBanner>}

      <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Nombre</th>
                <th className="px-4 py-3.5">Apellidos</th>
                <th className="px-4 py-3.5">Correo</th>
                <th className="px-4 py-3.5">Teléfono</th>
                <th className="px-4 py-3.5 text-center">Pedidos</th>
                <th className="px-4 py-3.5 text-center">Activo</th>
                <th className="px-4 py-3.5 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(clientes.datos ?? []).map((c) => (
                <tr key={c.idCliente} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 font-semibold text-slate-900">{c.nombreCliente}</td>
                  <td className="px-4 py-3.5 text-slate-800">{c.apellidos}</td>
                  <td className="px-4 py-3.5 text-slate-600">{c.correo}</td>
                  <td className="px-4 py-3.5 font-mono-num text-slate-600">{c.telefono || '—'}</td>
                  <td className="px-4 py-3.5 text-center font-mono-num">{c.cantidadPedidos}</td>
                  <td className="px-4 py-3.5 text-center">
                    <Toggle checked={c.activo} onChange={() => (c.activo ? setConfirmTarget(c) : void cambiarEstado(c, true))} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Button size="sm" variant="secondary" onClick={() => setDrawerId(c.idCliente)}>
                      <Eye className="w-3.5 h-3.5" /> Ver ficha
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SideDrawer
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
        title={ficha.datos ? `${ficha.datos.nombreCliente} ${ficha.datos.apellidos}` : 'Cliente'}
        subtitle={ficha.datos?.correo}
      >
        {ficha.error && <AlertBanner variant="error">{ficha.error}</AlertBanner>}
        {ficha.datos && (
          <div className="space-y-6 text-sm">
            <div className="bg-slate-50 rounded-[10px] border border-slate-200 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900">Datos personales</div>
                <Button size="sm" variant="secondary" onClick={() => ficha.datos && setFormulario(ficha.datos)}>
                  <Edit2 className="w-3.5 h-3.5" /> Editar datos
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-500">Teléfono:</span> {ficha.datos.telefono || '—'}</div>
                <div><span className="text-slate-500">Nacimiento:</span> {formatDate(ficha.datos.fechaNacimiento)}</div>
                <div><span className="text-slate-500">Registro:</span> {formatDate(ficha.datos.fechaCreacion)}</div>
                <div><span className="text-slate-500">Estado:</span> {ficha.datos.activo ? 'Activo' : 'Inactivo'}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-900">Direcciones</div>
              {(direcciones.datos ?? []).length === 0 ? (
                <p className="text-xs text-slate-500">Sin direcciones registradas.</p>
              ) : (
                <div className="space-y-2">
                  {(direcciones.datos ?? []).map((a) => (
                    <div key={a.idDireccion} className={`p-3 rounded-lg border text-xs ${a.activo ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-60'}`}>
                      <div className="font-semibold text-slate-900">
                        {a.lineaDireccion} {a.esPrincipal ? '(Principal)' : ''} {a.activo ? '' : '· inactiva'}
                      </div>
                      <div className="text-slate-500">{a.ciudad}, {a.provincia} · {a.nombreZonaEnvio}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-900">Historial de pedidos</div>
              {(pedidos.datos ?? []).length === 0 ? (
                <p className="text-xs text-slate-500">Sin pedidos.</p>
              ) : (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {(pedidos.datos ?? []).map((o) => (
                    <div
                      key={o.idPedido}
                      onClick={() => {
                        setDrawerId(null);
                        onSelectOrder(o.idPedido);
                      }}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                    >
                      <div>
                        <span className="font-mono-num font-bold text-[#0F8B8D]">#{o.idPedido}</span>
                        <span className="text-xs text-slate-500 ml-2">{formatDate(o.fechaPedido)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <OrderStatusBadge status={o.nombreEstadoPedido} />
                        <span className="font-mono-num font-semibold">{formatCRC(o.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SideDrawer>

      <ConfirmModal
        open={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) void cambiarEstado(confirmTarget, false);
          setConfirmTarget(null);
        }}
        title="Desactivar cliente"
        message={`Si desactiva a ${confirmTarget?.nombreCliente ?? ''} ${confirmTarget?.apellidos ?? ''}, no podrá iniciar sesión hasta ser reactivado. ¿Continuar?`}
        confirmLabel="Desactivar"
        variant="danger"
      />

      <ClienteFormModal
        cliente={formulario}
        onClose={() => setFormulario(null)}
        onGuardado={async (mensaje) => {
          addToast('success', mensaje);
          setFormulario(null);
          await Promise.all([clientes.recargar(), drawerId ? ficha.recargar() : Promise.resolve()]);
        }}
      />
    </div>
  );
};

/* Alta (sp_Cliente_Registrar) y edición (sp_Cliente_Actualizar) de clientes por el administrador.
   El correo no se puede cambiar: es el identificador de acceso del usuario. */
const ClienteFormModal: React.FC<{
  cliente: Cliente | 'nuevo' | null;
  onClose: () => void;
  onGuardado: (mensaje: string) => Promise<void>;
}> = ({ cliente, onClose, onGuardado }) => {
  const esNuevo = cliente === 'nuevo';
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    setError(null);
    setPassword('');
    if (cliente === 'nuevo') {
      setCorreo('');
      setNombre('');
      setApellidos('');
      setTelefono('');
      setFechaNacimiento('');
    } else {
      setCorreo(cliente.correo);
      setNombre(cliente.nombreCliente);
      setApellidos(cliente.apellidos);
      setTelefono(cliente.telefono ?? '');
      setFechaNacimiento(toYmd(cliente.fechaNacimiento));
    }
  }, [cliente]);

  const guardar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!cliente) return;
    setError(null);
    setGuardando(true);
    const datos = { nombreCliente: nombre.trim(), apellidos: apellidos.trim(), telefono: telefono.trim() || null, fechaNacimiento };
    try {
      if (cliente === 'nuevo') {
        await api.post('/admin/clientes', { ...datos, correo: correo.trim(), password });
        await onGuardado('Cliente creado');
      } else {
        await api.put(`/admin/clientes/${cliente.idCliente}`, datos);
        await onGuardado('Datos del cliente actualizados');
      }
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      open={Boolean(cliente)}
      onClose={onClose}
      title={esNuevo ? 'Nuevo cliente' : 'Editar cliente'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={guardando} onClick={() => guardar()}>Guardar</Button>
        </>
      }
    >
      <form onSubmit={guardar} className="space-y-4">
        {error && <AlertBanner variant="error">{error}</AlertBanner>}
        <Input
          label="Correo electrónico"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          disabled={!esNuevo}
          hint={esNuevo ? undefined : 'El correo es el identificador de acceso y no se modifica.'}
          maxLength={150}
          required
        />
        {esNuevo && (
          <Input
            label="Contraseña inicial"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="Mínimo 8 caracteres. Se guarda solo su hash bcrypt; el cliente puede cambiarla en su perfil."
            autoComplete="new-password"
            required
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} required />
          <Input label="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} maxLength={100} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Teléfono (opcional)" value={telefono} onChange={(e) => setTelefono(e.target.value)} maxLength={20} />
          <Input label="Fecha de nacimiento" type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} required />
        </div>
      </form>
    </Modal>
  );
};
