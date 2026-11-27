# PetShop Nova — Manual de instalación, ejecución y demostración

Sistema de comercio electrónico para una tienda ficticia de artículos para mascotas (perros, gatos, roedores, peces, aves y reptiles) en
Costa Rica. Proyecto Programado II del curso Bases de Datos I.

- **Base de datos:** Microsoft SQL Server. Toda la lógica de negocio vive en procedimientos
  almacenados, vistas y triggers (carpeta `sql/`).
- **Backend:** API en Node.js + Express (`backend/`). Cada endpoint ejecuta un procedimiento
  almacenado con parámetros tipados y se conecta con el login de mínimo privilegio `app_petshop`.
- **Frontend:** React + Vite + Tailwind (`frontend/`). Solo muestra lo que devuelve la API; no
  calcula precios, stock ni estados.
- **Todo corre en la misma computadora** (`localhost`): no hace falta internet ni hosting.

---

## 1. Requisitos

| Programa | Versión | Notas |
|---|---|---|
| Windows | 10 u 11 | |
| Microsoft SQL Server | 2019 o superior | Probado en SQL Server 2025 Developer (17.0.1000.7), instancia predeterminada `MSSQLSERVER` |
| SQL Server Management Studio | 22 | Para ejecutar los scripts y demostrar desde SQL |
| `sqlcmd` | cualquiera | Opcional; viene con SQL Server |
| Node.js | 20 o superior | Probado con Node 26. Instalar: `winget install OpenJS.NodeJS.LTS` |
| Navegador | Chrome, Edge o Firefox | |

---

## 2. Lista rápida para el día de la presentación

Si la computadora ya tiene todo instalado (como la del equipo), solo hacen falta tres pasos:

1. **Base limpia:** ejecutar los scripts de `sql/` en orden (sección 4).
2. **Encender la API:** en una terminal, dentro de `backend`, ejecutar `npm start`.
3. **Abrir la tienda:** **http://petshopnova.localhost** (con `PORT=80` en `backend/.env`, sección 6.1);
   con el puerto por defecto, http://petshopnova.localhost:4000

Comprobaciones antes de que llegue el profesor:

- [ ] http://petshopnova.localhost/api/salud responde `{"api":"ok","baseDeDatos":"ok"}`.
- [ ] Se puede iniciar sesión con `admin@petshopnova.cr` / `Nova12345`.
- [ ] SSMS está abierto, conectado al servidor y con la base `PetShopNova` seleccionada.
- [ ] Están abiertas **dos** ventanas de consulta en SSMS para la prueba de concurrencia (sección 8.10).
- [ ] La terminal de la API está visible: ahí aparecen los errores si algo falla.

> **Ojo con la fecha:** la promoción "Black Friday" termina el 30/11/2026 y el dashboard muestra
> el mes en curso. El 4 de diciembre el dashboard arrancará en ₡0 hasta que se haga una compra:
> conviene empezar la demostración con una compra (sección 8.1).

---

## 3. Preparar SQL Server (una sola vez por computadora)

La API se conecta por red local (TCP, puerto 1433) con un usuario de SQL Server. Por eso hay que
activar dos cosas:

### 3.1 Autenticación mixta
SSMS → clic derecho sobre el servidor → **Propiedades** → **Seguridad** → marcar
**"Modo de autenticación de SQL Server y de Windows"** → Aceptar.

### 3.2 TCP/IP
**Administrador de configuración de SQL Server** → *Configuración de red de SQL Server* →
*Protocolos de MSSQLSERVER* → **TCP/IP** → **Habilitar**.
En *Propiedades → Direcciones IP → IPAll*, el puerto TCP debe ser `1433`.

### 3.3 Reiniciar el servicio
En PowerShell **como administrador**:

```powershell
Restart-Service -Name MSSQLSERVER -Force
```

(o desde SSMS: clic derecho sobre el servidor → Reiniciar).

Para comprobarlo:

```powershell
Test-NetConnection localhost -Port 1433 -InformationLevel Quiet
```

Debe responder `True`.

---

## 4. Crear la base de datos

Los scripts crean la base **desde cero**: el `01` borra `PetShopNova` si ya existe. Se ejecutan
en orden y sin correcciones manuales:

| Script | Contenido |
|---|---|
| `01_esquema.sql` | Base, 27 tablas, PK/FK/UNIQUE/CHECK/DEFAULT, índices |
| `02_datos.sql` | Datos de prueba (14 marcas, 14 categorías, 6 especies, 70 productos con 3 imágenes cada uno, 20 clientes, 38 pedidos…) y consulta de conciliación |
| `03_procedimientos.sql` | Procedimientos almacenados, `fn_PromocionVigente` y login `app_petshop` |
| `04_vistas.sql` | 4 vistas |
| `05_triggers.sql` | 2 triggers de auditoría (multi-fila) |
| `06_reportes.sql` | Reportes R1–R10, dashboard y auditoría |
| `07_pruebas.sql` | Pruebas obligatorias de la sección 10 del enunciado (**pendiente**; mientras tanto, usar la sección 8 de este manual) |

### Opción A: SSMS
Abrir cada archivo **en orden** y ejecutarlo (F5). Al final de cada uno aparece el mensaje
`… ejecutado correctamente`. El `02` termina con una tabla de verificación: todas las filas deben
dar **0 diferencias**.

### Opción B: PowerShell (todos de una vez)
Desde la carpeta raíz del proyecto:

```powershell
Get-ChildItem sql -Filter '0*.sql' | Sort-Object Name | ForEach-Object { sqlcmd -S localhost -E -C -I -b -f 65001 -i $_.FullName; "$($_.Name): $LASTEXITCODE" }
```

Cada línea debe terminar en `: 0`.

> `-I` es **obligatorio** con `sqlcmd`: activa `QUOTED_IDENTIFIER`, que exigen los índices
> filtrados. SSMS ya lo trae activado. `-f 65001` lee los archivos como UTF-8 (tildes y ₡).

**Para dejar los datos como al inicio** después de una demostración, basta con volver a ejecutar
los scripts.

---

## 5. Encender el backend (API)

```powershell
cd backend
```

```powershell
Copy-Item .env.example .env
```

```powershell
npm install
```

```powershell
npm start
```

Debe aparecer:

```
API de PetShop Nova en http://localhost:4000
Conectado a SQL Server (localhost, base PetShopNova).
```

- `Copy-Item` y `npm install` solo hacen falta la primera vez en cada computadora.
- En `.env` conviene cambiar `JWT_SECRET` por una cadena larga cualquiera.
- Si se cambia la contraseña de `app_petshop` en el `03`, hay que cambiarla también en `.env`.
- Para detener la API: `Ctrl + C` en esa terminal.

---

## 6. Compilar el frontend

En **otra** terminal:

```powershell
cd frontend
```

```powershell
npm install
```

```powershell
npm run build
```

Esto genera `frontend/dist`, y la API lo sirve en **http://localhost:4000**. Solo hay que repetirlo
cuando cambie el código del frontend.

### 6.1 Nombre propio de la página: http://petshopnova.localhost

Los navegadores (Edge, Chrome, Firefox) envían a la propia computadora cualquier nombre que termine en
`.localhost`, así que **no hay que comprar nada ni editar el archivo `hosts`**. Solo hace falta que la API use el
puerto 80 para no escribir el número:

1. En `backend/.env`, cambiar `PORT=4000` por `PORT=80` y reiniciar la API (`npm start`).
2. Abrir **http://petshopnova.localhost**.

Si el puerto 80 está ocupado por otro programa (por ejemplo IIS), dejar `PORT=4000` y usar
`http://petshopnova.localhost:4000`.

> **Por qué no `.shop.cr`, `.cr` o `.com`:** Edge y Chrome bloquean (`ERR_BLOCKED_BY_CLIENT`) cualquier dominio
> con terminación pública que apunte a la propia computadora, aunque se agregue al archivo `hosts`. Solo aceptan
> los nombres reservados para uso local, como `.localhost` y `.test`. Se comprobó en Edge 158 el 27/11/2026.

**Modo desarrollo** (opcional, se recarga solo al guardar): `npm run dev` y abrir
http://localhost:3000. La API tiene que estar encendida, porque Vite le reenvía las llamadas a `/api`.

---

## 7. Usuarios de demostración

Todos usan la contraseña **`Nova12345`**. En la base solo se guarda su hash bcrypt.

| Correo | Rol | Para qué sirve |
|---|---|---|
| `admin@petshopnova.cr` | Administrador | Catálogos, inventario, pedidos, clientes, reportes, auditoría |
| `valeria.mora@correo-demo.cr` | Cliente (id 1) | Tiene compras y un carrito listo: compra exitosa |
| `kevin.duran@correo-demo.cr` | Cliente (id 20) | Su carrito trae un producto con stock y otro sin stock: compra que falla completa |
| `ricardo.barrantes@correo-demo.cr` | Cliente (id 18) | Carrito con el último ejemplar de PSN-050: concurrencia |
| `melissa.carvajal@correo-demo.cr` | Cliente (id 19) | Mismo producto que el cliente 18: concurrencia |

Los demás clientes son `*@correo-demo.cr` (los correos están en `sql/02_datos.sql`). Los clientes
18, 19 y 20 no tienen compras: aparecen en el reporte R8.

---

## 8. Guion de demostración: las 10 pruebas del enunciado (sección 10)

Para cada prueba se indica cómo hacerla desde la página y cómo verificarla en SSMS.
Conviene empezar con la base recién creada (sección 4): los números de pedido y las existencias
de los ejemplos corresponden a los datos iniciales.

### 8.1 Compra exitosa y descuento del inventario
1. **SSMS, antes:**
   ```sql
   SELECT p.sku, i.existencia FROM Inventario i JOIN Producto p ON p.idProducto = i.idProducto WHERE p.sku IN ('PSN-009','PSN-017','PSN-023','PSN-028');
   ```
2. **Página:** iniciar sesión como `valeria.mora…` → Carrito → *Continuar al pago* → elegir
   dirección → método de pago → *Confirmar pedido*.
3. **SSMS, después:** repetir la consulta del paso 1 (cada existencia bajó según el carrito). Además:
   ```sql
   SELECT TOP 5 * FROM MovimientoInventario ORDER BY idMovimiento DESC;
   ```
   Aparecen movimientos `SALIDA` con el número del pedido nuevo.

### 8.2 Compra fallida por falta de existencias (ROLLBACK)
**Página:** iniciar sesión como `kevin.duran…` → Carrito → confirmar. Aparece el mensaje *"Existencia
insuficiente para uno o más productos. No se registró el pedido ni se modificó el inventario."*

### 8.3 Pedido con dos productos, uno sin stock, sin afectar ningún inventario
Es el mismo carrito de Kevin: PSN-012 (con stock) y PSN-049 (sin stock). Verificar en SSMS que
**ninguno** cambió y que no se creó el pedido:

```sql
SELECT p.sku, i.existencia FROM Inventario i JOIN Producto p ON p.idProducto = i.idProducto WHERE p.sku IN ('PSN-012','PSN-049');
```

```sql
SELECT COUNT(*) FROM Pedido;
```

PSN-012 sigue en 4 y PSN-049 en 0.

### 8.4 Cancelación con reintegro único
**Página (administrador):** Pedidos → abrir el **#38** (Confirmado) → *Cambiar estado a* Cancelado.
Las unidades vuelven al inventario y el pago queda *Reembolsado*. Después, el botón
**"Probar 2.ª cancelación"** muestra el rechazo: *"El pedido ya estaba cancelado. No se devolvió
inventario de nuevo."*

**SSMS:**

```sql
EXEC dbo.sp_Pedido_Cancelar @idPedido = 38, @idUsuario = 1;
```

Si se ejecuta dos veces, la segunda falla con el error 50050.

```sql
SELECT * FROM MovimientoInventario WHERE idPedido = 38 ORDER BY idMovimiento;
```

Hay una sola `ENTRADA` por cada línea del pedido.

### 8.5 Transición de estado inválida
**Página (administrador):** abrir un pedido *Entregado* (por ejemplo el **#35**). El selector no
ofrece estados, porque salen de la tabla `TransicionEstado`. El botón **"Probar transición inválida
a Pendiente"** muestra el error de SQL Server.

**SSMS:**

```sql
EXEC dbo.sp_Pedido_CambiarEstado @idPedido = 35, @idEstadoNuevo = 1, @idUsuario = 1;
```

Error 50041: *Transición de estado inválida*.

### 8.6 El cambio de precio no altera el precio histórico
1. **SSMS:**
   ```sql
   SELECT TOP 3 idPedido, precioUnitario FROM DetallePedido WHERE idProducto = 1;
   ```
2. **Página (administrador):** Productos → editar *Croquetas Puppy Premium 3 kg* → cambiar el
   precio → Guardar.
3. **SSMS:** la consulta del paso 1 devuelve los mismos precios de antes. El precio nuevo solo
   está en `Producto.precioVigente`.

### 8.7 Dato duplicado rechazado por la base
**Página:** *Crear cuenta* con un correo que ya existe (por ejemplo `valeria.mora@correo-demo.cr`)
→ *"Ya existe un usuario registrado con ese correo (restricción UQ_Usuario_Correo)."*

**SSMS:**

```sql
DECLARE @id INT; EXEC dbo.sp_Marca_Crear @nombreMarca = N'PawNutri', @idMarca = @id OUTPUT;
```

Error 50001. Directo sobre la tabla:

```sql
INSERT INTO Marca (nombreMarca) VALUES (N'PawNutri');
```

Error 2627 por `UQ_Marca_Nombre`.

### 8.8 Trigger de auditoría con varias filas
**Página (administrador):** Productos → **Ajustar precios por categoría** → *Snacks y premios*,
`5` % → Aplicar. Luego **Auditoría**: aparece una fila por cada producto de la categoría, con el
valor anterior, el nuevo, el usuario de BD (`app_petshop`) y el usuario de la aplicación.

**SSMS:**

```sql
SELECT * FROM AuditoriaCambio ORDER BY idAuditoria DESC;
```

### 8.9 Verificar un reporte contra SQL
**Página (administrador):** Reportes → R1 (o cualquier otro).

**SSMS:**

```sql
EXEC dbo.sp_R01_TopClientes;
```

Las cifras coinciden porque la pantalla muestra exactamente lo que devuelve el procedimiento.
Comprobación independiente sobre la vista:

```sql
SELECT TOP 5 cliente, SUM(ingreso) AS monto FROM vw_VentasDetalle GROUP BY idCliente, cliente ORDER BY monto DESC;
```

Desde la pantalla también se puede **Exportar CSV / Excel**.

### 8.10 Dos compras simultáneas sin sobreventa (dos ventanas de SSMS)
Los clientes 18 y 19 tienen en el carrito el **último** ejemplar de PSN-050.

**Ventana A** (la transacción queda abierta 15 segundos):

```sql
BEGIN TRAN;
DECLARE @id INT;
EXEC dbo.sp_Pedido_Confirmar @idCliente = 18, @idDireccion = 18, @idMetodoPago = 1, @idPedido = @id OUTPUT;
SELECT @id AS pedidoVentanaA;
WAITFOR DELAY '00:00:15';
COMMIT;
```

**Ventana B** (ejecutar mientras A está esperando):

```sql
DECLARE @id INT;
EXEC dbo.sp_Pedido_Confirmar @idCliente = 19, @idDireccion = 19, @idMetodoPago = 1, @idPedido = @id OUTPUT;
```

Resultado: B **se queda esperando** hasta que A hace COMMIT y después falla con *"Existencia
insuficiente…"*. Para verificar:

```sql
SELECT existencia FROM Inventario WHERE idProducto = 50;
```

Debe dar 0: nunca negativa y sin sobreventa. (Probado el 27/11/2026: B esperó unos 6 segundos y
falló con el error 50085.)

### Otras demostraciones útiles
- **Factura imprimible / PDF:** detalle de cualquier pedido → *Imprimir / PDF*.
- **Alerta de bajo mínimo:** encabezado del panel de administrador y Dashboard
  (`vw_ExistenciasBajas`, `sp_Inventario_AlertaBajoMinimo`).
- **Kardex:** Inventario → *Ver kardex* (saldo acumulado con función de ventana).
- **Reseñas:** solo de productos comprados y entregados, una por cliente y producto
  (`sp_Resena_Crear`).
- **Mínimo privilegio:** con `app_petshop` no se puede leer una tabla directamente, solo ejecutar
  procedimientos. En SSMS, conectado como `app_petshop`, `SELECT * FROM Producto` da error de
  permisos.

---

## 9. Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `/api/salud` dice `"sin conexión"` y la terminal muestra `Failed to connect to localhost:1433` | TCP/IP desactivado o SQL Server detenido (sección 3.2 y 3.3) |
| `Login failed for user 'app_petshop'` | Falta la autenticación mixta (3.1), no se ejecutó el `03`, o la contraseña de `.env` no coincide |
| Un script falla con `QUOTED_IDENTIFIER` | Se ejecutó con `sqlcmd` sin `-I` |
| `npm` no se reconoce | Instalar Node.js y abrir una terminal **nueva** |
| `EADDRINUSE: 4000` | La API ya está encendida en otra terminal: usar esa o cerrarla |
| `petshopnova.localhost` no abre | La API no está encendida o no está en el puerto 80: revisar `PORT` en `backend/.env` o usar http://petshopnova.localhost:4000 |
| http://localhost:4000 muestra `Cannot GET /` | Falta compilar el frontend (`npm run build` en `frontend`) |
| La página dice que la sesión expiró | El token dura 8 horas: iniciar sesión de nuevo |
| Las imágenes de los productos salen como recuadros grises | Falta compilar el frontend (`npm run build`): las 210 imágenes están en `frontend/src/assets/images/catalog` y se copian a `dist` al compilar |
| Los datos quedaron "sucios" después de probar | Volver a ejecutar los scripts de `sql/` (sección 4) |

---

## 10. Dónde está cada cosa (para las preguntas de la defensa)

| Tema | Archivo |
|---|---|
| Tablas, restricciones, índices | `sql/01_esquema.sql` |
| Checkout atómico, cancelación, estados | `sql/03_procedimientos.sql` → `sp_Pedido_Confirmar`, `sp_Pedido_Cancelar`, `sp_Pedido_CambiarEstado` |
| Regla de promociones (no se acumulan) | `sql/03_procedimientos.sql` → `fn_PromocionVigente` |
| Login de mínimo privilegio | final de `sql/03_procedimientos.sql` |
| Vistas | `sql/04_vistas.sql` |
| Triggers de auditoría | `sql/05_triggers.sql` |
| Reportes R1–R10 | `sql/06_reportes.sql` (técnica de cada uno en el encabezado del archivo) |
| Conexión y ejecución de procedimientos | `backend/src/db.js` |
| Endpoints → procedimiento | `backend/README.md` |
| Sesión, roles y contraseñas (bcrypt) | `backend/src/auth.js`, `backend/src/routes/auth.js` |
| Llamadas desde la página | `frontend/src/api/client.ts`, `frontend/src/hooks/useApi.ts` |
| Diccionario de datos y diagrama ER | `sql/docs/` |
| Enunciado | `docs/Especificacion_Proyecto_II.pdf` |
