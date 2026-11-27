// Rutas de la página <-> direcciones (URL). Permite usar atrás/adelante del navegador,
// recargar sin perder la pantalla y compartir el enlace de un producto o pedido.
// La API sirve index.html para cualquier ruta que no empiece con /api, así que todas funcionan al recargar.
import type { SearchFilters } from './pages/customer/SearchResultsPage';

export type Route =
  | { name: 'login' }
  | { name: 'register' }
  | { name: 'design-system' }
  | { name: 'catalog' }
  | { name: 'search' }
  | { name: 'product'; productId: number }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'order-confirmed'; orderId: number }
  | { name: 'my-orders' }
  | { name: 'order-detail'; orderId: number; print?: boolean }
  | { name: 'profile' }
  | { name: 'admin-dashboard' }
  | { name: 'admin-products' }
  | { name: 'admin-product-form'; productId?: number }
  | { name: 'admin-brands' }
  | { name: 'admin-categories' }
  | { name: 'admin-species' }
  | { name: 'admin-promotions' }
  | { name: 'admin-inventory'; lowOnly?: boolean }
  | { name: 'admin-orders' }
  | { name: 'admin-order-detail'; orderId: number }
  | { name: 'admin-customers' }
  | { name: 'admin-reports' }
  | { name: 'admin-audit' }
  | { name: '403' }
  | { name: '404' };

export const EMPTY_FILTERS: SearchFilters = {
  keyword: '',
  brandId: '',
  categoryId: '',
  speciesId: '',
  minPrice: '',
  maxPrice: '',
  onlyFeatured: false,
  onlyOffers: false,
};

// Rutas fijas (sin parámetros)
const FIJAS: Record<string, Route> = {
  '/': { name: 'catalog' },
  '/ingresar': { name: 'login' },
  '/registro': { name: 'register' },
  '/sistema-de-diseno': { name: 'design-system' },
  '/buscar': { name: 'search' },
  '/carrito': { name: 'cart' },
  '/checkout': { name: 'checkout' },
  '/mis-pedidos': { name: 'my-orders' },
  '/perfil': { name: 'profile' },
  '/admin': { name: 'admin-dashboard' },
  '/admin/productos': { name: 'admin-products' },
  '/admin/productos/nuevo': { name: 'admin-product-form' },
  '/admin/marcas': { name: 'admin-brands' },
  '/admin/categorias': { name: 'admin-categories' },
  '/admin/especies': { name: 'admin-species' },
  '/admin/promociones': { name: 'admin-promotions' },
  '/admin/inventario': { name: 'admin-inventory' },
  '/admin/pedidos': { name: 'admin-orders' },
  '/admin/clientes': { name: 'admin-customers' },
  '/admin/reportes': { name: 'admin-reports' },
  '/admin/auditoria': { name: 'admin-audit' },
  '/403': { name: '403' },
};

// Rutas con un número en la dirección
const CON_ID: { patron: RegExp; crear: (id: number, q: URLSearchParams) => Route }[] = [
  { patron: /^\/producto\/(\d+)$/, crear: (id) => ({ name: 'product', productId: id }) },
  { patron: /^\/pedido-confirmado\/(\d+)$/, crear: (id) => ({ name: 'order-confirmed', orderId: id }) },
  { patron: /^\/mis-pedidos\/(\d+)$/, crear: (id, q) => ({ name: 'order-detail', orderId: id, print: q.get('imprimir') === '1' }) },
  { patron: /^\/admin\/productos\/(\d+)$/, crear: (id) => ({ name: 'admin-product-form', productId: id }) },
  { patron: /^\/admin\/pedidos\/(\d+)$/, crear: (id) => ({ name: 'admin-order-detail', orderId: id }) },
];

export function rutaDesdeUrl(loc: Location = window.location): Route {
  const camino = loc.pathname.replace(/\/+$/, '') || '/';
  const q = new URLSearchParams(loc.search);
  if (camino === '/admin/inventario' && q.get('bajoMinimo') === '1') return { name: 'admin-inventory', lowOnly: true };
  if (FIJAS[camino]) return FIJAS[camino];
  for (const { patron, crear } of CON_ID) {
    const m = patron.exec(camino);
    if (m) return crear(Number(m[1]), q);
  }
  return { name: '404' };
}

export function filtrosDesdeUrl(loc: Location = window.location): SearchFilters {
  const q = new URLSearchParams(loc.search);
  return {
    keyword: q.get('texto') ?? '',
    brandId: q.get('marca') ?? '',
    categoryId: q.get('categoria') ?? '',
    speciesId: q.get('especie') ?? '',
    minPrice: q.get('min') ?? '',
    maxPrice: q.get('max') ?? '',
    onlyFeatured: q.get('destacados') === '1',
    onlyOffers: q.get('ofertas') === '1',
  };
}

function consultaFiltros(f: SearchFilters) {
  const q = new URLSearchParams();
  if (f.keyword.trim()) q.set('texto', f.keyword.trim());
  if (f.brandId) q.set('marca', f.brandId);
  if (f.categoryId) q.set('categoria', f.categoryId);
  if (f.speciesId) q.set('especie', f.speciesId);
  if (f.minPrice) q.set('min', f.minPrice);
  if (f.maxPrice) q.set('max', f.maxPrice);
  if (f.onlyFeatured) q.set('destacados', '1');
  if (f.onlyOffers) q.set('ofertas', '1');
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function urlDeRuta(r: Route, filtros?: SearchFilters): string {
  switch (r.name) {
    case 'search':
      return '/buscar' + (filtros ? consultaFiltros(filtros) : '');
    case 'product':
      return `/producto/${r.productId}`;
    case 'order-confirmed':
      return `/pedido-confirmado/${r.orderId}`;
    case 'order-detail':
      return `/mis-pedidos/${r.orderId}${r.print ? '?imprimir=1' : ''}`;
    case 'admin-product-form':
      return r.productId ? `/admin/productos/${r.productId}` : '/admin/productos/nuevo';
    case 'admin-order-detail':
      return `/admin/pedidos/${r.orderId}`;
    case 'admin-inventory':
      return r.lowOnly ? '/admin/inventario?bajoMinimo=1' : '/admin/inventario';
    case '404':
      return '/pagina-no-encontrada';
    default: {
      const entrada = Object.entries(FIJAS).find(([, ruta]) => ruta.name === r.name);
      return entrada ? entrada[0] : '/';
    }
  }
}

// Título de la pestaña del navegador (aparece en el historial)
const TITULOS: Partial<Record<Route['name'], string>> = {
  catalog: 'Inicio',
  login: 'Iniciar sesión',
  register: 'Crear cuenta',
  'design-system': 'Sistema de diseño',
  search: 'Buscar productos',
  product: 'Producto',
  cart: 'Carrito',
  checkout: 'Finalizar compra',
  'order-confirmed': 'Pedido confirmado',
  'my-orders': 'Mis pedidos',
  'order-detail': 'Pedido',
  profile: 'Mi perfil',
  'admin-dashboard': 'Admin · Dashboard',
  'admin-products': 'Admin · Productos',
  'admin-product-form': 'Admin · Producto',
  'admin-brands': 'Admin · Marcas',
  'admin-categories': 'Admin · Categorías',
  'admin-species': 'Admin · Especies',
  'admin-promotions': 'Admin · Promociones',
  'admin-inventory': 'Admin · Inventario',
  'admin-orders': 'Admin · Pedidos',
  'admin-order-detail': 'Admin · Pedido',
  'admin-customers': 'Admin · Clientes',
  'admin-reports': 'Admin · Reportes',
  'admin-audit': 'Admin · Auditoría',
  '403': 'Acceso denegado',
  '404': 'Página no encontrada',
};

export function tituloDeRuta(r: Route): string {
  const base = TITULOS[r.name] ?? 'PetShop Nova';
  const id = 'orderId' in r ? ` #${r.orderId}` : '';
  return `${base}${id} · PetShop Nova`;
}
