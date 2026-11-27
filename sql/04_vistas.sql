/* =====================================================================
   PetShop Nova - Proyecto Programado II
   04_vistas.sql : vistas de lectura reutilizable
   Requiere 03_procedimientos.sql (usa dbo.fn_PromocionVigente).

   vw_CatalogoDisponible  catálogo a la venta con precio final y disponibilidad
   vw_ExistenciasBajas    productos bajo el mínimo de inventario
   vw_VentasDetalle       una fila por línea vendida; EXCLUYE pedidos cancelados
                          y usa el precio, descuento y costo HISTÓRICOS.
                          Base de los reportes R1-R9 (06_reportes.sql).
   vw_ResumenPedidos      un pedido por fila con estado, cliente y líneas (R10)
   ===================================================================== */

USE PetShopNova;
GO

-- Catálogo disponible: productos activos de marcas y categorías activas
CREATE OR ALTER VIEW dbo.vw_CatalogoDisponible
AS
SELECT p.idProducto,
       p.sku,
       p.nombreProducto,
       p.descripcion,
       p.idMarca,
       m.nombreMarca,
       p.idCategoria,
       c.nombreCategoria,
       p.precioVigente,
       ISNULL(pv.descuentoUnitario, 0)                   AS descuento,
       p.precioVigente - ISNULL(pv.descuentoUnitario, 0) AS precioFinal,
       pv.idPromocion,
       pv.nombrePromocion,
       i.existencia,
       CAST(CASE WHEN i.existencia > 0 THEN 1 ELSE 0 END AS BIT) AS disponible,
       img.url AS urlImagen,
       r.calificacionPromedio,
       ISNULL(r.cantidadResenas, 0) AS cantidadResenas,
       p.destacado
FROM dbo.Producto p
JOIN dbo.Marca m      ON m.idMarca = p.idMarca
JOIN dbo.Categoria c  ON c.idCategoria = p.idCategoria
JOIN dbo.Inventario i ON i.idProducto = p.idProducto
OUTER APPLY dbo.fn_PromocionVigente(p.idProducto, p.precioVigente, SYSDATETIME()) pv
OUTER APPLY (SELECT TOP (1) ip.url
             FROM dbo.ImagenProducto ip
             WHERE ip.idProducto = p.idProducto
             ORDER BY ip.esPrincipal DESC, ip.idImagen) img
OUTER APPLY (SELECT CAST(AVG(CAST(rs.calificacion AS DECIMAL(4,2))) AS DECIMAL(3,2)) AS calificacionPromedio,
                    COUNT(*) AS cantidadResenas
             FROM dbo.Resena rs
             WHERE rs.idProducto = p.idProducto) r
WHERE p.activo = 1
  AND m.activo = 1
  AND c.activo = 1;
GO

-- Existencias bajas: alimenta la alerta de la aplicación y el reporte R6
CREATE OR ALTER VIEW dbo.vw_ExistenciasBajas
AS
SELECT p.idProducto,
       p.sku,
       p.nombreProducto,
       m.nombreMarca,
       c.nombreCategoria,
       i.existencia,
       p.stockMinimo,
       p.stockMinimo - i.existencia AS unidadesFaltantes,
       i.fechaActualizacion
FROM dbo.Producto p
JOIN dbo.Inventario i ON i.idProducto = p.idProducto
JOIN dbo.Marca m      ON m.idMarca = p.idMarca
JOIN dbo.Categoria c  ON c.idCategoria = p.idCategoria
WHERE p.activo = 1
  AND i.existencia < p.stockMinimo;
GO

-- Ventas a nivel de línea (sin cancelados, con importes históricos)
CREATE OR ALTER VIEW dbo.vw_VentasDetalle
AS
SELECT pe.idPedido,
       pe.fechaPedido,
       YEAR(pe.fechaPedido)  AS anio,
       MONTH(pe.fechaPedido) AS mes,
       pe.idEstado,
       pe.idCliente,
       CONCAT(cl.nombreCliente, N' ', cl.apellidos) AS cliente,
       dp.idProducto,
       pr.sku,
       pr.nombreProducto,
       pr.idMarca,
       m.nombreMarca,
       pr.idCategoria,
       c.nombreCategoria,
       dp.cantidad,
       dp.precioUnitario,
       dp.descuentoUnitario,
       dp.costoUnitario,
       CAST(dp.cantidad * (dp.precioUnitario - dp.descuentoUnitario) AS DECIMAL(14,2)) AS ingreso,
       CAST(dp.cantidad * dp.costoUnitario AS DECIMAL(14,2))                           AS costoTotal,
       CAST(dp.cantidad * (dp.precioUnitario - dp.descuentoUnitario - dp.costoUnitario) AS DECIMAL(14,2)) AS utilidadBruta
FROM dbo.Pedido pe
JOIN dbo.DetallePedido dp ON dp.idPedido = pe.idPedido
JOIN dbo.Cliente cl       ON cl.idCliente = pe.idCliente
JOIN dbo.Producto pr      ON pr.idProducto = dp.idProducto
JOIN dbo.Marca m          ON m.idMarca = pr.idMarca
JOIN dbo.Categoria c      ON c.idCategoria = pr.idCategoria
WHERE pe.idEstado <> 6;          -- 6 = Cancelado: no cuenta como venta
GO

-- Resumen de pedidos (todos los estados): base de R10 y de la pantalla de administración
CREATE OR ALTER VIEW dbo.vw_ResumenPedidos
AS
SELECT pe.idPedido,
       pe.fechaPedido,
       pe.idEstado,
       e.nombreEstadoPedido,
       pe.idCliente,
       CONCAT(cl.nombreCliente, N' ', cl.apellidos) AS cliente,
       (SELECT COUNT(*) FROM dbo.DetallePedido dp WHERE dp.idPedido = pe.idPedido)         AS cantidadLineas,
       (SELECT SUM(dp.cantidad) FROM dbo.DetallePedido dp WHERE dp.idPedido = pe.idPedido) AS cantidadUnidades,
       pe.subtotal,
       pe.descuentoTotal,
       pe.costoEnvio,
       pe.total
FROM dbo.Pedido pe
JOIN dbo.EstadoPedido e ON e.idEstado = pe.idEstado
JOIN dbo.Cliente cl     ON cl.idCliente = pe.idCliente;
GO

PRINT N'04_vistas.sql ejecutado correctamente.';
GO
