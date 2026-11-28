import React from 'react';
import { ArrowRight, Bird, Cat, Dog, Fish, PawPrint, Rabbit, Tag, Turtle } from 'lucide-react';
import { useDb } from '../../store/db';
import { useApi } from '../../hooks/useApi';
import { ProductoResumen, Promocion } from '../../types';
import { formatCRC } from '../../utils/format';
import imagenPortada from '../../assets/images/hero_petshop_promo_1795496990902.jpg';
import { ProductCard } from '../../components/ProductCard';
import { AlertBanner, Button, ProductGridSkeleton, SafeImage } from '../../components/ui/DesignSystemKit';

// Ícono por especie (según el nombre que viene de la tabla Especie)
function iconoEspecie(nombre: string) {
  const n = nombre.toLowerCase();
  if (n.includes('perro')) return Dog;
  if (n.includes('gato')) return Cat;
  if (n.includes('roedor') || n.includes('mamífero')) return Rabbit;
  if (n.includes('pez') || n.includes('peces')) return Fish;
  if (n.includes('ave')) return Bird;
  if (n.includes('reptil')) return Turtle;
  return PawPrint;
}

interface CatalogPageProps {
  onSelectCategory: (catId: number) => void;
  onSelectSpecies: (idEspecie: number) => void;
  onSelectProduct: (productId: number) => void;
  onGoSearchOffers: () => void;
  onGoSearchAll: () => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  onSelectCategory,
  onSelectSpecies,
  onSelectProduct,
  onGoSearchOffers,
  onGoSearchAll,
}) => {
  const { categorias, especies } = useDb();
  const destacados = useApi<ProductoResumen[]>('/productos', { destacados: true });
  const ofertas = useApi<ProductoResumen[]>('/productos', { ofertas: true });
  const promociones = useApi<Promocion[]>('/promociones');

  const heroPromo = promociones.datos?.[0];

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-12">
      {/* Portada con la promoción vigente */}
      <section className="bg-white rounded-[12px] border border-slate-200 overflow-hidden shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 p-8 lg:p-12 flex flex-col justify-center space-y-5">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#F28C28] uppercase tracking-wider">
              <Tag className="w-4 h-4" />
              {heroPromo ? `Promoción vigente · ${heroPromo.nombrePromocion}` : 'Colección PetShop Nova'}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight text-balance">
              Todo para sus mascotas, con entrega en Costa Rica
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-xl">
              {heroPromo
                ? `Aproveche ${heroPromo.tipoDescuento === 'P' ? `un ${heroPromo.valor}%` : `${formatCRC(heroPromo.valor)}`} de descuento en productos seleccionados.`
                : 'Alimento, accesorios y hábitats para perros, gatos, roedores, peces, aves y reptiles, con entrega a las 7 provincias.'}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button variant="accent" size="lg" onClick={onGoSearchOffers}>
                Ver ofertas vigentes <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="lg" onClick={onGoSearchAll}>
                Explorar catálogo completo
              </Button>
            </div>
          </div>
          <div className="lg:col-span-6 relative min-h-[280px] lg:min-h-[380px] bg-slate-100">
            <SafeImage src={imagenPortada} alt="Perro y gato descansando en un hogar" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Compra por mascota (tabla Especie) */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Compra por mascota</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {especies.map((s) => {
            const Icono = iconoEspecie(s.nombreEspecie);
            return (
              <button
                key={s.idEspecie}
                type="button"
                onClick={() => onSelectSpecies(s.idEspecie)}
                className="flex flex-col items-center gap-2 p-4 rounded-[12px] bg-white border border-slate-200 hover:border-[#0F8B8D] hover:bg-teal-50/40 transition-colors cursor-pointer"
              >
                <span className="w-12 h-12 rounded-full bg-teal-50 text-[#0F8B8D] flex items-center justify-center">
                  <Icono className="w-6 h-6" />
                </span>
                <span className="text-sm font-semibold text-slate-800 text-center leading-tight">{s.nombreEspecie}</span>
                <span className="text-xs text-slate-500">{s.cantidadProductos} productos</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Categorías */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Categorías</h2>
          <button type="button" onClick={onGoSearchAll} className="text-sm font-medium text-[#0F8B8D] hover:underline cursor-pointer">
            Ver todo el catálogo
          </button>
        </div>
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
          {categorias.map((cat) => (
            <button
              key={cat.idCategoria}
              type="button"
              onClick={() => onSelectCategory(cat.idCategoria)}
              className="px-4 py-2 rounded-[10px] bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-[#0F8B8D] hover:text-[#0F8B8D] hover:bg-teal-50/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
            >
              {cat.nombreCategoria}
            </button>
          ))}
        </div>
      </section>

      <SeccionProductos
        titulo="Productos destacados"
        subtitulo="Los favoritos de nuestras familias en Costa Rica"
        textoBoton="Ver todos"
        onVerMas={onGoSearchAll}
        consulta={destacados}
        onSelectProduct={onSelectProduct}
      />

      <SeccionProductos
        titulo="Ofertas vigentes"
        subtitulo="Promociones activas: si un producto tiene varias, se aplica automáticamente la de mayor descuento"
        textoBoton="Ver todas las ofertas"
        onVerMas={onGoSearchOffers}
        consulta={ofertas}
        onSelectProduct={onSelectProduct}
      />
    </div>
  );
};

const SeccionProductos: React.FC<{
  titulo: string;
  subtitulo: string;
  textoBoton: string;
  onVerMas: () => void;
  consulta: { datos: ProductoResumen[] | null; cargando: boolean; error: string | null };
  onSelectProduct: (id: number) => void;
}> = ({ titulo, subtitulo, textoBoton, onVerMas, consulta, onSelectProduct }) => (
  <section className="space-y-5">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{titulo}</h2>
        <p className="text-sm text-slate-500">{subtitulo}</p>
      </div>
      <Button variant="ghost" onClick={onVerMas}>
        {textoBoton} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
    {consulta.error ? (
      <AlertBanner variant="error">{consulta.error}</AlertBanner>
    ) : consulta.cargando ? (
      <ProductGridSkeleton count={4} />
    ) : (consulta.datos ?? []).length === 0 ? (
      <p className="text-sm text-slate-500">No hay productos para mostrar.</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {(consulta.datos ?? []).slice(0, 8).map((p) => (
          <ProductCard key={p.idProducto} product={p} onSelectProduct={onSelectProduct} />
        ))}
      </div>
    )}
  </section>
);
