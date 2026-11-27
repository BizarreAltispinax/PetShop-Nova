// Punto de entrada de la API de PetShop Nova.
// Todo corre en la máquina local: SQL Server en localhost y esta API en http://localhost:PORT.
// Si existe frontend/dist (npm run build en frontend), también sirve la página,
// así que con "npm start" queda todo en una sola dirección.
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { cerrarPool, obtenerPool } from './db.js';
import { ErrorHttp, manejadorErrores } from './errores.js';
import rutasAuth from './routes/auth.js';
import rutasCatalogo from './routes/catalogo.js';
import rutasCliente from './routes/cliente.js';
import rutasAdmin from './routes/admin.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

// GET /api/salud : comprueba que la API corre y que hay conexión con SQL Server
app.get('/api/salud', async (req, res) => {
  try {
    await obtenerPool();
    res.json({ api: 'ok', baseDeDatos: 'ok' });
  } catch (err) {
    res.status(503).json({ api: 'ok', baseDeDatos: 'sin conexión', detalle: err.message });
  }
});

app.use('/api/auth', rutasAuth);
app.use('/api/mi', rutasCliente);
app.use('/api/admin', rutasAdmin);
app.use('/api', rutasCatalogo);

// Cualquier otra ruta /api no existe
app.use('/api', (req, res, next) => next(new ErrorHttp(404, 'Ruta no encontrada.')));

// Frontend compilado (opcional)
const dirActual = path.dirname(fileURLToPath(import.meta.url));
const dirFrontend = path.resolve(dirActual, '../../frontend/dist');
if (fs.existsSync(path.join(dirFrontend, 'index.html'))) {
  app.use(express.static(dirFrontend));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    return res.sendFile(path.join(dirFrontend, 'index.html'));
  });
}

app.use(manejadorErrores);

const servidor = app.listen(config.puerto, () => {
  console.log(`API de PetShop Nova en http://localhost:${config.puerto}`);
  obtenerPool()
    .then(() => console.log(`Conectado a SQL Server (${config.bd.server}, base ${config.bd.database}).`))
    .catch((err) => console.error(`[BD] Sin conexión todavía: ${err.message}`));
});

async function apagar() {
  servidor.close();
  await cerrarPool().catch(() => {});
  process.exit(0);
}
process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
