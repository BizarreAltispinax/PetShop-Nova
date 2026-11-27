// Sesión por token (JWT). El rol se valida SIEMPRE en el servidor:
// el frontend solo oculta pantallas, la API es la que niega el acceso.
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { ErrorHttp } from './errores.js';

export const ROL_ADMIN = 1;
export const ROL_CLIENTE = 2;

export function firmarToken(usuario) {
  const datos = {
    idUsuario: usuario.idUsuario,
    idRol: usuario.idRol,
    idCliente: usuario.idCliente ?? null,
    correo: usuario.correo,
  };
  return jwt.sign(datos, config.jwt.secreto, { expiresIn: config.jwt.expira });
}

// Exige un token válido y deja los datos de la sesión en req.usuario.
export function requiereSesion(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    return next(new ErrorHttp(401, 'Debe iniciar sesión.'));
  }
  try {
    req.usuario = jwt.verify(token, config.jwt.secreto);
    return next();
  } catch {
    return next(new ErrorHttp(401, 'La sesión expiró o no es válida. Inicie sesión de nuevo.'));
  }
}

export function requiereAdmin(req, res, next) {
  if (req.usuario?.idRol !== ROL_ADMIN) {
    return next(new ErrorHttp(403, 'Solo un administrador puede realizar esta acción.'));
  }
  return next();
}

export function requiereCliente(req, res, next) {
  if (req.usuario?.idRol !== ROL_CLIENTE || !req.usuario.idCliente) {
    return next(new ErrorHttp(403, 'Esta acción es solo para clientes.'));
  }
  return next();
}
