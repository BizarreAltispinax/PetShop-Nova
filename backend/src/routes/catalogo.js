// /api : catálogo público (no requiere sesión).
import { Router } from 'express';
import { ejecutar, sql } from '../db.js';
import { ErrorHttp, bit, decimalOpcional, entero, enteroOpcional, texto } from '../errores.js';

const router = Router();

// GET /api/marcas?texto=
router.get('/marcas', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Marca_Listar', {
    texto: [sql.NVarChar(100), texto(req.query.texto)],
    soloActivas: [sql.Bit, true],
  });
  res.json(filas);
});

// GET /api/categorias?texto=
router.get('/categorias', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Categoria_Listar', {
    texto: [sql.NVarChar(100), texto(req.query.texto)],
    soloActivas: [sql.Bit, true],
  });
  res.json(filas);
});

// GET /api/especies  (perros, gatos, roedores, peces, aves, reptiles)
router.get('/especies', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Especie_Listar', { soloActivas: [sql.Bit, true] });
  res.json(filas);
});

// GET /api/zonas-envio
router.get('/zonas-envio', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_ZonaEnvio_Listar', { soloActivas: [sql.Bit, true] });
  res.json(filas);
});

// GET /api/metodos-pago
router.get('/metodos-pago', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_MetodoPago_Listar', { soloActivos: [sql.Bit, true] });
  res.json(filas);
});

// GET /api/promociones : promociones vigentes (sección de ofertas)
router.get('/promociones', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Promocion_Listar', { soloVigentes: [sql.Bit, true] });
  res.json(filas);
});

// GET /api/productos?texto=&idMarca=&idCategoria=&idEspecie=&precioMin=&precioMax=&destacados=1&ofertas=1
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
    incluirInactivos: [sql.Bit, false],
    idEspecie: [sql.Int, enteroOpcional(q.idEspecie, 'idEspecie')],
  });
  res.json(filas);
});

// GET /api/productos/:id : { producto, imagenes, resenas, especies }
router.get('/productos/:id', async (req, res) => {
  const { conjuntos } = await ejecutar('dbo.sp_Producto_ObtenerDetalle', {
    idProducto: [sql.Int, entero(req.params.id, 'id')],
  });
  const fila = conjuntos[0]?.[0];
  if (!fila || !fila.activo) throw new ErrorHttp(404, 'El producto no existe o no está a la venta.');
  // El costo es información interna: solo lo ve el administrador (/api/admin/productos/:id)
  const { costo, ...producto } = fila; // eslint-disable-line no-unused-vars
  res.json({ producto, imagenes: conjuntos[1] ?? [], resenas: conjuntos[2] ?? [], especies: conjuntos[3] ?? [] });
});

// GET /api/productos/:id/resenas
router.get('/productos/:id/resenas', async (req, res) => {
  const { filas } = await ejecutar('dbo.sp_Resena_ListarPorProducto', {
    idProducto: [sql.Int, entero(req.params.id, 'id')],
  });
  res.json(filas);
});

export default router;
