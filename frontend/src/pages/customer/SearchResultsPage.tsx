import React, { useEffect, useState } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { useDb } from '../../store/db';
import { useApi } from '../../hooks/useApi';
import { ProductoResumen } from '../../types';
import { ProductCard } from '../../components/ProductCard';
import { AlertBanner, Button, Checkbox, EmptyState, Input, ProductGridSkeleton, Select } from '../../components/ui/DesignSystemKit';

export interface SearchFilters {
  keyword: string;
  brandId: string;
  categoryId: string;
  speciesId: string;
  minPrice: string;
  maxPrice: string;
  onlyFeatured: boolean;
  onlyOffers: boolean;
}

interface SearchResultsPageProps {
  filters: SearchFilters;
  onChangeFilters: (next: SearchFilters) => void;
  onResetFilters: () => void;
  onSelectProduct: (id: number) => void;
}

// Búsqueda filtrada: la hace sp_Producto_Buscar (texto, marca, categoría, rango de precio final,
// destacados y ofertas). El navegador solo envía los filtros.
export const SearchResultsPage: React.FC<SearchResultsPageProps> = ({
  filters,
  onChangeFilters,
  onResetFilters,
  onSelectProduct,
}) => {
  const { marcas, categorias, especies } = useDb();

  // El texto y los precios se envían 400 ms después de dejar de escribir
  const [filtrosAplicados, setFiltrosAplicados] = useState(filters);
  useEffect(() => {
    const t = setTimeout(() => setFiltrosAplicados(filters), 400);
    return () => clearTimeout(t);
  }, [filters]);

  const { datos, cargando, error } = useApi<ProductoResumen[]>('/productos', {
    texto: filtrosAplicados.keyword.trim(),
    idMarca: filtrosAplicados.brandId,
    idCategoria: filtrosAplicados.categoryId,
    idEspecie: filtrosAplicados.speciesId,
    precioMin: filtrosAplicados.minPrice,
    precioMax: filtrosAplicados.maxPrice,
    destacados: filtrosAplicados.onlyFeatured,
    ofertas: filtrosAplicados.onlyOffers,
  });
  const productos = datos ?? [];

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <aside className="w-full lg:w-[280px] shrink-0 bg-white rounded-[12px] border border-slate-200 p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#0F8B8D]" /> Filtros
            </h2>
            <button type="button" onClick={onResetFilters} className="text-xs font-medium text-[#0F8B8D] hover:underline flex items-center gap-1 cursor-pointer">
              <RotateCcw className="w-3 h-3" /> Limpiar filtros
            </button>
          </div>

          <Input
            label="Palabra clave"
            placeholder="Nombre, SKU o marca..."
            value={filters.keyword}
            onChange={(e) => onChangeFilters({ ...filters, keyword: e.target.value })}
          />

          <Select label="Mascota" value={filters.speciesId} onChange={(e) => onChangeFilters({ ...filters, speciesId: e.target.value })}>
            <option value="">Todas las mascotas</option>
            {especies.map((s) => (
              <option key={s.idEspecie} value={s.idEspecie}>
                {s.nombreEspecie}
              </option>
            ))}
          </Select>

          <Select label="Marca" value={filters.brandId} onChange={(e) => onChangeFilters({ ...filters, brandId: e.target.value })}>
            <option value="">Todas las marcas</option>
            {marcas.map((b) => (
              <option key={b.idMarca} value={b.idMarca}>
                {b.nombreMarca}
              </option>
            ))}
          </Select>

          <Select label="Categoría" value={filters.categoryId} onChange={(e) => onChangeFilters({ ...filters, categoryId: e.target.value })}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.idCategoria} value={c.idCategoria}>
                {c.nombreCategoria}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Precio mín. (₡)" type="number" min={0} placeholder="0" value={filters.minPrice} onChange={(e) => onChangeFilters({ ...filters, minPrice: e.target.value })} />
            <Input label="Precio máx. (₡)" type="number" min={0} placeholder="50000" value={filters.maxPrice} onChange={(e) => onChangeFilters({ ...filters, maxPrice: e.target.value })} />
          </div>

          <div className="space-y-3 pt-1 border-t border-slate-100">
            <Checkbox checked={filters.onlyFeatured} onChange={(val) => onChangeFilters({ ...filters, onlyFeatured: val })} label="Solo destacados" />
            <Checkbox checked={filters.onlyOffers} onChange={(val) => onChangeFilters({ ...filters, onlyOffers: val })} label="Solo ofertas" />
          </div>
        </aside>

        <div className="flex-1 min-w-0 space-y-5 w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-[12px] border border-slate-200 px-5 py-3.5">
            <h1 className="text-xl font-bold text-slate-900">Resultados de búsqueda</h1>
            <span className="text-sm text-slate-600 tabular-nums">
              {cargando ? 'Buscando...' : `${productos.length} ${productos.length === 1 ? 'producto encontrado' : 'productos encontrados'}`}
            </span>
          </div>

          {error ? (
            <AlertBanner variant="error">{error}</AlertBanner>
          ) : cargando && productos.length === 0 ? (
            <ProductGridSkeleton count={6} />
          ) : productos.length === 0 ? (
            <EmptyState
              title="No encontramos productos con esos filtros"
              description="Pruebe ajustando el rango de precio o seleccionando otra categoría."
              action={
                <Button variant="primary" onClick={onResetFilters}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {productos.map((p) => (
                <ProductCard key={p.idProducto} product={p} onSelectProduct={onSelectProduct} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
