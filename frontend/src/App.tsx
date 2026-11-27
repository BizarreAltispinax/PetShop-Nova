import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Bird,
  BarChart3,
  Boxes,
  ChevronDown,
  ClipboardList,
  FolderTree,
  Layers,
  LayoutDashboard,
  LogIn,
  LogOut,
  Package,
  PawPrint,
  Percent,
  Search,
  ShieldCheck,
  ShoppingCart,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { DbProvider, useDb } from './store/db';
import { useApi } from './hooks/useApi';
import { ToastContainer } from './components/ui/ToastContainer';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { ForbiddenPage, NotFoundPage } from './pages/ErrorPages';
import { CatalogPage } from './pages/customer/CatalogPage';
import { SearchFilters, SearchResultsPage } from './pages/customer/SearchResultsPage';
import { EMPTY_FILTERS, Route, filtrosDesdeUrl, rutaDesdeUrl, tituloDeRuta, urlDeRuta } from './routing';
import { ProductDetailPage } from './pages/customer/ProductDetailPage';
import {
  CartPage,
  CheckoutPage,
  OrderConfirmedPage,
} from './pages/customer/CartAndCheckoutPages';
import {
  MyOrdersPage,
  OrderDetailPage,
} from './pages/customer/OrderAndInvoicePages';
import { ProfilePage } from './pages/customer/ProfilePage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import {
  AdminProductFormPage,
  AdminProductsListPage,
} from './pages/admin/AdminProductsPages';
import {
  AdminBrandsCategoriesPage,
  AdminPromotionsPage,
} from './pages/admin/AdminCatalogMetaPages';
import {
  AdminCustomersPage,
  AdminInventoryPage,
  AdminOrdersPage,
} from './pages/admin/AdminInventoryAndOrdersPages';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';

function AppShell() {
  const { sesion, esAdmin, cargandoSesion, cerrarSesion, categorias, especies, unidadesCarrito, addToast } = useDb();
  // Para el menú se usa un objeto con nombre visible y rol (los datos vienen de /api/auth/yo)
  const currentUser = sesion
    ? { nombre: sesion.nombreCompleto?.split(' ')[0] ?? sesion.correo, nombreCompleto: sesion.nombreCompleto ?? sesion.correo, rol: sesion.rol }
    : null;
  const logout = () => {
    cerrarSesion();
    addToast('info', 'Sesión cerrada', 'Ha salido de su cuenta de PetShop Nova.');
  };

  // La pantalla actual sale de la URL: así funcionan atrás/adelante, recargar y los enlaces directos
  const [route, setRoute] = useState<Route>(() => rutaDesdeUrl());
  const [filters, setFilters] = useState<SearchFilters>(() => filtrosDesdeUrl());
  const [headerSearch, setHeaderSearch] = useState(() => filtrosDesdeUrl().keyword);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [mascotaMenuOpen, setMascotaMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAdminRoute = route.name.startsWith('admin-');
  // Al recargar una página que necesita sesión, esperar a que se verifique el token antes de mostrarla
  const esperandoSesion =
    cargandoSesion && ['cart', 'checkout', 'order-confirmed', 'my-orders', 'order-detail', 'profile'].includes(route.name);
  const cartCount = unidadesCarrito;
  // Alerta de bajo mínimo del encabezado admin: sp_Inventario_AlertaBajoMinimo
  const alertas = useApi<unknown[]>(esAdmin && isAdminRoute ? '/admin/inventario/alertas' : null, { r: route.name });
  const lowStockCount = alertas.datos?.length ?? 0;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [route.name]);

  // Botones atrás/adelante del navegador
  useEffect(() => {
    const alVolver = () => {
      setRoute(rutaDesdeUrl());
      setFilters(filtrosDesdeUrl());
      setCatMenuOpen(false);
      setUserMenuOpen(false);
    };
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, []);

  useEffect(() => {
    document.title = tituloDeRuta(route);
  }, [route]);

  // Cambia de pantalla y agrega una entrada al historial del navegador
  const navigate = (next: Route, filtrosNuevos?: SearchFilters) => {
    setCatMenuOpen(false);
    setMascotaMenuOpen(false);
    setUserMenuOpen(false);
    const url = urlDeRuta(next, filtrosNuevos ?? (next.name === 'search' ? filters : undefined));
    if (url !== window.location.pathname + window.location.search) {
      window.history.pushState(null, '', url);
    }
    setRoute(next);
  };

  // Abre la búsqueda con filtros (los filtros quedan en la URL)
  const irABusqueda = (f: SearchFilters) => {
    setFilters(f);
    setHeaderSearch(f.keyword);
    navigate({ name: 'search' }, f);
  };

  // Cambios de filtro dentro de la búsqueda: actualizan la URL sin llenar el historial
  const cambiarFiltros = (f: SearchFilters) => {
    setFilters(f);
    window.history.replaceState(null, '', urlDeRuta({ name: 'search' }, f));
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    irABusqueda({ ...EMPTY_FILTERS, keyword: headerSearch });
  };

  if (route.name === 'login') {
    return (
      <>
        <LoginPage
          onSuccess={(role) =>
            navigate(role === 'Administrador' ? { name: 'admin-dashboard' } : { name: 'catalog' })
          }
          onGoRegister={() => navigate({ name: 'register' })}
          onGoCatalog={() => navigate({ name: 'catalog' })}
          onGoDesignSystem={() => navigate({ name: 'design-system' })}
        />
        <ToastContainer />
      </>
    );
  }

  if (route.name === 'register') {
    return (
      <>
        <RegisterPage
          onSuccess={() => navigate({ name: 'catalog' })}
          onGoLogin={() => navigate({ name: 'login' })}
        />
        <ToastContainer />
      </>
    );
  }

  if (route.name === 'design-system') {
    return (
      <div className="min-h-screen bg-[#F6F8FA]">
        <DesignSystemPage
          onBack={() =>
            navigate(
              currentUser?.rol === 'Administrador'
                ? { name: 'admin-dashboard' }
                : { name: 'catalog' }
            )
          }
        />
        <ToastContainer />
      </div>
    );
  }

  /* ==================== ADMIN SHELL ==================== */
  if (isAdminRoute && currentUser?.rol === 'Administrador') {
    const adminNav = [
      { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'admin-products', label: 'Productos', icon: Package },
      { id: 'admin-brands', label: 'Marcas', icon: Award },
      { id: 'admin-categories', label: 'Categorías', icon: FolderTree },
      { id: 'admin-species', label: 'Especies', icon: Bird },
      { id: 'admin-promotions', label: 'Promociones', icon: Percent },
      { id: 'admin-inventory', label: 'Inventario', icon: Boxes },
      { id: 'admin-orders', label: 'Pedidos', icon: ClipboardList },
      { id: 'admin-customers', label: 'Clientes', icon: Users },
      { id: 'admin-reports', label: 'Reportes', icon: BarChart3 },
      { id: 'admin-audit', label: 'Auditoría', icon: ShieldCheck },
    ] as const;

    return (
      <div className="min-h-screen flex bg-[#F6F8FA]">
        {/* Left Sidebar */}
        <aside className="w-[248px] shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between no-print">
          <div>
            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-[8px] bg-[#0F8B8D] text-white flex items-center justify-center shrink-0">
                <PawPrint className="w-5 h-5" />
              </span>
              <span className="font-display font-extrabold text-lg text-slate-900 whitespace-nowrap">
                PetShop Nova
              </span>
            </div>

            <nav className="p-3 space-y-1">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const active =
                  route.name === item.id ||
                  (item.id === 'admin-products' && route.name === 'admin-product-form') ||
                  (item.id === 'admin-orders' && route.name === 'admin-order-detail');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate({ name: item.id } as Route)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#0F8B8D] text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-3 border-t border-slate-200 space-y-1 text-xs">
            <button
              type="button"
              onClick={() => navigate({ name: 'design-system' })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Layers className="w-4 h-4" /> Sistema de diseño
            </button>
            <button
              type="button"
              onClick={() => navigate({ name: 'catalog' })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" /> Ver tienda pública
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate({ name: 'login' });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Admin Main Viewport */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between gap-4 no-print">
            <div className="text-sm font-medium text-slate-500">
              Panel administrativo · SQL Server
            </div>
            <div className="flex items-center gap-4">

              <button
                type="button"
                onClick={() => navigate({ name: 'admin-inventory', lowOnly: true })}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="font-mono-num">{lowStockCount}</span> bajo mínimo
              </button>

              <div className="text-right border-l border-slate-200 pl-4">
                <div className="text-sm font-bold text-slate-900 whitespace-nowrap">
                  {currentUser.nombreCompleto}
                </div>
                <div className="text-xs text-[#0F8B8D] font-medium">Administrador</div>
              </div>
            </div>
          </header>

          <main className="p-8 flex-1 overflow-y-auto">
            {route.name === 'admin-dashboard' && (
              <AdminDashboardPage
                onGoInventoryLow={() => navigate({ name: 'admin-inventory', lowOnly: true })}
                onSelectOrder={(orderId) => navigate({ name: 'admin-order-detail', orderId })}
                onGoOrders={() => navigate({ name: 'admin-orders' })}
              />
            )}
            {route.name === 'admin-products' && (
              <AdminProductsListPage
                onCreateProduct={() => navigate({ name: 'admin-product-form' })}
                onEditProduct={(productId) => navigate({ name: 'admin-product-form', productId })}
              />
            )}
            {route.name === 'admin-product-form' && (
              <AdminProductFormPage
                editingProductId={route.productId}
                onBack={() => navigate({ name: 'admin-products' })}
              />
            )}
            {route.name === 'admin-brands' && <AdminBrandsCategoriesPage mode="brands" />}
            {route.name === 'admin-categories' && <AdminBrandsCategoriesPage mode="categories" />}
            {route.name === 'admin-species' && <AdminBrandsCategoriesPage mode="species" />}
            {route.name === 'admin-promotions' && <AdminPromotionsPage />}
            {route.name === 'admin-inventory' && (
              <AdminInventoryPage initialLowOnly={route.lowOnly} />
            )}
            {route.name === 'admin-orders' && (
              <AdminOrdersPage
                onSelectOrder={(orderId) => navigate({ name: 'admin-order-detail', orderId })}
              />
            )}
            {route.name === 'admin-order-detail' && (
              <OrderDetailPage
                orderId={route.orderId}
                isAdminView
                onBack={() => navigate({ name: 'admin-orders' })}
              />
            )}
            {route.name === 'admin-customers' && (
              <AdminCustomersPage
                onSelectOrder={(orderId) => navigate({ name: 'admin-order-detail', orderId })}
              />
            )}
            {route.name === 'admin-reports' && <AdminReportsPage />}
            {route.name === 'admin-audit' && <AdminAuditPage />}
          </main>
        </div>
        <ToastContainer />
      </div>
    );
  }

  /* ==================== CUSTOMER SHELL ==================== */
  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FA]">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
        <div className="max-w-[1280px] mx-auto px-6 h-[72px] flex items-center justify-between gap-6">
          {/* Brand + Categories */}
          <div className="flex items-center gap-6 shrink-0">
            <button
              type="button"
              onClick={() => navigate({ name: 'catalog' })}
              className="flex items-center gap-2.5 text-xl font-extrabold text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="w-9 h-9 rounded-[10px] bg-[#0F8B8D] text-white flex items-center justify-center">
                <PawPrint className="w-5 h-5" />
              </span>
              <span className="font-display">PetShop Nova</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMascotaMenuOpen(!mascotaMenuOpen);
                  setCatMenuOpen(false);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-[#0F8B8D] whitespace-nowrap cursor-pointer py-2"
              >
                Mascotas <ChevronDown className="w-4 h-4" />
              </button>
              {mascotaMenuOpen && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-[12px] border border-slate-200 shadow-lg py-2 z-50">
                  {especies.map((s) => (
                    <button
                      key={s.idEspecie}
                      type="button"
                      onClick={() => irABusqueda({ ...EMPTY_FILTERS, speciesId: String(s.idEspecie) })}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-teal-50 hover:text-[#0F8B8D] cursor-pointer"
                    >
                      {s.nombreEspecie}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setCatMenuOpen(!catMenuOpen);
                  setMascotaMenuOpen(false);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-[#0F8B8D] whitespace-nowrap cursor-pointer py-2"
              >
                Categorías <ChevronDown className="w-4 h-4" />
              </button>
              {catMenuOpen && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-[12px] border border-slate-200 shadow-lg py-2 z-50">
                  {categorias
                    .map((c) => (
                      <button
                        key={c.idCategoria}
                        type="button"
                        onClick={() => {
                          irABusqueda({ ...EMPTY_FILTERS, categoryId: String(c.idCategoria) });
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-teal-50 hover:text-[#0F8B8D] cursor-pointer"
                      >
                        {c.nombreCategoria}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Global Search Bar */}
          <form onSubmit={handleGlobalSearch} className="flex-1 max-w-md hidden md:flex">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar alimento, arena, camas, SKU..."
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-[10px] border border-slate-300 bg-slate-50 text-sm focus:bg-white focus:outline-none focus:border-[#0F8B8D]"
              />
            </div>
          </form>

          {/* Right Actions: Cart + User Menu */}
          <div className="flex items-center gap-4 shrink-0">
            {currentUser?.rol === 'Administrador' && (
              <button
                type="button"
                onClick={() => navigate({ name: 'admin-dashboard' })}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                Ir a Admin
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate({ name: 'cart' })}
              className="relative inline-flex items-center gap-2 px-3 py-2 rounded-[10px] hover:bg-slate-100 text-slate-700 cursor-pointer whitespace-nowrap"
              aria-label="Carrito de compras"
            >
              <ShoppingCart className="w-5 h-5 text-[#0F8B8D]" />
              <span className="text-sm font-semibold hidden sm:inline">Carrito</span>
              {cartCount > 0 && (
                <span className="px-1.5 py-0.5 min-w-[20px] text-center rounded-full bg-[#F28C28] text-white text-[11px] font-bold font-mono-num">
                  {cartCount}
                </span>
              )}
            </button>

            {currentUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-[10px] border border-slate-200 hover:border-slate-300 text-sm font-medium text-slate-800 cursor-pointer whitespace-nowrap"
                >
                  <UserIcon className="w-4 h-4 text-[#0F8B8D]" />
                  <span>{currentUser.nombre}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-[12px] border border-slate-200 shadow-lg py-1.5 z-50">
                    <button
                      type="button"
                      onClick={() => navigate({ name: 'profile' })}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Mi perfil
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate({ name: 'my-orders' })}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Mis pedidos
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate({ name: 'login' });
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate({ name: 'login' })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#0F8B8D] text-white text-sm font-semibold hover:bg-[#0B7072] cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" /> Ingresar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {esperandoSesion ? (
          <div className="max-w-[1280px] mx-auto px-6 py-12 text-sm text-slate-500">Cargando...</div>
        ) : (
          <>
        {route.name === 'catalog' && (
          <CatalogPage
            onSelectSpecies={(idEspecie) => irABusqueda({ ...EMPTY_FILTERS, speciesId: String(idEspecie) })}
            onSelectCategory={(catId) => {
              irABusqueda({ ...EMPTY_FILTERS, categoryId: String(catId) });
            }}
            onSelectProduct={(productId) => navigate({ name: 'product', productId })}
            onGoSearchOffers={() => {
              irABusqueda({ ...EMPTY_FILTERS, onlyOffers: true });
            }}
            onGoSearchAll={() => {
              irABusqueda(EMPTY_FILTERS);
            }}
          />
        )}

        {route.name === 'search' && (
          <SearchResultsPage
            filters={filters}
            onChangeFilters={cambiarFiltros}
            onResetFilters={() => {
              cambiarFiltros(EMPTY_FILTERS);
              setHeaderSearch('');
            }}
            onSelectProduct={(productId) => navigate({ name: 'product', productId })}
          />
        )}

        {route.name === 'product' && (
          <ProductDetailPage
            productId={route.productId}
            onBack={() => navigate({ name: 'catalog' })}
            onGoCart={() => navigate({ name: 'cart' })}
          />
        )}

        {route.name === 'cart' && (
          <CartPage
            onGoCatalog={() => navigate({ name: 'catalog' })}
            onGoCheckout={() => navigate({ name: 'checkout' })}
            onGoLogin={() => navigate({ name: 'login' })}
            onSelectProduct={(productId) => navigate({ name: 'product', productId })}
          />
        )}

        {route.name === 'checkout' && (
          <CheckoutPage
            onBackToCart={() => navigate({ name: 'cart' })}
            onGoLogin={() => navigate({ name: 'login' })}
            onOrderConfirmed={(orderId) => navigate({ name: 'order-confirmed', orderId })}
          />
        )}

        {route.name === 'order-confirmed' && (
          <OrderConfirmedPage
            orderId={route.orderId}
            onViewOrderDetail={(orderId) => navigate({ name: 'order-detail', orderId })}
            onPrintInvoice={(orderId) =>
              navigate({ name: 'order-detail', orderId, print: true })
            }
            onGoCatalog={() => navigate({ name: 'catalog' })}
          />
        )}

        {route.name === 'my-orders' && (
          <MyOrdersPage
            onSelectOrder={(orderId) => navigate({ name: 'order-detail', orderId })}
            onGoCatalog={() => navigate({ name: 'catalog' })}
          />
        )}

        {route.name === 'order-detail' && (
          <OrderDetailPage
            orderId={route.orderId}
            initialPrintMode={route.print}
            onBack={() => navigate({ name: 'my-orders' })}
          />
        )}

        {route.name === 'profile' && <ProfilePage />}

        {isAdminRoute &&
          (cargandoSesion ? (
            <div className="max-w-[1280px] mx-auto px-6 py-12 text-sm text-slate-500">Cargando...</div>
          ) : (
            <ForbiddenPage onGoHome={() => navigate({ name: 'catalog' })} />
          ))}

        {route.name === '403' && (
          <ForbiddenPage onGoHome={() => navigate({ name: 'catalog' })} />
        )}

        {route.name === '404' && (
          <NotFoundPage onGoHome={() => navigate({ name: 'catalog' })} />
        )}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-12 no-print">
        <div className="max-w-[1280px] mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <strong className="text-slate-800">PetShop Nova</strong> · San José, Costa Rica · Precios en colones (₡)
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => navigate({ name: 'design-system' })}
              className="hover:text-[#0F8B8D] cursor-pointer"
            >
              Sistema de diseño
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => navigate({ name: 'admin-dashboard' })}
              className="hover:text-[#0F8B8D] cursor-pointer"
            >
              Probar ruta Admin (403 si es Cliente)
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => navigate({ name: '404' })}
              className="hover:text-[#0F8B8D] cursor-pointer"
            >
              Probar 404
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => navigate({ name: 'login' })}
              className="font-semibold text-[#0F8B8D] hover:underline cursor-pointer"
            >
              Cambiar cuenta / Login
            </button>
          </div>
        </div>
      </footer>

      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <DbProvider>
      <AppShell />
    </DbProvider>
  );
}
