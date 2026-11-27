import { StockStatus } from '../types';

export function formatCRC(amount: number): string {
  const rounded = Math.round(amount);
  const absFormatted = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return rounded < 0 ? `-₡${absFormatted}` : `₡${absFormatted}`;
}

export function formatDate(isoOrYmd: string | null | undefined): string {
  if (!isoOrYmd) return 'Pendiente';
  // Handle YYYY-MM-DD directly to avoid timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrYmd)) {
    const [y, m, d] = isoOrYmd.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(isoOrYmd);
  if (Number.isNaN(d.getTime())) return isoOrYmd;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Pendiente';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const datePart = formatDate(iso);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}`;
}

// Fecha ISO de la API -> 'YYYY-MM-DD' en hora local (para <input type="date">)
export function toYmd(iso: string | null | undefined): string {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Fecha ISO de la API -> 'YYYY-MM-DDTHH:mm' en hora local (para <input type="datetime-local">)
export function toLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${toYmd(iso)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

// Etiqueta visual de disponibilidad (solo presentación; la existencia la valida la BD)
export function getStockStatus(existencia: number, stockMinimo: number): StockStatus {
  if (existencia <= 0) return 'Agotado';
  if (existencia <= stockMinimo) return 'Bajo mínimo';
  if (existencia <= stockMinimo + 4) return 'Últimas unidades';
  return 'Disponible';
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const COSTA_RICA_PROVINCES = [
  'San José',
  'Alajuela',
  'Cartago',
  'Heredia',
  'Guanacaste',
  'Puntarenas',
  'Limón',
];
