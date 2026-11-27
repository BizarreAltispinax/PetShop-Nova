# Backend de PetShop Nova

API en Node.js + Express. **Cada endpoint ejecuta un procedimiento almacenado** de
`sql/03_procedimientos.sql` con parámetros tipados (`mssql`); no hay SQL armado con texto.
Todo corre en la máquina local: SQL Server en `localhost` y la API en `http://localhost:4000`.

## Preparar SQL Server (una sola vez por computadora)

1. **Autenticación mixta**: en SSMS, clic derecho sobre el servidor → Propiedades → Seguridad →
   "Modo de autenticación de SQL Server y de Windows". Reiniciar el servicio.
2. **TCP/IP activado**: Administrador de configuración de SQL Server → Configuración de red →
   Protocolos de MSSQLSERVER → TCP/IP → Habilitar. Reiniciar el servicio.
   (Con instancia predeterminada escucha en el puerto 1433.)
3. Ejecutar en SSMS, en orden: `sql/01_esquema.sql` … `06_reportes.sql`.
   El `03` crea el login `app_petshop` (solo puede ejecutar procedimientos).
   Desde la línea de comandos: `sqlcmd -S localhost -E -C -I -f 65001 -i sql_esquema.sql` (y así cada uno).
   **`-I` es obligatorio** con sqlcmd: activa QUOTED_IDENTIFIER, que exigen los índices filtrados.

## Correr la API

```
cd backend
copy .env.example .env      (revisar los valores)
npm install
npm start                   (o npm run dev: se reinicia al guardar)
```

`GET http://localhost:4000/api/salud` dice si hay conexión con la base.

Si existe `frontend/dist` (`npm run build` en `frontend`), la API también sirve la página
en la misma dirección: con la API encendida, la tienda queda en `http://localhost:4000`.

## Contraseñas

La BD solo guarda el hash bcrypt. Todos los usuarios de prueba de `02_datos.sql`
(`admin@petshopnova.cr` y los `*@correo-demo.cr`) usan la contraseña **`Nova12345`**.
Para generar otro hash con la misma biblioteca: `npm run hash -- "OtraClave"`.

## Sesión y roles

`POST /api/auth/login` devuelve un token. Las demás rutas protegidas lo reciben en
`Authorization: Bearer <token>`. El rol se valida en el servidor:

- `/api/mi/...` solo clientes; el `idCliente` sale del token, nunca de la petición.
- `/api/admin/...` solo administradores.

Errores de negocio de los SP (`THROW 50001-50099`) → **400** con el mensaje en español.
Si SQL Server rechaza un dato por una restricción (CHECK/FK 547, UNIQUE 2601/2627), también → **400**
con el nombre de la restricción (por ejemplo `CK_Cliente_FechaNac`).

## Endpoints

| Ruta | Procedimiento |
|---|---|
| `POST /api/auth/login` | sp_Usuario_ObtenerPorCorreo + bcrypt |
| `POST /api/auth/registro` | sp_Cliente_Registrar |
| `GET /api/auth/yo` · `PUT /api/auth/password` | sp_Usuario_ObtenerPorCorreo · sp_Usuario_CambiarPassword |
| `GET /api/marcas` · `/categorias` · `/especies` · `/zonas-envio` · `/metodos-pago` · `/promociones` | *_Listar |
| `GET /api/productos` (texto, idMarca, idCategoria, idEspecie, precioMin, precioMax, destacados, ofertas) | sp_Producto_Buscar |
| `GET /api/productos/:id` · `/:id/resenas` | sp_Producto_ObtenerDetalle · sp_Resena_ListarPorProducto |
| `GET/PUT /api/mi/perfil` | sp_Cliente_Obtener · sp_Cliente_Actualizar |
| `GET/POST /api/mi/direcciones` · `PUT/DELETE /api/mi/direcciones/:id` | sp_Direccion_* |
| `GET/POST /api/mi/carrito` · `PUT/DELETE /api/mi/carrito/:idProducto` | sp_Carrito_* |
| `POST /api/mi/pedidos` | **sp_Pedido_Confirmar** (checkout atómico) |
| `GET /api/mi/pedidos` · `/:id` · `POST /:id/cancelar` | sp_Pedido_ListarPorCliente · ObtenerDetalle · Cancelar |
| `POST /api/mi/resenas` | sp_Resena_Crear |
| `/api/admin/clientes` (buscar, ver, `POST` alta, `PUT :id` edición, `PATCH :id/estado`, pedidos, direcciones) | sp_Cliente_* (alta con sp_Cliente_Registrar) |
| `/api/admin/marcas` · `/categorias` · `/especies` (listar, crear, actualizar) | sp_Marca_* · sp_Categoria_* |
| `/api/admin/productos` (listar, ver, crear, actualizar, `ajustar-precio`, `:id/imagenes`) | sp_Producto_* · sp_ImagenProducto_Agregar |
| `PUT /api/admin/productos/:id/especies` `{ especies: [1, 2] }` | sp_Producto_AsignarEspecies |
| `/api/admin/promociones` (listar, crear, actualizar, `:id/productos`, asignar/quitar producto) | sp_Promocion_* |
| `GET /api/admin/pedidos` (idEstado, desde, hasta, cliente) | sp_R10_ResumenPedidos |
| `/api/admin/pedidos/:id` · `/:id/transiciones` · `PATCH :id/estado` · `POST :id/cancelar` | sp_Pedido_* · sp_Pedido_TransicionesValidas |
| `/api/admin/inventario` · `/alertas` · `POST /movimientos` · `/:idProducto/movimientos` | sp_Inventario_* |
| `/api/admin/reportes/R01`…`R10` (filtros por query) | sp_R01…sp_R10 (`src/reportes.js`) |
| `/api/admin/dashboard` · `/api/admin/auditoria` | sp_Dashboard_Indicadores · sp_Auditoria_Listar |
