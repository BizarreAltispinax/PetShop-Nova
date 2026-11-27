// Errores HTTP, conversión de parámetros y traducción de los errores de negocio de SQL Server.
// Aquí NO se validan reglas de negocio (stock, transiciones, promociones...):
// eso lo hacen los procedimientos. Solo se revisa que los datos tengan el tipo correcto.

export class ErrorHttp extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

// Entero positivo obligatorio (si no, 400).
export function entero(valor, campo) {
  const numero = Number(valor);
  if (valor === '' || valor === null || !Number.isInteger(numero) || numero <= 0) {
    throw new ErrorHttp(400, `El campo "${campo}" debe ser un número entero positivo.`);
  }
  return numero;
}

// Entero (puede ser negativo, p. ej. un AJUSTE de inventario).
export function enteroConSigno(valor, campo) {
  const numero = Number(valor);
  if (valor === '' || valor === null || !Number.isInteger(numero)) {
    throw new ErrorHttp(400, `El campo "${campo}" debe ser un número entero.`);
  }
  return numero;
}

// Entero opcional: vacío -> undefined (el SP usa su valor por defecto).
export function enteroOpcional(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return undefined;
  return entero(valor, campo);
}

export function decimal(valor, campo) {
  const numero = Number(valor);
  if (valor === '' || valor === null || valor === undefined || !Number.isFinite(numero)) {
    throw new ErrorHttp(400, `El campo "${campo}" debe ser numérico.`);
  }
  return numero;
}

export function decimalOpcional(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return undefined;
  return decimal(valor, campo);
}

// "1", "true", true -> true; "0", "false", false -> false; vacío -> undefined.
export function bit(valor) {
  if (valor === undefined || valor === null || valor === '') return undefined;
  return valor === true || valor === 1 || valor === '1' || valor === 'true';
}

// Texto: undefined se respeta (parámetro omitido); null -> NULL.
export function texto(valor) {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  return String(valor);
}

// Fecha 'YYYY-MM-DD' o ISO -> Date; vacío -> undefined.
export function fecha(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return undefined;
  // 'YYYY-MM-DD' se interpreta en hora local (new Date('2026-05-10') sería UTC y cambiaría el día)
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor));
  const f = soloFecha
    ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
    : new Date(valor);
  if (Number.isNaN(f.getTime())) {
    throw new ErrorHttp(400, `El campo "${campo}" no es una fecha válida.`);
  }
  return f;
}

/* Middleware final de errores.
   - THROW 50001-50099 de los procedimientos: regla de negocio -> 400 con su mensaje en español.
   - ErrorHttp: el estado indicado.
   - Conexión con la BD caída: 503.
   - Cualquier otro: 500 sin detalles internos (se registra en la consola del servidor). */
// eslint-disable-next-line no-unused-vars
// SQL Server puede devolver varios errores juntos (p. ej. 547 + 3621 "se terminó la instrucción");
// el driver los agrupa y el error principal queda sin número. Se revisan todos.
function erroresSql(err) {
  const lista = [];
  if (err?.number) lista.push(err);
  for (const e of err?.originalError?.errors ?? err?.precedingErrors ?? []) {
    if (e?.number) lista.push(e);
  }
  if (err?.originalError?.info?.number) lista.push(err.originalError.info);
  return lista;
}

export function manejadorErrores(err, req, res, next) {
  // Se toma el PRIMER error relevante: es la causa real (los siguientes son consecuencia)
  const errores = erroresSql(err);
  const primero = errores.find((e) => (e.number >= 50001 && e.number <= 50099) || [547, 2601, 2627].includes(e.number));
  const negocio = primero && primero.number >= 50001 ? primero : null;
  const restriccionBd = primero && !negocio ? primero : null;

  if (negocio) {
    return res.status(400).json({ error: negocio.message, codigo: negocio.number });
  }
  // Restricciones de la BD que no tradujo un SP: CHECK/FK (547) y UNIQUE (2601/2627)
  if (restriccionBd) {
    const numeroSql = restriccionBd.number;
    const restriccion = /(?:constraint|índice|index)\s+["']?([A-Za-z_][\w]*)/i.exec(restriccionBd.message)?.[1];
    const tipo = numeroSql === 547 ? 'una restricción de la base de datos' : 'una restricción de valor único';
    return res.status(400).json({
      error: `SQL Server rechazó el dato porque no cumple ${tipo}${restriccion ? ` (${restriccion})` : ''}.`,
      codigo: numeroSql,
    });
  }
  if (err instanceof ErrorHttp) {
    return res.status(err.estado).json({ error: err.message });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
  }
  if (['ELOGIN', 'ESOCKET', 'ETIMEOUT', 'EINSTLOOKUP'].includes(err?.code)) {
    console.error('[BD]', err.message);
    return res.status(503).json({ error: 'No hay conexión con la base de datos.' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor.' });
}
