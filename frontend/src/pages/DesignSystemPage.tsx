import React, { useState } from 'react';
import { ArrowLeft, Layers, Sparkles } from 'lucide-react';
import {
  AlertBanner,
  Button,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  OrderStatusBadge,
  Pagination,
  PaymentStatusBadge,
  ProductGridSkeleton,
  PromotionStatusBadge,
  QuantityStepper,
  Select,
  SideDrawer,
  StarRating,
  StockStatusBadge,
  TableSkeleton,
  Toggle,
  VerticalTimeline,
} from '../components/ui/DesignSystemKit';
import { useDb } from '../store/db';
import { formatCRC } from '../utils/format';

interface DesignSystemPageProps {
  onBack: () => void;
}

export const DesignSystemPage: React.FC<DesignSystemPageProps> = ({ onBack }) => {
  const { addToast } = useDb();
  const [qty, setQty] = useState(2);
  const [rating, setRating] = useState(4);
  const [checked, setChecked] = useState(true);
  const [toggled, setToggled] = useState(true);
  const [dateVal, setDateVal] = useState('2026-11-23');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);

  const sampleRows = [
    { id: 39, cliente: 'Sofía Vargas Quesada', fecha: '23/11/2026', total: 20300, estado: 'Confirmado' as const },
    { id: 38, cliente: 'Lucía Solano Alvarado', fecha: '21/11/2026', total: 26340, estado: 'En preparación' as const },
    { id: 37, cliente: 'Sofía Vargas Quesada', fecha: '16/11/2026', total: 22500, estado: 'Enviado' as const },
    { id: 36, cliente: 'Carlos Mora Jiménez', fecha: '05/11/2026', total: 42800, estado: 'Entregado' as const },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#0F8B8D] mb-1">
            <Layers className="w-4 h-4" />
            Guía visual y componentes base · PetShop Nova
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Sistema de diseño</h1>
          <p className="text-sm text-slate-600 mt-1">
            Paleta institucional (Teal #0F8B8D + Naranja #F28C28), tipografía Nunito / DM Sans, estados fijos y componentes reutilizables.
          </p>
        </div>
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Volver a la aplicación
        </Button>
      </div>

      {/* Colors & Typography */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Paleta de colores</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: 'Primario Teal', hex: '#0F8B8D', bg: 'bg-[#0F8B8D]', text: 'text-white' },
              { name: 'Acento Oferta', hex: '#F28C28', bg: 'bg-[#F28C28]', text: 'text-white' },
              { name: 'Texto Base', hex: '#1E293B', bg: 'bg-[#1E293B]', text: 'text-white' },
              { name: 'Fondo Lienzo', hex: '#F6F8FA', bg: 'bg-[#F6F8FA]', text: 'text-slate-800 border border-slate-200' },
            ].map((c) => (
              <div key={c.hex} className="space-y-1.5">
                <div className={`h-16 rounded-[10px] flex items-end p-2 text-xs font-mono-num ${c.bg} ${c.text}`}>
                  {c.hex}
                </div>
                <div className="text-xs font-medium text-slate-700">{c.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Tipografía y formato local (Costa Rica)</h2>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="text-2xl font-extrabold font-display text-slate-900">
              Titular Nunito Bold · 24px–36px
            </div>
            <p>
              Cuerpo DM Sans Regular 15px: lectura limpia para descripciones de producto, tablas administrativas y validaciones SQL Server.
            </p>
            <div className="flex flex-wrap gap-6 pt-2 font-mono-num text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span>Moneda: <strong className="text-slate-900">{formatCRC(14500)}</strong></span>
              <span>Fecha: <strong className="text-slate-900">23/11/2026</strong></span>
              <span>SKU: <strong className="text-slate-900">PN-ALI-001</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* Buttons */}
      <section className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Botones y controles interactivos</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primario</Button>
          <Button variant="accent">Oferta / CTA</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="danger">Peligro / Cancelar</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" loading>Procesando</Button>
          <Button variant="primary" disabled>Deshabilitado</Button>
        </div>
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-8">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">Selector de cantidad</div>
            <QuantityStepper value={qty} min={1} max={10} onChange={setQty} />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">Calificación (1-5 estrellas)</div>
            <div className="flex items-center gap-2">
              <StarRating value={rating} onChange={setRating} readOnly={false} size="lg" />
              <span className="text-sm font-medium text-slate-700">{rating}/5</span>
            </div>
          </div>
          <Checkbox checked={checked} onChange={setChecked} label="Solo ofertas vigentes" />
          <Toggle checked={toggled} onChange={setToggled} label="Producto activo" />
        </div>
      </section>

      {/* Inputs, Selects, Date Pickers */}
      <section className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Entradas, selectores y fechas</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input label="Nombre del producto" placeholder="Ej. Croquetas Puppy 3 kg" required />
          <Input
            label="Correo con error"
            defaultValue="sofia.vargas@correo.cr"
            error="Ya existe un usuario registrado con ese correo"
          />
          <Select label="Provincia (Costa Rica)">
            <option>San José</option>
            <option>Alajuela</option>
            <option>Cartago</option>
            <option>Heredia</option>
            <option>Guanacaste</option>
            <option>Puntarenas</option>
            <option>Limón</option>
          </Select>
          <Input
            type="date"
            label="Fecha de nacimiento"
            value={dateVal}
            onChange={(e) => setDateVal(e.target.value)}
            hint="Formato visual dd/mm/aaaa"
          />
        </div>
      </section>

      {/* Badges */}
      <section className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-5">
        <h2 className="text-lg font-bold text-slate-900">Insignias de estado (colores fijos)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase">Estado de pedido</div>
            <div className="flex flex-wrap gap-2">
              <OrderStatusBadge status="Pendiente" />
              <OrderStatusBadge status="Confirmado" />
              <OrderStatusBadge status="En preparación" />
              <OrderStatusBadge status="Enviado" />
              <OrderStatusBadge status="Entregado" />
              <OrderStatusBadge status="Cancelado" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase">Estado de promoción</div>
            <div className="flex flex-wrap gap-2">
              <PromotionStatusBadge status="Vigente" />
              <PromotionStatusBadge status="Programada" />
              <PromotionStatusBadge status="Vencida" />
              <PromotionStatusBadge status="Inactiva" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase">Estado de pago</div>
            <div className="flex flex-wrap gap-2">
              <PaymentStatusBadge status="Aprobado" />
              <PaymentStatusBadge status="Rechazado" />
              <PaymentStatusBadge status="Reembolsado" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase">Existencia / Inventario</div>
            <div className="flex flex-wrap gap-2">
              <StockStatusBadge status="Disponible" />
              <StockStatusBadge status="Últimas unidades" />
              <StockStatusBadge status="Agotado" />
              <StockStatusBadge status="Bajo mínimo" />
            </div>
          </div>
        </div>
      </section>

      {/* Alerts, Toasts, Modals, Drawers */}
      <section className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Alertas, notificaciones, modales y paneles</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => addToast('success', 'Operación exitosa', 'Se actualizaron 4 productos')}>
              Toast éxito
            </Button>
            <Button size="sm" variant="danger" onClick={() => addToast('error', 'Error de SQL Server', 'Existencia insuficiente para uno o más productos.')}>
              Toast error
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
              Abrir modal
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setDrawerOpen(true)}>
              Abrir drawer lateral
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AlertBanner variant="error" title="Error devuelto por la base de datos">
            Existencia insuficiente para uno o más productos. No se registró el pedido ni se modificó el inventario.
          </AlertBanner>
          <AlertBanner variant="warning" title="Productos bajo mínimo">
            Hay 4 productos por debajo del stock mínimo configurado en bodega.
          </AlertBanner>
        </div>
      </section>

      {/* Table with Pagination & Timeline */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[12px] border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Tabla con paginación y skeleton</h2>
            <Toggle checked={showSkeleton} onChange={setShowSkeleton} label="Vista cargando" />
          </div>
          {showSkeleton ? (
            <TableSkeleton rows={4} cols={5} />
          ) : (
            <>
              <div className="overflow-x-auto border border-slate-200 rounded-[10px]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">N.º</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sampleRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono-num font-semibold">#{row.id}</td>
                        <td className="px-4 py-3 text-slate-800">{row.cliente}</td>
                        <td className="px-4 py-3 font-mono-num text-slate-600">{row.fecha}</td>
                        <td className="px-4 py-3"><OrderStatusBadge status={row.estado} /></td>
                        <td className="px-4 py-3 text-right font-mono-num font-semibold">{formatCRC(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} totalPages={3} totalItems={12} onPageChange={setPage} />
            </>
          )}
        </div>

        <div className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Línea de tiempo vertical</h2>
          <VerticalTimeline
            entries={[
              { estado: 'Pendiente', fechaHora: '2026-11-16T15:30:00Z' },
              { estado: 'Confirmado', fechaHora: '2026-11-16T15:32:00Z', nota: 'Pago aprobado' },
              { estado: 'En preparación', fechaHora: '2026-11-16T17:45:00Z' },
              { estado: 'Enviado', fechaHora: '2026-11-17T10:20:00Z', nota: 'Guía CR-2026-000379' },
            ]}
          />
        </div>
      </section>

      {/* Empty state & Card Skeleton */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmptyState
          title="No encontramos productos con esos filtros"
          description="Intente limpiar los filtros de marca, categoría o rango de precios para explorar todo nuestro catálogo."
          action={<Button variant="primary">Limpiar filtros</Button>}
        />
        <div className="bg-white rounded-[12px] border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Esqueleto de carga (Catálogo)</h2>
          <ProductGridSkeleton count={2} />
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ejemplo de Modal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cerrar</Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>Aceptar</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Los modales se utilizan para confirmaciones irreversibles, formularios de marca/categoría, reseñas y ajuste masivo de precios.
        </p>
      </Modal>

      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Ejemplo de Drawer Lateral"
        subtitle="Utilizado para Kardex de inventario y detalle de clientes"
      >
        <div className="space-y-4 text-sm text-slate-600">
          <AlertBanner variant="info" title="Consulta SQL en vivo">
            Este panel lateral permite inspeccionar movimientos históricos sin perder el contexto de la tabla principal.
          </AlertBanner>
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Sparkles className="w-4 h-4 text-[#F28C28]" /> Contenido desplazable independiente.
          </div>
        </div>
      </SideDrawer>
    </div>
  );
};
