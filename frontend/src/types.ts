// Tipos de los datos que devuelve la API. Los nombres de campo son los mismos
// que las columnas de los procedimientos almacenados (sql/03 y sql/06).
// Las fechas llegan como texto ISO.

export type Role = 'Cliente' | 'Administrador';

export type OrderStatus =
  | 'Pendiente'
  | 'Confirmado'
  | 'En preparación'
  | 'Enviado'
  | 'Entregado'
  | 'Cancelado';

export type PaymentStatus = 'Aprobado' | 'Rechazado' | 'Reembolsado';
export type PromotionStatus = 'Vigente' | 'Programada' | 'Vencida' | 'Inactiva';
export type StockStatus = 'Disponible' | 'Últimas unidades' | 'Agotado' | 'Bajo mínimo';
export type InventoryMovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

export const ESTADOS_PEDIDO: { id: number; nombre: OrderStatus }[] = [
  { id: 1, nombre: 'Pendiente' },
  { id: 2, nombre: 'Confirmado' },
  { id: 3, nombre: 'En preparación' },
  { id: 4, nombre: 'Enviado' },
  { id: 5, nombre: 'Entregado' },
  { id: 6, nombre: 'Cancelado' },
];

/* ---------------- Sesión ---------------- */
export interface Sesion {
  idUsuario: number;
  correo: string;
  idRol: number;
  rol: Role;
  idCliente: number | null;
  nombreCompleto: string | null;
}

/* ---------------- Catálogos ---------------- */
export interface Marca {
  idMarca: number;
  nombreMarca: string;
  activo: boolean;
  cantidadProductos: number;
}

export interface Categoria {
  idCategoria: number;
  nombreCategoria: string;
  activo: boolean;
  cantidadProductos: number;
}

export interface Especie {
  idEspecie: number;
  nombreEspecie: string;
  activo: boolean;
  cantidadProductos: number;
}

export interface ZonaEnvio {
  idZonaEnvio: number;
  nombreZonaEnvio: string;
  tarifa: number;
  activo: boolean;
}

export interface MetodoPago {
  idMetodoPago: number;
  nombreMetodoPago: string;
  activo: boolean;
}

/* ---------------- Productos ---------------- */
export interface ProductoResumen {
  idProducto: number;
  sku: string;
  nombreProducto: string;
  descripcion: string | null;
  idMarca: number;
  nombreMarca: string;
  idCategoria: number;
  nombreCategoria: string;
  precioVigente: number;
  descuento: number;
  precioFinal: number;
  nombrePromocion: string | null;
  existencia: number;
  stockMinimo: number;
  disponible: boolean;
  urlImagen: string | null;
  calificacionPromedio: number | null;
  cantidadResenas: number;
  destacado: boolean;
  activo: boolean;
  especies: string | null;
}

export interface ProductoFicha {
  idProducto: number;
  sku: string;
  nombreProducto: string;
  descripcion: string | null;
  especificaciones: string | null;
  idMarca: number;
  nombreMarca: string;
  idCategoria: number;
  nombreCategoria: string;
  precioVigente: number;
  descuento: number;
  precioFinal: number;
  nombrePromocion: string | null;
  existencia: number;
  disponible: boolean;
  calificacionPromedio: number | null;
  cantidadResenas: number;
  destacado: boolean;
  activo: boolean;
  costo: number;
  stockMinimo: number;
  fechaActualizacion: string;
}

export interface ImagenProducto {
  idImagen: number;
  url: string;
  esPrincipal: boolean;
}

export interface Resena {
  idResena: number;
  cliente: string;
  calificacion: number;
  comentario: string | null;
  fecha: string;
}

export interface ProductoDetalle {
  producto: ProductoFicha;
  imagenes: ImagenProducto[];
  resenas: Resena[];
  especies: { idEspecie: number; nombreEspecie: string }[];
}

/* ---------------- Promociones ---------------- */
export interface Promocion {
  idPromocion: number;
  nombrePromocion: string;
  tipoDescuento: 'P' | 'M';
  valor: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  estadoVigencia: PromotionStatus;
  cantidadProductos: number;
}

export interface ProductoDePromocion {
  idProducto: number;
  sku: string;
  nombreProducto: string;
  precioVigente: number;
  activo: boolean;
}

/* ---------------- Cliente ---------------- */
export interface Cliente {
  idCliente: number;
  idUsuario: number;
  correo: string;
  nombreCliente: string;
  apellidos: string;
  telefono: string | null;
  fechaNacimiento: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface ClienteBusqueda {
  idCliente: number;
  nombreCliente: string;
  apellidos: string;
  correo: string;
  telefono: string | null;
  activo: boolean;
  cantidadPedidos: number;
}

export interface Direccion {
  idDireccion: number;
  lineaDireccion: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string | null;
  esPrincipal: boolean;
  activo: boolean;
  idZonaEnvio: number;
  nombreZonaEnvio: string;
  tarifa: number;
}

/* ---------------- Carrito ---------------- */
export interface LineaCarrito {
  idProducto: number;
  sku: string;
  nombreProducto: string;
  urlImagen: string | null;
  cantidad: number;
  precioVigente: number;
  descuentoUnitario: number;
  precioFinal: number;
  subtotalLinea: number;
  nombrePromocion: string | null;
  existencia: number;
  disponible: boolean;
}

export interface ResumenCarrito {
  cantidadLineas: number;
  cantidadUnidades: number;
  subtotal: number;
  descuentoTotal: number;
  costoEnvio: number;
  total: number;
}

export interface Carrito {
  lineas: LineaCarrito[];
  resumen: ResumenCarrito | null;
}

/* ---------------- Pedidos ---------------- */
export interface PedidoCliente {
  idPedido: number;
  fechaPedido: string;
  idEstado: number;
  nombreEstadoPedido: OrderStatus;
  cantidadLineas: number;
  subtotal: number;
  descuentoTotal: number;
  costoEnvio: number;
  total: number;
  sePuedeCancelar: boolean;
}

export interface PedidoResumen {
  idPedido: number;
  fechaPedido: string;
  idEstado: number;
  nombreEstadoPedido: OrderStatus;
  idCliente: number;
  cliente: string;
  correo: string;
  cantidadLineas: number;
  cantidadUnidades: number;
  subtotal: number;
  descuentoTotal: number;
  costoEnvio: number;
  total: number;
}

export interface PedidoEncabezado {
  idPedido: number;
  fechaPedido: string;
  nombreEstadoPedido: OrderStatus;
  idCliente: number;
  cliente: string;
  correo: string;
  telefono: string | null;
  direccionEntrega: string;
  nombreZonaEnvio: string;
  subtotal: number;
  descuentoTotal: number;
  costoEnvio: number;
  total: number;
  nombreMetodoPago: string | null;
  estadoPago: PaymentStatus | null;
  referenciaPago: string | null;
  transportista: string | null;
  numeroGuia: string | null;
  fechaEnvio: string | null;
  fechaEntrega: string | null;
}

export interface LineaPedido {
  idProducto: number;
  sku: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  descuentoUnitario: number;
  precioFinal: number;
  totalLinea: number;
  nombrePromocion: string | null;
}

export interface HistorialPedido {
  fecha: string;
  nombreEstadoPedido: OrderStatus;
}

export interface PedidoDetalle {
  pedido: PedidoEncabezado | null;
  lineas: LineaPedido[];
  historial: HistorialPedido[];
}

export interface EstadoDestino {
  idEstado: number;
  nombreEstadoPedido: OrderStatus;
}

/* ---------------- Inventario ---------------- */
export interface InventarioFila {
  idProducto: number;
  sku: string;
  nombreProducto: string;
  nombreMarca: string;
  nombreCategoria: string;
  existencia: number;
  stockMinimo: number;
  unidadesFaltantes: number;
  bajoMinimo: boolean;
  fechaActualizacion: string;
  activo: boolean;
}

export interface MovimientoKardex {
  idMovimiento: number;
  fecha: string;
  tipo: InventoryMovementType;
  cantidad: number;
  efecto: number;
  saldo: number;
  motivo: string;
  idPedido: number | null;
  usuario: string;
}

/* ---------------- Auditoría y dashboard ---------------- */
export interface AuditoriaFila {
  idAuditoria: number;
  fechaCambio: string;
  tablaAfectada: string;
  idRegistro: number;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  usuarioBd: string;
  idUsuarioApp: number | null;
  usuarioApp: string | null;
}

export interface Dashboard {
  indicadores: {
    mes: string;
    ventasMes: number;
    pedidosMes: number;
    ticketPromedio: number;
    productosBajoMinimo: number;
  } | null;
  ventasMensuales: { anio: number; mes: number; ventas: number }[];
  pedidosRecientes: {
    idPedido: number;
    fechaPedido: string;
    idEstado: number;
    nombreEstadoPedido: OrderStatus;
    idCliente: number;
    cliente: string;
    total: number;
  }[];
  bajoMinimo: {
    idProducto: number;
    sku: string;
    nombreProducto: string;
    existencia: number;
    stockMinimo: number;
    unidadesFaltantes: number;
  }[];
}

/* ---------------- UI ---------------- */
export interface OrderHistoryEntry {
  estado: OrderStatus;
  fechaHora: string;
  nota?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}
