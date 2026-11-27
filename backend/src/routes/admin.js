// /api/admin : pantallas del administrador. Todas exigen sesión con rol Administrador.
// El idUsuario que se manda a los SP (auditoría, movimientos) sale del token.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ejecutar, sql } from '../db.js';
import { requiereAdmin, requiereSesion } from '../auth.js';
import {
  ErrorHttp, bit, decimal, decimalOpcional, entero, enteroConSigno, enteroOpcional, fecha, texto,
} from '../errores.js';
import { reportes } from '../reportes.js';

const router = Router();
router.use(requiereSesion, requiereAdmin);

const idUsr = (req) => [sql.Int, req.usuario.idUsuario];

/* ---------------- Clientes ---------------- */

// GET /api/admin/clientes?texto=&soloActivos=1
router.get('/clientes', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Cliente_Buscar', {
    texto: [sql.NVarChar(100), texto(req.query.texto)],
    soloActivos: [sql.Bit, bit(req.query.soloActivos)],
  });
  res.json(filas);
});

router.get('/clientes/:id', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Cliente_Obtener', {
    idCliente: [sql.Int, entero(req.params.id, 'id')],
  });
  if (!filas[0]) throw new ErrorHttp(404, 'El cliente no existe.');
  res.json(filas[0]);
});

// POST /api/admin/clientes  { correo, password, nombreCliente, apellidos, telefono?, fechaNacimiento }
// Alta de un cliente por el administrador: mismo SP que el registro (sp_Cliente_Registrar).
router.post('/clientes', async (req, res) => {
  const b = req.body ?? {};
  if (typeof b.password !== 'string' || b.password.length < 8) {
    throw new ErrorHttp(400, 'La contraseña inicial debe tener al menos 8 caracteres.');
  }
  const { salida } = await ejecutar(
    'dbo.sp_Cliente_Registrar',
    {
      correo: [sql.NVarChar(150), texto(b.correo)],
      passwordHash: [sql.NVarChar(255), await bcrypt.hash(b.password, 12)],
      nombreCliente: [sql.NVarChar(80), texto(b.nombreCliente)],
      apellidos: [sql.NVarChar(100), texto(b.apellidos)],
      telefono: [sql.NVarChar(20), texto(b.telefono) || null],
      fechaNacimiento: [sql.Date, fecha(b.fechaNacimiento, 'fechaNacimiento') ?? null],
    },
    { idCliente: sql.Int },
  );
  res.status(201).json({ idCliente: salida.idCliente });
});

// PUT /api/admin/clientes/:id  { nombreCliente, apellidos, telefono?, fechaNacimiento }
router.put('/clientes/:id', async (req, res) => {
  const b = req.body ?? {};
  await ejecutar('dbo.sp_Cliente_Actualizar', {
    idCliente: [sql.Int, entero(req.params.id, 'id')],
    nombreCliente: [sql.NVarChar(80), texto(b.nombreCliente)],
    apellidos: [sql.NVarChar(100), texto(b.apellidos)],
    telefono: [sql.NVarChar(20), texto(b.telefono) || null],
    fechaNacimiento: [sql.Date, fecha(b.fechaNacimiento, 'fechaNacimiento') ?? null],
  });
  res.json({ mensaje: 'Datos del cliente actualizados.' });
});

// PATCH /api/admin/clientes/:id/estado  { activo }
router.patch('/clientes/:id/estado', async (req, res) => {
  await ejecutar('dbo.sp_Cliente_CambiarEstado', {
    idCliente: [sql.Int, entero(req.params.id, 'id')],
    activo: [sql.Bit, bit(req.body?.activo) ?? false],
  });
  res.json({ mensaje: 'Estado del cliente actualizado.' });
});

router.get('/clientes/:id/pedidos', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Pedido_ListarPorCliente', {
    idCliente: [sql.Int, entero(req.params.id, 'id')],
  });
  res.json(filas);
});

router.get('/clientes/:id/direcciones', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Direccion_Listar', {
    idCliente: [sql.Int, entero(req.params.id, 'id')],
    soloActivas: [sql.Bit, false],
  });
  res.json(filas);
});

/* ---------------- Marcas y categorías ---------------- */

router.get('/marcas', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Marca_Listar', {
    texto: [sql.NVarChar(100), texto(req.query.texto)],
    soloActivas: [sql.Bit, false],
  });
  res.json(filas);
});

router.post('/marcas', async (req, res) => {
  const { salida } = await ejecutar(
    'dbo.sp_Marca_Crear',
    { nombreMarca: [sql.NVarChar(100), texto(req.body?.nombreMarca)] },
    { idMarca: sql.Int },
  );
  res.status(201).json({ idMarca: salida.idMarca });
});

router.put('/marcas/:id', async (req, res) => {
  await ejecutar('dbo.sp_Marca_Actualizar', {
    idMarca: [sql.Int, entero(req.params.id, 'id')],
    nombreMarca: [sql.NVarChar(100), texto(req.body?.nombreMarca)],
    activo: [sql.Bit, bit(req.body?.activo) ?? true],
  });
  res.json({ mensaje: 'Marca actualizada.' });
});

router.get('/categorias', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Categoria_Listar', {
    texto: [sql.NVarChar(100), texto(req.query.texto)],
    soloActivas: [sql.Bit, false],
  });
  res.json(filas);
});

router.post('/categorias', async (req, res) => {
  const { salida } = await ejecutar(
    'dbo.sp_Categoria_Crear',
    { nombreCategoria: [sql.NVarChar(100), texto(req.body?.nombreCategoria)] },
    { idCategoria: sql.Int },
  );
  res.status(201).json({ idCategoria: salida.idCategoria });
});

router.put('/categorias/:id', async (req, res) => {
  await ejecutar('dbo.sp_Categoria_Actualizar', {
    idCategoria: [sql.Int, entero(req.params.id, 'id')],
    nombreCategoria: [sql.NVarChar(100), texto(req.body?.nombreCategoria)],
    activo: [sql.Bit, bit(req.body?.activo) ?? true],
  });
  res.json({ mensaje: 'Categoría actualizada.' });
});

/* ---------------- Especies ---------------- */

router.get('/especies', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Especie_Listar', { soloActivas: [sql.Bit, false] });
  res.json(filas);
});

router.post('/especies', async (req, res) => {
  const { salida } = await ejecutar(
    'dbo.sp_Especie_Crear',
    { nombreEspecie: [sql.NVarChar(60), texto(req.body?.nombreEspecie)] },
    { idEspecie: sql.Int },
  );
  res.status(201).json({ idEspecie: salida.idEspecie });
});

router.put('/especies/:id', async (req, res) => {
  await ejecutar('dbo.sp_Especie_Actualizar', {
    idEspecie: [sql.Int, entero(req.params.id, 'id')],
    nombreEspecie: [sql.NVarChar(60), texto(req.body?.nombreEspecie)],
    activo: [sql.Bit, bit(req.body?.activo) ?? true],
  });
  res.json({ mensaje: 'Especie actualizada.' });
});

/* ---------------- Productos ---------------- */

// GET /api/admin/productos  (incluye inactivos; mismos filtros que el catálogo)
router.get('/productos', async (req, res) => {
  const q = req.query;
  const { filas } = await ejecutar('dbo.sp_Producto_Buscar', {
    texto: [sql.NVarChar(100), texto(q.texto)],
    idMarca: [sql.Int, enteroOpcional(q.idMarca, 'idMarca')],
    idCategoria: [sql.Int, enteroOpcional(q.idCategoria, 'idCategoria')],
    precioMin: [sql.Decimal(12, 2), decimalOpcional(q.precioMin, 'precioMin')],
    precioMax: [sql.Decimal(12, 2), decimalOpcional(q.precioMax, 'precioMax')],
    soloDestacados: [sql.Bit, bit(q.destacados)],
    soloOfertas: [sql.Bit, bit(q.ofertas)],
    incluirInactivos: [sql.Bit, true],
    idEspecie: [sql.Int, enteroOpcional(q.idEspecie, 'idEspecie')],
  });
  res.json(filas);
});

router.get('/productos/:id', async (req, res) => {
  const { conjuntos } = await ejecutar('dbo.sp_Producto_ObtenerDetalle', {
    idProducto: [sql.Int, entero(req.params.id, 'id')],
  });
  const producto = conjuntos[0]?.[0];
  if (!producto) throw new ErrorHttp(404, 'El producto no existe.');
  res.json({ producto, imagenes: conjuntos[1] ?? [], resenas: conjuntos[2] ?? [], especies: conjuntos[3] ?? [] });
});

function parametrosProducto(b) {
  return {
    sku: [sql.NVarChar(30), texto(b.sku)],
    idMarca: [sql.Int, entero(b.idMarca, 'idMarca')],
    idCategoria: [sql.Int, entero(b.idCategoria, 'idCategoria')],
    nombreProducto: [sql.NVarChar(150), texto(b.nombreProducto)],
    descripcion: [sql.NVarChar(600), texto(b.descripcion) || null],
    especificaciones: [sql.NVarChar(600), texto(b.especificaciones) || null],
    precioVigente: [sql.Decimal(12, 2), decimal(b.precioVigente, 'precioVigente')],
    costo: [sql.Decimal(12, 2), decimal(b.costo, 'costo')],
  };
}

// POST /api/admin/productos  (crea también su inventario e imagen principal)
router.post('/productos', async (req, res) => {
  const b = req.body ?? {};
  const { salida } = await ejecutar(
    'dbo.sp_Producto_Crear',
    {
      ...parametrosProducto(b),
      stockMinimo: [sql.Int, b.stockMinimo === undefined ? undefined : enteroConSigno(b.stockMinimo, 'stockMinimo')],
      destacado: [sql.Bit, bit(b.destacado)],
      urlImagen: [sql.NVarChar(300), texto(b.urlImagen) || null],
      existenciaInicial: [sql.Int, b.existenciaInicial === undefined ? undefined : enteroConSigno(b.existenciaInicial, 'existenciaInicial')],
      idUsuario: idUsr(req),
    },
    { idProducto: sql.Int },
  );
  res.status(201).json({ idProducto: salida.idProducto });
});

// PUT /api/admin/productos/:id  (el trigger audita los cambios de precio y costo)
router.put('/productos/:id', async (req, res) => {
  const b = req.body ?? {};
  await ejecutar('dbo.sp_Producto_Actualizar', {
    idProducto: [sql.Int, entero(req.params.id, 'id')],
    ...parametrosProducto(b),
    stockMinimo: [sql.Int, enteroConSigno(b.stockMinimo, 'stockMinimo')],
    destacado: [sql.Bit, bit(b.destacado) ?? false],
    activo: [sql.Bit, bit(b.activo) ?? true],
    idUsuario: idUsr(req),
  });
  res.json({ mensaje: 'Producto actualizado.' });
});

// POST /api/admin/productos/ajustar-precio  { idCategoria, porcentaje }   (10 = +10 %, -5 = -5 %)
router.post('/productos/ajustar-precio', async (req, res) => {
  const b = req.body ?? {};
  const { salida } = await ejecutar(
    'dbo.sp_Producto_AjustarPrecioPorCategoria',
    {
      idCategoria: [sql.Int, entero(b.idCategoria, 'idCategoria')],
      porcentaje: [sql.Decimal(5, 2), decimal(b.porcentaje, 'porcentaje')],
      idUsuario: idUsr(req),
    },
    { filasAfectadas: sql.Int },
  );
  res.json({ filasAfectadas: salida.filasAfectadas });
});

// PUT /api/admin/productos/:id/especies  { especies: [1, 2] }   (reemplaza la lista; sp_Producto_AsignarEspecies)
router.put('/productos/:id/especies', async (req, res) => {
  const lista = Array.isArray(req.body?.especies) ? req.body.especies : [];
  const ids = lista.map((x) => entero(x, 'especies'));
  await ejecutar('dbo.sp_Producto_AsignarEspecies', {
    idProducto: [sql.Int, entero(req.params.id, 'id')],
    especies: [sql.NVarChar(200), ids.join(',')],
  });
  res.json({ mensaje: 'Especies del producto actualizadas.' });
});

// POST /api/admin/productos/:id/imagenes  { url, esPrincipal? }
router.post('/productos/:id/imagenes', async (req, res) => {
  const { salida } = await ejecutar(
    'dbo.sp_ImagenProducto_Agregar',
    {
      idProducto: [sql.Int, entero(req.params.id, 'id')],
      url: [sql.NVarChar(300), texto(req.body?.url)],
      esPrincipal: [sql.Bit, bit(req.body?.esPrincipal)],
    },
    { idImagen: sql.Int },
  );
  res.status(201).json({ idImagen: salida.idImagen });
});

/* ---------------- Promociones ---------------- */

function parametrosPromocion(b) {
  return {
    nombrePromocion: [sql.NVarChar(100), texto(b.nombrePromocion)],
    tipoDescuento: [sql.Char(1), texto(b.tipoDescuento)], // 'P' porcentaje, 'M' monto
    valor: [sql.Decimal(12, 2), decimal(b.valor, 'valor')],
    fechaInicio: [sql.DateTime2, fecha(b.fechaInicio, 'fechaInicio') ?? null],
    fechaFin: [sql.DateTime2, fecha(b.fechaFin, 'fechaFin') ?? null],
  };
}

router.get('/promociones', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Promocion_Listar', {
    soloVigentes: [sql.Bit, bit(req.query.vigentes)],
  });
  res.json(filas);
});

router.post('/promociones', async (req, res) => {
  const { salida } = await ejecutar(
    'dbo.sp_Promocion_Crear',
    parametrosPromocion(req.body ?? {}),
    { idPromocion: sql.Int },
  );
  res.status(201).json({ idPromocion: salida.idPromocion });
});

router.put('/promociones/:id', async (req, res) => {
  const b = req.body ?? {};
  await ejecutar('dbo.sp_Promocion_Actualizar', {
    idPromocion: [sql.Int, entero(req.params.id, 'id')],
    ...parametrosPromocion(b),
    activo: [sql.Bit, bit(b.activo) ?? true],
  });
  res.json({ mensaje: 'Promoción actualizada.' });
});

// GET /api/admin/promociones/:id/productos
router.get('/promociones/:id/productos', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Promocion_ListarProductos', {
    idPromocion: [sql.Int, entero(req.params.id, 'id')],
  });
  res.json(filas);
});

// POST /api/admin/promociones/:id/productos  { idProducto }
router.post('/promociones/:id/productos', async (req, res) => {
  await ejecutar('dbo.sp_Promocion_AsignarProducto', {
    idPromocion: [sql.Int, entero(req.params.id, 'id')],
    idProducto: [sql.Int, entero(req.body?.idProducto, 'idProducto')],
  });
  res.status(201).json({ mensaje: 'Producto asignado a la promoción.' });
});

router.delete('/promociones/:id/productos/:idProducto', async (req, res) => {
  await ejecutar('dbo.sp_Promocion_QuitarProducto', {
    idPromocion: [sql.Int, entero(req.params.id, 'id')],
    idProducto: [sql.Int, entero(req.params.idProducto, 'idProducto')],
  });
  res.json({ mensaje: 'Producto quitado de la promoción.' });
});

/* ---------------- Pedidos ---------------- */

// GET /api/admin/pedidos?idEstado=&desde=&hasta=&cliente=   (mismo SP que el reporte R10)
router.get('/pedidos', async (req, res) => {
  const { filas } = await ejecutar(reportes.R10.procedimiento, reportes.R10.parametros(req.query));
  res.json(filas);
});

router.get('/pedidos/:id', async (req, res) => {
  const { conjuntos } = await ejecutar('dbo.sp_Pedido_ObtenerDetalle', {
    idPedido: [sql.Int, entero(req.params.id, 'id')],
  });
  res.json({ pedido: conjuntos[0]?.[0] ?? null, lineas: conjuntos[1] ?? [], historial: conjuntos[2] ?? [] });
});

// GET /api/admin/pedidos/:id/transiciones  -> estados a los que puede pasar (TransicionEstado)
router.get('/pedidos/:id/transiciones', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Pedido_TransicionesValidas', {
    idPedido: [sql.Int, entero(req.params.id, 'id')],
  });
  res.json(filas);
});

// PATCH /api/admin/pedidos/:id/estado  { idEstado }   (6 = Cancelado devuelve el stock)
router.patch('/pedidos/:id/estado', async (req, res) => {
  await ejecutar('dbo.sp_Pedido_CambiarEstado', {
    idPedido: [sql.Int, entero(req.params.id, 'id')],
    idEstadoNuevo: [sql.Int, entero(req.body?.idEstado, 'idEstado')],
    idUsuario: idUsr(req),
  });
  res.json({ mensaje: 'Estado del pedido actualizado.' });
});

router.post('/pedidos/:id/cancelar', async (req, res) => {
  await ejecutar('dbo.sp_Pedido_Cancelar', {
    idPedido: [sql.Int, entero(req.params.id, 'id')],
    idUsuario: idUsr(req),
    motivo: [sql.NVarChar(150), texto(req.body?.motivo) || 'Cancelado por el administrador'],
  });
  res.json({ mensaje: 'Pedido cancelado. El inventario fue devuelto.' });
});

/* ---------------- Inventario ---------------- */

// GET /api/admin/inventario?texto=&bajoMinimo=1
router.get('/inventario', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Inventario_Listar', {
    texto: [sql.NVarChar(100), texto(req.query.texto)],
    soloBajoMinimo: [sql.Bit, bit(req.query.bajoMinimo)],
  });
  res.json(filas);
});

router.get('/inventario/alertas', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Inventario_AlertaBajoMinimo');
  res.json(filas);
});

// POST /api/admin/inventario/movimientos  { idProducto, tipo: ENTRADA|SALIDA|AJUSTE, cantidad, motivo }
router.post('/inventario/movimientos', async (req, res) => {
  const b = req.body ?? {};
  const { salida } = await ejecutar(
    'dbo.sp_Inventario_RegistrarMovimiento',
    {
      idProducto: [sql.Int, entero(b.idProducto, 'idProducto')],
      tipo: [sql.NVarChar(10), texto(b.tipo)],
      cantidad: [sql.Int, enteroConSigno(b.cantidad, 'cantidad')],
      idUsuario: idUsr(req),
      motivo: [sql.NVarChar(200), texto(b.motivo)],
    },
    { idMovimiento: sql.Int },
  );
  res.status(201).json({ idMovimiento: salida.idMovimiento });
});

// GET /api/admin/inventario/:idProducto/movimientos?desde=&hasta=   (kardex)
router.get('/inventario/:idProducto/movimientos', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Inventario_Movimientos', {
    idProducto: [sql.Int, entero(req.params.idProducto, 'idProducto')],
    desde: [sql.Date, fecha(req.query.desde, 'desde')],
    hasta: [sql.Date, fecha(req.query.hasta, 'hasta')],
  });
  res.json(filas);
});

/* ---------------- Reportes, dashboard y auditoría (06_reportes.sql) ---------------- */

// GET /api/admin/reportes/R01 ... R10
router.get('/reportes/:codigo', async (req, res) => {
  const codigo = String(req.params.codigo).toUpperCase();
  const reporte = reportes[codigo];
  if (!reporte) throw new ErrorHttp(404, `El reporte ${codigo} no existe.`);
  const { conjuntos } = await ejecutar(reporte.procedimiento, reporte.parametros(req.query));
  // R05 devuelve dos resultados (por unidades y por ingresos); los demás, uno
  res.json(conjuntos.length === 1 ? conjuntos[0] : conjuntos);
});

// GET /api/admin/dashboard  -> { indicadores, ventasMensuales, pedidosRecientes, bajoMinimo }
router.get('/dashboard', async (req, res) => {
  const { conjuntos } = await ejecutar('dbo.sp_Dashboard_Indicadores', {
    fecha: [sql.Date, fecha(req.query.fecha, 'fecha')],
  });
  res.json({
    indicadores: conjuntos[0]?.[0] ?? null,
    ventasMensuales: conjuntos[1] ?? [],
    pedidosRecientes: conjuntos[2] ?? [],
    bajoMinimo: conjuntos[3] ?? [],
  });
});

// GET /api/admin/auditoria?tabla=&campo=&desde=&hasta=
router.get('/auditoria', async (req, res) => {
  const q = req.query;
  const { filas } = await ejecutar('dbo.sp_Auditoria_Listar', {
    tabla: [sql.NVarChar(50), texto(q.tabla) || undefined],
    campo: [sql.NVarChar(50), texto(q.campo) || undefined],
    desde: [sql.Date, fecha(q.desde, 'desde')],
    hasta: [sql.Date, fecha(q.hasta, 'hasta')],
  });
  res.json(filas);
});

export default router;
