// Cliente HTTP de la API de PetShop Nova.
// Todas las lecturas y escrituras pasan por la API, que solo ejecuta procedimientos
// almacenados de SQL Server. El navegador no guarda datos de negocio: solo el token de sesión.

const CLAVE_TOKEN = 'petshop_nova_token';

export class ApiError extends Error {
  estado: number;
  codigo?: number;
  constructor(estado: number, mensaje: string, codigo?: number) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
  }
}

export function obtenerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // almacenamiento no disponible: la sesión dura lo que dure la pestaña
  }
}

// Se llama cuando la API responde 401 (token vencido): la app cierra la sesión.
let alExpirarSesion: (() => void) | null = null;
export function registrarExpiracionSesion(fn: () => void) {
  alExpirarSesion = fn;
}

type Consulta = Record<string, string | number | boolean | null | undefined>;

function armarUrl(ruta: string, consulta?: Consulta) {
  const params = new URLSearchParams();
  if (consulta) {
    for (const [k, v] of Object.entries(consulta)) {
      if (v === undefined || v === null || v === '' || v === false) continue;
      params.set(k, v === true ? '1' : String(v));
    }
  }
  const qs = params.toString();
  return `/api${ruta}${qs ? `?${qs}` : ''}`;
}

async function solicitar<T>(metodo: string, ruta: string, cuerpo?: unknown, consulta?: Consulta): Promise<T> {
  const token = obtenerToken();
  let respuesta: Response;
  try {
    respuesta = await fetch(armarUrl(ruta, consulta), {
      method: metodo,
      headers: {
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Verifique que la API esté encendida.');
  }

  const texto = await respuesta.text();
  let datos: unknown = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = texto;
    }
  }

  if (!respuesta.ok) {
    const cuerpoError = (datos ?? {}) as { error?: string; codigo?: number };
    if (respuesta.status === 401 && token) alExpirarSesion?.();
    throw new ApiError(
      respuesta.status,
      cuerpoError.error ?? `Error ${respuesta.status} al comunicarse con el servidor.`,
      cuerpoError.codigo,
    );
  }
  return datos as T;
}

export const api = {
  get: <T>(ruta: string, consulta?: Consulta) => solicitar<T>('GET', ruta, undefined, consulta),
  post: <T>(ruta: string, cuerpo?: unknown) => solicitar<T>('POST', ruta, cuerpo ?? {}),
  put: <T>(ruta: string, cuerpo?: unknown) => solicitar<T>('PUT', ruta, cuerpo ?? {}),
  patch: <T>(ruta: string, cuerpo?: unknown) => solicitar<T>('PATCH', ruta, cuerpo ?? {}),
  delete: <T>(ruta: string) => solicitar<T>('DELETE', ruta),
};

// Mensaje legible de cualquier error (los de negocio vienen en español desde los SP).
export function mensajeError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error inesperado.';
}
