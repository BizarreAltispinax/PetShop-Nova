import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { AuditoriaFila } from '../../types';
import { formatDateTime } from '../../utils/format';
import { AlertBanner, Input, Select, TableSkeleton } from '../../components/ui/DesignSystemKit';

// Bitácora que llenan los triggers TR_Producto_AuditoriaPrecio y TR_Pedido_AuditoriaEstado.
// Los filtros se aplican en SQL Server (sp_Auditoria_Listar).
export const AdminAuditPage: React.FC = () => {
  const [tabla, setTabla] = useState('');
  const [campo, setCampo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const { datos, cargando, error } = useApi<AuditoriaFila[]>('/admin/auditoria', { tabla, campo, desde, hasta });
  const filas = datos ?? [];

  const camposPorTabla: Record<string, string[]> = {
    '': ['precioVigente', 'costo', 'idEstado'],
    Producto: ['precioVigente', 'costo'],
    Pedido: ['idEstado'],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Auditoría</h1>
        <p className="text-sm text-slate-500">Bitácora automática de los triggers de SQL Server para Producto y Pedido</p>
      </div>

      <div className="bg-white rounded-[12px] border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select
          label="Tabla afectada"
          value={tabla}
          onChange={(e) => {
            setTabla(e.target.value);
            setCampo('');
          }}
        >
          <option value="">Todas</option>
          <option value="Producto">Producto</option>
          <option value="Pedido">Pedido</option>
        </Select>
        <Select label="Campo" value={campo} onChange={(e) => setCampo(e.target.value)}>
          <option value="">Todos</option>
          {camposPorTabla[tabla].map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
        <Input label="Fecha desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <Input label="Fecha hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </div>

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {cargando && filas.length === 0 ? (
        <TableSkeleton rows={6} cols={8} />
      ) : (
        <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Fecha y hora</th>
                  <th className="px-4 py-3.5">Tabla afectada</th>
                  <th className="px-4 py-3.5 text-center">ID registro</th>
                  <th className="px-4 py-3.5">Campo</th>
                  <th className="px-4 py-3.5">Valor anterior</th>
                  <th className="px-4 py-3.5">Valor nuevo</th>
                  <th className="px-4 py-3.5">Usuario de BD</th>
                  <th className="px-4 py-3.5">Usuario de aplicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No hay cambios registrados con esos filtros.
                    </td>
                  </tr>
                ) : (
                  filas.map((a) => (
                    <tr key={a.idAuditoria} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono-num text-slate-600">{formatDateTime(a.fechaCambio)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{a.tablaAfectada}</td>
                      <td className="px-4 py-3 text-center font-mono-num">#{a.idRegistro}</td>
                      <td className="px-4 py-3 font-mono-num text-[#0F8B8D]">{a.campo}</td>
                      <td className="px-4 py-3 font-mono-num text-red-600">{a.valorAnterior}</td>
                      <td className="px-4 py-3 font-mono-num text-emerald-700 font-semibold">{a.valorNuevo}</td>
                      <td className="px-4 py-3 font-mono-num text-slate-600">{a.usuarioBd}</td>
                      <td className="px-4 py-3 text-slate-700">{a.usuarioApp ?? '— (cambio directo en SSMS)'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
