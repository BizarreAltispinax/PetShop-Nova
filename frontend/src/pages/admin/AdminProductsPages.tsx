import React, { useEffect, useState } from 'react';
import { ArrowLeft, Edit2, Percent, Plus, Star } from 'lucide-react';
import { useDb } from '../../store/db';
import { useApi } from '../../hooks/useApi';
import { api, mensajeError } from '../../api/client';
import { Categoria, Especie, Marca, ProductoDetalle, ProductoResumen } from '../../types';
import { formatCRC } from '../../utils/format';
import { AlertBanner, Button, Checkbox, Input, Modal, Pagination, SafeImage, Select, TableSkeleton, Textarea, Toggle } from '../../components/ui/DesignSystemKit';

// Datos que pide sp_Producto_Actualizar a partir de la ficha completa
function cuerpoActualizacion(d: ProductoDetalle['producto'], cambios: Record<string, unknown> = {}) {
  return {
    sku: d.sku,
    idMarca: d.idMarca,
    idCategoria: d.idCategoria,
    nombreProducto: d.nombreProducto,
    descripcion: d.descripcion,
    especificaciones: d.especificaciones,
    precioVigente: d.precioVigente,
    costo: d.costo,
    stockMinimo: d.stockMinimo,
    destacado: d.destacado,
    activo: d.activo,
    ...cambios,
  };
}

/* ======================== LISTA DE PRODUCTOS ======================== */
interface AdminProductsListPageProps {
  onCreateProduct: () => void;
  onEditProduct: (id: number) => void;
}

export const AdminProductsListPage: React.FC<AdminProductsListPageProps> = ({ onCreateProduct, onEditProduct }) => {
  const { addToast, recargarCatalogos } = useDb();
  const marcas = useApi<Marca[]>('/admin/marcas');
  const categorias = useApi<Categoria[]>('/admin/categorias');

  const [search, setSearch] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // sp_Producto_Buscar con @incluirInactivos = 1
  const productos = useApi<ProductoResumen[]>('/admin/productos', { texto: busqueda, idMarca: brandFilter, idCategoria: catFilter });
  const filtrados = (productos.datos ?? []).filter((p) => includeInactive || p.activo);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCatId, setBulkCatId] = useState<number>(0);
  const [bulkPct, setBulkPct] = useState('10');
  const [bulkErr, setBulkErr] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const paginados = filtrados.slice((page - 1) * pageSize, page * pageSize);

  const toggleActivo = async (p: ProductoResumen) => {
    try {
      const d = await api.get<ProductoDetalle>(`/admin/productos/${p.idProducto}`);
      await api.put(`/admin/productos/${p.idProducto}`, cuerpoActualizacion(d.producto, { activo: !p.activo }));
      await productos.recargar();
    } catch (err) {
      addToast('error', 'No se pudo cambiar el producto', mensajeError(err));
    }
  };

  const handleBulkSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBulkErr(null);
    setAplicando(true);
    try {
      const r = await api.post<{ filasAfectadas: number }>('/admin/productos/ajustar-precio', { idCategoria: bulkCatId, porcentaje: Number(bulkPct) });
      addToast('success', 'Precios ajustados', `${r.filasAfectadas} productos actualizados. El trigger registró cada cambio en Auditoría.`);
      setBulkOpen(false);
      await Promise.all([productos.recargar(), recargarCatalogos()]);
    } catch (err) {
      setBulkErr(mensajeError(err));
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Productos</h1>
          <p className="text-sm text-slate-500">Catálogo maestro, precios vigentes y disponibilidad</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setBulkErr(null);
              setBulkCatId(categorias.datos?.find((c) => c.activo)?.idCategoria ?? 0);
              setBulkOpen(true);
            }}
          >
            <Percent className="w-4 h-4" /> Ajustar precios por categoría
          </Button>
          <Button variant="primary" onClick={onCreateProduct}>
            <Plus className="w-4 h-4" /> Nuevo producto
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <Input label="Buscar producto o SKU" placeholder="Nombre o SKU..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Select label="Marca" value={brandFilter} onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }}>
          <option value="">Todas</option>
          {(marcas.datos ?? []).map((b) => (
            <option key={b.idMarca} value={b.idMarca}>{b.nombreMarca}</option>
          ))}
        </Select>
        <Select label="Categoría" value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}>
          <option value="">Todas</option>
          {(categorias.datos ?? []).map((c) => (
            <option key={c.idCategoria} value={c.idCategoria}>{c.nombreCategoria}</option>
          ))}
        </Select>
        <div className="pb-2">
          <Toggle checked={includeInactive} onChange={(v) => { setIncludeInactive(v); setPage(1); }} label="Incluir inactivos" />
        </div>
      </div>

      {productos.error && <AlertBanner variant="error">{productos.error}</AlertBanner>}

      {productos.cargando && filtrados.length === 0 ? (
        <TableSkeleton rows={6} cols={8} />
      ) : (
        <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Marca</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-right">Final</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-right">Mín.</th>
                  <th className="px-4 py-3 text-center">Dest.</th>
                  <th className="px-4 py-3 text-center">Activo</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginados.map((p) => (
                  <tr key={p.idProducto} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <SafeImage src={p.urlImagen ?? undefined} alt={p.nombreProducto} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                        <span className="font-semibold text-slate-900 max-w-[200px] truncate">{p.nombreProducto}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono-num text-xs text-slate-600">{p.sku}</td>
                    <td className="px-4 py-3 text-slate-700">{p.nombreMarca}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{p.nombreCategoria}</td>
                    <td className="px-4 py-3 text-right font-mono-num text-slate-600">{formatCRC(p.precioVigente)}</td>
                    <td className="px-4 py-3 text-right font-mono-num font-bold text-slate-900">{formatCRC(p.precioFinal)}</td>
                    <td className={`px-4 py-3 text-right font-mono-num font-semibold ${p.existencia < p.stockMinimo ? 'text-red-600' : 'text-slate-900'}`}>{p.existencia}</td>
                    <td className="px-4 py-3 text-right font-mono-num text-slate-500">{p.stockMinimo}</td>
                    <td className="px-4 py-3 text-center">
                      <Star className={`w-4 h-4 mx-auto ${p.destacado ? 'fill-[#F28C28] text-[#F28C28]' : 'text-slate-300'}`} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Toggle checked={p.activo} onChange={() => void toggleActivo(p)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => onEditProduct(p.idProducto)}>
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-100">
            <Pagination page={page} totalPages={totalPages} totalItems={filtrados.length} onPageChange={setPage} />
          </div>
        </div>
      )}

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Ajustar precios por categoría"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBulkOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={aplicando} onClick={() => handleBulkSubmit()}>Aplicar ajuste</Button>
          </>
        }
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          {bulkErr && <AlertBanner variant="error">{bulkErr}</AlertBanner>}
          <Select label="Categoría" value={bulkCatId} onChange={(e) => setBulkCatId(Number(e.target.value))}>
            {(categorias.datos ?? []).filter((c) => c.activo).map((c) => (
              <option key={c.idCategoria} value={c.idCategoria}>{c.nombreCategoria}</option>
            ))}
          </Select>
          <Input label="Porcentaje de ajuste (10 = +10 %, -5 = -5 %)" type="number" value={bulkPct} onChange={(e) => setBulkPct(e.target.value)} required />
          <AlertBanner variant="info">
            Se cambia el precio de todos los productos de la categoría a la vez. Cada cambio queda registrado en Auditoría.
          </AlertBanner>
        </form>
      </Modal>
    </div>
  );
};

/* ======================== CREAR / EDITAR PRODUCTO ======================== */
interface AdminProductFormPageProps {
  editingProductId?: number;
  onBack: () => void;
}

export const AdminProductFormPage: React.FC<AdminProductFormPageProps> = ({ editingProductId, onBack }) => {
  const { addToast, recargarCatalogos } = useDb();
  const isEdit = Boolean(editingProductId);
  const marcas = useApi<Marca[]>('/admin/marcas');
  const categorias = useApi<Categoria[]>('/admin/categorias');
  const detalle = useApi<ProductoDetalle>(isEdit ? `/admin/productos/${editingProductId}` : null);
  const especiesBd = useApi<Especie[]>('/admin/especies');
  const [especiesSel, setEspeciesSel] = useState<number[]>([]);

  const [sku, setSku] = useState('');
  const [nombre, setNombre] = useState('');
  const [idMarca, setIdMarca] = useState<number>(0);
  const [idCategoria, setIdCategoria] = useState<number>(0);
  const [descripcion, setDescripcion] = useState('');
  const [especificaciones, setEspecificaciones] = useState('');
  const [precioVigente, setPrecioVigente] = useState('');
  const [costo, setCosto] = useState('');
  const [stockMinimo, setStockMinimo] = useState('5');
  const [existencia, setExistencia] = useState('10');
  const [destacado, setDestacado] = useState(false);
  const [activo, setActivo] = useState(true);
  const [urlImagen, setUrlImagen] = useState('');
  const [nuevaImagen, setNuevaImagen] = useState('');
  const [nuevaPrincipal, setNuevaPrincipal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Valores iniciales: los del producto (edición) o la primera marca/categoría activa (nuevo)
  useEffect(() => {
    const d = detalle.datos?.producto;
    if (d) {
      setSku(d.sku);
      setNombre(d.nombreProducto);
      setIdMarca(d.idMarca);
      setIdCategoria(d.idCategoria);
      setDescripcion(d.descripcion ?? '');
      setEspecificaciones(d.especificaciones ?? '');
      setPrecioVigente(String(d.precioVigente));
      setCosto(String(d.costo));
      setStockMinimo(String(d.stockMinimo));
      setDestacado(d.destacado);
      setActivo(d.activo);
      setEspeciesSel((detalle.datos?.especies ?? []).map((s) => s.idEspecie));
    }
  }, [detalle.datos]);

  useEffect(() => {
    if (!isEdit && !idMarca && marcas.datos?.length) setIdMarca(marcas.datos.find((m) => m.activo)?.idMarca ?? marcas.datos[0].idMarca);
    if (!isEdit && !idCategoria && categorias.datos?.length) setIdCategoria(categorias.datos.find((c) => c.activo)?.idCategoria ?? categorias.datos[0].idCategoria);
  }, [isEdit, marcas.datos, categorias.datos, idMarca, idCategoria]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const base = {
      sku: sku.trim(),
      idMarca,
      idCategoria,
      nombreProducto: nombre.trim(),
      descripcion: descripcion.trim() || null,
      especificaciones: especificaciones.trim() || null,
      precioVigente: Number(precioVigente),
      costo: Number(costo),
      stockMinimo: Number(stockMinimo),
      destacado,
    };
    setGuardando(true);
    try {
      let id = editingProductId;
      if (isEdit) {
        await api.put(`/admin/productos/${editingProductId}`, { ...base, activo });
      } else {
        id = (await api.post<{ idProducto: number }>('/admin/productos', { ...base, urlImagen: urlImagen.trim() || null, existenciaInicial: Number(existencia) })).idProducto;
      }
      // Especies a las que va dirigido (sp_Producto_AsignarEspecies)
      await api.put(`/admin/productos/${id}/especies`, { especies: especiesSel });
      addToast(
        'success',
        isEdit ? 'Producto actualizado' : 'Producto creado',
        isEdit ? 'Los cambios de precio o costo quedaron en Auditoría.' : 'Se registró su inventario inicial como movimiento de ENTRADA.',
      );
      await recargarCatalogos();
      onBack();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const agregarImagen = async () => {
    if (!editingProductId) return;
    try {
      await api.post(`/admin/productos/${editingProductId}/imagenes`, { url: nuevaImagen.trim(), esPrincipal: nuevaPrincipal });
      setNuevaImagen('');
      setNuevaPrincipal(false);
      await detalle.recargar();
      addToast('success', 'Imagen agregada');
    } catch (err) {
      addToast('error', 'No se pudo agregar la imagen', mensajeError(err));
    }
  };

  if (isEdit && detalle.cargando && !detalle.datos) return <TableSkeleton rows={6} cols={3} />;
  if (isEdit && detalle.error) return <AlertBanner variant="error">{detalle.error}</AlertBanner>;

  return (
    <div className="max-w-4xl space-y-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0F8B8D] cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Volver a Productos
      </button>

      <h1 className="text-2xl font-extrabold text-slate-900">{isEdit ? `Editar producto · ${sku}` : 'Nuevo producto'}</h1>

      {isEdit && <AlertBanner variant="info">Los cambios de precio y costo los registra el trigger de auditoría.</AlertBanner>}
      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <form onSubmit={handleSubmit} className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="SKU (único)" placeholder="Ej. PSN-051" value={sku} onChange={(e) => setSku(e.target.value)} maxLength={30} required />
          <div className="sm:col-span-2">
            <Input label="Nombre del producto" placeholder="Ej. Croquetas Adulto Salmón 5 kg" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={150} required />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Marca" value={idMarca} onChange={(e) => setIdMarca(Number(e.target.value))}>
            {(marcas.datos ?? []).map((b) => (
              <option key={b.idMarca} value={b.idMarca}>{b.nombreMarca}{b.activo ? '' : ' (inactiva)'}</option>
            ))}
          </Select>
          <Select label="Categoría" value={idCategoria} onChange={(e) => setIdCategoria(Number(e.target.value))}>
            {(categorias.datos ?? []).map((c) => (
              <option key={c.idCategoria} value={c.idCategoria}>{c.nombreCategoria}{c.activo ? '' : ' (inactiva)'}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Textarea label="Descripción" rows={4} maxLength={600} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} hint={`${descripcion.length} / 600 caracteres`} />
          <Textarea label="Especificaciones" rows={4} maxLength={600} value={especificaciones} onChange={(e) => setEspecificaciones(e.target.value)} hint={`${especificaciones.length} / 600 caracteres`} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Input label="Precio vigente (₡)" type="number" step="0.01" value={precioVigente} onChange={(e) => setPrecioVigente(e.target.value)} required />
          <Input label="Costo (₡)" type="number" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} required />
          <Input label="Stock mínimo" type="number" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} required />
          {!isEdit && <Input label="Existencia inicial" type="number" value={existencia} onChange={(e) => setExistencia(e.target.value)} required />}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Mascotas a las que va dirigido <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {(especiesBd.datos ?? []).map((s) => (
              <Checkbox
                key={s.idEspecie}
                checked={especiesSel.includes(s.idEspecie)}
                onChange={() => setEspeciesSel((prev) => (prev.includes(s.idEspecie) ? prev.filter((x) => x !== s.idEspecie) : [...prev, s.idEspecie]))}
                label={s.nombreEspecie + (s.activo ? '' : ' (inactiva)')}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <Toggle checked={destacado} onChange={setDestacado} label="Producto destacado" />
          {isEdit && <Toggle checked={activo} onChange={setActivo} label="Producto activo" />}
        </div>

        <div className="pt-4 border-t border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">{isEdit ? 'Imágenes' : 'Imagen principal'}</h2>
          {!isEdit ? (
            <Input label="URL de la imagen principal (opcional)" value={urlImagen} onChange={(e) => setUrlImagen(e.target.value)} placeholder="https://..." maxLength={300} />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(detalle.datos?.imagenes ?? []).map((img) => (
                  <div key={img.idImagen} className={`rounded-[10px] border p-2.5 space-y-2 ${img.esPrincipal ? 'border-[#0F8B8D] bg-teal-50/30' : 'border-slate-200'}`}>
                    <SafeImage src={img.url} alt="Vista previa" className="w-full aspect-[4/3] object-cover rounded-lg" />
                    <span className={`text-xs font-bold ${img.esPrincipal ? 'text-[#0F8B8D]' : 'text-slate-500'}`}>{img.esPrincipal ? 'Principal' : 'Secundaria'}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[260px]">
                  <Input label="Agregar imagen por URL" placeholder="https://..." value={nuevaImagen} onChange={(e) => setNuevaImagen(e.target.value)} maxLength={300} />
                </div>
                <div className="pb-2">
                  <Checkbox checked={nuevaPrincipal} onChange={setNuevaPrincipal} label="Principal" />
                </div>
                <Button type="button" variant="secondary" disabled={!nuevaImagen.trim()} onClick={() => void agregarImagen()}>
                  Agregar imagen
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onBack}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={guardando}>{isEdit ? 'Guardar cambios' : 'Crear producto'}</Button>
        </div>
      </form>
    </div>
  );
};
