import React, { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { ProductoResumen } from '../types';
import { useDb } from '../store/db';
import { formatCRC, getStockStatus } from '../utils/format';
import { Button, SafeImage, StarRating, StockStatusBadge } from './ui/DesignSystemKit';

interface ProductCardProps {
  product: ProductoResumen;
  onSelectProduct: (id: number) => void;
}

// Muestra el precio final y la promoción tal como los calcula SQL Server (sp_Producto_Buscar).
export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelectProduct }) => {
  const { agregarAlCarrito } = useDb();
  const [agregando, setAgregando] = useState(false);
  const stockStatus = getStockStatus(product.existencia, product.stockMinimo);
  const isOut = !product.disponible;
  const rating = product.calificacionPromedio ?? 0;

  const handleAdd = async () => {
    setAgregando(true);
    await agregarAlCarrito(product.idProducto, 1);
    setAgregando(false);
  };

  return (
    <div className="bg-white rounded-[12px] border border-slate-200/90 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 flex flex-col overflow-hidden">
      <button
        type="button"
        onClick={() => onSelectProduct(product.idProducto)}
        className="relative aspect-[4/3] w-full bg-[#F5F6F8] overflow-hidden text-left cursor-pointer group"
      >
        <SafeImage
          src={product.urlImagen ?? undefined}
          alt={product.nombreProducto}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
        />
        {product.nombrePromocion && (
          <span className="absolute top-3 left-3 bg-[#F28C28] text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-xs">
            {product.nombrePromocion}
          </span>
        )}
      </button>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">
            {product.nombreMarca}
          </span>
          <StockStatusBadge status={stockStatus} />
        </div>

        <button
          type="button"
          onClick={() => onSelectProduct(product.idProducto)}
          className="text-left font-bold text-slate-900 text-base leading-snug hover:text-[#0F8B8D] transition-colors line-clamp-2 min-h-[44px] cursor-pointer"
        >
          {product.nombreProducto}
        </button>

        <div className="flex items-center gap-1.5 mt-2">
          <StarRating value={rating} size="sm" />
          <span className="text-xs text-slate-500 tabular-nums">
            {product.cantidadResenas > 0 ? `${rating.toFixed(1)} (${product.cantidadResenas})` : 'Sin reseñas'}
          </span>
        </div>

        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2 mb-3">
            {product.descuento > 0 && (
              <span className="text-xs text-slate-400 line-through tabular-nums">
                {formatCRC(product.precioVigente)}
              </span>
            )}
            <span className="text-lg font-bold text-slate-900 tabular-nums">
              {formatCRC(product.precioFinal)}
            </span>
          </div>

          <Button
            variant={isOut ? 'secondary' : 'primary'}
            size="md"
            disabled={isOut}
            loading={agregando}
            onClick={handleAdd}
            className="w-full"
          >
            <ShoppingCart className="w-4 h-4" />
            {isOut ? 'Agotado' : 'Agregar al carrito'}
          </Button>
        </div>
      </div>
    </div>
  );
};
