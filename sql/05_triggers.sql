/* =====================================================================
   PetShop Nova - Proyecto Programado II
   05_triggers.sql : auditoría por triggers
   Requiere 01_esquema.sql.

   Ambos triggers son MULTI-FILA: unen las pseudotablas inserted y deleted
   por la llave primaria y escriben una fila de auditoría por cada fila
   realmente modificada. Nunca usan "SELECT @variable = ... FROM inserted",
   que solo procesaría una fila.

   Usuario: usuarioBd toma SUSER_SNAME() (login de SQL Server; desde la app
   siempre es app_petshop) e idUsuarioApp toma SESSION_CONTEXT(N'idUsuario'),
   que los procedimientos establecen con sp_set_session_context. Si el cambio
   se hace directo en SSMS, idUsuarioApp queda en NULL.

   Justificación: la auditoría debe registrarse sin importar desde dónde se
   modifique el dato (aplicación, SSMS o un UPDATE masivo), por eso se usa
   un trigger y no se deja la responsabilidad a cada procedimiento.
   Los triggers NO reemplazan la transacción de compra: solo registran.
   ===================================================================== */

USE PetShopNova;
GO

/* ---------------------------------------------------------------------
   TR_Producto_AuditoriaPrecio
   Registra los cambios de precioVigente y de costo de los productos.
   --------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER dbo.TR_Producto_AuditoriaPrecio
ON dbo.Producto
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT (UPDATE(precioVigente) OR UPDATE(costo))
        RETURN;

    DECLARE @idUsuarioApp INT = CONVERT(INT, SESSION_CONTEXT(N'idUsuario'));

    INSERT INTO dbo.AuditoriaCambio (tablaAfectada, idRegistro, campo, valorAnterior, valorNuevo, usuarioBd, idUsuarioApp)
    SELECT N'Producto', i.idProducto, N'precioVigente',
           CONVERT(NVARCHAR(100), d.precioVigente), CONVERT(NVARCHAR(100), i.precioVigente),
           SUSER_SNAME(), @idUsuarioApp
    FROM inserted i
    JOIN deleted d ON d.idProducto = i.idProducto
    WHERE i.precioVigente <> d.precioVigente

    UNION ALL

    SELECT N'Producto', i.idProducto, N'costo',
           CONVERT(NVARCHAR(100), d.costo), CONVERT(NVARCHAR(100), i.costo),
           SUSER_SNAME(), @idUsuarioApp
    FROM inserted i
    JOIN deleted d ON d.idProducto = i.idProducto
    WHERE i.costo <> d.costo;
END;
GO

/* ---------------------------------------------------------------------
   TR_Pedido_AuditoriaEstado
   Registra cada cambio de estado de un pedido con el estado anterior y el
   nuevo (id y nombre). Complementa a HistorialEstadoPedido, que guarda la
   línea de tiempo del negocio; esta tabla guarda la traza técnica (quién).
   --------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER dbo.TR_Pedido_AuditoriaEstado
ON dbo.Pedido
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT UPDATE(idEstado)
        RETURN;

    DECLARE @idUsuarioApp INT = CONVERT(INT, SESSION_CONTEXT(N'idUsuario'));

    INSERT INTO dbo.AuditoriaCambio (tablaAfectada, idRegistro, campo, valorAnterior, valorNuevo, usuarioBd, idUsuarioApp)
    SELECT N'Pedido', i.idPedido, N'idEstado',
           CONCAT(d.idEstado, N' - ', ea.nombreEstadoPedido),
           CONCAT(i.idEstado, N' - ', en.nombreEstadoPedido),
           SUSER_SNAME(), @idUsuarioApp
    FROM inserted i
    JOIN deleted d          ON d.idPedido = i.idPedido
    JOIN dbo.EstadoPedido ea ON ea.idEstado = d.idEstado
    JOIN dbo.EstadoPedido en ON en.idEstado = i.idEstado
    WHERE i.idEstado <> d.idEstado;
END;
GO

PRINT N'05_triggers.sql ejecutado correctamente.';
GO
