/* =====================================================================
   PetShop Nova - Proyecto Programado II (Bases de Datos)
   01_esquema.sql : base de datos, tablas, restricciones e índices
   Motor: Microsoft SQL Server 2019 o superior (probado para SSMS 22)
   Re-ejecutable: borra y vuelve a crear la base completa.
   Los nombres, tipos y nulos siguen el Diccionario de datos.
   ===================================================================== */
/*
USE master;
GO

IF DB_ID(N'PetShopNova') IS NOT NULL
BEGIN
    ALTER DATABASE PetShopNova SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE PetShopNova;
END
GO
*/

CREATE DATABASE PetShopNova;
GO

USE PetShopNova;
GO

/* =====================================================================
   USUARIOS Y CLIENTES
   ===================================================================== */

-- Catálogo con IDs fijos (1 = Administrador, 2 = Cliente): sin IDENTITY
CREATE TABLE Rol (
    idRol           INT             NOT NULL,
    nombreRol       NVARCHAR(30)    NOT NULL,
    CONSTRAINT PK_Rol           PRIMARY KEY (idRol),
    CONSTRAINT UQ_Rol_Nombre    UNIQUE (nombreRol)
);
GO

CREATE TABLE Usuario (
    idUsuario       INT IDENTITY(1,1) NOT NULL,
    idRol           INT             NOT NULL,
    correo          NVARCHAR(150)   NOT NULL,
    passwordHash    NVARCHAR(255)   NOT NULL,
    activo          BIT             NOT NULL CONSTRAINT DF_Usuario_Activo DEFAULT (1),
    fechaCreacion   DATETIME2       NOT NULL CONSTRAINT DF_Usuario_Fecha  DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_Usuario           PRIMARY KEY (idUsuario),
    CONSTRAINT FK_Usuario_Rol       FOREIGN KEY (idRol) REFERENCES Rol (idRol),
    CONSTRAINT UQ_Usuario_Correo    UNIQUE (correo),
    CONSTRAINT CK_Usuario_Correo    CHECK (correo LIKE N'%_@_%._%')
);
GO

CREATE TABLE ZonaEnvio (
    idZonaEnvio     INT IDENTITY(1,1) NOT NULL,
    nombreZonaEnvio NVARCHAR(200)   NOT NULL,
    tarifa          DECIMAL(10,2)   NOT NULL,
    activo          BIT             NOT NULL CONSTRAINT DF_ZonaEnvio_Activo DEFAULT (1),
    CONSTRAINT PK_ZonaEnvio         PRIMARY KEY (idZonaEnvio),
    CONSTRAINT UQ_ZonaEnvio_Nombre  UNIQUE (nombreZonaEnvio),
    CONSTRAINT CK_ZonaEnvio_Tarifa  CHECK (tarifa >= 0)
);
GO

CREATE TABLE Cliente (
    idCliente       INT IDENTITY(1,1) NOT NULL,
    idUsuario       INT             NOT NULL,
    nombreCliente   NVARCHAR(80)    NOT NULL,
    apellidos       NVARCHAR(100)   NOT NULL,
    telefono        NVARCHAR(20)    NULL,
    activo          BIT             NOT NULL CONSTRAINT DF_Cliente_Activo DEFAULT (1),
    fechaNacimiento DATE            NOT NULL,
    CONSTRAINT PK_Cliente               PRIMARY KEY (idCliente),
    CONSTRAINT FK_Cliente_Usuario       FOREIGN KEY (idUsuario) REFERENCES Usuario (idUsuario),
    CONSTRAINT UQ_Cliente_Usuario       UNIQUE (idUsuario),          -- 1 usuario : máx. 1 cliente
    CONSTRAINT CK_Cliente_FechaNac      CHECK (fechaNacimiento < CAST(GETDATE() AS DATE))
);
GO

CREATE TABLE Direccion (
    idDireccion     INT IDENTITY(1,1) NOT NULL,
    idCliente       INT             NOT NULL,
    idZonaEnvio     INT             NOT NULL,
    lineaDireccion  NVARCHAR(200)   NOT NULL,
    ciudad          NVARCHAR(80)    NOT NULL,
    provincia       NVARCHAR(50)    NOT NULL,
    codigoPostal    NVARCHAR(10)    NULL,
    esPrincipal     BIT             NOT NULL CONSTRAINT DF_Direccion_Principal DEFAULT (0),
    activo          BIT             NOT NULL CONSTRAINT DF_Direccion_Activo    DEFAULT (1),
    CONSTRAINT PK_Direccion             PRIMARY KEY (idDireccion),
    CONSTRAINT FK_Direccion_Cliente     FOREIGN KEY (idCliente)   REFERENCES Cliente (idCliente),
    CONSTRAINT FK_Direccion_ZonaEnvio   FOREIGN KEY (idZonaEnvio) REFERENCES ZonaEnvio (idZonaEnvio)
);
GO

/* =====================================================================
   CATÁLOGO DE PRODUCTOS
   ===================================================================== */

CREATE TABLE Marca (
    idMarca         INT IDENTITY(1,1) NOT NULL,
    nombreMarca     NVARCHAR(100)   NOT NULL,
    activo          BIT             NOT NULL CONSTRAINT DF_Marca_Activo DEFAULT (1),
    CONSTRAINT PK_Marca         PRIMARY KEY (idMarca),
    CONSTRAINT UQ_Marca_Nombre  UNIQUE (nombreMarca)
);
GO

CREATE TABLE Categoria (
    idCategoria     INT IDENTITY(1,1) NOT NULL,
    nombreCategoria NVARCHAR(100)   NOT NULL,
    activo          BIT             NOT NULL CONSTRAINT DF_Categoria_Activo DEFAULT (1),
    CONSTRAINT PK_Categoria         PRIMARY KEY (idCategoria),
    CONSTRAINT UQ_Categoria_Nombre  UNIQUE (nombreCategoria)
);
GO

CREATE TABLE Producto (
    idProducto       INT IDENTITY(1,1) NOT NULL,
    sku              NVARCHAR(30)    NOT NULL,
    idMarca          INT             NOT NULL,
    idCategoria      INT             NOT NULL,
    nombreProducto   NVARCHAR(150)   NOT NULL,
    descripcion      NVARCHAR(600)   NULL,
    especificaciones NVARCHAR(600)   NULL,
    precioVigente    DECIMAL(12,2)   NOT NULL,
    costo            DECIMAL(12,2)   NOT NULL,
    stockMinimo      INT             NOT NULL CONSTRAINT DF_Producto_StockMinimo DEFAULT (5),
    destacado        BIT             NOT NULL CONSTRAINT DF_Producto_Destacado   DEFAULT (0),
    activo           BIT             NOT NULL CONSTRAINT DF_Producto_Activo      DEFAULT (1),
    CONSTRAINT PK_Producto              PRIMARY KEY (idProducto),
    CONSTRAINT FK_Producto_Marca        FOREIGN KEY (idMarca)     REFERENCES Marca (idMarca),
    CONSTRAINT FK_Producto_Categoria    FOREIGN KEY (idCategoria) REFERENCES Categoria (idCategoria),
    CONSTRAINT UQ_Producto_Sku          UNIQUE (sku),
    CONSTRAINT CK_Producto_Precio       CHECK (precioVigente > 0),
    CONSTRAINT CK_Producto_Costo        CHECK (costo >= 0),
    CONSTRAINT CK_Producto_StockMinimo  CHECK (stockMinimo >= 0)
);
GO

CREATE TABLE ImagenProducto (
    idImagen        INT IDENTITY(1,1) NOT NULL,
    idProducto      INT             NOT NULL,
    url             NVARCHAR(300)   NOT NULL,
    esPrincipal     BIT             NOT NULL CONSTRAINT DF_ImagenProducto_Principal DEFAULT (0),
    CONSTRAINT PK_ImagenProducto            PRIMARY KEY (idImagen),
    CONSTRAINT FK_ImagenProducto_Producto   FOREIGN KEY (idProducto) REFERENCES Producto (idProducto)
);
GO

/* Regla de combinación: las promociones NO se acumulan; si un producto tiene
   varias vigentes, el checkout aplica la de mayor descuento. */
CREATE TABLE Promocion (
    idPromocion     INT IDENTITY(1,1) NOT NULL,
    nombrePromocion NVARCHAR(100)   NOT NULL,
    tipoDescuento   CHAR(1)         NOT NULL,
    valor           DECIMAL(12,2)   NOT NULL,
    fechaInicio     DATETIME2       NOT NULL,
    fechaFin        DATETIME2       NOT NULL,
    activo          BIT             NOT NULL CONSTRAINT DF_Promocion_Activo DEFAULT (1),
    CONSTRAINT PK_Promocion             PRIMARY KEY (idPromocion),
    CONSTRAINT CK_Promocion_Tipo        CHECK (tipoDescuento IN ('P', 'M')),   -- P = porcentaje, M = monto
    CONSTRAINT CK_Promocion_Valor       CHECK (valor > 0),
    CONSTRAINT CK_Promocion_Porcentaje  CHECK (tipoDescuento <> 'P' OR valor <= 100),
    CONSTRAINT CK_Promocion_Fechas      CHECK (fechaFin > fechaInicio)
);
GO

CREATE TABLE ProductoPromocion (
    idPromocion     INT             NOT NULL,
    idProducto      INT             NOT NULL,
    CONSTRAINT PK_ProductoPromocion             PRIMARY KEY (idPromocion, idProducto),
    CONSTRAINT FK_ProductoPromocion_Promocion   FOREIGN KEY (idPromocion) REFERENCES Promocion (idPromocion),
    CONSTRAINT FK_ProductoPromocion_Producto    FOREIGN KEY (idProducto)  REFERENCES Producto (idProducto)
);
GO

/* =====================================================================
   INVENTARIO (MovimientoInventario se crea después de Pedido)
   ===================================================================== */

CREATE TABLE Inventario (
    idProducto          INT         NOT NULL,
    existencia          INT         NOT NULL CONSTRAINT DF_Inventario_Existencia DEFAULT (0),
    fechaActualizacion  DATETIME2   NOT NULL CONSTRAINT DF_Inventario_Fecha      DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_Inventario            PRIMARY KEY (idProducto),
    CONSTRAINT FK_Inventario_Producto   FOREIGN KEY (idProducto) REFERENCES Producto (idProducto),
    CONSTRAINT CK_Inventario_Existencia CHECK (existencia >= 0)
);
GO

/* =====================================================================
   ESTADOS Y MÉTODOS DE PAGO (catálogos)
   ===================================================================== */

-- IDs fijos (1 Pendiente ... 6 Cancelado) porque los procedimientos los usan: sin IDENTITY
CREATE TABLE EstadoPedido (
    idEstado            INT             NOT NULL,
    nombreEstadoPedido  NVARCHAR(30)    NOT NULL,
    orden               TINYINT         NOT NULL,
    CONSTRAINT PK_EstadoPedido          PRIMARY KEY (idEstado),
    CONSTRAINT UQ_EstadoPedido_Nombre   UNIQUE (nombreEstadoPedido)
);
GO

CREATE TABLE TransicionEstado (
    idEstadoOrigen  INT             NOT NULL,
    idEstadoDestino INT             NOT NULL,
    CONSTRAINT PK_TransicionEstado          PRIMARY KEY (idEstadoOrigen, idEstadoDestino),
    CONSTRAINT FK_TransicionEstado_Origen   FOREIGN KEY (idEstadoOrigen)  REFERENCES EstadoPedido (idEstado),
    CONSTRAINT FK_TransicionEstado_Destino  FOREIGN KEY (idEstadoDestino) REFERENCES EstadoPedido (idEstado),
    CONSTRAINT CK_TransicionEstado_Distinto CHECK (idEstadoOrigen <> idEstadoDestino)
);
GO

CREATE TABLE MetodoPago (
    idMetodoPago     INT IDENTITY(1,1) NOT NULL,
    nombreMetodoPago NVARCHAR(40)   NOT NULL,
    activo           BIT            NOT NULL CONSTRAINT DF_MetodoPago_Activo DEFAULT (1),
    CONSTRAINT PK_MetodoPago        PRIMARY KEY (idMetodoPago),
    CONSTRAINT UQ_MetodoPago_Nombre UNIQUE (nombreMetodoPago)
);
GO

/* =====================================================================
   CARRITO Y RESEÑAS
   ===================================================================== */

CREATE TABLE Carrito (
    idCarrito       INT IDENTITY(1,1) NOT NULL,
    idCliente       INT             NOT NULL,
    fechaCreacion   DATETIME2       NOT NULL CONSTRAINT DF_Carrito_Fecha  DEFAULT (SYSDATETIME()),
    activo          BIT             NOT NULL CONSTRAINT DF_Carrito_Activo DEFAULT (1),
    CONSTRAINT PK_Carrito           PRIMARY KEY (idCarrito),
    CONSTRAINT FK_Carrito_Cliente   FOREIGN KEY (idCliente) REFERENCES Cliente (idCliente)
);
GO

CREATE TABLE DetalleCarrito (
    idDetalleCarrito INT IDENTITY(1,1) NOT NULL,
    idCarrito        INT            NOT NULL,
    idProducto       INT            NOT NULL,
    cantidad         INT            NOT NULL,
    CONSTRAINT PK_DetalleCarrito            PRIMARY KEY (idDetalleCarrito),
    CONSTRAINT FK_DetalleCarrito_Carrito    FOREIGN KEY (idCarrito)  REFERENCES Carrito (idCarrito),
    CONSTRAINT FK_DetalleCarrito_Producto   FOREIGN KEY (idProducto) REFERENCES Producto (idProducto),
    CONSTRAINT UQ_DetalleCarrito_Producto   UNIQUE (idCarrito, idProducto),   -- sin líneas duplicadas
    CONSTRAINT CK_DetalleCarrito_Cantidad   CHECK (cantidad > 0)
);
GO

CREATE TABLE Resena (
    idResena        INT IDENTITY(1,1) NOT NULL,
    idCliente       INT             NOT NULL,
    idProducto      INT             NOT NULL,
    calificacion    TINYINT         NOT NULL,
    comentario      NVARCHAR(500)   NULL,
    fecha           DATETIME2       NOT NULL CONSTRAINT DF_Resena_Fecha DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_Resena                PRIMARY KEY (idResena),
    CONSTRAINT FK_Resena_Cliente        FOREIGN KEY (idCliente)  REFERENCES Cliente (idCliente),
    CONSTRAINT FK_Resena_Producto       FOREIGN KEY (idProducto) REFERENCES Producto (idProducto),
    CONSTRAINT UQ_Resena_ClienteProducto UNIQUE (idCliente, idProducto),     -- una reseña por cliente y producto
    CONSTRAINT CK_Resena_Calificacion   CHECK (calificacion BETWEEN 1 AND 5)
);
GO

/* =====================================================================
   PEDIDOS
   ===================================================================== */

/* Desnormalización justificada: subtotal, descuentoTotal y total se derivan del
   detalle; se guardan para fijar el importe cobrado y acelerar los reportes.
   CK_Pedido_Total garantiza que siempre cuadren. */
CREATE TABLE Pedido (
    idPedido        INT IDENTITY(1,1) NOT NULL,
    idCliente       INT             NOT NULL,
    idDireccion     INT             NOT NULL,
    idEstado        INT             NOT NULL,
    fechaPedido     DATETIME2       NOT NULL CONSTRAINT DF_Pedido_Fecha     DEFAULT (SYSDATETIME()),
    subtotal        DECIMAL(12,2)   NOT NULL,
    descuentoTotal  DECIMAL(12,2)   NOT NULL CONSTRAINT DF_Pedido_Descuento DEFAULT (0),
    costoEnvio      DECIMAL(12,2)   NOT NULL,
    total           DECIMAL(12,2)   NOT NULL,
    CONSTRAINT PK_Pedido                PRIMARY KEY (idPedido),
    CONSTRAINT FK_Pedido_Cliente        FOREIGN KEY (idCliente)   REFERENCES Cliente (idCliente),
    CONSTRAINT FK_Pedido_Direccion      FOREIGN KEY (idDireccion) REFERENCES Direccion (idDireccion),
    CONSTRAINT FK_Pedido_Estado         FOREIGN KEY (idEstado)    REFERENCES EstadoPedido (idEstado),
    CONSTRAINT CK_Pedido_Subtotal       CHECK (subtotal >= 0),
    CONSTRAINT CK_Pedido_DescuentoNoNeg CHECK (descuentoTotal >= 0),
    CONSTRAINT CK_Pedido_Descuento      CHECK (descuentoTotal <= subtotal),
    CONSTRAINT CK_Pedido_CostoEnvio     CHECK (costoEnvio >= 0),
    CONSTRAINT CK_Pedido_Total          CHECK (total = subtotal - descuentoTotal + costoEnvio)
);
GO

-- Precio, costo y descuento HISTÓRICOS: se copian al confirmar el pedido
CREATE TABLE DetallePedido (
    idDetallePedido   INT IDENTITY(1,1) NOT NULL,
    idPedido          INT           NOT NULL,
    idProducto        INT           NOT NULL,
    idPromocion       INT           NULL,
    cantidad          INT           NOT NULL,
    precioUnitario    DECIMAL(12,2) NOT NULL,
    costoUnitario     DECIMAL(12,2) NOT NULL,
    descuentoUnitario DECIMAL(12,2) NOT NULL CONSTRAINT DF_DetallePedido_Descuento DEFAULT (0),
    CONSTRAINT PK_DetallePedido             PRIMARY KEY (idDetallePedido),
    CONSTRAINT FK_DetallePedido_Pedido      FOREIGN KEY (idPedido)    REFERENCES Pedido (idPedido),
    CONSTRAINT FK_DetallePedido_Producto    FOREIGN KEY (idProducto)  REFERENCES Producto (idProducto),
    CONSTRAINT FK_DetallePedido_Promocion   FOREIGN KEY (idPromocion) REFERENCES Promocion (idPromocion),
    CONSTRAINT UQ_DetallePedido_Producto    UNIQUE (idPedido, idProducto),     -- sin líneas duplicadas
    CONSTRAINT CK_DetallePedido_Cantidad    CHECK (cantidad > 0),
    CONSTRAINT CK_DetallePedido_Precio      CHECK (precioUnitario >= 0),
    CONSTRAINT CK_DetallePedido_Costo       CHECK (costoUnitario >= 0),
    CONSTRAINT CK_DetallePedido_Descuento   CHECK (descuentoUnitario >= 0 AND descuentoUnitario <= precioUnitario)
);
GO

CREATE TABLE HistorialEstadoPedido (
    idHistorial     INT IDENTITY(1,1) NOT NULL,
    idPedido        INT             NOT NULL,
    idEstado        INT             NOT NULL,
    fecha           DATETIME2       NOT NULL CONSTRAINT DF_HistorialEstadoPedido_Fecha DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_HistorialEstadoPedido         PRIMARY KEY (idHistorial),
    CONSTRAINT FK_HistorialEstadoPedido_Pedido  FOREIGN KEY (idPedido) REFERENCES Pedido (idPedido),
    CONSTRAINT FK_HistorialEstadoPedido_Estado  FOREIGN KEY (idEstado) REFERENCES EstadoPedido (idEstado)
);
GO

-- Va después de Pedido porque puede referenciar el pedido que originó el movimiento
CREATE TABLE MovimientoInventario (
    idMovimiento    INT IDENTITY(1,1) NOT NULL,
    idProducto      INT             NOT NULL,
    idUsuario       INT             NOT NULL,
    idPedido        INT             NULL,
    tipo            NVARCHAR(10)    NOT NULL,
    cantidad        INT             NOT NULL,
    fecha           DATETIME2       NOT NULL CONSTRAINT DF_MovimientoInventario_Fecha DEFAULT (SYSDATETIME()),
    motivo          NVARCHAR(200)   NOT NULL,
    CONSTRAINT PK_MovimientoInventario          PRIMARY KEY (idMovimiento),
    CONSTRAINT FK_MovimientoInventario_Producto FOREIGN KEY (idProducto) REFERENCES Producto (idProducto),
    CONSTRAINT FK_MovimientoInventario_Usuario  FOREIGN KEY (idUsuario)  REFERENCES Usuario (idUsuario),
    CONSTRAINT FK_MovimientoInventario_Pedido   FOREIGN KEY (idPedido)   REFERENCES Pedido (idPedido),
    CONSTRAINT CK_MovimientoInventario_Tipo     CHECK (tipo IN (N'ENTRADA', N'SALIDA', N'AJUSTE')),
    CONSTRAINT CK_MovimientoInventario_Cantidad CHECK ((tipo IN (N'ENTRADA', N'SALIDA') AND cantidad > 0)
                                                       OR (tipo = N'AJUSTE' AND cantidad <> 0))
);
GO

/* =====================================================================
   PAGOS Y ENVÍOS (simulados)
   ===================================================================== */

CREATE TABLE Pago (
    idPago          INT IDENTITY(1,1) NOT NULL,
    idPedido        INT             NOT NULL,
    idMetodoPago    INT             NOT NULL,
    monto           DECIMAL(12,2)   NOT NULL,
    estadoPago      NVARCHAR(20)    NOT NULL,
    referencia      NVARCHAR(50)    NOT NULL,
    fecha           DATETIME2       NOT NULL CONSTRAINT DF_Pago_Fecha DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_Pago              PRIMARY KEY (idPago),
    CONSTRAINT FK_Pago_Pedido       FOREIGN KEY (idPedido)     REFERENCES Pedido (idPedido),
    CONSTRAINT FK_Pago_MetodoPago   FOREIGN KEY (idMetodoPago) REFERENCES MetodoPago (idMetodoPago),
    CONSTRAINT UQ_Pago_Referencia   UNIQUE (referencia),
    CONSTRAINT CK_Pago_Monto        CHECK (monto > 0),
    CONSTRAINT CK_Pago_Estado       CHECK (estadoPago IN (N'Aprobado', N'Rechazado', N'Reembolsado'))
);
GO

-- La fila se crea al confirmar; guía y fechas se llenan al pasar a Enviado / Entregado
CREATE TABLE Envio (
    idEnvio         INT IDENTITY(1,1) NOT NULL,
    idPedido        INT             NOT NULL,
    transportista   NVARCHAR(60)    NOT NULL,
    numeroGuia      NVARCHAR(40)    NULL,
    fechaEnvio      DATETIME2       NULL,
    fechaEntrega    DATETIME2       NULL,
    CONSTRAINT PK_Envio         PRIMARY KEY (idEnvio),
    CONSTRAINT FK_Envio_Pedido  FOREIGN KEY (idPedido) REFERENCES Pedido (idPedido),
    CONSTRAINT UQ_Envio_Pedido  UNIQUE (idPedido),                          -- 1 pedido : máx. 1 envío
    CONSTRAINT CK_Envio_Fechas  CHECK (fechaEntrega IS NULL
                                       OR (fechaEnvio IS NOT NULL AND fechaEntrega >= fechaEnvio))
);
GO

/* =====================================================================
   AUDITORÍA (sin FK a propósito: la llenan los triggers de 05_triggers.sql)
   ===================================================================== */

CREATE TABLE AuditoriaCambio (
    idAuditoria     INT IDENTITY(1,1) NOT NULL,
    tablaAfectada   NVARCHAR(50)    NOT NULL,
    idRegistro      INT             NOT NULL,
    campo           NVARCHAR(50)    NOT NULL,
    valorAnterior   NVARCHAR(100)   NOT NULL,
    valorNuevo      NVARCHAR(100)   NOT NULL,
    fechaCambio     DATETIME2       NOT NULL CONSTRAINT DF_AuditoriaCambio_Fecha   DEFAULT (SYSDATETIME()),
    usuarioBd       NVARCHAR(128)   NOT NULL CONSTRAINT DF_AuditoriaCambio_Usuario DEFAULT (SUSER_SNAME()),
    idUsuarioApp    INT             NULL,     -- viene de SESSION_CONTEXT(N'idUsuario')
    CONSTRAINT PK_AuditoriaCambio PRIMARY KEY (idAuditoria)
);
GO

/* =====================================================================
   ÍNDICES ÚNICOS FILTRADOS (reglas de negocio)
   ===================================================================== */

-- Un solo carrito activo por cliente
CREATE UNIQUE NONCLUSTERED INDEX UX_Carrito_ClienteActivo
    ON Carrito (idCliente) WHERE activo = 1;

-- Una sola dirección principal activa por cliente
CREATE UNIQUE NONCLUSTERED INDEX UX_Direccion_Principal
    ON Direccion (idCliente) WHERE esPrincipal = 1 AND activo = 1;

-- Una sola imagen principal por producto
CREATE UNIQUE NONCLUSTERED INDEX UX_ImagenProducto_Principal
    ON ImagenProducto (idProducto) WHERE esPrincipal = 1;

-- Número de guía único cuando existe
CREATE UNIQUE NONCLUSTERED INDEX UX_Envio_NumeroGuia
    ON Envio (numeroGuia) WHERE numeroGuia IS NOT NULL;
GO

/* =====================================================================
   ÍNDICES NO AGRUPADOS DE RENDIMIENTO (requisito 4.2: mínimo 4)
   Evidencia: SET STATISTICS IO ON + plan de ejecución en 07_pruebas.sql
   ===================================================================== */

-- 1. Catálogo: filtros por categoría y marca en la búsqueda de productos
CREATE NONCLUSTERED INDEX IX_Producto_Categoria_Marca
    ON Producto (idCategoria, idMarca) INCLUDE (nombreProducto, precioVigente, activo);

-- 2. Historial de pedidos por cliente; R1 y R8 (compras por cliente y fecha)
CREATE NONCLUSTERED INDEX IX_Pedido_Cliente_Fecha
    ON Pedido (idCliente, fechaPedido) INCLUDE (idEstado, total);

-- 3. Reportes por período y estado: R4, R9 y R10 (excluyen cancelados)
CREATE NONCLUSTERED INDEX IX_Pedido_Estado_Fecha
    ON Pedido (idEstado, fechaPedido) INCLUDE (idCliente, total);

-- 4. Productos más vendidos y rentabilidad: R5 y R7
CREATE NONCLUSTERED INDEX IX_DetallePedido_Producto
    ON DetallePedido (idProducto) INCLUDE (cantidad, precioUnitario, costoUnitario, descuentoUnitario);

-- 5. Conciliación de inventario por producto
CREATE NONCLUSTERED INDEX IX_MovimientoInventario_Producto_Fecha
    ON MovimientoInventario (idProducto, fecha) INCLUDE (tipo, cantidad);

-- 6. Calificación promedio y reseñas en el detalle del producto
CREATE NONCLUSTERED INDEX IX_Resena_Producto
    ON Resena (idProducto) INCLUDE (calificacion);

-- 7. Direcciones de un cliente (la FK no crea índice automáticamente)
CREATE NONCLUSTERED INDEX IX_Direccion_Cliente
    ON Direccion (idCliente) INCLUDE (activo, esPrincipal);
GO

PRINT N'01_esquema.sql ejecutado correctamente: base PetShopNova creada.';
GO
