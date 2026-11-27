# PetShop Nova — Proyecto Programado II (Bases de Datos)

## ⚠️ Regla de trabajo (leer primero)

**No hagas nada por iniciativa propia.** Al abrir una sesión, no modifiques, crees ni borres
archivos, ni ejecutes comandos que cambien algo (`npm install`, scripts SQL, `git commit`,
formateadores, etc.) hasta que el usuario lo pida explícitamente.

- Puedes leer archivos para responder preguntas.
- Cuando el usuario pida un cambio, haz **solo** ese cambio. Si el cambio es grande o toca
  varios archivos, primero describe el plan en pocas líneas y espera su confirmación.
- No "aproveches" para corregir otras cosas que veas: menciónalas y espera.
- **Nunca hagas commits.** Todos los cambios quedan locales; el usuario se encarga de los commits.
- Trabaja directamente en la carpeta principal del proyecto (`PetShop-Nova`), no en un worktree:
  el usuario dio permiso para escribir en todas las carpetas del proyecto.
- Responde en español.

---

## Qué es el proyecto

Proyecto de curso de Bases de Datos: un sistema de comercio electrónico para una tienda ficticia
de artículos para mascotas en Costa Rica (perros, gatos, roedores, peces, aves y reptiles;
no vende animales) (**PetShop Nova**). Montos en colones (₡).

- **Motor obligatorio: Microsoft SQL Server** (se usa SSMS 22). No se acepta otro motor.
- Equipos de hasta 4 personas. Lenguaje de la aplicación libre (aquí: frontend en React +
  TypeScript y backend en Node.js con JavaScript).
- **Todo corre en local**, sin hosting: SQL Server en `localhost` y la API en
  `http://localhost:4000`. Donde esté la carpeta del proyecto se debe poder ejecutar la página.
- **Entrega y defensa: 4 de diciembre de 2026** (confirmar con el profesor; la fecha viene de
  una versión anterior del enunciado).
- La especificación completa está en `docs/Especificacion_Proyecto_II.pdf`.

### Puntos clave de la especificación
- 80 de 100 puntos son de SQL Server: diseño (15), esquema e integridad (15), procedimientos (15),
  transacciones y reglas críticas (15), consultas y reportes (15), triggers (5).
  Aplicación y evidencias: 20.
- **Toda lectura y escritura de la aplicación debe pasar por procedimientos almacenados.**
  Prohibido concatenar SQL dinámico con entradas del usuario.
- **No duplicar en la interfaz las reglas críticas de negocio.** No hay puntos por funciones
  "solo simuladas en pantalla sin persistencia".
- Mínimo privilegio y sin credenciales administrativas en el código.
- Exportación a CSV/Excel de al menos 2 reportes y a PDF/impresión de un pedido.
- Contraseñas: solo el hash (bcrypt en la aplicación), nunca texto plano.
- Entregables: PDF de documentación, carpeta `sql/` con `01`…`07` ejecutables en orden sin
  correcciones manuales, código de la app, README, repositorio Git con commits de todos.
- En la defensa cada integrante explica una parte del modelo, un procedimiento y un reporte.

---

## Estructura del repositorio

```
CLAUDE.md
.gitignore
docs/
  Especificacion_Proyecto_II.pdf          enunciado oficial
sql/
  01_esquema.sql        base, 27 tablas, constraints, índices (re-ejecutable: borra y crea)
  02_datos.sql          datos de prueba conciliados
  03_procedimientos.sql 52 procedimientos + fn_PromocionVigente + login app_petshop
  04_vistas.sql         4 vistas
  05_triggers.sql       2 triggers de auditoría multi-fila
  06_reportes.sql       sp_R01…sp_R10, sp_Dashboard_Indicadores, sp_Auditoria_Listar
  (pendiente) 07_pruebas.sql
  docs/
    Diccionario_de_datos_-_Proyecto_Programado_II.docx
    Diagrama_ER.drawio
backend/                API Node.js + Express 5 (JavaScript, ES modules) — ver backend/README.md
  src/server.js         arranque, rutas, sirve frontend/dist si existe
  src/config.js         lee backend/.env (plantilla: .env.example; .env no se versiona)
  src/db.js             ejecutar(procedimiento, entradas, salidas): solo SP con parámetros tipados
  src/auth.js           JWT, requiereSesion / requiereAdmin / requiereCliente
  src/errores.js        convertidores de parámetros y manejador de errores
  src/reportes.js       mapa R01–R10 -> SP de 06_reportes.sql y sus parámetros
  src/routes/           auth.js, catalogo.js (público), cliente.js (/api/mi), admin.js (/api/admin)
  scripts/generar-hash.js  npm run hash -- "clave"  -> hash bcrypt para 02_datos.sql
frontend/               React 19 + Vite + Tailwind (diseño original de Google AI Studio)
  src/api/client.ts     fetch a /api con el token; ApiError con el mensaje del SP
  src/hooks/useApi.ts   useApi(ruta, filtros) -> { datos, cargando, error, recargar }
  src/store/db.tsx      estado global mínimo: sesión, catálogos, carrito (de la BD), avisos
  src/types.ts          tipos = columnas que devuelven los SP
  src/routing.ts        rutas <-> URL (/producto/12, /admin/pedidos/38, /buscar?texto=...); historial del navegador
```

## Cómo se ejecuta (todo local)

1. SQL Server con autenticación mixta y TCP/IP (puerto 1433) activados.
2. Ejecutar `sql/01` … `06` en orden (SSMS, o `sqlcmd -S localhost -E -C -I -f 65001 -i <archivo>`;
   **`-I` es obligatorio** en sqlcmd: los índices filtrados requieren QUOTED_IDENTIFIER ON).
3. `backend`: copiar `.env.example` a `.env`, `npm install`, `npm start` -> http://localhost:4000.
4. `frontend`: `npm install`, `npm run build` (la API sirve `frontend/dist`).
   Para desarrollar: `npm run dev` (http://localhost:3000, con proxy de /api al puerto 4000).
5. Nombre propio: `http://petshopnova.localhost` (con `PORT=80` en `backend/.env`; no requiere `hosts`).
   Edge/Chrome bloquean dominios públicos (.cr, .shop, .com) que apunten a 127.0.0.1: no usar esos.
6. Cuentas de prueba: `admin@petshopnova.cr` y `*@correo-demo.cr`, contraseña `Nova12345`.

Siete SP que validan `@@ROWCOUNT` después de un UPDATE (`sp_Cliente_Actualizar`, `sp_Usuario_CambiarPassword`,
`sp_Direccion_Desactivar`, `sp_Promocion_Actualizar`, `sp_Promocion_QuitarProducto`, `sp_Carrito_CambiarCantidad`,
`sp_Carrito_EliminarLinea`) tienen `SET XACT_ABORT ON`: sin eso, un CHECK fallido seguía al chequeo y daba un mensaje
equivocado ("no existe").

Los scripts `01`…`06` se ejecutaron completos en SQL Server 2025 (17.0, instancia MSSQLSERVER de
esta computadora) el 2026-11-27. Error corregido: en `sp_Pedido_Confirmar` la variable entera
`@lineas` chocaba con la tabla `@Lineas` (T-SQL no distingue mayúsculas); ahora es `@cantidadLineas`.

---

## Estado actual

| Pieza | Estado |
|---|---|
| Diccionario de datos y diagrama ER | Listos (corregidos) |
| `01_esquema.sql` a `06_reportes.sql` | Ejecutados y probados en SQL Server |
| `07_pruebas.sql` | **Pendiente** |
| Backend | Listo y probado contra la BD con `app_petshop` |
| Frontend | Conectado a la API: sin datos simulados ni reglas de negocio en el navegador |
| README raíz (manual de instalación, ejecución y demostración) | Listo |
| Documento PDF (`docs/Documentacion_Tecnica_PetShop_Nova.pdf`) | Listo (29 páginas) |
| Capturas de evidencia y commits de todos | Pendientes |

---

## Base de datos: decisiones de diseño

- **Nombres:** tablas en PascalCase (`ZonaEnvio`), columnas en camelCase (`idZonaEnvio`),
  cada FK se llama igual que la PK a la que apunta. Constraints con nombre:
  `PK_`, `FK_`, `UQ_`, `CK_`, `DF_`, `IX_` (índice), `UX_` (índice único filtrado).
- **PK con `IDENTITY(1,1)`**, excepto `Rol` y `EstadoPedido`, que tienen IDs fijos:
  - Rol: 1 Administrador, 2 Cliente.
  - EstadoPedido: 1 Pendiente, 2 Confirmado, 3 En preparación, 4 Enviado, 5 Entregado, 6 Cancelado.
  - TransicionEstado: (1→2), (2→3), (3→4), (4→5) y cancelación (1→6), (2→6), (3→6).
- **Valores históricos:** `DetallePedido` copia `precioUnitario`, `costoUnitario` y
  `descuentoUnitario` al confirmar; los reportes usan esos valores, nunca el precio actual.
- **Desnormalización justificada:** `Pedido.subtotal`, `descuentoTotal` y `total` son derivados;
  `CK_Pedido_Total` exige `total = subtotal - descuentoTotal + costoEnvio`.
- **Promociones:** no se acumulan; se aplica la de mayor descuento (`fn_PromocionVigente`).
  Tipo `'P'` (porcentaje, máx. 100) o `'M'` (monto). El descuento nunca supera el precio.
  Se eliminó la columna `combinable`.
- **Inventario:** `existencia = SUM(movimientos)` (ENTRADA suma, SALIDA resta, AJUSTE usa su signo).
  `CK_MovimientoInventario_Cantidad`: ENTRADA/SALIDA > 0, AJUSTE ≠ 0. Existencia nunca negativa.
- **Envío:** la fila se crea al confirmar; `numeroGuia` (formato `PSN000039CR`) y `fechaEnvio` se
  llenan al pasar a Enviado; `fechaEntrega` al pasar a Entregado.
- **Direcciones:** si una dirección ya se usó en un pedido, editarla la desactiva y crea una nueva.
- **Eliminación lógica** con `activo`; ninguna FK usa cascada.
- **Índices únicos filtrados:** un carrito activo por cliente, una dirección principal activa por
  cliente, una imagen principal por producto, `numeroGuia` único si no es NULL.
- **Auditoría (`AuditoriaCambio`, sin FK):** la llenan `TR_Producto_AuditoriaPrecio` (precio y costo)
  y `TR_Pedido_AuditoriaEstado`. Guardan `usuarioBd = SUSER_SNAME()` e `idUsuarioApp`, leído de
  `SESSION_CONTEXT(N'idUsuario')`, que los SP establecen con `sp_set_session_context`.

## Especies (agregado el 27/11/2026)

- Tablas `Especie` (Perros, Gatos, Roedores y pequeños mamíferos, Peces, Aves, Reptiles) y `ProductoEspecie`
  (muchos a muchos, PK compuesta; índice `IX_ProductoEspecie_Especie`). La tienda no vende animales.
- SPs: `sp_Especie_Crear|Actualizar|Listar`, `sp_Producto_AsignarEspecies` (lista de ids separada por comas,
  STRING_SPLIT, transacción; exige al menos una), `sp_Producto_Buscar @idEspecie`, y el 4.º resultado de
  `sp_Producto_ObtenerDetalle`.
- Diagrama ER (`sql/docs/Diagrama_ER.drawio`) y PDF actualizados. El `.docx` del diccionario del equipo NO:
  las dos tablas nuevas solo están en el PDF.

## Procedimientos (`03_procedimientos.sql`)

Errores de negocio: `THROW` 50001–50099 con mensaje en español listo para mostrar.
50001 = duplicado rechazado por una restricción UNIQUE (el SP traduce el error 2601/2627).

- Usuarios/clientes: `sp_Usuario_ObtenerPorCorreo` (devuelve el hash; la app verifica con bcrypt),
  `sp_Usuario_CambiarPassword`, `sp_Cliente_Registrar` (OUTPUT), `sp_Cliente_Actualizar`,
  `sp_Cliente_CambiarEstado`, `sp_Cliente_Obtener`, `sp_Cliente_Buscar`.
- Direcciones y catálogos: `sp_Direccion_Crear` (OUTPUT), `sp_Direccion_Actualizar` (OUTPUT),
  `sp_Direccion_Desactivar`, `sp_Direccion_Listar`, `sp_ZonaEnvio_Listar`, `sp_MetodoPago_Listar`.
- Marcas/categorías: `sp_Marca_Crear|Actualizar|Listar`, `sp_Categoria_Crear|Actualizar|Listar`.
- Productos: `sp_Producto_Crear` (OUTPUT, crea inventario e imagen), `sp_Producto_Actualizar`,
  `sp_Producto_AjustarPrecioPorCategoria` (varias filas: demuestra el trigger),
  `sp_Producto_Buscar` (texto, marca, categoría, rango de precio, destacados, ofertas),
  `sp_Producto_ObtenerDetalle` (4 resultados: datos, imágenes, reseñas), `sp_ImagenProducto_Agregar`.
- Promociones: `sp_Promocion_Crear|Actualizar|AsignarProducto|QuitarProducto|Listar`.
- Carrito (persistente en BD): `sp_Carrito_ObtenerActivo`, `sp_Carrito_AgregarProducto`,
  `sp_Carrito_CambiarCantidad`, `sp_Carrito_EliminarLinea`, `sp_Carrito_Ver` (líneas + resumen).
- Pedidos: **`sp_Pedido_Confirmar`** (checkout atómico, `@idPedido OUTPUT`; descuenta stock con un
  UPDATE condicional `existencia >= cantidad` y compara filas afectadas: todo o nada, sin
  sobreventa), **`sp_Pedido_Cancelar`** (solo antes de Enviado; un segundo intento falla y no
  devuelve stock), **`sp_Pedido_CambiarEstado`** (valida contra TransicionEstado),
  `sp_Pedido_ListarPorCliente`, `sp_Pedido_ObtenerDetalle` (3 resultados; sirve para imprimir).
- Inventario: `sp_Inventario_RegistrarMovimiento` (OUTPUT), `sp_Inventario_Listar`,
  `sp_Inventario_AlertaBajoMinimo`, `sp_Inventario_Movimientos` (kardex con saldo acumulado).
- Reseñas: `sp_Resena_Crear` (solo si compró y recibió; una por cliente y producto),
  `sp_Resena_ListarPorProducto`.
- Seguridad (final del archivo): login `app_petshop` + rol `rol_aplicacion` con
  `GRANT EXECUTE ON SCHEMA::dbo` y sin permisos sobre tablas. Requiere autenticación mixta.

Vistas (`04_vistas.sql`): `vw_CatalogoDisponible`, `vw_ExistenciasBajas`,
`vw_VentasDetalle` (excluye cancelados, importes históricos; base de los reportes),
`vw_ResumenPedidos`.

## Datos de prueba (`02_datos.sql`)

- Se ejecuta antes de los SP y triggers, así que usa INSERT directos con IDs explícitos.
  Al final hay una consulta de verificación que debe devolver 0 diferencias.
- 14 marcas ficticias, 14 categorías, 6 especies, 70 productos (SKU `PSN-001`…`PSN-070`; del 51 al 70 son
  de roedores, peces, aves y reptiles), 1 admin
  (`admin@petshopnova.cr`) y 20 clientes (`*@correo-demo.cr`), 38 pedidos de enero a noviembre
  de 2026 (3 cancelados), 264 movimientos, 5 promociones, 22 reseñas, 5 carritos activos.
- Reservados para `07_pruebas.sql`: **PSN-049** con existencia 0 (stock insuficiente);
  **PSN-050** con 1 unidad, en el carrito de los clientes 18 y 19 (concurrencia);
  el carrito del cliente 20 tiene un producto sin stock (pedido que debe fallar completo).
  Los clientes 18, 19 y 20 no tienen compras (R8).
- **`@hashDemo` es un marcador:** hay que reemplazarlo por un hash bcrypt real generado con la
  misma biblioteca del backend. La contraseña de `app_petshop` en `03` también es de demostración.

---

## Backend: decisiones

- Node.js 20+ (en esta computadora: Node 26, instalado con winget). Dependencias: `express` 5,
  `mssql`, `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv`.
- Conexión con el login de mínimo privilegio `app_petshop` (autenticación de SQL Server).
  Requiere autenticación mixta y **TCP/IP activado** en la instancia (puerto 1433).
  Instancias en esta computadora: `MSSQLSERVER` (predeterminada, la que se usa) y `MSSQLSERVER01`.
- `useUTC: false` en `mssql`: las fechas viajan en hora local, como `SYSDATETIME()`.
- La API **no valida reglas de negocio**: solo tipos de datos. Las reglas son de los SP.
- Sesión con JWT (`Authorization: Bearer`). El rol se valida en el servidor. En `/api/mi/...`
  el `idCliente` sale del token. Antes de `sp_Pedido_Cancelar` (que no recibe cliente), la ruta
  del cliente llama `sp_Pedido_ObtenerDetalle` con `@idCliente` para comprobar que el pedido es suyo.
- Errores: `THROW` 50001–50099 → 400 `{ error, codigo }`; restricciones de la BD (547, 2601, 2627) → 400 con el
  nombre de la restricción; sin sesión 401; rol incorrecto 403;
  BD caída 503; pendientes 501.
- Login: mismo mensaje si el correo no existe o la clave es incorrecta. Contraseña mínima de 8.

---

## Frontend: decisiones

- Cada pantalla pide sus datos a la API con `useApi`; no hay datos de ejemplo en el navegador.
  El token de sesión es lo único que se guarda (localStorage).
- Precios finales, promociones, envío, totales, estados de pedido y disponibilidad vienen de los SP.
  Las transiciones que ofrece el detalle de pedido (admin) salen de `sp_Pedido_TransicionesValidas`.
- Los errores de negocio se muestran con el mensaje que manda el SP (THROW 50001–50099).
- Se quitó de la UI el "alias" de dirección y el "tiempo estimado" de zona (no existen en la BD).
- El carrito exige sesión de cliente (vive en la BD). El administrador no compra.
- Navegación con URL propia por pantalla (History API, sin react-router): atrás/adelante, recarga y enlaces
  directos funcionan; los filtros de búsqueda van en la URL (replaceState para no llenar el historial).
  La API devuelve index.html para cualquier ruta que no sea /api.
- Imágenes: 3 por producto en `frontend/src/assets/images/catalog/<SKU>_image_0N.png` (01 empaque,
  02 ficha de medidas, 03 en uso). Son ilustraciones generadas (no fotos), consistentes por producto.
  La BD guarda la ruta `/src/assets/images/catalog/...`; Vite la sirve en dev y la copia a `dist` al compilar.
- Restos de AI Studio que siguen en `frontend/`: `README.md`, `.env.example` (GEMINI_API_KEY),
  `metadata.json`, la dependencia `motion` y la pantalla de "Sistema de diseño".

## Plan acordado (en este orden)

1. ~~`sql/06_reportes.sql`~~ **Hecho**: `sp_R01`…`sp_R10` sobre `vw_VentasDetalle` (sin cancelados,
   importes históricos). HAVING en R1/R5, NOT EXISTS en R8, LAG en R9, ROW_NUMBER en R5,
   matriz con SUM(CASE) en R3 (marca × 12 meses) y cliente × categoría en R2 (celdas en 0 incluidas,
   totales con SUM OVER), CTE de meses en R4/R9. Más `sp_Dashboard_Indicadores` y `sp_Auditoria_Listar`.
   El listado de pedidos del admin usa `sp_R10_ResumenPedidos`.
2. ~~Backend~~ **Hecho** en `backend/` (ver "Backend: decisiones").
3. ~~Frontend conectado~~ **Hecho**.
4. `sql/07_pruebas.sql`: las 10 pruebas obligatorias de la sección 10 de la especificación
   (estado antes, acción, estado después), evidencia de índices con `SET STATISTICS IO ON`,
   y la prueba de concurrencia con dos ventanas de SSMS.
5. ~~README y documento PDF~~ **Hechos**. Faltan las capturas de evidencia.

Recuerda la regla del inicio: espera a que el usuario pida cada paso.
