// Configuración leída de backend/.env (ver .env.example).
import 'dotenv/config';

function obligatorio(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable ${nombre} en backend/.env (copien .env.example como .env).`);
  }
  return valor;
}

const puertoBd = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;

export const config = {
  puerto: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  jwt: {
    secreto: obligatorio('JWT_SECRET'),
    expira: process.env.JWT_EXPIRA || '8h',
  },
  bd: {
    server: process.env.DB_SERVER || 'localhost',
    port: puertoBd,
    database: process.env.DB_NAME || 'PetShopNova',
    user: obligatorio('DB_USER'),
    password: obligatorio('DB_PASSWORD'),
    options: {
      instanceName: process.env.DB_INSTANCE || undefined,
      useUTC: false, // fechas en hora local, igual que SYSDATETIME() del servidor
      encrypt: true,
      trustServerCertificate: true, // certificado autofirmado del SQL Server local
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  },
};
