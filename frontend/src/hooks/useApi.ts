import { useCallback, useEffect, useRef, useState } from 'react';
import { api, mensajeError } from '../api/client';

type Consulta = Record<string, string | number | boolean | null | undefined>;

/**
 * Lee un endpoint GET y devuelve { datos, cargando, error, recargar }.
 * Pasar ruta = null no hace la petición (p. ej. mientras no hay sesión).
 * Se vuelve a pedir cuando cambian la ruta o los filtros.
 */
export function useApi<T>(ruta: string | null, consulta?: Consulta) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState<boolean>(ruta !== null);
  const [error, setError] = useState<string | null>(null);
  const clave = ruta === null ? null : `${ruta}?${JSON.stringify(consulta ?? {})}`;
  const ultima = useRef(0);

  const cargar = useCallback(async () => {
    if (ruta === null) {
      setDatos(null);
      setCargando(false);
      return;
    }
    const id = ++ultima.current;
    setCargando(true);
    setError(null);
    try {
      const resultado = await api.get<T>(ruta, consulta);
      if (id === ultima.current) setDatos(resultado);
    } catch (err) {
      if (id === ultima.current) setError(mensajeError(err));
    } finally {
      if (id === ultima.current) setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { datos, cargando, error, recargar: cargar };
}
