/* =====================================================================
   PetShop Nova - Proyecto Programado II
   03_procedimientos.sql : lógica de negocio en T-SQL
   Requiere 01_esquema.sql y 02_datos.sql.

   Convenciones
   - Todos los procedimientos son parametrizados (nada de SQL dinámico).
   - Errores de negocio: THROW con números 50001-50099 y mensaje en español,
     listo para mostrarse en la aplicación.
   - Procedimientos con transacción explícita (TRY...CATCH, BEGIN TRAN,
     COMMIT / ROLLBACK, THROW): sp_Pedido_Confirmar, sp_Pedido_Cancelar,
     sp_Pedido_CambiarEstado, sp_Inventario_RegistrarMovimiento,
     sp_Producto_Crear, sp_Cliente_Registrar, sp_Direccion_Crear,
     sp_Direccion_Actualizar y sp_ImagenProducto_Agregar.
   - Procedimientos con parámetro OUTPUT (id creado): los *_Crear,
     sp_Cliente_Registrar, sp_Pedido_Confirmar, sp_Resena_Crear,
     sp_Inventario_RegistrarMovimiento, sp_Carrito_ObtenerActivo.
   - Los que modifican datos auditados guardan el usuario de la aplicación
     con sp_set_session_context; los triggers lo leen (05_triggers.sql).

   Índice
     0. Función de apoyo: promoción vigente
     1. Usuarios y clientes        6. Carrito
     2. Direcciones y catálogos    7. Pedidos (checkout, estados, cancelación)
     3. Marcas y categorías        8. Inventario
     4. Productos e imágenes       9. Reseñas
     5. Promociones               10. Seguridad: usuario de la aplicación
   ===================================================================== */

USE PetShopNova;
GO

/* =====================================================================
   0. FUNCIÓN DE APOYO
   Devuelve la promoción vigente de mayor descuento para un producto.
   Regla de combinación: las promociones no se acumulan.
   El descuento nunca supera el precio (el importe final nunca es negativo).
   ===================================================================== */
CREATE OR ALTER FUNCTION dbo.fn_PromocionVigente
(
    @idProducto INT,
    @precio     DECIMAL(12,2),
    @fecha      DATETIME2
)
RETURNS TABLE
AS
RETURN
(
    SELECT TOP (1)
           pr.idPromocion,
           pr.nombrePromocion,
           CAST(CASE WHEN pr.tipoDescuento = 'P' THEN ROUND(@precio * pr.valor / 100, 2)
                     WHEN pr.valor > @precio      THEN @precio
                     ELSE pr.valor
                END AS DECIMAL(12,2)) AS descuentoUnitario
    FROM dbo.ProductoPromocion pp
    JOIN dbo.Promocion pr ON pr.idPromocion = pp.idPromocion
    WHERE pp.idProducto = @idProducto
      AND pr.activo = 1
      AND @fecha BETWEEN pr.fechaInicio AND pr.fechaFin
    ORDER BY descuentoUnitario DESC, pr.idPromocion
);
GO

/* =====================================================================
   1. USUARIOS Y CLIENTES
   ===================================================================== */

-- Inicio de sesión: devuelve el hash para que la APLICACIÓN lo verifique con bcrypt
CREATE OR ALTER PROCEDURE dbo.sp_Usuario_ObtenerPorCorreo
    @correo NVARCHAR(150)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT u.idUsuario, u.correo, u.passwordHash, u.activo,
           u.idRol, r.nombreRol,
           c.idCliente, CONCAT(c.nombreCliente, N' ', c.apellidos) AS nombreCompleto
    FROM dbo.Usuario u
    JOIN dbo.Rol r          ON r.idRol = u.idRol
    LEFT JOIN dbo.Cliente c ON c.idUsuario = u.idUsuario
    WHERE u.correo = LTRIM(RTRIM(@correo));
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Usuario_CambiarPassword
    @idUsuario    INT,
    @passwordHash NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    IF NULLIF(LTRIM(RTRIM(@passwordHash)), N'') IS NULL
        THROW 50003, N'El hash de la contraseña es obligatorio.', 1;

    UPDATE dbo.Usuario SET passwordHash = @passwordHash WHERE idUsuario = @idUsuario;
    IF @@ROWCOUNT = 0
        THROW 50004, N'El usuario no existe.', 1;
END;
GO

-- Registro de un cliente nuevo: crea Usuario (rol Cliente) y Cliente en una sola transacción
CREATE OR ALTER PROCEDURE dbo.sp_Cliente_Registrar
    @correo          NVARCHAR(150),
    @passwordHash    NVARCHAR(255),
    @nombreCliente   NVARCHAR(80),
    @apellidos       NVARCHAR(100),
    @telefono        NVARCHAR(20) = NULL,
    @fechaNacimiento DATE,
    @idCliente       INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @idUsuario INT;

    BEGIN TRY
        IF NULLIF(LTRIM(RTRIM(@nombreCliente)), N'') IS NULL OR NULLIF(LTRIM(RTRIM(@apellidos)), N'') IS NULL
            THROW 50005, N'El nombre y los apellidos son obligatorios.', 1;
        IF NULLIF(LTRIM(RTRIM(@passwordHash)), N'') IS NULL
            THROW 50003, N'El hash de la contraseña es obligatorio.', 1;

        BEGIN TRANSACTION;

        INSERT INTO dbo.Usuario (idRol, correo, passwordHash)
        VALUES (2, LTRIM(RTRIM(@correo)), @passwordHash);
        SET @idUsuario = SCOPE_IDENTITY();

        INSERT INTO dbo.Cliente (idUsuario, nombreCliente, apellidos, telefono, fechaNacimiento)
        VALUES (@idUsuario, LTRIM(RTRIM(@nombreCliente)), LTRIM(RTRIM(@apellidos)), @telefono, @fechaNacimiento);
        SET @idCliente = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @idCliente = NULL;
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50001, N'Ya existe un usuario registrado con ese correo (restricción UQ_Usuario_Correo).', 1;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Cliente_Actualizar
    @idCliente       INT,
    @nombreCliente   NVARCHAR(80),
    @apellidos       NVARCHAR(100),
    @telefono        NVARCHAR(20) = NULL,
    @fechaNacimiento DATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NULLIF(LTRIM(RTRIM(@nombreCliente)), N'') IS NULL OR NULLIF(LTRIM(RTRIM(@apellidos)), N'') IS NULL
        THROW 50005, N'El nombre y los apellidos son obligatorios.', 1;

    UPDATE dbo.Cliente
    SET nombreCliente   = LTRIM(RTRIM(@nombreCliente)),
        apellidos       = LTRIM(RTRIM(@apellidos)),
        telefono        = @telefono,
        fechaNacimiento = @fechaNacimiento
    WHERE idCliente = @idCliente;

    IF @@ROWCOUNT = 0
        THROW 50006, N'El cliente no existe.', 1;
END;
GO

-- Eliminación lógica: activa o desactiva al cliente y a su usuario
CREATE OR ALTER PROCEDURE dbo.sp_Cliente_CambiarEstado
    @idCliente INT,
    @activo    BIT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Cliente SET activo = @activo WHERE idCliente = @idCliente;
        IF @@ROWCOUNT = 0
            THROW 50006, N'El cliente no existe.', 1;

        UPDATE u SET u.activo = @activo
        FROM dbo.Usuario u
        JOIN dbo.Cliente c ON c.idUsuario = u.idUsuario
        WHERE c.idCliente = @idCliente;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Cliente_Obtener
    @idCliente INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.idCliente, c.idUsuario, u.correo, c.nombreCliente, c.apellidos,
           c.telefono, c.fechaNacimiento, c.activo, u.fechaCreacion
    FROM dbo.Cliente c
    JOIN dbo.Usuario u ON u.idUsuario = c.idUsuario
    WHERE c.idCliente = @idCliente;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Cliente_Buscar
    @texto       NVARCHAR(100) = NULL,
    @soloActivos BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @patron NVARCHAR(102) =
        CASE WHEN NULLIF(LTRIM(RTRIM(@texto)), N'') IS NULL THEN NULL
             ELSE CONCAT(N'%', LTRIM(RTRIM(@texto)), N'%') END;

    SELECT c.idCliente, c.nombreCliente, c.apellidos, u.correo, c.telefono, c.activo,
           (SELECT COUNT(*) FROM dbo.Pedido p WHERE p.idCliente = c.idCliente) AS cantidadPedidos
    FROM dbo.Cliente c
    JOIN dbo.Usuario u ON u.idUsuario = c.idUsuario
    WHERE (@soloActivos = 0 OR c.activo = 1)
      AND (@patron IS NULL
           OR c.nombreCliente LIKE @patron
           OR c.apellidos LIKE @patron
           OR u.correo LIKE @patron)
    ORDER BY c.apellidos, c.nombreCliente;
END;
GO

/* =====================================================================
   2. DIRECCIONES, ZONAS Y MÉTODOS DE PAGO
   ===================================================================== */

CREATE OR ALTER PROCEDURE dbo.sp_Direccion_Crear
    @idCliente      INT,
    @idZonaEnvio    INT,
    @lineaDireccion NVARCHAR(200),
    @ciudad         NVARCHAR(80),
    @provincia      NVARCHAR(50),
    @codigoPostal   NVARCHAR(10) = NULL,
    @esPrincipal    BIT = 0,
    @idDireccion    INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Cliente WHERE idCliente = @idCliente AND activo = 1)
            THROW 50006, N'El cliente no existe o está inactivo.', 1;
        IF NOT EXISTS (SELECT 1 FROM dbo.ZonaEnvio WHERE idZonaEnvio = @idZonaEnvio AND activo = 1)
            THROW 50007, N'La zona de envío no existe o está inactiva.', 1;

        BEGIN TRANSACTION;

        -- La primera dirección activa del cliente siempre es la principal
        IF NOT EXISTS (SELECT 1 FROM dbo.Direccion WHERE idCliente = @idCliente AND activo = 1)
            SET @esPrincipal = 1;

        IF @esPrincipal = 1
            UPDATE dbo.Direccion SET esPrincipal = 0
            WHERE idCliente = @idCliente AND esPrincipal = 1;

        INSERT INTO dbo.Direccion (idCliente, idZonaEnvio, lineaDireccion, ciudad, provincia, codigoPostal, esPrincipal)
        VALUES (@idCliente, @idZonaEnvio, @lineaDireccion, @ciudad, @provincia, @codigoPostal, @esPrincipal);
        SET @idDireccion = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @idDireccion = NULL;
        THROW;
    END CATCH
END;
GO

/* Política de historial: si la dirección ya se usó en un pedido, NO se edita;
   se desactiva y se crea una nueva con los datos nuevos. @idDireccionResultado
   devuelve la dirección vigente (la misma o la nueva). */
CREATE OR ALTER PROCEDURE dbo.sp_Direccion_Actualizar
    @idDireccion          INT,
    @idCliente            INT,
    @idZonaEnvio          INT,
    @lineaDireccion       NVARCHAR(200),
    @ciudad               NVARCHAR(80),
    @provincia            NVARCHAR(50),
    @codigoPostal         NVARCHAR(10) = NULL,
    @esPrincipal          BIT = 0,
    @idDireccionResultado INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Direccion WHERE idDireccion = @idDireccion AND idCliente = @idCliente AND activo = 1)
            THROW 50008, N'La dirección no existe, está inactiva o no pertenece al cliente.', 1;
        IF NOT EXISTS (SELECT 1 FROM dbo.ZonaEnvio WHERE idZonaEnvio = @idZonaEnvio AND activo = 1)
            THROW 50007, N'La zona de envío no existe o está inactiva.', 1;

        BEGIN TRANSACTION;

        IF @esPrincipal = 1
            UPDATE dbo.Direccion SET esPrincipal = 0
            WHERE idCliente = @idCliente AND esPrincipal = 1 AND idDireccion <> @idDireccion;

        IF EXISTS (SELECT 1 FROM dbo.Pedido WHERE idDireccion = @idDireccion)
        BEGIN
            -- Se conserva la dirección original para los pedidos anteriores
            UPDATE dbo.Direccion SET activo = 0, esPrincipal = 0 WHERE idDireccion = @idDireccion;

            INSERT INTO dbo.Direccion (idCliente, idZonaEnvio, lineaDireccion, ciudad, provincia, codigoPostal, esPrincipal)
            VALUES (@idCliente, @idZonaEnvio, @lineaDireccion, @ciudad, @provincia, @codigoPostal, @esPrincipal);
            SET @idDireccionResultado = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE dbo.Direccion
            SET idZonaEnvio = @idZonaEnvio, lineaDireccion = @lineaDireccion, ciudad = @ciudad,
                provincia = @provincia, codigoPostal = @codigoPostal, esPrincipal = @esPrincipal
            WHERE idDireccion = @idDireccion;
            SET @idDireccionResultado = @idDireccion;
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @idDireccionResultado = NULL;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Direccion_Desactivar
    @idDireccion INT,
    @idCliente   INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Direccion SET activo = 0, esPrincipal = 0
    WHERE idDireccion = @idDireccion AND idCliente = @idCliente AND activo = 1;

    IF @@ROWCOUNT = 0
        THROW 50008, N'La dirección no existe, ya estaba inactiva o no pertenece al cliente.', 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Direccion_Listar
    @idCliente    INT,
    @soloActivas  BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SELECT d.idDireccion, d.lineaDireccion, d.ciudad, d.provincia, d.codigoPostal,
           d.esPrincipal, d.activo, z.idZonaEnvio, z.nombreZonaEnvio, z.tarifa
    FROM dbo.Direccion d
    JOIN dbo.ZonaEnvio z ON z.idZonaEnvio = d.idZonaEnvio
    WHERE d.idCliente = @idCliente
      AND (@soloActivas = 0 OR d.activo = 1)
    ORDER BY d.esPrincipal DESC, d.idDireccion;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ZonaEnvio_Listar
    @soloActivas BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SELECT idZonaEnvio, nombreZonaEnvio, tarifa, activo
    FROM dbo.ZonaEnvio
    WHERE @soloActivas = 0 OR activo = 1
    ORDER BY tarifa, nombreZonaEnvio;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_MetodoPago_Listar
    @soloActivos BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SELECT idMetodoPago, nombreMetodoPago, activo
    FROM dbo.MetodoPago
    WHERE @soloActivos = 0 OR activo = 1
    ORDER BY idMetodoPago;
END;
GO

/* =====================================================================
   3. MARCAS Y CATEGORÍAS
   Los duplicados los rechaza la restricción UNIQUE de la base; el CATCH
   solo traduce el error a un mensaje claro.
   ===================================================================== */

CREATE OR ALTER PROCEDURE dbo.sp_Marca_Crear
    @nombreMarca NVARCHAR(100),
    @idMarca     INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NULLIF(LTRIM(RTRIM(@nombreMarca)), N'') IS NULL
            THROW 50010, N'El nombre de la marca es obligatorio.', 1;

        INSERT INTO dbo.Marca (nombreMarca) VALUES (LTRIM(RTRIM(@nombreMarca)));
        SET @idMarca = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        SET @idMarca = NULL;
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50001, N'Ya existe una marca con ese nombre (restricción UQ_Marca_Nombre).', 1;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Marca_Actualizar
    @idMarca     INT,
    @nombreMarca NVARCHAR(100),
    @activo      BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NULLIF(LTRIM(RTRIM(@nombreMarca)), N'') IS NULL
            THROW 50010, N'El nombre de la marca es obligatorio.', 1;

        UPDATE dbo.Marca SET nombreMarca = LTRIM(RTRIM(@nombreMarca)), activo = @activo
        WHERE idMarca = @idMarca;

        IF @@ROWCOUNT = 0
            THROW 50011, N'La marca no existe.', 1;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50001, N'Ya existe una marca con ese nombre (restricción UQ_Marca_Nombre).', 1;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Marca_Listar
    @texto       NVARCHAR(100) = NULL,
    @soloActivas BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT m.idMarca, m.nombreMarca, m.activo,
           (SELECT COUNT(*) FROM dbo.Producto p WHERE p.idMarca = m.idMarca) AS cantidadProductos
    FROM dbo.Marca m
    WHERE (@soloActivas = 0 OR m.activo = 1)
      AND (NULLIF(LTRIM(RTRIM(@texto)), N'') IS NULL OR m.nombreMarca LIKE CONCAT(N'%', LTRIM(RTRIM(@texto)), N'%'))
    ORDER BY m.nombreMarca;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Categoria_Crear
    @nombreCategoria NVARCHAR(100),
    @idCategoria     INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NULLIF(LTRIM(RTRIM(@nombreCategoria)), N'') IS NULL
            THROW 50012, N'El nombre de la categoría es obligatorio.', 1;

        INSERT INTO dbo.Categoria (nombreCategoria) VALUES (LTRIM(RTRIM(@nombreCategoria)));
        SET @idCategoria = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        SET @idCategoria = NULL;
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50001, N'Ya existe una categoría con ese nombre (restricción UQ_Categoria_Nombre).', 1;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Categoria_Actualizar
    @idCategoria     INT,
    @nombreCategoria NVARCHAR(100),
    @activo          BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NULLIF(LTRIM(RTRIM(@nombreCategoria)), N'') IS NULL
            THROW 50012, N'El nombre de la categoría es obligatorio.', 1;

        UPDATE dbo.Categoria SET nombreCategoria = LTRIM(RTRIM(@nombreCategoria)), activo = @activo
        WHERE idCategoria = @idCategoria;

        IF @@ROWCOUNT = 0
            THROW 50013, N'La categoría no existe.', 1;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50001, N'Ya existe una categoría con ese nombre (restricción UQ_Categoria_Nombre).', 1;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Categoria_Listar
    @texto       NVARCHAR(100) = NULL,
    @soloActivas BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.idCategoria, c.nombreCategoria, c.activo,
           (SELECT COUNT(*) FROM dbo.Producto p WHERE p.idCategoria = c.idCategoria AND p.activo = 1) AS cantidadProductos
    FROM dbo.Categoria c
    WHERE (@soloActivas = 0 OR c.activo = 1)
      AND (NULLIF(LTRIM(RTRIM(@texto)), N'') IS NULL OR c.nombreCategoria LIKE CONCAT(N'%', LTRIM(RTRIM(@texto)), N'%'))
    ORDER BY c.nombreCategoria;
END;
GO

/* =====================================================================
   4. PRODUCTOS E IMÁGENES
   ===================================================================== */

-- Crea el producto, su fila de inventario, la imagen principal y (opcional) la existencia inicial
CREATE OR ALTER PROCEDURE dbo.sp_Producto_Crear
    @sku               NVARCHAR(30),
    @idMarca           INT,
    @idCategoria       INT,
    @nombreProducto    NVARCHAR(150),
    @descripcion       NVARCHAR(600) = NULL,
    @especificaciones  NVARCHAR(600) = NULL,
    @precioVigente     DECIMAL(12,2),
    @costo             DECIMAL(12,2),
    @stockMinimo       INT = 5,
    @destacado         BIT = 0,
    @urlImagen         NVARCHAR(300) = NULL,
    @existenciaInicial INT = 0,
    @idUsuario         INT,
    @idProducto        INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF NULLIF(LTRIM(RTRIM(@sku)), N'') IS NULL OR NULLIF(LTRIM(RTRIM(@nombreProducto)), N'') IS NULL
            THROW 50020, N'El SKU y el nombre del producto son obligatorios.', 1;
        IF @precioVigente IS NULL OR @precioVigente <= 0 OR @costo IS NULL OR @costo < 0
            THROW 50021, N'El precio debe ser mayor que cero y el costo no puede ser negativo.', 1;
        IF ISNULL(@existenciaInicial, 0) < 0
            THROW 50022, N'La existencia inicial no puede ser negativa.', 1;
        IF NOT EXISTS (SELECT 1 FROM dbo.Marca WHERE idMarca = @idMarca AND activo = 1)
            THROW 50011, N'La marca no existe o está inactiva.', 1;
        IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE idCategoria = @idCategoria AND activo = 1)
            THROW 50013, N'La categoría no existe o está inactiva.', 1;

        BEGIN TRANSACTION;

        INSERT INTO dbo.Producto (sku, idMarca, idCategoria, nombreProducto, descripcion, especificaciones,
                                  precioVigente, costo, stockMinimo, destacado)
        VALUES (LTRIM(RTRIM(@sku)), @idMarca, @idCategoria, LTRIM(RTRIM(@nombreProducto)), @descripcion, @especificaciones,
                @precioVigente, @costo, @stockMinimo, @destacado);
        SET @idProducto = SCOPE_IDENTITY();

        INSERT INTO dbo.Inventario (idProducto, existencia) VALUES (@idProducto, ISNULL(@existenciaInicial, 0));

        IF ISNULL(@existenciaInicial, 0) > 0
            INSERT INTO dbo.MovimientoInventario (idProducto, idUsuario, tipo, cantidad, motivo)
            VALUES (@idProducto, @idUsuario, N'ENTRADA', @existenciaInicial, N'Inventario inicial');

        IF NULLIF(LTRIM(RTRIM(@urlImagen)), N'') IS NOT NULL
            INSERT INTO dbo.ImagenProducto (idProducto, url, esPrincipal) VALUES (@idProducto, LTRIM(RTRIM(@urlImagen)), 1);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @idProducto = NULL;
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50001, N'Ya existe un producto con ese SKU (restricción UQ_Producto_Sku).', 1;
        THROW;
    END CATCH
END;
GO

-- Actualiza el producto. Un cambio de precio lo registra el trigger de auditoría.
-- La existencia NO se cambia aquí: solo con sp_Inventario_RegistrarMovimiento.
CREATE OR ALTER PROCEDURE dbo.sp_Producto_Actualizar
    @idProducto       INT,
    @sku              NVARCHAR(30),
    @idMarca          INT,
    @idCategoria      INT,
    @nombreProducto   NVARCHAR(150),
    @descripcion      NVARCHAR(600) = NULL,
    @especificaciones NVARCHAR(600) = NULL,
    @precioVigente    DECIMAL(12,2),
    @costo            DECIMAL(12,2),
    @stockMinimo      INT,
    @destacado        BIT,
    @activo           BIT,
    @idUsuario        INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NULLIF(LTRIM(RTRIM(@sku)), N'') IS NULL OR NULLIF(LTRIM(RTRIM(@nombreProducto)), N'') IS NULL
            THROW 50020, N'El SKU y el nombre del producto son obligatorios.', 1;
        IF @precioVigente IS NULL OR @precioVigente <= 0 OR @costo IS NULL OR @costo < 0
            THROW 50021, N'El precio debe ser mayor que cero y el costo no puede ser negativo.', 1;

        EXEC sys.sp_set_session_context @key = N'idUsuario', @value = @idUsuario;

        UPDATE dbo.Producto
        SET sku = LTRIM(RTRIM(@sku)), idMarca = @idMarca, idCategoria = @idCategoria,
            nombreProducto = LTRIM(RTRIM(@nombreProducto)), descripcion = @descripcion,
            especificaciones = @especificaciones, precioVigente = @precioVigente, costo = @costo,
            stockMinimo = @stockMinimo, destacado = @destacado, activo = @activo
        WHERE idProducto = @idProducto;

        IF @@ROWCOUNT = 0
            THROW 50023, N'El producto no existe.', 1;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50001, N'Ya existe un producto con ese SKU (restricción UQ_Producto_Sku).', 1;
        THROW;
    END CATCH
END;
GO

-- Ajuste masivo de precios por categoría (varias filas a la vez: demuestra el trigger multi-fila)
CREATE OR ALTER PROCEDURE dbo.sp_Producto_AjustarPrecioPorCategoria
    @idCategoria     INT,
    @porcentaje      DECIMAL(5,2),     -- 10 = +10 %, -5 = -5 %
    @idUsuario       INT,
    @filasAfectadas  INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF @porcentaje IS NULL OR @porcentaje = 0 OR @porcentaje < -50 OR @porcentaje > 100
        THROW 50024, N'El porcentaje debe estar entre -50 y 100 y ser distinto de cero.', 1;

    EXEC sys.sp_set_session_context @key = N'idUsuario', @value = @idUsuario;

    UPDATE dbo.Producto
    SET precioVigente = ROUND(precioVigente * (1 + @porcentaje / 100), 2)
    WHERE idCategoria = @idCategoria AND activo = 1;

    SET @filasAfectadas = @@ROWCOUNT;
END;
GO

-- Catálogo: búsqueda por palabra clave y filtros. También sirve para destacados y ofertas.
CREATE OR ALTER PROCEDURE dbo.sp_Producto_Buscar
    @texto            NVARCHAR(100) = NULL,
    @idMarca          INT = NULL,
    @idCategoria      INT = NULL,
    @precioMin        DECIMAL(12,2) = NULL,
    @precioMax        DECIMAL(12,2) = NULL,
    @soloDestacados   BIT = 0,
    @soloOfertas      BIT = 0,
    @incluirInactivos BIT = 0       -- 1 solo para la pantalla de administración
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ahora  DATETIME2 = SYSDATETIME();
    DECLARE @patron NVARCHAR(102) =
        CASE WHEN NULLIF(LTRIM(RTRIM(@texto)), N'') IS NULL THEN NULL
             ELSE CONCAT(N'%', LTRIM(RTRIM(@texto)), N'%') END;

    SELECT p.idProducto, p.sku, p.nombreProducto, p.descripcion,
           p.idMarca, m.nombreMarca, p.idCategoria, c.nombreCategoria,
           p.precioVigente,
           ISNULL(pv.descuentoUnitario, 0)                   AS descuento,
           p.precioVigente - ISNULL(pv.descuentoUnitario, 0) AS precioFinal,
           pv.nombrePromocion,
           i.existencia,
           CAST(CASE WHEN i.existencia > 0 THEN 1 ELSE 0 END AS BIT) AS disponible,
           img.url AS urlImagen,
           r.calificacionPromedio, r.cantidadResenas,
           p.destacado, p.activo
    FROM dbo.Producto p
    JOIN dbo.Marca m      ON m.idMarca = p.idMarca
    JOIN dbo.Categoria c  ON c.idCategoria = p.idCategoria
    JOIN dbo.Inventario i ON i.idProducto = p.idProducto
    OUTER APPLY dbo.fn_PromocionVigente(p.idProducto, p.precioVigente, @ahora) pv
    OUTER APPLY (SELECT TOP (1) ip.url FROM dbo.ImagenProducto ip
                 WHERE ip.idProducto = p.idProducto ORDER BY ip.esPrincipal DESC, ip.idImagen) img
    OUTER APPLY (SELECT CAST(AVG(CAST(rs.calificacion AS DECIMAL(4,2))) AS DECIMAL(3,2)) AS calificacionPromedio,
                        COUNT(*) AS cantidadResenas
                 FROM dbo.Resena rs WHERE rs.idProducto = p.idProducto) r
    WHERE (@incluirInactivos = 1 OR (p.activo = 1 AND m.activo = 1 AND c.activo = 1))
      AND (@patron IS NULL
           OR p.nombreProducto LIKE @patron OR p.descripcion LIKE @patron
           OR p.sku LIKE @patron OR m.nombreMarca LIKE @patron)
      AND (@idMarca IS NULL OR p.idMarca = @idMarca)
      AND (@idCategoria IS NULL OR p.idCategoria = @idCategoria)
      AND (@precioMin IS NULL OR p.precioVigente - ISNULL(pv.descuentoUnitario, 0) >= @precioMin)
      AND (@precioMax IS NULL OR p.precioVigente - ISNULL(pv.descuentoUnitario, 0) <= @precioMax)
      AND (@soloDestacados = 0 OR p.destacado = 1)
      AND (@soloOfertas = 0 OR pv.idPromocion IS NOT NULL)
    ORDER BY p.destacado DESC, p.nombreProducto
    OPTION (RECOMPILE);
END;
GO

-- Detalle de producto: 1) datos, precio y disponibilidad  2) imágenes  3) reseñas
CREATE OR ALTER PROCEDURE dbo.sp_Producto_ObtenerDetalle
    @idProducto INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ahora DATETIME2 = SYSDATETIME();

    SELECT p.idProducto, p.sku, p.nombreProducto, p.descripcion, p.especificaciones,
           m.nombreMarca, c.nombreCategoria, p.precioVigente,
           ISNULL(pv.descuentoUnitario, 0)                   AS descuento,
           p.precioVigente - ISNULL(pv.descuentoUnitario, 0) AS precioFinal,
           pv.nombrePromocion,
           i.existencia,
           CAST(CASE WHEN i.existencia > 0 THEN 1 ELSE 0 END AS BIT) AS disponible,
           r.calificacionPromedio, r.cantidadResenas,
           p.destacado, p.activo
    FROM dbo.Producto p
    JOIN dbo.Marca m      ON m.idMarca = p.idMarca
    JOIN dbo.Categoria c  ON c.idCategoria = p.idCategoria
    JOIN dbo.Inventario i ON i.idProducto = p.idProducto
    OUTER APPLY dbo.fn_PromocionVigente(p.idProducto, p.precioVigente, @ahora) pv
    OUTER APPLY (SELECT CAST(AVG(CAST(rs.calificacion AS DECIMAL(4,2))) AS DECIMAL(3,2)) AS calificacionPromedio,
                        COUNT(*) AS cantidadResenas
                 FROM dbo.Resena rs WHERE rs.idProducto = p.idProducto) r
    WHERE p.idProducto = @idProducto;

    SELECT idImagen, url, esPrincipal
    FROM dbo.ImagenProducto
    WHERE idProducto = @idProducto
    ORDER BY esPrincipal DESC, idImagen;

    SELECT rs.idResena, CONCAT(c.nombreCliente, N' ', LEFT(c.apellidos, 1), N'.') AS cliente,
           rs.calificacion, rs.comentario, rs.fecha
    FROM dbo.Resena rs
    JOIN dbo.Cliente c ON c.idCliente = rs.idCliente
    WHERE rs.idProducto = @idProducto
    ORDER BY rs.fecha DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ImagenProducto_Agregar
    @idProducto  INT,
    @url         NVARCHAR(300),
    @esPrincipal BIT = 0,
    @idImagen    INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF NULLIF(LTRIM(RTRIM(@url)), N'') IS NULL
            THROW 50025, N'La URL de la imagen es obligatoria.', 1;
        IF NOT EXISTS (SELECT 1 FROM dbo.Producto WHERE idProducto = @idProducto)
            THROW 50023, N'El producto no existe.', 1;

        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM dbo.ImagenProducto WHERE idProducto = @idProducto)
            SET @esPrincipal = 1;

        IF @esPrincipal = 1
            UPDATE dbo.ImagenProducto SET esPrincipal = 0
            WHERE idProducto = @idProducto AND esPrincipal = 1;

        INSERT INTO dbo.ImagenProducto (idProducto, url, esPrincipal)
        VALUES (@idProducto, LTRIM(RTRIM(@url)), @esPrincipal);
        SET @idImagen = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @idImagen = NULL;
        THROW;
    END CATCH
END;
GO

/* =====================================================================
   5. PROMOCIONES
   ===================================================================== */

CREATE OR ALTER PROCEDURE dbo.sp_Promocion_Crear
    @nombrePromocion NVARCHAR(100),
    @tipoDescuento   CHAR(1),
    @valor           DECIMAL(12,2),
    @fechaInicio     DATETIME2,
    @fechaFin        DATETIME2,
    @idPromocion     INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF NULLIF(LTRIM(RTRIM(@nombrePromocion)), N'') IS NULL
        THROW 50030, N'El nombre de la promoción es obligatorio.', 1;
    IF @tipoDescuento NOT IN ('P', 'M')
        THROW 50031, N'El tipo de descuento debe ser P (porcentaje) o M (monto).', 1;
    IF @valor IS NULL OR @valor <= 0 OR (@tipoDescuento = 'P' AND @valor > 100)
        THROW 50032, N'El valor debe ser mayor que cero y, si es porcentaje, no puede superar 100.', 1;
    IF @fechaFin <= @fechaInicio
        THROW 50033, N'La fecha de fin debe ser posterior a la fecha de inicio.', 1;

    INSERT INTO dbo.Promocion (nombrePromocion, tipoDescuento, valor, fechaInicio, fechaFin)
    VALUES (LTRIM(RTRIM(@nombrePromocion)), @tipoDescuento, @valor, @fechaInicio, @fechaFin);
    SET @idPromocion = SCOPE_IDENTITY();
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Promocion_Actualizar
    @idPromocion     INT,
    @nombrePromocion NVARCHAR(100),
    @tipoDescuento   CHAR(1),
    @valor           DECIMAL(12,2),
    @fechaInicio     DATETIME2,
    @fechaFin        DATETIME2,
    @activo          BIT
AS
BEGIN
    SET NOCOUNT ON;
    IF @tipoDescuento NOT IN ('P', 'M')
        THROW 50031, N'El tipo de descuento debe ser P (porcentaje) o M (monto).', 1;
    IF @valor IS NULL OR @valor <= 0 OR (@tipoDescuento = 'P' AND @valor > 100)
        THROW 50032, N'El valor debe ser mayor que cero y, si es porcentaje, no puede superar 100.', 1;
    IF @fechaFin <= @fechaInicio
        THROW 50033, N'La fecha de fin debe ser posterior a la fecha de inicio.', 1;

    UPDATE dbo.Promocion
    SET nombrePromocion = LTRIM(RTRIM(@nombrePromocion)), tipoDescuento = @tipoDescuento, valor = @valor,
        fechaInicio = @fechaInicio, fechaFin = @fechaFin, activo = @activo
    WHERE idPromocion = @idPromocion;

    IF @@ROWCOUNT = 0
        THROW 50034, N'La promoción no existe.', 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Promocion_AsignarProducto
    @idPromocion INT,
    @idProducto  INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO dbo.ProductoPromocion (idPromocion, idProducto) VALUES (@idPromocion, @idProducto);
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50001, N'El producto ya está incluido en esa promoción.', 1;
        IF ERROR_NUMBER() = 547
            THROW 50035, N'La promoción o el producto no existen.', 1;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Promocion_QuitarProducto
    @idPromocion INT,
    @idProducto  INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.ProductoPromocion WHERE idPromocion = @idPromocion AND idProducto = @idProducto;
    IF @@ROWCOUNT = 0
        THROW 50036, N'El producto no estaba incluido en esa promoción.', 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Promocion_Listar
    @soloVigentes BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ahora DATETIME2 = SYSDATETIME();

    SELECT pr.idPromocion, pr.nombrePromocion, pr.tipoDescuento, pr.valor,
           pr.fechaInicio, pr.fechaFin, pr.activo,
           CASE WHEN pr.activo = 0           THEN N'Inactiva'
                WHEN @ahora < pr.fechaInicio THEN N'Programada'
                WHEN @ahora > pr.fechaFin    THEN N'Vencida'
                ELSE N'Vigente' END AS estadoVigencia,
           (SELECT COUNT(*) FROM dbo.ProductoPromocion pp WHERE pp.idPromocion = pr.idPromocion) AS cantidadProductos
    FROM dbo.Promocion pr
    WHERE @soloVigentes = 0
       OR (pr.activo = 1 AND @ahora BETWEEN pr.fechaInicio AND pr.fechaFin)
    ORDER BY pr.fechaInicio DESC;
END;
GO

/* =====================================================================
   6. CARRITO PERSISTENTE
   ===================================================================== */

-- Devuelve el carrito activo del cliente; si no tiene, lo crea
CREATE OR ALTER PROCEDURE dbo.sp_Carrito_ObtenerActivo
    @idCliente INT,
    @idCarrito INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @idCarrito = NULL;

    SELECT @idCarrito = idCarrito FROM dbo.Carrito WHERE idCliente = @idCliente AND activo = 1;

    IF @idCarrito IS NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM dbo.Cliente WHERE idCliente = @idCliente AND activo = 1)
            THROW 50006, N'El cliente no existe o está inactivo.', 1;

        INSERT INTO dbo.Carrito (idCliente) VALUES (@idCliente);
        SET @idCarrito = SCOPE_IDENTITY();
    END;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Carrito_AgregarProducto
    @idCliente  INT,
    @idProducto INT,
    @cantidad   INT = 1
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idCarrito INT, @existencia INT, @enCarrito INT, @msg NVARCHAR(400);

    IF @cantidad IS NULL OR @cantidad <= 0
        THROW 50070, N'La cantidad debe ser mayor que cero.', 1;

    SELECT @existencia = i.existencia
    FROM dbo.Producto p
    JOIN dbo.Inventario i ON i.idProducto = p.idProducto
    WHERE p.idProducto = @idProducto AND p.activo = 1;

    IF @existencia IS NULL
        THROW 50023, N'El producto no existe o no está a la venta.', 1;

    EXEC dbo.sp_Carrito_ObtenerActivo @idCliente = @idCliente, @idCarrito = @idCarrito OUTPUT;

    SELECT @enCarrito = cantidad FROM dbo.DetalleCarrito WHERE idCarrito = @idCarrito AND idProducto = @idProducto;

    -- Validación de cortesía; la definitiva ocurre en el checkout
    IF ISNULL(@enCarrito, 0) + @cantidad > @existencia
    BEGIN
        SET @msg = CONCAT(N'Solo hay ', @existencia, N' unidad(es) disponible(s) de este producto.');
        THROW 50071, @msg, 1;
    END;

    IF @enCarrito IS NULL
        INSERT INTO dbo.DetalleCarrito (idCarrito, idProducto, cantidad) VALUES (@idCarrito, @idProducto, @cantidad);
    ELSE
        UPDATE dbo.DetalleCarrito SET cantidad = cantidad + @cantidad
        WHERE idCarrito = @idCarrito AND idProducto = @idProducto;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Carrito_CambiarCantidad
    @idCliente  INT,
    @idProducto INT,
    @cantidad   INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @existencia INT, @msg NVARCHAR(400);

    IF @cantidad IS NULL OR @cantidad <= 0
        THROW 50070, N'La cantidad debe ser mayor que cero. Para quitar el producto use eliminar línea.', 1;

    SELECT @existencia = existencia FROM dbo.Inventario WHERE idProducto = @idProducto;
    IF @cantidad > ISNULL(@existencia, 0)
    BEGIN
        SET @msg = CONCAT(N'Solo hay ', ISNULL(@existencia, 0), N' unidad(es) disponible(s) de este producto.');
        THROW 50071, @msg, 1;
    END;

    UPDATE dc SET dc.cantidad = @cantidad
    FROM dbo.DetalleCarrito dc
    JOIN dbo.Carrito c ON c.idCarrito = dc.idCarrito
    WHERE c.idCliente = @idCliente AND c.activo = 1 AND dc.idProducto = @idProducto;

    IF @@ROWCOUNT = 0
        THROW 50072, N'El producto no está en el carrito.', 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Carrito_EliminarLinea
    @idCliente  INT,
    @idProducto INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE dc
    FROM dbo.DetalleCarrito dc
    JOIN dbo.Carrito c ON c.idCarrito = dc.idCarrito
    WHERE c.idCliente = @idCliente AND c.activo = 1 AND dc.idProducto = @idProducto;

    IF @@ROWCOUNT = 0
        THROW 50072, N'El producto no está en el carrito.', 1;
END;
GO

-- Resultado 1: líneas con precio vigente y descuento.  Resultado 2: resumen con envío y total.
-- Si no se indica dirección se usa la principal del cliente.
CREATE OR ALTER PROCEDURE dbo.sp_Carrito_Ver
    @idCliente   INT,
    @idDireccion INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ahora DATETIME2 = SYSDATETIME(), @costoEnvio DECIMAL(12,2);

    SELECT dc.idProducto, p.sku, p.nombreProducto, img.url AS urlImagen,
           dc.cantidad, p.precioVigente,
           ISNULL(pv.descuentoUnitario, 0) AS descuentoUnitario,
           pv.nombrePromocion,
           i.existencia,
           CAST(CASE WHEN i.existencia >= dc.cantidad AND p.activo = 1 THEN 1 ELSE 0 END AS BIT) AS disponible
    INTO #lineas
    FROM dbo.Carrito c
    JOIN dbo.DetalleCarrito dc ON dc.idCarrito = c.idCarrito
    JOIN dbo.Producto p        ON p.idProducto = dc.idProducto
    JOIN dbo.Inventario i      ON i.idProducto = p.idProducto
    OUTER APPLY dbo.fn_PromocionVigente(p.idProducto, p.precioVigente, @ahora) pv
    OUTER APPLY (SELECT TOP (1) ip.url FROM dbo.ImagenProducto ip
                 WHERE ip.idProducto = p.idProducto ORDER BY ip.esPrincipal DESC, ip.idImagen) img
    WHERE c.idCliente = @idCliente AND c.activo = 1;

    SELECT @costoEnvio = z.tarifa
    FROM dbo.Direccion d
    JOIN dbo.ZonaEnvio z ON z.idZonaEnvio = d.idZonaEnvio
    WHERE d.idCliente = @idCliente AND d.activo = 1
      AND ((@idDireccion IS NOT NULL AND d.idDireccion = @idDireccion)
           OR (@idDireccion IS NULL AND d.esPrincipal = 1));

    SELECT idProducto, sku, nombreProducto, urlImagen, cantidad, precioVigente, descuentoUnitario,
           precioVigente - descuentoUnitario                AS precioFinal,
           cantidad * (precioVigente - descuentoUnitario)   AS subtotalLinea,
           nombrePromocion, existencia, disponible
    FROM #lineas
    ORDER BY nombreProducto;

    SELECT COUNT(*)                                        AS cantidadLineas,
           ISNULL(SUM(cantidad), 0)                        AS cantidadUnidades,
           ISNULL(SUM(cantidad * precioVigente), 0)        AS subtotal,
           ISNULL(SUM(cantidad * descuentoUnitario), 0)    AS descuentoTotal,
           ISNULL(@costoEnvio, 0)                          AS costoEnvio,
           ISNULL(SUM(cantidad * (precioVigente - descuentoUnitario)), 0)
             + CASE WHEN COUNT(*) > 0 THEN ISNULL(@costoEnvio, 0) ELSE 0 END AS total
    FROM #lineas;
END;
GO

/* =====================================================================
   7. PEDIDOS
   ===================================================================== */

/* CHECKOUT ATÓMICO
   Todo ocurre en una transacción: si algo falla, ROLLBACK y no queda nada.
   1. Cierra el carrito (bloqueo: un doble clic no crea dos pedidos).
   2. Calcula las líneas con precio, costo y descuento HISTÓRICOS.
   3. Descuenta existencias con un UPDATE condicional (existencia >= cantidad):
      si una sola línea no alcanza, se cancela todo. Como el UPDATE bloquea
      las filas de Inventario, dos compras simultáneas no pueden sobrevender.
   4. Registra encabezado, detalle, movimientos SALIDA, pago, envío e historial. */
CREATE OR ALTER PROCEDURE dbo.sp_Pedido_Confirmar
    @idCliente    INT,
    @idDireccion  INT,
    @idMetodoPago INT,
    @idPedido     INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @idUsuario INT, @idCarrito INT, @costoEnvio DECIMAL(12,2),
            @subtotal DECIMAL(12,2), @descuento DECIMAL(12,2), @total DECIMAL(12,2),
            @lineas INT, @actualizadas INT, @ahora DATETIME2 = SYSDATETIME(), @msg NVARCHAR(400);

    DECLARE @Lineas TABLE (
        idProducto        INT PRIMARY KEY,
        nombreProducto    NVARCHAR(150),
        activo            BIT,
        cantidad          INT,
        precioUnitario    DECIMAL(12,2),
        costoUnitario     DECIMAL(12,2),
        idPromocion       INT NULL,
        descuentoUnitario DECIMAL(12,2)
    );

    SET @idPedido = NULL;

    BEGIN TRY
        -- Validaciones previas
        SELECT @idUsuario = idUsuario FROM dbo.Cliente WHERE idCliente = @idCliente AND activo = 1;
        IF @idUsuario IS NULL
            THROW 50006, N'El cliente no existe o está inactivo.', 1;

        SELECT @costoEnvio = z.tarifa
        FROM dbo.Direccion d
        JOIN dbo.ZonaEnvio z ON z.idZonaEnvio = d.idZonaEnvio
        WHERE d.idDireccion = @idDireccion AND d.idCliente = @idCliente AND d.activo = 1;
        IF @costoEnvio IS NULL
            THROW 50008, N'La dirección de entrega no existe, está inactiva o no pertenece al cliente.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.MetodoPago WHERE idMetodoPago = @idMetodoPago AND activo = 1)
            THROW 50080, N'El método de pago no existe o está inactivo.', 1;

        EXEC sys.sp_set_session_context @key = N'idUsuario', @value = @idUsuario;

        BEGIN TRANSACTION;

        -- 1. Cerrar el carrito
        SELECT @idCarrito = idCarrito
        FROM dbo.Carrito WITH (UPDLOCK, HOLDLOCK)
        WHERE idCliente = @idCliente AND activo = 1;
        IF @idCarrito IS NULL
            THROW 50081, N'El cliente no tiene un carrito activo.', 1;

        UPDATE dbo.Carrito SET activo = 0 WHERE idCarrito = @idCarrito AND activo = 1;
        IF @@ROWCOUNT = 0
            THROW 50082, N'El carrito ya fue procesado por otra operación.', 1;

        -- 2. Líneas con valores históricos
        INSERT INTO @Lineas (idProducto, nombreProducto, activo, cantidad, precioUnitario, costoUnitario, idPromocion, descuentoUnitario)
        SELECT dc.idProducto, p.nombreProducto, p.activo, dc.cantidad, p.precioVigente, p.costo,
               pv.idPromocion, ISNULL(pv.descuentoUnitario, 0)
        FROM dbo.DetalleCarrito dc
        JOIN dbo.Producto p ON p.idProducto = dc.idProducto
        OUTER APPLY dbo.fn_PromocionVigente(p.idProducto, p.precioVigente, @ahora) pv
        WHERE dc.idCarrito = @idCarrito;
        SET @lineas = @@ROWCOUNT;

        IF @lineas = 0
            THROW 50083, N'El carrito está vacío.', 1;

        IF EXISTS (SELECT 1 FROM @Lineas WHERE activo = 0)
        BEGIN
            SELECT TOP (1) @msg = CONCAT(N'El producto "', nombreProducto, N'" ya no está a la venta.')
            FROM @Lineas WHERE activo = 0;
            THROW 50084, @msg, 1;
        END;

        -- 3. Descontar existencias: todas las líneas o ninguna
        UPDATE i
        SET i.existencia = i.existencia - l.cantidad,
            i.fechaActualizacion = @ahora
        FROM dbo.Inventario i WITH (ROWLOCK)
        JOIN @Lineas l ON l.idProducto = i.idProducto
        WHERE i.existencia >= l.cantidad;
        SET @actualizadas = @@ROWCOUNT;

        IF @actualizadas <> @lineas
            THROW 50085, N'Existencia insuficiente para uno o más productos. No se registró el pedido ni se modificó el inventario.', 1;

        -- 4. Registrar el pedido
        SELECT @subtotal  = SUM(cantidad * precioUnitario),
               @descuento = SUM(cantidad * descuentoUnitario)
        FROM @Lineas;
        SET @total = @subtotal - @descuento + @costoEnvio;

        INSERT INTO dbo.Pedido (idCliente, idDireccion, idEstado, fechaPedido, subtotal, descuentoTotal, costoEnvio, total)
        VALUES (@idCliente, @idDireccion, 1, @ahora, @subtotal, @descuento, @costoEnvio, @total);
        SET @idPedido = SCOPE_IDENTITY();

        INSERT INTO dbo.HistorialEstadoPedido (idPedido, idEstado, fecha) VALUES (@idPedido, 1, @ahora);

        INSERT INTO dbo.DetallePedido (idPedido, idProducto, idPromocion, cantidad, precioUnitario, costoUnitario, descuentoUnitario)
        SELECT @idPedido, idProducto, idPromocion, cantidad, precioUnitario, costoUnitario, descuentoUnitario
        FROM @Lineas;

        INSERT INTO dbo.MovimientoInventario (idProducto, idUsuario, idPedido, tipo, cantidad, fecha, motivo)
        SELECT idProducto, @idUsuario, @idPedido, N'SALIDA', cantidad, @ahora, CONCAT(N'Venta - pedido #', @idPedido)
        FROM @Lineas;

        IF @total > 0
            INSERT INTO dbo.Pago (idPedido, idMetodoPago, monto, estadoPago, referencia, fecha)
            VALUES (@idPedido, @idMetodoPago, @total, N'Aprobado',
                    CONCAT(N'PSN-PAG-', RIGHT(CONCAT(N'000000', @idPedido), 6), N'-',
                           LEFT(REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N''), 6)),
                    @ahora);

        INSERT INTO dbo.Envio (idPedido, transportista) VALUES (@idPedido, N'Correos de Costa Rica');

        -- Pago simulado aprobado: el pedido pasa de Pendiente a Confirmado
        UPDATE dbo.Pedido SET idEstado = 2 WHERE idPedido = @idPedido;
        INSERT INTO dbo.HistorialEstadoPedido (idPedido, idEstado) VALUES (@idPedido, 2);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @idPedido = NULL;
        THROW;
    END CATCH
END;
GO

/* CANCELACIÓN (solo antes del envío)
   El UPDATE solo cambia el estado si TransicionEstado permite pasar a Cancelado.
   Un segundo intento no encuentra la fila: falla y NO devuelve stock otra vez. */
CREATE OR ALTER PROCEDURE dbo.sp_Pedido_Cancelar
    @idPedido  INT,
    @idUsuario INT,
    @motivo    NVARCHAR(150) = N'Cancelación solicitada'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @estadoActual INT, @msg NVARCHAR(400);

    BEGIN TRY
        EXEC sys.sp_set_session_context @key = N'idUsuario', @value = @idUsuario;

        BEGIN TRANSACTION;

        UPDATE p SET p.idEstado = 6
        FROM dbo.Pedido p
        WHERE p.idPedido = @idPedido
          AND EXISTS (SELECT 1 FROM dbo.TransicionEstado t
                      WHERE t.idEstadoOrigen = p.idEstado AND t.idEstadoDestino = 6);

        IF @@ROWCOUNT = 0
        BEGIN
            SELECT @estadoActual = idEstado FROM dbo.Pedido WHERE idPedido = @idPedido;
            SET @msg = CASE WHEN @estadoActual IS NULL THEN N'El pedido no existe.'
                            WHEN @estadoActual = 6     THEN N'El pedido ya estaba cancelado. No se devolvió inventario de nuevo.'
                            ELSE N'El pedido ya fue enviado o entregado y no se puede cancelar.' END;
            THROW 50050, @msg, 1;
        END;

        -- Devolver existencias (una sola vez, porque el estado ya es Cancelado)
        UPDATE i
        SET i.existencia = i.existencia + d.cantidad,
            i.fechaActualizacion = SYSDATETIME()
        FROM dbo.Inventario i
        JOIN dbo.DetallePedido d ON d.idProducto = i.idProducto
        WHERE d.idPedido = @idPedido;

        INSERT INTO dbo.MovimientoInventario (idProducto, idUsuario, idPedido, tipo, cantidad, motivo)
        SELECT d.idProducto, @idUsuario, @idPedido, N'ENTRADA', d.cantidad,
               LEFT(CONCAT(N'Devolución por cancelación - pedido #', @idPedido, N'. ', @motivo), 200)
        FROM dbo.DetallePedido d
        WHERE d.idPedido = @idPedido;

        INSERT INTO dbo.HistorialEstadoPedido (idPedido, idEstado) VALUES (@idPedido, 6);

        UPDATE dbo.Pago SET estadoPago = N'Reembolsado'
        WHERE idPedido = @idPedido AND estadoPago = N'Aprobado';

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

/* CAMBIO DE ESTADO: valida la transición contra TransicionEstado.
   Pasar a Cancelado se delega a sp_Pedido_Cancelar (devuelve el stock). */
CREATE OR ALTER PROCEDURE dbo.sp_Pedido_CambiarEstado
    @idPedido      INT,
    @idEstadoNuevo INT,
    @idUsuario     INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @idEstadoActual INT, @msg NVARCHAR(400);

    IF @idEstadoNuevo = 6
    BEGIN
        EXEC dbo.sp_Pedido_Cancelar @idPedido = @idPedido, @idUsuario = @idUsuario,
                                    @motivo = N'Cancelado por el administrador';
        RETURN;
    END;

    BEGIN TRY
        EXEC sys.sp_set_session_context @key = N'idUsuario', @value = @idUsuario;

        BEGIN TRANSACTION;

        SELECT @idEstadoActual = idEstado
        FROM dbo.Pedido WITH (UPDLOCK, ROWLOCK)
        WHERE idPedido = @idPedido;

        IF @idEstadoActual IS NULL
            THROW 50040, N'El pedido no existe.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.TransicionEstado
                       WHERE idEstadoOrigen = @idEstadoActual AND idEstadoDestino = @idEstadoNuevo)
        BEGIN
            SELECT @msg = CONCAT(N'Transición de estado inválida: de "', eo.nombreEstadoPedido, N'" a "',
                                 ISNULL(ed.nombreEstadoPedido, N'(estado inexistente)'), N'".')
            FROM dbo.EstadoPedido eo
            LEFT JOIN dbo.EstadoPedido ed ON ed.idEstado = @idEstadoNuevo
            WHERE eo.idEstado = @idEstadoActual;
            THROW 50041, @msg, 1;
        END;

        UPDATE dbo.Pedido SET idEstado = @idEstadoNuevo WHERE idPedido = @idPedido;
        INSERT INTO dbo.HistorialEstadoPedido (idPedido, idEstado) VALUES (@idPedido, @idEstadoNuevo);

        IF @idEstadoNuevo = 4       -- Enviado: se genera la guía simulada
            UPDATE dbo.Envio
            SET numeroGuia = CONCAT(N'PSN', RIGHT(CONCAT(N'000000', @idPedido), 6), N'CR'),
                fechaEnvio = SYSDATETIME()
            WHERE idPedido = @idPedido;

        IF @idEstadoNuevo = 5       -- Entregado
            UPDATE dbo.Envio SET fechaEntrega = SYSDATETIME() WHERE idPedido = @idPedido;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- Historial de pedidos de un cliente
CREATE OR ALTER PROCEDURE dbo.sp_Pedido_ListarPorCliente
    @idCliente INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.idPedido, p.fechaPedido, p.idEstado, e.nombreEstadoPedido,
           (SELECT COUNT(*) FROM dbo.DetallePedido d WHERE d.idPedido = p.idPedido) AS cantidadLineas,
           p.subtotal, p.descuentoTotal, p.costoEnvio, p.total,
           CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.TransicionEstado t
                                  WHERE t.idEstadoOrigen = p.idEstado AND t.idEstadoDestino = 6)
                     THEN 1 ELSE 0 END AS BIT) AS sePuedeCancelar
    FROM dbo.Pedido p
    JOIN dbo.EstadoPedido e ON e.idEstado = p.idEstado
    WHERE p.idCliente = @idCliente
    ORDER BY p.fechaPedido DESC;
END;
GO

-- Detalle completo (también sirve para imprimir el pedido a PDF):
-- 1) encabezado  2) líneas con precio histórico  3) historial de estados
-- Si se envía @idCliente, se verifica que el pedido le pertenezca.
CREATE OR ALTER PROCEDURE dbo.sp_Pedido_ObtenerDetalle
    @idPedido  INT,
    @idCliente INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Pedido
                   WHERE idPedido = @idPedido AND (@idCliente IS NULL OR idCliente = @idCliente))
        THROW 50040, N'El pedido no existe o no pertenece al cliente.', 1;

    SELECT p.idPedido, p.fechaPedido, e.nombreEstadoPedido,
           c.idCliente, CONCAT(c.nombreCliente, N' ', c.apellidos) AS cliente, u.correo, c.telefono,
           CONCAT(d.lineaDireccion, N', ', d.ciudad, N', ', d.provincia) AS direccionEntrega,
           z.nombreZonaEnvio,
           p.subtotal, p.descuentoTotal, p.costoEnvio, p.total,
           mp.nombreMetodoPago, pa.estadoPago, pa.referencia AS referenciaPago,
           en.transportista, en.numeroGuia, en.fechaEnvio, en.fechaEntrega
    FROM dbo.Pedido p
    JOIN dbo.EstadoPedido e  ON e.idEstado = p.idEstado
    JOIN dbo.Cliente c       ON c.idCliente = p.idCliente
    JOIN dbo.Usuario u       ON u.idUsuario = c.idUsuario
    JOIN dbo.Direccion d     ON d.idDireccion = p.idDireccion
    JOIN dbo.ZonaEnvio z     ON z.idZonaEnvio = d.idZonaEnvio
    LEFT JOIN dbo.Pago pa    ON pa.idPedido = p.idPedido
    LEFT JOIN dbo.MetodoPago mp ON mp.idMetodoPago = pa.idMetodoPago
    LEFT JOIN dbo.Envio en   ON en.idPedido = p.idPedido
    WHERE p.idPedido = @idPedido;

    SELECT dp.idProducto, pr.sku, pr.nombreProducto, dp.cantidad,
           dp.precioUnitario, dp.descuentoUnitario,
           dp.precioUnitario - dp.descuentoUnitario                 AS precioFinal,
           dp.cantidad * (dp.precioUnitario - dp.descuentoUnitario) AS totalLinea,
           pm.nombrePromocion
    FROM dbo.DetallePedido dp
    JOIN dbo.Producto pr      ON pr.idProducto = dp.idProducto
    LEFT JOIN dbo.Promocion pm ON pm.idPromocion = dp.idPromocion
    WHERE dp.idPedido = @idPedido
    ORDER BY pr.nombreProducto;

    SELECT h.fecha, e.nombreEstadoPedido
    FROM dbo.HistorialEstadoPedido h
    JOIN dbo.EstadoPedido e ON e.idEstado = h.idEstado
    WHERE h.idPedido = @idPedido
    ORDER BY h.fecha, h.idHistorial;
END;
GO

/* =====================================================================
   8. INVENTARIO
   ===================================================================== */

/* Entradas, salidas y ajustes manuales. ENTRADA/SALIDA usan cantidad positiva;
   AJUSTE usa el signo (positivo suma, negativo resta). Nunca deja existencia negativa. */
CREATE OR ALTER PROCEDURE dbo.sp_Inventario_RegistrarMovimiento
    @idProducto   INT,
    @tipo         NVARCHAR(10),
    @cantidad     INT,
    @idUsuario    INT,
    @motivo       NVARCHAR(200),
    @idMovimiento INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @delta INT;
    SET @idMovimiento = NULL;

    BEGIN TRY
        SET @tipo = UPPER(LTRIM(RTRIM(@tipo)));

        IF @tipo NOT IN (N'ENTRADA', N'SALIDA', N'AJUSTE')
            THROW 50060, N'El tipo de movimiento debe ser ENTRADA, SALIDA o AJUSTE.', 1;
        IF (@tipo IN (N'ENTRADA', N'SALIDA') AND (@cantidad IS NULL OR @cantidad <= 0))
           OR (@tipo = N'AJUSTE' AND (@cantidad IS NULL OR @cantidad = 0))
            THROW 50061, N'Cantidad inválida: ENTRADA y SALIDA requieren un valor positivo; AJUSTE, distinto de cero.', 1;
        IF NULLIF(LTRIM(RTRIM(@motivo)), N'') IS NULL
            THROW 50062, N'El motivo del movimiento es obligatorio.', 1;

        SET @delta = CASE @tipo WHEN N'SALIDA' THEN -@cantidad ELSE @cantidad END;

        BEGIN TRANSACTION;

        UPDATE dbo.Inventario
        SET existencia = existencia + @delta,
            fechaActualizacion = SYSDATETIME()
        WHERE idProducto = @idProducto
          AND existencia + @delta >= 0;

        IF @@ROWCOUNT = 0
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM dbo.Inventario WHERE idProducto = @idProducto)
                THROW 50063, N'El producto no existe.', 1;
            THROW 50064, N'El movimiento dejaría la existencia en negativo. No se registró.', 1;
        END;

        INSERT INTO dbo.MovimientoInventario (idProducto, idUsuario, tipo, cantidad, motivo)
        VALUES (@idProducto, @idUsuario, @tipo, @cantidad, LTRIM(RTRIM(@motivo)));
        SET @idMovimiento = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @idMovimiento = NULL;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Inventario_Listar
    @texto          NVARCHAR(100) = NULL,
    @soloBajoMinimo BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @patron NVARCHAR(102) =
        CASE WHEN NULLIF(LTRIM(RTRIM(@texto)), N'') IS NULL THEN NULL
             ELSE CONCAT(N'%', LTRIM(RTRIM(@texto)), N'%') END;

    SELECT p.idProducto, p.sku, p.nombreProducto, m.nombreMarca, c.nombreCategoria,
           i.existencia, p.stockMinimo,
           CASE WHEN i.existencia < p.stockMinimo THEN p.stockMinimo - i.existencia ELSE 0 END AS unidadesFaltantes,
           CAST(CASE WHEN i.existencia < p.stockMinimo THEN 1 ELSE 0 END AS BIT) AS bajoMinimo,
           i.fechaActualizacion, p.activo
    FROM dbo.Producto p
    JOIN dbo.Inventario i ON i.idProducto = p.idProducto
    JOIN dbo.Marca m      ON m.idMarca = p.idMarca
    JOIN dbo.Categoria c  ON c.idCategoria = p.idCategoria
    WHERE (@soloBajoMinimo = 0 OR i.existencia < p.stockMinimo)
      AND (@patron IS NULL OR p.nombreProducto LIKE @patron OR p.sku LIKE @patron)
    ORDER BY CASE WHEN i.existencia < p.stockMinimo THEN 0 ELSE 1 END, p.nombreProducto;
END;
GO

-- Alerta para la aplicación: productos activos bajo el mínimo
CREATE OR ALTER PROCEDURE dbo.sp_Inventario_AlertaBajoMinimo
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.idProducto, p.sku, p.nombreProducto, i.existencia, p.stockMinimo,
           p.stockMinimo - i.existencia AS unidadesFaltantes
    FROM dbo.Producto p
    JOIN dbo.Inventario i ON i.idProducto = p.idProducto
    WHERE p.activo = 1 AND i.existencia < p.stockMinimo
    ORDER BY i.existencia, p.nombreProducto;
END;
GO

-- Kardex de un producto con saldo acumulado (función de ventana)
CREATE OR ALTER PROCEDURE dbo.sp_Inventario_Movimientos
    @idProducto INT,
    @desde      DATE = NULL,
    @hasta      DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT x.idMovimiento, x.fecha, x.tipo, x.cantidad, x.efecto, x.saldo,
           x.motivo, x.idPedido, x.usuario
    FROM (
        SELECT m.idMovimiento, m.fecha, m.tipo, m.cantidad,
               CASE m.tipo WHEN N'SALIDA' THEN -m.cantidad ELSE m.cantidad END AS efecto,
               SUM(CASE m.tipo WHEN N'SALIDA' THEN -m.cantidad ELSE m.cantidad END)
                   OVER (ORDER BY m.fecha, m.idMovimiento ROWS UNBOUNDED PRECEDING) AS saldo,
               m.motivo, m.idPedido, u.correo AS usuario
        FROM dbo.MovimientoInventario m
        JOIN dbo.Usuario u ON u.idUsuario = m.idUsuario
        WHERE m.idProducto = @idProducto
    ) x
    WHERE (@desde IS NULL OR x.fecha >= @desde)
      AND (@hasta IS NULL OR x.fecha < DATEADD(DAY, 1, @hasta))
    ORDER BY x.fecha, x.idMovimiento;
END;
GO

/* =====================================================================
   9. RESEÑAS
   Regla: una por cliente y producto (UNIQUE) y solo de productos que el
   cliente compró y recibió (pedido Entregado).
   ===================================================================== */

CREATE OR ALTER PROCEDURE dbo.sp_Resena_Crear
    @idCliente    INT,
    @idProducto   INT,
    @calificacion TINYINT,
    @comentario   NVARCHAR(500) = NULL,
    @idResena     INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @idResena = NULL;
    BEGIN TRY
        IF @calificacion IS NULL OR @calificacion NOT BETWEEN 1 AND 5
            THROW 50090, N'La calificación debe estar entre 1 y 5.', 1;

        IF NOT EXISTS (SELECT 1
                       FROM dbo.Pedido p
                       JOIN dbo.DetallePedido d ON d.idPedido = p.idPedido
                       WHERE p.idCliente = @idCliente AND d.idProducto = @idProducto AND p.idEstado = 5)
            THROW 50091, N'Solo puede reseñar productos que compró y ya recibió.', 1;

        INSERT INTO dbo.Resena (idCliente, idProducto, calificacion, comentario)
        VALUES (@idCliente, @idProducto, @calificacion, NULLIF(LTRIM(RTRIM(@comentario)), N''));
        SET @idResena = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        SET @idResena = NULL;
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50001, N'Ya existe una reseña suya para este producto (restricción UQ_Resena_ClienteProducto).', 1;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Resena_ListarPorProducto
    @idProducto INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT r.idResena, r.idCliente, CONCAT(c.nombreCliente, N' ', LEFT(c.apellidos, 1), N'.') AS cliente,
           r.calificacion, r.comentario, r.fecha
    FROM dbo.Resena r
    JOIN dbo.Cliente c ON c.idCliente = r.idCliente
    WHERE r.idProducto = @idProducto
    ORDER BY r.fecha DESC;
END;
GO

/* =====================================================================
   10. SEGURIDAD: USUARIO DE LA APLICACIÓN (mínimo privilegio)
   La aplicación se conecta con este login, que SOLO puede ejecutar
   procedimientos del esquema dbo: no puede leer ni modificar tablas directo
   (los procedimientos sí, por encadenamiento de propiedad).
   La contraseña es de DEMOSTRACIÓN: cámbienla y no la suban a Git;
   la app la lee de su archivo de configuración local.
   Requiere que SQL Server tenga activada la autenticación mixta.
   ===================================================================== */
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'app_petshop')
    CREATE LOGIN app_petshop
        WITH PASSWORD = N'Cambiar_Esta_Clave_2026!',
             DEFAULT_DATABASE = PetShopNova,
             CHECK_POLICY = ON;
GO

USE PetShopNova;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'app_petshop')
    CREATE USER app_petshop FOR LOGIN app_petshop;

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'rol_aplicacion' AND type = 'R')
    CREATE ROLE rol_aplicacion;

GRANT EXECUTE ON SCHEMA::dbo TO rol_aplicacion;   -- cubre también los reportes de 06_reportes.sql
ALTER ROLE rol_aplicacion ADD MEMBER app_petshop;
GO

PRINT N'03_procedimientos.sql ejecutado correctamente.';
GO
