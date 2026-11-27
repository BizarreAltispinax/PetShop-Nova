// Genera un hash bcrypt con la MISMA biblioteca que usa la API.
// Uso:  npm run hash -- "LaContraseña"
// El resultado se pega en sql/02_datos.sql (variable @hashDemo).
import bcrypt from 'bcryptjs';

const clave = process.argv[2];
if (!clave) {
  console.error('Uso: npm run hash -- "LaContraseña"');
  process.exit(1);
}
console.log(bcrypt.hashSync(clave, 12));
