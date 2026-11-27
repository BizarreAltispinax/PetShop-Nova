// Estado global mínimo de la aplicación. NO es una base de datos:
// solo guarda la sesión, los catálogos públicos (marcas, categorías, zonas, métodos de pago),
// el carrito del cliente tal como lo devuelve SQL Server y los avisos (toasts).
// Toda regla de negocio (precios, promociones, stock, estados) la decide la base de datos.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, guardarToken, mensajeError, obtenerToken, registrarExpiracionSesion } from '../api/client';
import { Carrito, Categoria, Especie, Marca, MetodoPago, Sesion, ToastMessage, ZonaEnvio } from '../types';

interface DatosRegistro {
  correo: string;
  password: string;
  nombreCliente: string;
  apellidos: string;
  telefono: string;
  fechaNacimiento: string;
}

interface AppContextValue {
  // Sesión
  sesion: Sesion | null;
  cargandoSesion: boolean;
  esAdmin: boolean;
  esCliente: boolean;
  iniciarSesion: (correo: string, password: string) => Promise<Sesion>;
  registrarse: (datos: DatosRegistro) => Promise<Sesion>;
  cerrarSesion: () => void;
  recargarSesion: () => Promise<void>;

  // Catálogos públicos (activos)
  marcas: Marca[];
  especies: Especie[];
  categorias: Categoria[];
  zonas: ZonaEnvio[];
  metodosPago: MetodoPago[];
  recargarCatalogos: () => Promise<void>;

  // Carrito (vive en la BD)
  carrito: Carrito | null;
  unidadesCarrito: number;
  recargarCarrito: () => Promise<void>;
  agregarAlCarrito: (idProducto: number, cantidad?: number) => Promise<boolean>;

  // Avisos
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState<boolean>(Boolean(obtenerToken()));
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [especies, setEspecies] = useState<Especie[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [zonas, setZonas] = useState<ZonaEnvio[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [carrito, setCarrito] = useState<Carrito | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const esAdmin = sesion?.rol === 'Administrador';
  const esCliente = sesion?.rol === 'Cliente' && Boolean(sesion.idCliente);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastMessage['type'], title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast],
  );

  /* ---------- Catálogos ---------- */
  const recargarCatalogos = useCallback(async () => {
    try {
      const [m, c, z, mp, e] = await Promise.all([
        api.get<Marca[]>('/marcas'),
        api.get<Categoria[]>('/categorias'),
        api.get<ZonaEnvio[]>('/zonas-envio'),
        api.get<MetodoPago[]>('/metodos-pago'),
        api.get<Especie[]>('/especies'),
      ]);
      setEspecies(e);
      setMarcas(m);
      setCategorias(c);
      setZonas(z);
      setMetodosPago(mp);
    } catch (err) {
      addToast('error', 'No se pudo cargar el catálogo', mensajeError(err));
    }
  }, [addToast]);

  /* ---------- Carrito ---------- */
  const recargarCarrito = useCallback(async () => {
    if (!sesion || sesion.rol !== 'Cliente') {
      setCarrito(null);
      return;
    }
    try {
      setCarrito(await api.get<Carrito>('/mi/carrito'));
    } catch {
      setCarrito(null);
    }
  }, [sesion]);

  const agregarAlCarrito = useCallback(
    async (idProducto: number, cantidad = 1) => {
      if (!sesion) {
        addToast('info', 'Inicie sesión para comprar', 'El carrito se guarda en su cuenta.');
        return false;
      }
      if (sesion.rol !== 'Cliente') {
        addToast('info', 'Solo los clientes pueden comprar', 'Ingrese con una cuenta de cliente.');
        return false;
      }
      try {
        await api.post('/mi/carrito', { idProducto, cantidad });
        await recargarCarrito();
        addToast('success', 'Producto agregado al carrito');
        return true;
      } catch (err) {
        addToast('error', 'No se pudo agregar al carrito', mensajeError(err));
        return false;
      }
    },
    [sesion, addToast, recargarCarrito],
  );

  /* ---------- Sesión ---------- */
  const cerrarSesion = useCallback(() => {
    guardarToken(null);
    setSesion(null);
    setCarrito(null);
  }, []);

  const recargarSesion = useCallback(async () => {
    if (!obtenerToken()) {
      setSesion(null);
      setCargandoSesion(false);
      return;
    }
    try {
      setSesion(await api.get<Sesion>('/auth/yo'));
    } catch {
      guardarToken(null);
      setSesion(null);
    } finally {
      setCargandoSesion(false);
    }
  }, []);

  const iniciarSesion = useCallback(async (correo: string, password: string) => {
    const r = await api.post<{ token: string; usuario: Sesion }>('/auth/login', { correo, password });
    guardarToken(r.token);
    setSesion(r.usuario);
    return r.usuario;
  }, []);

  const registrarse = useCallback(async (datos: DatosRegistro) => {
    const r = await api.post<{ token: string; usuario: Sesion }>('/auth/registro', datos);
    guardarToken(r.token);
    setSesion(r.usuario);
    return r.usuario;
  }, []);

  useEffect(() => {
    registrarExpiracionSesion(() => {
      guardarToken(null);
      setSesion(null);
      setCarrito(null);
      addToast('info', 'Su sesión expiró', 'Inicie sesión de nuevo para continuar.');
    });
    void recargarSesion();
    void recargarCatalogos();
  }, [recargarSesion, recargarCatalogos, addToast]);

  useEffect(() => {
    void recargarCarrito();
  }, [recargarCarrito]);

  const unidadesCarrito = carrito?.resumen?.cantidadUnidades ?? 0;

  return (
    <AppContext.Provider
      value={{
        sesion,
        cargandoSesion,
        esAdmin,
        esCliente,
        iniciarSesion,
        registrarse,
        cerrarSesion,
        recargarSesion,
        marcas,
        especies,
        categorias,
        zonas,
        metodosPago,
        recargarCatalogos,
        carrito,
        unidadesCarrito,
        recargarCarrito,
        agregarAlCarrito,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useDb() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useDb debe usarse dentro de <DbProvider>');
  return ctx;
}
