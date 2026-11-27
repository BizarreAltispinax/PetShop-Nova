import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Info, MessageSquarePlus, ShoppingCart } from 'lucide-react';
import { useDb } from '../../store/db';
import { useApi } from '../../hooks/useApi';
import { api, mensajeError } from '../../api/client';
import { ProductoDetalle } from '../../types';
import { formatCRC, formatDate, getStockStatus } from '../../utils/format';
import {
  AlertBanner,
  Button,
  Modal,
  QuantityStepper,
  SafeImage,
  StarRating,
  StockStatusBadge,
  Textarea,
} from '../../components/ui/DesignSystemKit';

interface ProductDetailPageProps {
  productId: number;
  onBack: () => void;
  onGoCart: () => void;
}

// Detalle de producto: sp_Producto_ObtenerDetalle (datos, imágenes y reseñas).
export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ productId, onBack, onGoCart }) => {
  const { esCliente, agregarAlCarrito, addToast } = useDb();
  const { datos, cargando, error, recargar } = useApi<ProductoDetalle>(`/productos/${productId}`);

  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [agregando, setAgregando] = useState(false);
  const [activeTab, setActiveTab] = useState<'descripcion' | 'especificaciones' | 'resenas'>('descripcion');

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [enviandoResena, setEnviandoResena] = useState(false);

  if (cargando && !datos) {
    return <div className="max-w-[1280px] mx-auto px-6 py-12 text-sm text-slate-500">Cargando producto...</div>;
  }

  if (error || !datos) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <AlertBanner variant="error">{error ?? 'El producto solicitado no existe.'}</AlertBanner>
        <div className="mt-4">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" /> Volver al catálogo
          </Button>
        </div>
      </div>
    );
  }

  const { producto, imagenes, resenas, especies } = datos;
  const promedio = producto.calificacionPromedio ?? 0;
  const stockStatus = getStockStatus(producto.existencia, producto.stockMinimo);
  const isOut = !producto.disponible;
  const listaImagenes = imagenes.length > 0 ? imagenes : [{ idImagen: 0, url: '', esPrincipal: true }];
  const currentImg = listaImagenes[selectedImgIdx] ?? listaImagenes[0];

  // Distribución de estrellas para la gráfica (solo presentación de las reseñas recibidas)
  const distribucion = [5, 4, 3, 2, 1].map((n) => resenas.filter((r) => r.calificacion === n).length);

  const handleAdd = async () => {
    setAgregando(true);
    await agregarAlCarrito(producto.idProducto, qty);
    setAgregando(false);
  };

  const handleSubmitReview = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setReviewError(null);
    setEnviandoResena(true);
    try {
      // sp_Resena_Crear valida que el cliente compró y recibió el producto, y que no lo reseñó antes
      await api.post('/mi/resenas', {
        idProducto: producto.idProducto,
        calificacion: reviewStars,
        comentario: reviewComment.trim() || null,
      });
      setReviewModalOpen(false);
      addToast('success', 'Reseña publicada', 'Gracias por compartir su opinión.');
      await recargar();
    } catch (err) {
      setReviewError(mensajeError(err));
    } finally {
      setEnviandoResena(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-8">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0F8B8D] cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Volver al catálogo
      </button>

      <div className="bg-white rounded-[12px] border border-slate-200 p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Galería */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-[4/3] w-full rounded-[12px] bg-[#F5F6F8] overflow-hidden border border-slate-100">
            <SafeImage src={currentImg?.url || undefined} alt={producto.nombreProducto} className="w-full h-full object-contain" />
          </div>
          {listaImagenes.length > 1 && (
            <div className="flex items-center gap-3">
              {listaImagenes.map((img, idx) => (
                <button
                  key={img.idImagen}
                  type="button"
                  onClick={() => setSelectedImgIdx(idx)}
                  className={`w-20 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    idx === selectedImgIdx ? 'border-[#0F8B8D]' : 'border-slate-200 opacity-75 hover:opacity-100'
                  }`}
                >
                  <SafeImage src={img.url} alt={`${producto.nombreProducto} vista ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Compra */}
        <div className="lg:col-span-6 flex flex-col space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#0F8B8D] uppercase">{producto.nombreMarca}</span>
              <span>·</span>
              <span>{producto.nombreCategoria}</span>
              <span>·</span>
              <span className="font-mono-num">SKU: {producto.sku}</span>
            </div>
            {especies.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-500">Para:</span>
                {especies.map((s) => (
                  <span key={s.idEspecie} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-[#0F8B8D] border border-teal-200">
                    {s.nombreEspecie}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{producto.nombreProducto}</h1>
            <div className="flex items-center gap-2 pt-1">
              <StarRating value={promedio} size="md" />
              <span className="text-sm text-slate-600 tabular-nums">
                {producto.cantidadResenas > 0
                  ? `${promedio.toFixed(1)} de 5 (${producto.cantidadResenas} reseñas)`
                  : 'Sin reseñas todavía'}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-[12px] border border-slate-200 p-5 space-y-2">
            {producto.nombrePromocion && (
              <div className="inline-flex items-center gap-1.5 bg-[#F28C28] text-white text-xs font-semibold px-2.5 py-1 rounded-md">
                Promoción: {producto.nombrePromocion}
              </div>
            )}
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{formatCRC(producto.precioFinal)}</span>
              {producto.descuento > 0 && (
                <>
                  <span className="text-base text-slate-400 line-through tabular-nums">{formatCRC(producto.precioVigente)}</span>
                  <span className="text-sm font-semibold text-[#F28C28] tabular-nums">Ahorra {formatCRC(producto.descuento)}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <StockStatusBadge status={stockStatus} />
            <span className="text-slate-700 font-medium tabular-nums">
              {isOut ? 'Agotado' : `${producto.existencia} unidades disponibles`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <QuantityStepper value={isOut ? 0 : qty} min={isOut ? 0 : 1} max={Math.max(1, producto.existencia)} disabled={isOut} onChange={setQty} />
            <Button variant="primary" size="lg" disabled={isOut} loading={agregando} onClick={handleAdd} className="flex-1 min-w-[200px]">
              <ShoppingCart className="w-5 h-5" />
              {isOut ? 'Agotado' : 'Agregar al carrito'}
            </Button>
            <Button variant="secondary" size="lg" onClick={onGoCart}>
              Ir al carrito
            </Button>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0F8B8D]" />
              Envío mediante Correos de Costa Rica a todo el país.
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas */}
      <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-6">
          {[
            { id: 'descripcion', label: 'Descripción' },
            { id: 'especificaciones', label: 'Especificaciones' },
            { id: 'resenas', label: `Reseñas (${producto.cantidadResenas})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id ? 'border-[#0F8B8D] text-[#0F8B8D] bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 lg:p-8">
          {activeTab === 'descripcion' && (
            <p className="text-slate-700 leading-relaxed max-w-3xl">{producto.descripcion || 'Sin descripción.'}</p>
          )}

          {activeTab === 'especificaciones' && (
            <div className="text-slate-700 leading-relaxed whitespace-pre-line max-w-3xl">
              {producto.especificaciones || 'Sin especificaciones.'}
            </div>
          )}

          {activeTab === 'resenas' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-4 bg-slate-50 rounded-[12px] border border-slate-200 p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-extrabold text-slate-900 tabular-nums">{promedio.toFixed(1)}</div>
                  <div>
                    <StarRating value={promedio} size="md" />
                    <div className="text-xs text-slate-500 mt-1">
                      Basado en {producto.cantidadResenas} {producto.cantidadResenas === 1 ? 'reseña' : 'reseñas'}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((stars, idx) => {
                    const count = distribucion[idx];
                    const pct = resenas.length > 0 ? Math.round((count / resenas.length) * 100) : 0;
                    return (
                      <div key={stars} className="flex items-center gap-2 text-xs">
                        <span className="w-12 text-slate-600 tabular-nums">{stars} estr.</span>
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#F28C28]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-7 text-right text-slate-500 tabular-nums">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-8 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="text-lg font-bold text-slate-900">Opiniones de clientes</h3>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!esCliente}
                      onClick={() => {
                        setReviewError(null);
                        setReviewStars(5);
                        setReviewComment('');
                        setReviewModalOpen(true);
                      }}
                    >
                      <MessageSquarePlus className="w-4 h-4" /> Escribir reseña
                    </Button>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      {esCliente
                        ? 'Solo se aceptan reseñas de productos comprados y recibidos (una por producto).'
                        : 'Inicie sesión como cliente para escribir una reseña.'}
                    </span>
                  </div>
                </div>

                {resenas.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 border border-dashed border-slate-200 rounded-lg text-center">
                    Aún no hay reseñas para este producto.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {resenas.map((rev) => (
                      <div key={rev.idResena} className="py-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-sm text-slate-900">{rev.cliente}</span>
                            <StarRating value={rev.calificacion} size="sm" />
                          </div>
                          <span className="text-xs font-mono-num text-slate-500">{formatDate(rev.fecha)}</span>
                        </div>
                        {rev.comentario && <p className="text-sm text-slate-700 leading-relaxed">{rev.comentario}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={`Escribir reseña · ${producto.nombreProducto}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" loading={enviandoResena} onClick={() => handleSubmitReview()}>
              Publicar reseña
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitReview} className="space-y-4">
          {reviewError && <AlertBanner variant="error">{reviewError}</AlertBanner>}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Calificación <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <StarRating value={reviewStars} onChange={setReviewStars} readOnly={false} size="lg" />
              <span className="text-sm font-semibold text-slate-700">{reviewStars} de 5</span>
            </div>
          </div>
          <Textarea
            label="Comentario (opcional)"
            rows={4}
            maxLength={500}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Cuéntenos cómo le fue a su mascota con este producto..."
            hint={`${reviewComment.length} / 500 caracteres`}
          />
        </form>
      </Modal>
    </div>
  );
};
