/* =====================================================================
   PetShop Nova - Proyecto Programado II
   06_reportes.sql : reportes R1-R10, indicadores del dashboard y auditoría
   Requiere 01 a 05.

   Reglas comunes (sección 7 de la especificación)
   - Ventas = importe HISTÓRICO de las líneas: cantidad * (precioUnitario - descuentoUnitario),
     tomado de vw_VentasDetalle, que ya EXCLUYE los pedidos cancelados.
     El costo de envío no se cuenta como venta de mercadería.
   - Todos los reportes son procedimientos parametrizados (sin SQL dinámico).

   Técnicas SQL exigidas y dónde se demuestran
   - HAVING ............................ R1 (monto mínimo), R5 (solo productos con ventas)
   - Subconsulta / NOT EXISTS .......... R8 (clientes sin compras), R1 (productos distintos)
   - Función de ventana ................ R9 (LAG), R5 (ROW_NUMBER), R2 (SUM OVER)
   - Varias tablas con agrupación ...... R7, R10, dashboard
   - Reporte matricial ................. R3 (SUM(CASE) por mes) y R2 (cliente x categoría)
   - CTE de 12 meses (meses sin ventas)  R4 y R9
   ===================================================================== */

USE PetShopNova;
GO

/* ---------------------------------------------------------------------
   R1. Top clientes: monto comprado, cantidad de pedidos y número de
   productos diferentes adquiridos.
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_R01_TopClientes
    @top         INT = 5,
    @montoMinimo DECIMAL(14,2) = 0
AS
BEGIN
    SET NOCOUNT ON;
    IF @top IS NULL OR @top < 1 SET @top = 5;

    SELECT TOP (@top)
           v.idCliente,
           v.cliente,
           u.correo,
           SUM(v.ingreso)                AS montoComprado,
           COUNT(DISTINCT v.idPedido)    AS cantidadPedidos,
           COUNT(DISTINCT v.idProducto)  AS productosDistintos
    FROM dbo.vw_VentasDetalle v
    JOIN dbo.Cliente c ON c.idCliente = v.idCliente
    JOIN dbo.Usuario u ON u.idUsuario = c.idUsuario
    GROUP BY v.idCliente, v.cliente, u.correo
    HAVING SUM(v.ingreso) >= ISNULL(@montoMinimo, 0)
    ORDER BY montoComprado DESC, v.cliente;
END;
GO

/* ---------------------------------------------------------------------
   R2. Matriz cliente x categoría: total comprado por cada cliente en cada
   categoría. Devuelve TODAS las celdas (también las que valen 0) de los
   clientes con compras, más el total de la fila y el total de la columna
   calculados con funciones de ventana. La aplicación solo acomoda las
   celdas en la cuadrícula (las categorías son datos, no columnas fijas,
   así se evita PIVOT con SQL dinámico).
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_R02_MatrizClienteCategoria
AS
BEGIN
    SET NOCOUNT ON;

    WITH Clientes AS (
        SELECT DISTINCT idCliente, cliente FROM dbo.vw_VentasDetalle
    ),
    Celdas AS (
        SELECT cl.idCliente, cl.cliente, ca.idCategoria, ca.nombreCategoria,
               ISNULL(SUM(v.ingreso), 0) AS total
        FROM Clientes cl
        CROSS JOIN dbo.Categoria ca
        LEFT JOIN dbo.vw_VentasDetalle v
               ON v.idCliente = cl.idCliente AND v.idCategoria = ca.idCategoria
        GROUP BY cl.idCliente, cl.cliente, ca.idCategoria, ca.nombreCategoria
    )
    SELECT idCliente, cliente, idCategoria, nombreCategoria, total,
           SUM(total) OVER (PARTITION BY idCliente)   AS totalCliente,
           SUM(total) OVER (PARTITION BY idCategoria) AS totalCategoria,
           SUM(total) OVER ()                         AS totalGeneral
    FROM Celdas
    ORDER BY totalCliente DESC, cliente, nombreCategoria;
END;
GO

/* ---------------------------------------------------------------------
   R3. Ventas mensuales por marca del año elegido (matriz marca x mes con
   agregación condicional). Aparecen todas las marcas y los 12 meses,
   aunque no tengan ventas (valor 0).
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_R03_VentasMensualesMarca
    @anio INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @anio IS NULL SET @anio = YEAR(SYSDATETIME());

    SELECT m.idMarca,
           m.nombreMarca,
           ISNULL(SUM(CASE WHEN v.mes = 1  THEN v.ingreso END), 0) AS ene,
           ISNULL(SUM(CASE WHEN v.mes = 2  THEN v.ingreso END), 0) AS feb,
           ISNULL(SUM(CASE WHEN v.mes = 3  THEN v.ingreso END), 0) AS mar,
           ISNULL(SUM(CASE WHEN v.mes = 4  THEN v.ingreso END), 0) AS abr,
           ISNULL(SUM(CASE WHEN v.mes = 5  THEN v.ingreso END), 0) AS may,
           ISNULL(SUM(CASE WHEN v.mes = 6  THEN v.ingreso END), 0) AS jun,
           ISNULL(SUM(CASE WHEN v.mes = 7  THEN v.ingreso END), 0) AS jul,
           ISNULL(SUM(CASE WHEN v.mes = 8  THEN v.ingreso END), 0) AS ago,
           ISNULL(SUM(CASE WHEN v.mes = 9  THEN v.ingreso END), 0) AS sep,
           ISNULL(SUM(CASE WHEN v.mes = 10 THEN v.ingreso END), 0) AS oct,
           ISNULL(SUM(CASE WHEN v.mes = 11 THEN v.ingreso END), 0) AS nov,
           ISNULL(SUM(CASE WHEN v.mes = 12 THEN v.ingreso END), 0) AS dic,
           ISNULL(SUM(v.ingreso), 0)                                AS total
    FROM dbo.Marca m
    LEFT JOIN dbo.vw_VentasDetalle v
           ON v.idMarca = m.idMarca AND v.anio = @anio
    GROUP BY m.idMarca, m.nombreMarca
    ORDER BY total DESC, m.nombreMarca;
END;
GO

/* ---------------------------------------------------------------------
   R4. Evolución mensual: ventas, cantidad de pedidos y ticket promedio.
   El CTE de 12 meses hace que aparezcan los meses sin ventas.
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_R04_EvolucionMensual
    @anio INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @anio IS NULL SET @anio = YEAR(SYSDATETIME());

    WITH Meses AS (
        SELECT 1 AS mes
        UNION ALL
        SELECT mes + 1 FROM Meses WHERE mes < 12
    ),
    Ventas AS (
        SELECT mes, SUM(ingreso) AS ventas, COUNT(DISTINCT idPedido) AS pedidos
        FROM dbo.vw_VentasDetalle
        WHERE anio = @anio
        GROUP BY mes
    )
    SELECT m.mes,
           ISNULL(v.ventas, 0)  AS ventas,
           ISNULL(v.pedidos, 0) AS pedidos,
           CAST(CASE WHEN ISNULL(v.pedidos, 0) = 0 THEN 0
                     ELSE v.ventas / v.pedidos END AS DECIMAL(14,2)) AS ticketPromedio
    FROM Meses m
    LEFT JOIN Ventas v ON v.mes = m.mes
    ORDER BY m.mes;
END;
GO

/* ---------------------------------------------------------------------
   R5. Productos más vendidos: top por unidades (resultado 1) y top por
   ingresos (resultado 2), con categoría y marca.
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_R05_ProductosMasVendidos
    @top INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF @top IS NULL OR @top < 1 SET @top = 10;

    WITH Totales AS (
        SELECT idProducto, sku, nombreProducto, nombreCategoria, nombreMarca,
               SUM(cantidad) AS unidades,
               SUM(ingreso)  AS ingresos
        FROM dbo.vw_VentasDetalle
        GROUP BY idProducto, sku, nombreProducto, nombreCategoria, nombreMarca
        HAVING SUM(cantidad) > 0
    ),
    Rankings AS (
        SELECT *,
               ROW_NUMBER() OVER (ORDER BY unidades DESC, ingresos DESC, nombreProducto) AS rankingUnidades,
               ROW_NUMBER() OVER (ORDER BY ingresos DESC, unidades DESC, nombreProducto) AS rankingIngresos
        FROM Totales
    )
    SELECT * INTO #Rankings FROM Rankings;

    SELECT rankingUnidades AS ranking, idProducto, sku, nombreProducto, nombreCategoria, nombreMarca, unidades, ingresos
    FROM #Rankings WHERE rankingUnidades <= @top ORDER BY rankingUnidades;

    SELECT rankingIngresos AS ranking, idProducto, sku, nombreProducto, nombreCategoria, nombreMarca, unidades, ingresos
    FROM #Rankings WHERE rankingIngresos <= @top ORDER BY rankingIngresos;
END;
GO

/* ---------------------------------------------------------------------
   R6. Inventario crítico: productos bajo mínimo, existencia actual,
   unidades faltantes y estimación de reposición.
   Estimación = lo que falta para llegar al mínimo + la venta promedio
   mensual de los últimos 3 meses (redondeada hacia arriba), de modo que
   el producto no vuelva a quedar bajo el mínimo en el mes siguiente.
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_R06_InventarioCritico
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @desde DATETIME2 = DATEADD(MONTH, -3, SYSDATETIME());

    SELECT b.idProducto, b.sku, b.nombreProducto, b.nombreMarca, b.nombreCategoria,
           b.existencia, b.stockMinimo, b.unidadesFaltantes,
           CAST(ISNULL(s.unidades3Meses, 0) / 3.0 AS DECIMAL(10,1)) AS ventaPromedioMensual,
           b.unidadesFaltantes + CAST(CEILING(ISNULL(s.unidades3Meses, 0) / 3.0) AS INT) AS reposicionSugerida
    FROM dbo.vw_ExistenciasBajas b
    OUTER APPLY (SELECT SUM(v.cantidad) AS unidades3Meses
                 FROM dbo.vw_VentasDetalle v
                 WHERE v.idProducto = b.idProducto AND v.fechaPedido >= @desde) s
    ORDER BY b.unidadesFaltantes DESC, b.nombreProducto;
END;
GO

/* ---------------------------------------------------------------------
   R7. Rentabilidad por producto (@agrupacion = 'P') o por categoría ('C'):
   ingresos, costo histórico, utilidad bruta y margen. La utilidad es
   ingresos - costo, no las ventas.
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_R07_Rentabilidad
    @agrupacion CHAR(1) = 'P'
AS
BEGIN
    SET NOCOUNT ON;

    IF @agrupacion NOT IN ('P', 'C')
        THROW 50090, N'La agrupación debe ser P (producto) o C (categoría).', 1;

    IF @agrupacion = 'P'
        SELECT v.idProducto AS id, v.nombreProducto AS nombre, v.nombreCategoria AS detalle,
               SUM(v.ingreso)       AS ingresos,
               SUM(v.costoTotal)    AS costoHistorico,
               SUM(v.utilidadBruta) AS utilidadBruta,
               CAST(CASE WHEN SUM(v.ingreso) = 0 THEN 0
                         ELSE 100.0 * SUM(v.utilidadBruta) / SUM(v.ingreso) END AS DECIMAL(6,2)) AS margenPorcentaje
        FROM dbo.vw_VentasDetalle v
        GROUP BY v.idProducto, v.nombreProducto, v.nombreCategoria
        ORDER BY utilidadBruta DESC, nombre;
    ELSE
        SELECT v.idCategoria AS id, v.nombreCategoria AS nombre, CAST(NULL AS NVARCHAR(100)) AS detalle,
               SUM(v.ingreso)       AS ingresos,
               SUM(v.costoTotal)    AS costoHistorico,
               SUM(v.utilidadBruta) AS utilidadBruta,
               CAST(CASE WHEN SUM(v.ingreso) = 0 THEN 0
                         ELSE 100.0 * SUM(v.utilidadBruta) / SUM(v.ingreso) END AS DECIMAL(6,2)) AS margenPorcentaje
        FROM dbo.vw_VentasDetalle v
        GROUP BY v.idCategoria, v.nombreCategoria
        ORDER BY utilidadBruta DESC, nombre;
END;
GO

/* ---------------------------------------------------------------------
   R8. Clientes sin compras: sin rango, los que nunca han comprado; con
   rango, los que no compraron entre @desde y @hasta (NOT EXISTS).
   Un pedido cancelado no cuenta como compra.
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_R08_ClientesSinCompras
    @desde DATE = NULL,
    @hasta DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @desde IS NOT NULL AND @hasta IS NOT NULL AND @hasta < @desde
        THROW 50091, N'La fecha "hasta" no puede ser anterior a la fecha "desde".', 1;

    SELECT c.idCliente,
           CONCAT(c.nombreCliente, N' ', c.apellidos) AS cliente,
           u.correo,
           c.activo,
           u.fechaCreacion AS fechaRegistro,
           (SELECT MAX(p2.fechaPedido) FROM dbo.Pedido p2
            WHERE p2.idCliente = c.idCliente AND p2.idEstado <> 6) AS ultimaCompra
    FROM dbo.Cliente c
    JOIN dbo.Usuario u ON u.idUsuario = c.idUsuario
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.Pedido p
        WHERE p.idCliente = c.idCliente
          AND p.idEstado <> 6
          AND (@desde IS NULL OR p.fechaPedido >= @desde)
          AND (@hasta IS NULL OR p.fechaPedido < DATEADD(DAY, 1, CAST(@hasta AS DATETIME2)))
    )
    ORDER BY c.apellidos, c.nombreCliente;
END;
GO

/* ---------------------------------------------------------------------
   R9. Comparación temporal por mes: ventas y variación absoluta y
   porcentual respecto del mes anterior, con LAG. Enero se compara con
   diciembre del año anterior (por eso el CTE parte de ese mes).
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_R09_ComparacionMensual
    @anio INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @anio IS NULL SET @anio = YEAR(SYSDATETIME());

    DECLARE @inicio DATE = DATEFROMPARTS(@anio - 1, 12, 1);

    WITH Meses AS (
        SELECT @inicio AS primerDia
        UNION ALL
        SELECT DATEADD(MONTH, 1, primerDia) FROM Meses WHERE primerDia < DATEFROMPARTS(@anio, 12, 1)
    ),
    VentasMes AS (
        SELECT m.primerDia, ISNULL(SUM(v.ingreso), 0) AS ventas
        FROM Meses m
        LEFT JOIN dbo.vw_VentasDetalle v
               ON v.anio = YEAR(m.primerDia) AND v.mes = MONTH(m.primerDia)
        GROUP BY m.primerDia
    ),
    Comparacion AS (
        SELECT primerDia, ventas,
               LAG(ventas) OVER (ORDER BY primerDia) AS ventasMesAnterior
        FROM VentasMes
    )
    SELECT MONTH(primerDia) AS mes,
           ventas,
           ventasMesAnterior,
           ventas - ventasMesAnterior AS variacionAbsoluta,
           CAST(CASE WHEN ventasMesAnterior = 0 THEN NULL
                     ELSE 100.0 * (ventas - ventasMesAnterior) / ventasMesAnterior END AS DECIMAL(8,2)) AS variacionPorcentual
    FROM Comparacion
    WHERE YEAR(primerDia) = @anio
      AND primerDia <= SYSDATETIME()       -- no muestra meses que aún no ocurren
    ORDER BY primerDia;
END;
GO

/* ---------------------------------------------------------------------
   R10. Resumen de pedidos con filtros parametrizados (todos opcionales):
   estado, rango de fechas, texto del cliente (nombre o correo) y cliente.
   Incluye todos los estados; también alimenta la pantalla "Pedidos" del
   administrador.
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_R10_ResumenPedidos
    @idEstado  INT = NULL,
    @desde     DATE = NULL,
    @hasta     DATE = NULL,
    @cliente   NVARCHAR(100) = NULL,
    @idCliente INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @patron NVARCHAR(102) =
        CASE WHEN NULLIF(LTRIM(RTRIM(@cliente)), N'') IS NULL THEN NULL
             ELSE CONCAT(N'%', LTRIM(RTRIM(@cliente)), N'%') END;

    SELECT r.idPedido, r.fechaPedido, r.idEstado, r.nombreEstadoPedido,
           r.idCliente, r.cliente, u.correo,
           r.cantidadLineas, r.cantidadUnidades,
           r.subtotal, r.descuentoTotal, r.costoEnvio, r.total
    FROM dbo.vw_ResumenPedidos r
    JOIN dbo.Cliente c ON c.idCliente = r.idCliente
    JOIN dbo.Usuario u ON u.idUsuario = c.idUsuario
    WHERE (@idEstado IS NULL OR r.idEstado = @idEstado)
      AND (@idCliente IS NULL OR r.idCliente = @idCliente)
      AND (@desde IS NULL OR r.fechaPedido >= @desde)
      AND (@hasta IS NULL OR r.fechaPedido < DATEADD(DAY, 1, CAST(@hasta AS DATETIME2)))
      AND (@patron IS NULL OR r.cliente LIKE @patron OR u.correo LIKE @patron)
    ORDER BY r.fechaPedido DESC, r.idPedido DESC
    OPTION (RECOMPILE);
END;
GO

/* ---------------------------------------------------------------------
   Dashboard: indicadores del mes, ventas de los últimos 6 meses,
   5 pedidos más recientes y productos bajo mínimo.
   Resultados: 1) KPIs  2) ventas por mes  3) pedidos recientes  4) alertas
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_Dashboard_Indicadores
    @fecha DATE = NULL      -- mes a mostrar; por defecto el actual
AS
BEGIN
    SET NOCOUNT ON;
    IF @fecha IS NULL SET @fecha = CAST(SYSDATETIME() AS DATE);

    DECLARE @inicioMes DATE = DATEFROMPARTS(YEAR(@fecha), MONTH(@fecha), 1);
    DECLARE @finMes    DATE = DATEADD(MONTH, 1, @inicioMes);

    -- 1) KPIs del mes
    SELECT @inicioMes AS mes,
           ISNULL(SUM(v.ingreso), 0)       AS ventasMes,
           COUNT(DISTINCT v.idPedido)      AS pedidosMes,
           CAST(CASE WHEN COUNT(DISTINCT v.idPedido) = 0 THEN 0
                     ELSE SUM(v.ingreso) / COUNT(DISTINCT v.idPedido) END AS DECIMAL(14,2)) AS ticketPromedio,
           (SELECT COUNT(*) FROM dbo.vw_ExistenciasBajas) AS productosBajoMinimo
    FROM dbo.vw_VentasDetalle v
    WHERE v.fechaPedido >= @inicioMes AND v.fechaPedido < @finMes;

    -- 2) Ventas de los últimos 6 meses (incluye meses sin ventas)
    WITH Meses AS (
        SELECT DATEADD(MONTH, -5, @inicioMes) AS primerDia
        UNION ALL
        SELECT DATEADD(MONTH, 1, primerDia) FROM Meses WHERE primerDia < @inicioMes
    )
    SELECT YEAR(m.primerDia) AS anio, MONTH(m.primerDia) AS mes, ISNULL(SUM(v.ingreso), 0) AS ventas
    FROM Meses m
    LEFT JOIN dbo.vw_VentasDetalle v
           ON v.anio = YEAR(m.primerDia) AND v.mes = MONTH(m.primerDia)
    GROUP BY m.primerDia
    ORDER BY m.primerDia;

    -- 3) Cinco pedidos más recientes (todos los estados)
    SELECT TOP (5) idPedido, fechaPedido, idEstado, nombreEstadoPedido, idCliente, cliente, total
    FROM dbo.vw_ResumenPedidos
    ORDER BY fechaPedido DESC, idPedido DESC;

    -- 4) Productos bajo mínimo
    SELECT idProducto, sku, nombreProducto, existencia, stockMinimo, unidadesFaltantes
    FROM dbo.vw_ExistenciasBajas
    ORDER BY unidadesFaltantes DESC, nombreProducto;
END;
GO

/* ---------------------------------------------------------------------
   Auditoría: bitácora que llenan los triggers de 05_triggers.sql.
   El usuario de la aplicación se muestra con su correo (si se conoce).
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_Auditoria_Listar
    @tabla NVARCHAR(50) = NULL,
    @campo NVARCHAR(50) = NULL,
    @desde DATE = NULL,
    @hasta DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT a.idAuditoria, a.fechaCambio, a.tablaAfectada, a.idRegistro, a.campo,
           a.valorAnterior, a.valorNuevo, a.usuarioBd, a.idUsuarioApp,
           u.correo AS usuarioApp
    FROM dbo.AuditoriaCambio a
    LEFT JOIN dbo.Usuario u ON u.idUsuario = a.idUsuarioApp
    WHERE (@tabla IS NULL OR a.tablaAfectada = @tabla)
      AND (@campo IS NULL OR a.campo = @campo)
      AND (@desde IS NULL OR a.fechaCambio >= @desde)
      AND (@hasta IS NULL OR a.fechaCambio < DATEADD(DAY, 1, CAST(@hasta AS DATETIME2)))
    ORDER BY a.fechaCambio DESC, a.idAuditoria DESC;
END;
GO

PRINT N'06_reportes.sql ejecutado correctamente.';
GO
