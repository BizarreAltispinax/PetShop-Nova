// /api/auth : inicio de sesión, registro y cambio de contraseña.
// La contraseña nunca llega a la BD: la app calcula y verifica el hash bcrypt.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ejecutar, sql } from '../db.js';
import { firmarToken, requiereSesion } from '../auth.js';
import { ErrorHttp, fecha, texto } from '../errores.js';

const router = Router();
const RONDAS_BCRYPT = 12;
const LARGO_MINIMO_CLAVE = 8;

function validarClave(clave) {
  if (typeof clave !== 'string' || clave.length < LARGO_MINIMO_CLAVE) {
    throw new ErrorHttp(400, `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`);
  }
}

async function buscarUsuario(correo) {
  const { filas } = await ejecutar('dbo.sp_Usuario_ObtenerPorCorreo', {
    correo: [sql.NVarChar(150), correo],
  });
  return filas[0];
}

function datosPublicos(u) {
  return {
    idUsuario: u.idUsuario,
    correo: u.correo,
    idRol: u.idRol,
    rol: u.nombreRol,
    idCliente: u.idCliente ?? null,
    nombreCompleto: u.nombreCompleto || null,
  };
}

// POST /api/auth/login  { correo, password }
router.post('/login', async (req, res) => {
  const { correo, password } = req.body ?? {};
  if (!correo || !password) throw new ErrorHttp(400, 'Indique el correo y la contraseña.');

  const usuario = await buscarUsuario(String(correo));
  // Mismo mensaje si el correo no existe o la clave es incorrecta (no revela qué correos existen)
  const valido = usuario && (await bcrypt.compare(String(password), usuario.passwordHash));
  if (!valido) throw new ErrorHttp(401, 'Correo o contraseña incorrectos.');
  if (!usuario.activo) throw new ErrorHttp(403, 'La cuenta está desactivada.');

  res.json({ token: firmarToken(usuario), usuario: datosPublicos(usuario) });
});

// POST /api/auth/registro  { correo, password, nombreCliente, apellidos, telefono?, fechaNacimiento }
router.post('/registro', async (req, res) => {
  const b = req.body ?? {};
  validarClave(b.password);
  const passwordHash = await bcrypt.hash(b.password, RONDAS_BCRYPT);

  await ejecutar(
    'dbo.sp_Cliente_Registrar',
    {
      correo: [sql.NVarChar(150), texto(b.correo)],
      passwordHash: [sql.NVarChar(255), passwordHash],
      nombreCliente: [sql.NVarChar(80), texto(b.nombreCliente)],
      apellidos: [sql.NVarChar(100), texto(b.apellidos)],
      telefono: [sql.NVarChar(20), texto(b.telefono) || null],
      fechaNacimiento: [sql.Date, fecha(b.fechaNacimiento, 'fechaNacimiento') ?? null],
    },
    { idCliente: sql.Int },
  );

  const usuario = await buscarUsuario(String(b.correo).trim());
  res.status(201).json({ token: firmarToken(usuario), usuario: datosPublicos(usuario) });
});

// GET /api/auth/yo : datos de la sesión actual
router.get('/yo', requiereSesion, async (req, res) => {
  const usuario = await buscarUsuario(req.usuario.correo);
  if (!usuario || !usuario.activo) throw new ErrorHttp(401, 'La cuenta ya no está disponible.');
  res.json(datosPublicos(usuario));
});

// PUT /api/auth/password  { actual, nueva }
router.put('/password', requiereSesion, async (req, res) => {
  const { actual, nueva } = req.body ?? {};
  validarClave(nueva);
  const usuario = await buscarUsuario(req.usuario.correo);
  if (!usuario || !(await bcrypt.compare(String(actual ?? ''), usuario.passwordHash))) {
    throw new ErrorHttp(400, 'La contraseña actual no es correcta.');
  }
  await ejecutar('dbo.sp_Usuario_CambiarPassword', {
    idUsuario: [sql.Int, req.usuario.idUsuario],
    passwordHash: [sql.NVarChar(255), await bcrypt.hash(nueva, RONDAS_BCRYPT)],
  });
  res.json({ mensaje: 'Contraseña actualizada.' });
});

export default router;
