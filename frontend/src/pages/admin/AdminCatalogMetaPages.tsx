import React, { useState } from 'react';
import { Edit2, Plus, Tag } from 'lucide-react';
import { useDb } from '../../store/db';
import { useApi } from '../../hooks/useApi';
import { api, mensajeError } from '../../api/client';
import { Categoria, Especie, Marca, ProductoResumen, Promocion } from '../../types';
import { formatCRC, formatDateTime, toLocalDateTimeInput } from '../../utils/format';
import { AlertBanner, Button, Checkbox, Input, Modal, PromotionStatusBadge, TableSkeleton, Toggle } from '../../components/ui/DesignSystemKit';

/* ======================== MARCAS, CATEGORÍAS Y ESPECIES ======================== */
// sp_Marca_*, sp_Categoria_* y sp_Especie_*: solo desactivación lógica, sin borrado físico.
type ModoCatalogo = 'brands' | 'categories' | 'species';
const MODOS: Record<ModoCatalogo, { ruta: string; campo: string; plural: string; singular: string; nueva: string; guardada: string; desc: string; ejemplo: string }> = {
  brands: { ruta: '/admin/marcas', campo: 'nombreMarca', plural: 'Marcas', singular: 'marca', nueva: 'Nueva marca', guardada: 'Marca guardada', desc: 'marcas comerciales', ejemplo: 'Ej. PawNutri' },
  categories: { ruta: '/admin/categorias', campo: 'nombreCategoria', plural: 'Categorías', singular: 'categoría', nueva: 'Nueva categoría', guardada: 'Categoría guardada', desc: 'categorías de producto', ejemplo: 'Ej. Suplementos' },
  species: { ruta: '/admin/especies', campo: 'nombreEspecie', plural: 'Especies', singular: 'especie', nueva: 'Nueva especie', guardada: 'Especie guardada', desc: 'especies de mascota a las que va dirigido cada producto', ejemplo: 'Ej. Conejos' },
};
interface FilaCatalogo {
  id: number;
  nombre: string;
  activo: boolean;
  cantidadProductos: number;
}

export const AdminBrandsCategoriesPage: React.FC<{ mode: ModoCatalogo }> = ({ mode }) => {
  const { addToast, recargarCatalogos } = useDb();
  const cfg = MODOS[mode];
  const ruta = cfg.ruta;
  const { datos, cargando, error, recargar } = useApi<(Marca | Categoria | Especie)[]>(ruta);

  const filas: FilaCatalogo[] = (datos ?? []).map((d) => {
    const r = d as unknown as Record<string, unknown>;
    const id = (mode === 'brands' ? r.idMarca : mode === 'categories' ? r.idCategoria : r.idEspecie) as number;
    return { id, nombre: r[cfg.campo] as string, activo: d.activo, cantidadProductos: d.cantidadProductos };
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FilaCatalogo | null>(null);
  const [nombre, setNombre] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const campoNombre = cfg.campo;

  const guardar = async (fila: FilaCatalogo | null, nuevoNombre: string, activo: boolean) => {
    if (fila) await api.put(`${ruta}/${fila.id}`, { [campoNombre]: nuevoNombre, activo });
    else await api.post(ruta, { [campoNombre]: nuevoNombre });
    await Promise.all([recargar(), recargarCatalogos()]);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError(null);
    setGuardando(true);
    try {
      await guardar(editing, nombre.trim(), editing?.activo ?? true);
      addToast('success', cfg.guardada);
      setModalOpen(false);
    } catch (err) {
      setFormError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const toggle = async (fila: FilaCatalogo) => {
    try {
      await guardar(fila, fila.nombre, !fila.activo);
    } catch (err) {
      addToast('error', 'No se pudo cambiar el estado', mensajeError(err));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{cfg.plural}</h1>
          <p className="text-sm text-slate-500">
            Catálogo de {cfg.desc} (solo desactivación, sin borrado físico)
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null);
            setNombre('');
            setFormError(null);
            setModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" /> {cfg.nueva}
        </Button>
      </div>

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {cargando && filas.length === 0 ? (
        <TableSkeleton rows={6} cols={4} />
      ) : (
        <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Nombre</th>
                <th className="px-5 py-3.5 text-center">Productos asociados</th>
                <th className="px-5 py-3.5 text-center">Activo</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{item.nombre}</td>
                  <td className="px-5 py-3.5 text-center font-mono-num text-slate-600">{item.cantidadProductos}</td>
                  <td className="px-5 py-3.5 text-center">
                    <Toggle checked={item.activo} onChange={() => void toggle(item)} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditing(item);
                        setNombre(item.nombre);
                        setFormError(null);
                        setModalOpen(true);
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar ${cfg.singular}` : cfg.nueva}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" loading={guardando} onClick={() => handleSubmit()}>
              Guardar
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <AlertBanner variant="error">{formError}</AlertBanner>}
          <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={cfg.ejemplo} maxLength={mode === 'species' ? 60 : 100} required />
        </form>
      </Modal>
    </div>
  );
};

/* ======================== PROMOCIONES ======================== */
// sp_Promocion_*: el estado de vigencia lo calcula la BD; las asignaciones a productos
// se guardan con sp_Promocion_AsignarProducto / sp_Promocion_QuitarProducto.
export const AdminPromotionsPage: React.FC = () => {
  const { addToast } = useDb();
  const promociones = useApi<Promocion[]>('/admin/promociones');
  const productos = useApi<ProductoResumen[]>('/admin/productos');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promocion | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'P' | 'M'>('P');
  const [valor, setValor] = useState('15');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [activo, setActivo] = useState(true);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [originales, setOriginales] = useState<number[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const abrirNueva = () => {
    const hoy = new Date();
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate(), 23, 59);
    setEditingPromo(null);
    setNombre('');
    setTipo('P');
    setValor('15');
    setFechaInicio(toLocalDateTimeInput(hoy.toISOString()));
    setFechaFin(toLocalDateTimeInput(fin.toISOString()));
    setActivo(true);
    setSeleccionados([]);
    setOriginales([]);
    setProdSearch('');
    setFormError(null);
    setModalOpen(true);
  };

  const abrirEdicion = async (p: Promocion) => {
    setEditingPromo(p);
    setNombre(p.nombrePromocion);
    setTipo(p.tipoDescuento);
    setValor(String(p.valor));
    setFechaInicio(toLocalDateTimeInput(p.fechaInicio));
    setFechaFin(toLocalDateTimeInput(p.fechaFin));
    setActivo(p.activo);
    setProdSearch('');
    setFormError(null);
    setSeleccionados([]);
    setOriginales([]);
    setModalOpen(true);
    try {
      const asignados = await api.get<{ idProducto: number }[]>(`/admin/promociones/${p.idPromocion}/productos`);
      const ids = asignados.map((a) => a.idProducto);
      setSeleccionados(ids);
      setOriginales(ids);
    } catch (err) {
      setFormError(mensajeError(err));
    }
  };

  const datosPromo = (activoFinal: boolean, p?: Promocion) => ({
    nombrePromocion: p ? p.nombrePromocion : nombre.trim(),
    tipoDescuento: p ? p.tipoDescuento : tipo,
    valor: p ? p.valor : Number(valor),
    fechaInicio: p ? toLocalDateTimeInput(p.fechaInicio) : fechaInicio,
    fechaFin: p ? toLocalDateTimeInput(p.fechaFin) : fechaFin,
    activo: activoFinal,
  });

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError(null);
    setGuardando(true);
    try {
      let id = editingPromo?.idPromocion;
      if (id) await api.put(`/admin/promociones/${id}`, datosPromo(activo));
      else id = (await api.post<{ idPromocion: number }>('/admin/promociones', datosPromo(true))).idPromocion;

      const agregar = seleccionados.filter((x) => !originales.includes(x));
      const quitar = originales.filter((x) => !seleccionados.includes(x));
      for (const idProducto of agregar) await api.post(`/admin/promociones/${id}/productos`, { idProducto });
      for (const idProducto of quitar) await api.delete(`/admin/promociones/${id}/productos/${idProducto}`);

      addToast('success', 'Promoción guardada', `${agregar.length} productos asignados, ${quitar.length} quitados.`);
      setModalOpen(false);
      await promociones.recargar();
    } catch (err) {
      setFormError(mensajeError(err));
      await promociones.recargar();
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (p: Promocion) => {
    try {
      await api.put(`/admin/promociones/${p.idPromocion}`, datosPromo(!p.activo, p));
      await promociones.recargar();
    } catch (err) {
      addToast('error', 'No se pudo cambiar la promoción', mensajeError(err));
    }
  };

  const filtro = prodSearch.trim().toLowerCase();
  const listaProductos = (productos.datos ?? []).filter(
    (p) => p.activo && (!filtro || p.nombreProducto.toLowerCase().includes(filtro) || p.sku.toLowerCase().includes(filtro)),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Promociones</h1>
          <p className="text-sm text-slate-500">Descuentos por porcentaje o monto fijo asignados a productos</p>
        </div>
        <Button variant="primary" onClick={abrirNueva}>
          <Plus className="w-4 h-4" /> Nueva promoción
        </Button>
      </div>

      <AlertBanner variant="info">Las promociones no se acumulan: SQL Server aplica la de mayor descuento (fn_PromocionVigente).</AlertBanner>
      {promociones.error && <AlertBanner variant="error">{promociones.error}</AlertBanner>}

      <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Nombre</th>
                <th className="px-4 py-3.5">Tipo</th>
                <th className="px-4 py-3.5 text-right">Valor</th>
                <th className="px-4 py-3.5">Inicio</th>
                <th className="px-4 py-3.5">Fin</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-center">Productos</th>
                <th className="px-4 py-3.5 text-center">Activo</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(promociones.datos ?? []).map((promo) => (
                <tr key={promo.idPromocion} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 font-semibold text-slate-900">
                    <span className="inline-flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#F28C28]" />
                      {promo.nombrePromocion}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{promo.tipoDescuento === 'P' ? 'Porcentaje' : 'Monto'}</td>
                  <td className="px-4 py-3.5 text-right font-mono-num font-bold text-slate-900">
                    {promo.tipoDescuento === 'P' ? `${promo.valor} %` : formatCRC(promo.valor)}
                  </td>
                  <td className="px-4 py-3.5 font-mono-num text-xs text-slate-600">{formatDateTime(promo.fechaInicio)}</td>
                  <td className="px-4 py-3.5 font-mono-num text-xs text-slate-600">{formatDateTime(promo.fechaFin)}</td>
                  <td className="px-4 py-3.5">
                    <PromotionStatusBadge status={promo.estadoVigencia} />
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono-num">{promo.cantidadProductos}</td>
                  <td className="px-4 py-3.5 text-center">
                    <Toggle checked={promo.activo} onChange={() => void toggleActivo(promo)} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Button size="sm" variant="secondary" onClick={() => void abrirEdicion(promo)}>
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPromo ? `Editar promoción · ${editingPromo.nombrePromocion}` : 'Nueva promoción'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" loading={guardando} onClick={() => handleSave()}>
              Guardar promoción
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <AlertBanner variant="error">{formError}</AlertBanner>}

          <Input label="Nombre de la promoción" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Festival Mascota Feliz 20%" maxLength={100} required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Tipo de descuento</label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-[10px]">
                {(['P', 'M'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`py-2 text-xs font-semibold rounded-[8px] transition-colors cursor-pointer ${tipo === t ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                  >
                    {t === 'P' ? 'Porcentaje (%)' : 'Monto fijo (₡)'}
                  </button>
                ))}
              </div>
            </div>
            <Input label={tipo === 'P' ? 'Valor (% máx 100)' : 'Valor en colones (₡)'} type="number" value={valor} onChange={(e) => setValor(e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Fecha y hora de inicio" type="datetime-local" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required />
            <Input label="Fecha y hora de fin" type="datetime-local" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required />
          </div>

          {editingPromo && <Toggle checked={activo} onChange={setActivo} label="Promoción activa" />}

          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900">Productos asignados ({seleccionados.length})</label>
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 w-56"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-[10px] divide-y divide-slate-100 p-2">
              {listaProductos.map((p) => (
                <div key={p.idProducto} className="py-2 px-2 hover:bg-slate-50 rounded-md">
                  <Checkbox
                    checked={seleccionados.includes(p.idProducto)}
                    onChange={() =>
                      setSeleccionados((prev) => (prev.includes(p.idProducto) ? prev.filter((x) => x !== p.idProducto) : [...prev, p.idProducto]))
                    }
                    label={`${p.sku} — ${p.nombreProducto} (${formatCRC(p.precioVigente)})`}
                  />
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
