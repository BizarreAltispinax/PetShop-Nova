// Acceso a SQL Server. La API SOLO ejecuta procedimientos almacenados:
// no hay consultas armadas con texto, todos los valores van como parámetros tipados.
import sql from 'mssql';
import { config } from './config.js';

let poolPromesa = null;

export function obtenerPool() {
  if (!poolPromesa) {
    poolPromesa = new sql.ConnectionPool(config.bd).connect().catch((err) => {
      poolPromesa = null; // permite reintentar en la siguiente petición
      throw err;
    });
  }
  return poolPromesa;
}

/**
 * Ejecuta un procedimiento almacenado.
 * @param {string} nombre   p. ej. 'dbo.sp_Producto_Buscar'
 * @param {object} entradas { nombreParametro: [tipoSql, valor] }  (undefined -> se omite: el SP usa su valor por defecto)
 * @param {object} salidas  { nombreParametro: tipoSql }  para parámetros OUTPUT
 * @returns {{ conjuntos: object[][], filas: object[], salida: object }}
 */
export async function ejecutar(nombre, entradas = {}, salidas = {}) {
  const pool = await obtenerPool();
  const peticion = pool.request();

  for (const [parametro, [tipo, valor]] of Object.entries(entradas)) {
    if (valor !== undefined) peticion.input(parametro, tipo, valor);
  }
  for (const [parametro, tipo] of Object.entries(salidas)) {
    peticion.output(parametro, tipo);
  }

  const resultado = await peticion.execute(nombre);
  return {
    conjuntos: resultado.recordsets,
    filas: resultado.recordsets[0] ?? [],
    salida: resultado.output,
  };
}

export async function cerrarPool() {
  if (poolPromesa) {
    const pool = await poolPromesa;
    await pool.close();
    poolPromesa = null;
  }
}

export { sql };
