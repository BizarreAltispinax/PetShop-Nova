import React, { useState } from 'react';
import { Lock, PawPrint, ShieldCheck, UserPlus } from 'lucide-react';
import { useDb } from '../store/db';
import { mensajeError } from '../api/client';
import { Role } from '../types';
import { AlertBanner, Button, Input } from '../components/ui/DesignSystemKit';

// Usuarios de prueba de sql/02_datos.sql (todos usan la contraseña de demostración Nova12345)
const CUENTAS_DEMO = [
  { etiqueta: 'Cliente con compras', correo: 'valeria.mora@correo-demo.cr', admin: false },
  { etiqueta: 'Cliente sin compras', correo: 'kevin.duran@correo-demo.cr', admin: false },
  { etiqueta: 'Administrador', correo: 'admin@petshopnova.cr', admin: true },
];
const CLAVE_DEMO = 'Nova12345';

interface LoginPageProps {
  onSuccess: (role: Role) => void;
  onGoRegister: () => void;
  onGoCatalog: () => void;
  onGoDesignSystem: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onGoRegister, onGoCatalog, onGoDesignSystem }) => {
  const { iniciarSesion, addToast } = useDb();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!correo.trim() || !contrasena) {
      setError('Debe ingresar su correo y contraseña.');
      return;
    }
    setCargando(true);
    try {
      const sesion = await iniciarSesion(correo.trim(), contrasena);
      addToast('success', `Bienvenido(a)${sesion.nombreCompleto ? `, ${sesion.nombreCompleto}` : ''}`, `Sesión iniciada como ${sesion.rol}.`);
      onSuccess(sesion.rol);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col justify-center py-12 px-4">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center">
          <button
            type="button"
            onClick={onGoCatalog}
            className="inline-flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 cursor-pointer"
          >
            <span className="w-10 h-10 rounded-[10px] bg-[#0F8B8D] text-white flex items-center justify-center">
              <PawPrint className="w-6 h-6" />
            </span>
            PetShop Nova
          </button>
          <h1 className="text-2xl font-bold text-slate-900 mt-4">Iniciar sesión</h1>
          <p className="text-sm text-slate-600 mt-1">
            Acceda a su cuenta de cliente o al panel administrativo
          </p>
        </div>

        <div className="bg-white rounded-[12px] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
          {error && <AlertBanner variant="error">{error}</AlertBanner>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="ejemplo@correo.cr"
              autoComplete="username"
              required
            />
            <Input
              label="Contraseña"
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <Button type="submit" variant="primary" size="lg" loading={cargando} className="w-full">
              <Lock className="w-4 h-4" /> Ingresar
            </Button>
          </form>

          <div className="text-center text-sm text-slate-600">
            ¿Aún no tiene cuenta?{' '}
            <button
              type="button"
              onClick={onGoRegister}
              className="font-semibold text-[#0F8B8D] hover:underline cursor-pointer"
            >
              Crear cuenta
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Cuentas de prueba (contraseña {CLAVE_DEMO})
            </div>
            <div className="grid grid-cols-1 gap-2">
              {CUENTAS_DEMO.map((c) => (
                <button
                  key={c.correo}
                  type="button"
                  onClick={() => {
                    setCorreo(c.correo);
                    setContrasena(CLAVE_DEMO);
                    setError(null);
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-[#0F8B8D] hover:bg-teal-50/40 text-left text-xs transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    {c.admin && <ShieldCheck className="w-3.5 h-3.5 text-[#F28C28]" />}
                    <strong className="text-slate-900">{c.etiqueta}:</strong> {c.correo}
                  </span>
                  <span className="text-[#0F8B8D] font-medium">Cargar</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
          <button type="button" onClick={onGoCatalog} className="hover:text-slate-800 cursor-pointer">
            Explorar catálogo
          </button>
          <span>·</span>
          <button type="button" onClick={onGoDesignSystem} className="hover:text-slate-800 cursor-pointer">
            Sistema de diseño
          </button>
        </div>
      </div>
    </div>
  );
};

interface RegisterPageProps {
  onSuccess: () => void;
  onGoLogin: () => void;
}

// Registro: sp_Cliente_Registrar. La contraseña se convierte en hash bcrypt en la API.
export const RegisterPage: React.FC<RegisterPageProps> = ({ onSuccess, onGoLogin }) => {
  const { registrarse, addToast } = useDb();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Comprobación de formulario (no es regla de negocio): que las dos contraseñas coincidan
    if (contrasena !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setCargando(true);
    try {
      await registrarse({
        correo: correo.trim(),
        password: contrasena,
        nombreCliente: nombre.trim(),
        apellidos: apellidos.trim(),
        telefono: telefono.trim(),
        fechaNacimiento,
      });
      addToast('success', 'Cuenta creada', 'Su registro se completó correctamente.');
      onSuccess();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col justify-center py-10 px-4">
      <div className="max-w-lg w-full mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5 text-2xl font-extrabold text-slate-900">
            <span className="w-10 h-10 rounded-[10px] bg-[#0F8B8D] text-white flex items-center justify-center">
              <PawPrint className="w-6 h-6" />
            </span>
            PetShop Nova
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-4">Crear cuenta</h1>
          <p className="text-sm text-slate-600 mt-1">Regístrese para guardar sus direcciones y consultar sus pedidos</p>
        </div>

        <div className="bg-white rounded-[12px] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
          {error && <AlertBanner variant="error">{error}</AlertBanner>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. María" maxLength={80} required />
              <Input label="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} placeholder="Ej. Rodríguez Solís" maxLength={100} required />
            </div>

            <Input
              label="Correo electrónico"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="correo@ejemplo.cr"
              hint="Si el correo ya existe, SQL Server lo rechaza (restricción UQ_Usuario_Correo)."
              maxLength={150}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Teléfono (opcional)" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="8888-0000" maxLength={20} />
              <Input label="Fecha de nacimiento" type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Contraseña" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" required />
              <Input label="Confirmar contraseña" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder="Repita la contraseña" autoComplete="new-password" required />
            </div>

            <Button type="submit" variant="primary" size="lg" loading={cargando} className="w-full">
              <UserPlus className="w-4 h-4" /> Crear cuenta
            </Button>
          </form>

          <div className="text-center text-sm text-slate-600">
            ¿Ya tiene una cuenta?{' '}
            <button type="button" onClick={onGoLogin} className="font-semibold text-[#0F8B8D] hover:underline cursor-pointer">
              Iniciar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
