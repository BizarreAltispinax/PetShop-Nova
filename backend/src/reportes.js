// Mapa de reportes R01-R10 -> procedimiento de sql/06_reportes.sql.
// Cada entrada indica el SP y cómo convertir los filtros de la URL (?anio=2026&desde=...)
// en parámetros tipados. La API no calcula nada: solo devuelve lo que entrega el SP.
import { sql } from './db.js';
import { enteroOpcional, fecha, texto } from './errores.js';

const anio = (q) => ({ anio: [sql.Int, enteroOpcional(q.anio, 'anio')] });

export const reportes = {
  R01: {
    procedimiento: 'dbo.sp_R01_TopClientes',
    parametros: (q) => ({ top: [sql.Int, enteroOpcional(q.top, 'top')] }),
  },
  R02: { procedimiento: 'dbo.sp_R02_MatrizClienteCategoria', parametros: () => ({}) },
  R03: { procedimiento: 'dbo.sp_R03_VentasMensualesMarca', parametros: anio },
  R04: { procedimiento: 'dbo.sp_R04_EvolucionMensual', parametros: anio },
  R05: {
    procedimiento: 'dbo.sp_R05_ProductosMasVendidos',
    parametros: (q) => ({ top: [sql.Int, enteroOpcional(q.top, 'top')] }),
  },
  R06: { procedimiento: 'dbo.sp_R06_InventarioCritico', parametros: () => ({}) },
  R07: {
    procedimiento: 'dbo.sp_R07_Rentabilidad',
    parametros: (q) => ({ agrupacion: [sql.Char(1), texto(q.agrupacion)?.toUpperCase()] }),
  },
  R08: {
    procedimiento: 'dbo.sp_R08_ClientesSinCompras',
    parametros: (q) => ({
      desde: [sql.Date, fecha(q.desde, 'desde')],
      hasta: [sql.Date, fecha(q.hasta, 'hasta')],
    }),
  },
  R09: { procedimiento: 'dbo.sp_R09_ComparacionMensual', parametros: anio },
  R10: {
    procedimiento: 'dbo.sp_R10_ResumenPedidos',
    parametros: (q) => ({
      idEstado: [sql.Int, enteroOpcional(q.idEstado, 'idEstado')],
      desde: [sql.Date, fecha(q.desde, 'desde')],
      hasta: [sql.Date, fecha(q.hasta, 'hasta')],
      cliente: [sql.NVarChar(100), texto(q.cliente) || undefined],
      idCliente: [sql.Int, enteroOpcional(q.idCliente, 'idCliente')],
    }),
  },
};
