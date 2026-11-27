import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Minus,
  Package,
  Plus,
  Star,
  X,
} from 'lucide-react';
import {
  OrderHistoryEntry,
  OrderStatus,
  PaymentStatus,
  PromotionStatus,
  StockStatus,
} from '../../types';
import IMG_EMPTY from '../../assets/images/empty_pet_illustration_1795496992211.jpg';
import { formatDateTime } from '../../utils/format';

/* ======================== BUTTONS ======================== */
export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-[10px] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F8B8D] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-[#0F8B8D] text-white hover:bg-[#0B7072] shadow-xs',
    accent: 'bg-[#F28C28] text-white hover:bg-[#D97719] shadow-xs',
    secondary:
      'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-xs',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 min-h-[34px]',
    md: 'text-sm px-4 py-2 min-h-[40px]',
    lg: 'text-base px-5 py-2.5 min-h-[44px]',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
};

/* ======================== INPUTS, SELECTS, DATE ======================== */
interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  label,
  error,
  hint,
  required,
  children,
  className = '',
}) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && (
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <span className="text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        {error}
      </span>
    ) : hint ? (
      <span className="text-xs text-slate-500">{hint}</span>
    ) : null}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, hint, required, className = '', ...props }) => (
  <FieldWrapper label={label} error={error} hint={hint} required={required}>
    <input
      className={`w-full rounded-[10px] border bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F8B8D]/20 focus:border-[#0F8B8D] disabled:bg-slate-100 disabled:text-slate-500 ${
        error ? 'border-red-400' : 'border-slate-300'
      } ${className}`}
      {...props}
    />
  </FieldWrapper>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  hint,
  required,
  className = '',
  ...props
}) => (
  <FieldWrapper label={label} error={error} hint={hint} required={required}>
    <textarea
      className={`w-full rounded-[10px] border bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F8B8D]/20 focus:border-[#0F8B8D] ${
        error ? 'border-red-400' : 'border-slate-300'
      } ${className}`}
      {...props}
    />
  </FieldWrapper>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  hint,
  required,
  className = '',
  children,
  ...props
}) => (
  <FieldWrapper label={label} error={error} hint={hint} required={required}>
    <select
      className={`w-full rounded-[10px] border bg-white px-3.5 py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F8B8D]/20 focus:border-[#0F8B8D] ${
        error ? 'border-red-400' : 'border-slate-300'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  </FieldWrapper>
);

/* ======================== CHECKBOX & TOGGLE ======================== */
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label, disabled }) => (
  <label className={`inline-flex items-center gap-2.5 text-sm select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-4.5 h-4.5 rounded-[5px] border flex items-center justify-center transition-colors shrink-0 ${
        checked ? 'bg-[#0F8B8D] border-[#0F8B8D] text-white' : 'bg-white border-slate-300'
      }`}
    >
      {checked && <Check className="w-3 h-3 stroke-[3]" />}
    </button>
    <span className="text-slate-700">{label}</span>
  </label>
);

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, disabled }) => (
  <label className={`inline-flex items-center gap-2.5 text-sm select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-150 ${
        checked ? 'bg-[#0F8B8D]' : 'bg-slate-300'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-150 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
    {label && <span className="text-slate-700 font-medium">{label}</span>}
  </label>
);

/* ======================== QUANTITY STEPPER ======================== */
interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  min = 1,
  max = 999,
  onChange,
  disabled = false,
  size = 'md',
}) => {
  const btnCls =
    size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const txtCls =
    size === 'sm' ? 'w-8 text-xs' : 'w-10 text-sm';

  return (
    <div className="inline-flex items-center rounded-[10px] border border-slate-300 bg-white overflow-hidden">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`${btnCls} flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
        aria-label="Disminuir cantidad"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className={`${txtCls} text-center font-medium tabular-nums text-slate-900 select-none`}>
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={`${btnCls} flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
        aria-label="Aumentar cantidad"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/* ======================== STAR RATING ======================== */
interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  size = 'sm',
  readOnly = true,
}) => {
  const sizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(star)}
            className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
            aria-label={`${star} estrellas`}
          >
            <Star
              className={`${sizes[size]} ${
                filled ? 'fill-[#F28C28] text-[#F28C28]' : 'fill-slate-100 text-slate-300'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

/* ======================== STATUS BADGES ======================== */
export const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const styles: Record<OrderStatus, string> = {
    Pendiente: 'bg-slate-100 text-slate-700 border-slate-200',
    Confirmado: 'bg-blue-50 text-blue-700 border-blue-200',
    'En preparación': 'bg-amber-50 text-amber-800 border-amber-200',
    Enviado: 'bg-purple-50 text-purple-700 border-purple-200',
    Entregado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Cancelado: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap ${styles[status]}`}
    >
      {status}
    </span>
  );
};

export const PromotionStatusBadge: React.FC<{ status: PromotionStatus }> = ({ status }) => {
  const styles: Record<PromotionStatus, string> = {
    Vigente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Programada: 'bg-blue-50 text-blue-700 border-blue-200',
    Vencida: 'bg-slate-100 text-slate-600 border-slate-200',
    Inactiva: 'bg-slate-700 text-white border-slate-800',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap ${styles[status]}`}
    >
      {status}
    </span>
  );
};

export const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const styles: Record<PaymentStatus, string> = {
    Aprobado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rechazado: 'bg-red-50 text-red-700 border-red-200',
    Reembolsado: 'bg-amber-50 text-amber-800 border-amber-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap ${styles[status]}`}
    >
      {status}
    </span>
  );
};

export const StockStatusBadge: React.FC<{ status: StockStatus }> = ({ status }) => {
  const styles: Record<StockStatus, string> = {
    Disponible: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Últimas unidades': 'bg-amber-50 text-amber-800 border-amber-200',
    Agotado: 'bg-red-50 text-red-700 border-red-200',
    'Bajo mínimo': 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap ${styles[status]}`}
    >
      {status}
    </span>
  );
};

/* ======================== ALERT BANNERS ======================== */
interface AlertBannerProps {
  variant: 'error' | 'warning' | 'success' | 'info';
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  variant,
  title,
  children,
  action,
  className = '',
}) => {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    info: 'bg-teal-50 border-teal-200 text-teal-900',
  };
  const icons = {
    error: <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-[#0F8B8D] shrink-0 mt-0.5" />,
  };

  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-4 rounded-[12px] border px-4 py-3.5 text-sm ${styles[variant]} ${className}`}
    >
      <div className="flex items-start gap-3">
        {icons[variant]}
        <div>
          {title && <div className="font-semibold mb-0.5">{title}</div>}
          <div>{children}</div>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

/* ======================== MODAL & DRAWER ======================== */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  size = 'md',
  children,
  footer,
}) => {
  if (!open) return null;
  const maxW = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4">
      <div
        className={`w-full ${maxW} bg-white rounded-[12px] shadow-xl border border-slate-200 flex flex-col max-h-[90vh]`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-[12px] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  children?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  variant = 'danger',
  children,
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant={variant} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
    {children && <div className="mt-4">{children}</div>}
  </Modal>
);

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  widthClass?: string;
  children: React.ReactNode;
}

export const SideDrawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  subtitle,
  widthClass = 'max-w-2xl',
  children,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]">
      <div
        className={`w-full ${widthClass} bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col`}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

/* ======================== PAGINATION ======================== */
interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (p: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalItems,
  onPageChange,
}) => {
  if (totalPages <= 1) {
    return (
      <div className="text-xs text-slate-500 py-2">
        Mostrando {totalItems} {totalItems === 1 ? 'registro' : 'registros'}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between pt-3 text-xs text-slate-600">
      <span>
        Página {page} de {totalPages} · {totalItems} registros
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Anterior
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
        >
          Siguiente <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

/* ======================== EMPTY STATE & SKELETONS ======================== */
export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white rounded-[12px] border border-slate-200">
    <img
      src={IMG_EMPTY}
      alt="Ilustración de mascota PetShop Nova"
      referrerPolicy="no-referrer"
      className="w-36 h-36 object-contain mb-4 rounded-xl"
    />
    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
    {description && <p className="text-sm text-slate-500 mt-1 max-w-md">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 6,
}) => (
  <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
    <div className="h-10 bg-slate-50 border-b border-slate-200" />
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="grid gap-4 px-4 py-3.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((__, cIdx) => (
            <div key={cIdx} className="h-4 rounded skeleton-shimmer" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="bg-white rounded-[12px] border border-slate-200 overflow-hidden p-4 flex flex-col gap-3"
      >
        <div className="aspect-[4/3] rounded-lg skeleton-shimmer" />
        <div className="h-3 w-20 rounded skeleton-shimmer" />
        <div className="h-4 w-3/4 rounded skeleton-shimmer" />
        <div className="h-5 w-1/3 rounded skeleton-shimmer mt-1" />
        <div className="h-10 w-full rounded-[10px] skeleton-shimmer mt-2" />
      </div>
    ))}
  </div>
);

/* ======================== VERTICAL TIMELINE ======================== */
export const VerticalTimeline: React.FC<{ entries: OrderHistoryEntry[] }> = ({ entries }) => (
  <ol className="relative space-y-5 pl-6 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
    {entries.map((entry, idx) => {
      const isLast = idx === entries.length - 1;
      const isCanceled = entry.estado === 'Cancelado';
      return (
        <li key={`${entry.estado}-${idx}`} className="relative">
          <span
            className={`absolute -left-6 top-1 w-[19px] h-[19px] rounded-full border-2 flex items-center justify-center ${
              isCanceled
                ? 'bg-red-50 border-red-500 text-red-600'
                : isLast
                ? 'bg-[#0F8B8D] border-[#0F8B8D] text-white'
                : 'bg-white border-[#0F8B8D] text-[#0F8B8D]'
            }`}
          >
            {isCanceled ? <X className="w-2.5 h-2.5" /> : <Check className="w-2.5 h-2.5" />}
          </span>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <OrderStatusBadge status={entry.estado} />
            <span className="text-xs font-mono-num text-slate-500">
              {formatDateTime(entry.fechaHora)}
            </span>
          </div>
          {entry.nota && <p className="text-xs text-slate-600 mt-1">{entry.nota}</p>}
        </li>
      );
    })}
  </ol>
);

/* ======================== RESILIENT IMAGE ======================== */
export const SafeImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = React.useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center ${className}`}
      >
        <Package className="w-8 h-8 mb-1.5 text-slate-300" />
        <span className="text-xs text-slate-500 line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
