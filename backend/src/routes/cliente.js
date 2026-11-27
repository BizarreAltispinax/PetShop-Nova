// /api/mi : todo lo del cliente con sesión iniciada.
// El idCliente SIEMPRE sale del token, nunca del cuerpo ni de la URL:
// un cliente no puede ver ni tocar datos de otro.
import { Router } from 'express';
import { ejecutar, sql } from '../db.js';
import { requiereCliente, requiereSesion } from '../auth.js';
import { ErrorHttp, bit, entero, enteroOpcional, fecha, texto } from '../errores.js';

const router = Router();
router.use(requiereSesion, requiereCliente);

const idCli = (req) => [sql.Int, req.usuario.idCliente];

/* ---------------- Perfil ---------------- */

// GET /api/mi/perfil
router.get('/perfil', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Cliente_Obtener', { idCliente: idCli(req) });
  if (!filas[0]) throw new ErrorHttp(404, 'El cliente no existe.');
  res.json(filas[0]);
});

// PUT /api/mi/perfil  { nombreCliente, apellidos, telefono?, fechaNacimiento }
router.put('/perfil', async (req, res) => {
  const b = req.body ?? {};
  await ejecutar('dbo.sp_Cliente_Actualizar', {
    idCliente: idCli(req),
    nombreCliente: [sql.NVarChar(80), texto(b.nombreCliente)],
    apellidos: [sql.NVarChar(100), texto(b.apellidos)],
    telefono: [sql.NVarChar(20), texto(b.telefono) || null],
    fechaNacimiento: [sql.Date, fecha(b.fechaNacimiento, 'fechaNacimiento') ?? null],
  });
  res.json({ mensaje: 'Perfil actualizado.' });
});

/* ---------------- Direcciones ---------------- */

function parametrosDireccion(b) {
  return {
    idZonaEnvio: [sql.Int, entero(b.idZonaEnvio, 'idZonaEnvio')],
    lineaDireccion: [sql.NVarChar(200), texto(b.lineaDireccion)],
    ciudad: [sql.NVarChar(80), texto(b.ciudad)],
    provincia: [sql.NVarChar(50), texto(b.provincia)],
    codigoPostal: [sql.NVarChar(10), texto(b.codigoPostal) || null],
    esPrincipal: [sql.Bit, bit(b.esPrincipal) ?? false],
  };
}

// GET /api/mi/direcciones
router.get('/direcciones', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Direccion_Listar', {
    idCliente: idCli(req),
    soloActivas: [sql.Bit, true],
  });
  res.json(filas);
});

// POST /api/mi/direcciones
router.post('/direcciones', async (req, res) => {
  const { salida } = await ejecutar(
    'dbo.sp_Direccion_Crear',
    { idCliente: idCli(req), ...parametrosDireccion(req.body ?? {}) },
    { idDireccion: sql.Int },
  );
  res.status(201).json({ idDireccion: salida.idDireccion });
});

// PUT /api/mi/direcciones/:id
// Si la dirección ya se usó en un pedido, el SP la desactiva y crea otra: se devuelve el id resultante.
router.put('/direcciones/:id', async (req, res) => {
  const { salida } = await ejecutar(
    'dbo.sp_Direccion_Actualizar',
    {
      idDireccion: [sql.Int, entero(req.params.id, 'id')],
      idCliente: idCli(req),
      ...parametrosDireccion(req.body ?? {}),
    },
    { idDireccionResultado: sql.Int },
  );
  res.json({ idDireccion: salida.idDireccionResultado });
});

// DELETE /api/mi/direcciones/:id  (eliminación lógica)
router.delete('/direcciones/:id', async (req, res) => {
  await ejecutar('dbo.sp_Direccion_Desactivar', {
    idDireccion: [sql.Int, entero(req.params.id, 'id')],
    idCliente: idCli(req),
  });
  res.json({ mensaje: 'Dirección eliminada.' });
});

/* ---------------- Carrito (persistente en la BD) ---------------- */

// GET /api/mi/carrito?idDireccion=  -> { lineas, resumen }
router.get('/carrito', async (req, res) => {
  const { conjuntos } = await ejecutar('dbo.sp_Carrito_Ver', {
    idCliente: idCli(req),
    idDireccion: [sql.Int, enteroOpcional(req.query.idDireccion, 'idDireccion')],
  });
  res.json({ lineas: conjuntos[0] ?? [], resumen: conjuntos[1]?.[0] ?? null });
});

// POST /api/mi/carrito  { idProducto, cantidad? }
router.post('/carrito', async (req, res) => {
  const b = req.body ?? {};
  await ejecutar('dbo.sp_Carrito_AgregarProducto', {
    idCliente: idCli(req),
    idProducto: [sql.Int, entero(b.idProducto, 'idProducto')],
    cantidad: [sql.Int, enteroOpcional(b.cantidad, 'cantidad')],
  });
  res.status(201).json({ mensaje: 'Producto agregado al carrito.' });
});

// PUT /api/mi/carrito/:idProducto  { cantidad }
router.put('/carrito/:idProducto', async (req, res) => {
  await ejecutar('dbo.sp_Carrito_CambiarCantidad', {
    idCliente: idCli(req),
    idProducto: [sql.Int, entero(req.params.idProducto, 'idProducto')],
    cantidad: [sql.Int, entero(req.body?.cantidad, 'cantidad')],
  });
  res.json({ mensaje: 'Cantidad actualizada.' });
});

// DELETE /api/mi/carrito/:idProducto
router.delete('/carrito/:idProducto', async (req, res) => {
  await ejecutar('dbo.sp_Carrito_EliminarLinea', {
    idCliente: idCli(req),
    idProducto: [sql.Int, entero(req.params.idProducto, 'idProducto')],
  });
  res.json({ mensaje: 'Producto eliminado del carrito.' });
});

/* ---------------- Pedidos ---------------- */

// POST /api/mi/pedidos  { idDireccion, idMetodoPago }  -> checkout atómico (sp_Pedido_Confirmar)
router.post('/pedidos', async (req, res) => {
  const b = req.body ?? {};
  const { salida } = await ejecutar(
    'dbo.sp_Pedido_Confirmar',
    {
      idCliente: idCli(req),
      idDireccion: [sql.Int, entero(b.idDireccion, 'idDireccion')],
      idMetodoPago: [sql.Int, entero(b.idMetodoPago, 'idMetodoPago')],
    },
    { idPedido: sql.Int },
  );
  res.status(201).json({ idPedido: salida.idPedido });
});

// GET /api/mi/pedidos
router.get('/pedidos', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Pedido_ListarPorCliente', { idCliente: idCli(req) });
  res.json(filas);
});

async function detallePedido(idPedido, idCliente) {
  // El SP lanza 50040 si el pedido no existe o no es de ese cliente
  const { conjuntos } = await ejecutar('dbo.sp_Pedido_ObtenerDetalle', {
    idPedido: [sql.Int, idPedido],
    idCliente: [sql.Int, idCliente],
  });
  return { pedido: conjuntos[0]?.[0] ?? null, lineas: conjuntos[1] ?? [], historial: conjuntos[2] ?? [] };
}

// GET /api/mi/pedidos/:id  -> { pedido, lineas, historial }  (sirve para la factura imprimible)
router.get('/pedidos/:id', async (req, res) => {
  res.json(await detallePedido(entero(req.params.id, 'id'), req.usuario.idCliente));
});

// POST /api/mi/pedidos/:id/cancelar  { motivo? }
router.post('/pedidos/:id/cancelar', async (req, res) => {
  const idPedido = entero(req.params.id, 'id');
  // sp_Pedido_Cancelar no recibe el cliente: primero se confirma que el pedido es suyo
  await detallePedido(idPedido, req.usuario.idCliente);
  await ejecutar('dbo.sp_Pedido_Cancelar', {
    idPedido: [sql.Int, idPedido],
    idUsuario: [sql.Int, req.usuario.idUsuario],
    motivo: [sql.NVarChar(150), texto(req.body?.motivo) || undefined],
  });
  res.json({ mensaje: 'Pedido cancelado. El inventario fue devuelto.' });
});

/* ---------------- Reseñas ---------------- */

// POST /api/mi/resenas  { idProducto, calificacion, comentario? }
router.post('/resenas', async (req, res) => {
  const b = req.body ?? {};
  const { salida } = await ejecutar(
    'dbo.sp_Resena_Crear',
    {
      idCliente: idCli(req),
      idProducto: [sql.Int, entero(b.idProducto, 'idProducto')],
      calificacion: [sql.TinyInt, entero(b.calificacion, 'calificacion')],
      comentario: [sql.NVarChar(500), texto(b.comentario) || null],
    },
    { idResena: sql.Int },
  );
  res.status(201).json({ idResena: salida.idResena });
});

export default router;
