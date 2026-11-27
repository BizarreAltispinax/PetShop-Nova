import React, { useEffect, useState } from 'react';
import { Edit2, KeyRound, MapPin, Plus, PowerOff, User as UserIcon } from 'lucide-react';
import { useDb } from '../../store/db';
import { useApi } from '../../hooks/useApi';
import { api, mensajeError } from '../../api/client';
import { Cliente, Direccion } from '../../types';
import { formatCRC, toYmd } from '../../utils/format';
import { AlertBanner, Button, ConfirmModal, Input } from '../../components/ui/DesignSystemKit';
import { AddressModal } from '../../components/AddressModal';

// Perfil del cliente: sp_Cliente_Obtener / sp_Cliente_Actualizar, cambio de contraseña
// (la API verifica la actual con bcrypt) y direcciones (sp_Direccion_*).
export const ProfilePage: React.FC = () => {
  const { esCliente, addToast, recargarSesion, recargarCarrito } = useDb();
  const perfil = useApi<Cliente>(esCliente ? '/mi/perfil' : null);
  const direcciones = useApi<Direccion[]>(esCliente ? '/mi/direcciones' : null);
  const [tab, setTab] = useState<'datos' | 'seguridad' | 'direcciones'>('datos');

  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [passErr, setPassErr] = useState<string | null>(null);
  const [guardandoClave, setGuardandoClave] = useState(false);

  const [addrModalOpen, setAddrModalOpen] = useState(false);
  const [editingAddr, setEditingAddr] = useState<Direccion | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Direccion | null>(null);

  useEffect(() => {
    if (perfil.datos) {
      setNombre(perfil.datos.nombreCliente);
      setApellidos(perfil.datos.apellidos);
      setTelefono(perfil.datos.telefono ?? '');
      setFechaNacimiento(toYmd(perfil.datos.fechaNacimiento));
    }
  }, [perfil.datos]);

  if (!esCliente) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErr(null);
    setGuardandoPerfil(true);
    try {
      await api.put('/mi/perfil', { nombreCliente: nombre.trim(), apellidos: apellidos.trim(), telefono: telefono.trim() || null, fechaNacimiento });
      addToast('success', 'Perfil actualizado', 'Sus datos personales fueron guardados.');
      await Promise.all([perfil.recargar(), recargarSesion()]);
    } catch (err) {
      setProfileErr(mensajeError(err));
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassErr(null);
    if (passNueva !== passConfirm) {
      setPassErr('La confirmación de contraseña no coincide.');
      return;
    }
    setGuardandoClave(true);
    try {
      await api.put('/auth/password', { actual: passActual, nueva: passNueva });
      addToast('success', 'Contraseña actualizada', 'Su nueva contraseña ya está activa.');
      setPassActual('');
      setPassNueva('');
      setPassConfirm('');
    } catch (err) {
      setPassErr(mensajeError(err));
    } finally {
      setGuardandoClave(false);
    }
  };

  const desactivarDireccion = async (d: Direccion) => {
    try {
      await api.delete(`/mi/direcciones/${d.idDireccion}`);
      addToast('success', 'Dirección desactivada');
      await Promise.all([direcciones.recargar(), recargarCarrito()]);
    } catch (err) {
      addToast('error', 'No se pudo desactivar la dirección', mensajeError(err));
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Mi perfil</h1>
        <p className="text-sm text-slate-500">Administre sus datos personales, seguridad y direcciones de entrega</p>
      </div>

      {perfil.error && <AlertBanner variant="error">{perfil.error}</AlertBanner>}

      <div className="bg-white rounded-[12px] border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          {[
            { id: 'datos', label: 'Datos personales', icon: UserIcon },
            { id: 'seguridad', label: 'Seguridad', icon: KeyRound },
            { id: 'direcciones', label: 'Mis direcciones', icon: MapPin },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as typeof tab)}
                className={`inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  tab === t.id ? 'border-[#0F8B8D] text-[#0F8B8D] bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-6 lg:p-8">
          {tab === 'datos' && (
            <form onSubmit={handleSaveProfile} className="max-w-xl space-y-4">
              {profileErr && <AlertBanner variant="error">{profileErr}</AlertBanner>}
              <Input label="Correo electrónico" value={perfil.datos?.correo ?? ''} disabled hint="El correo es su identificador único y no se puede modificar." />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} required />
                <Input label="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} maxLength={100} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} maxLength={20} />
                <Input label="Fecha de nacimiento" type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} required />
              </div>
              <div className="pt-2">
                <Button type="submit" variant="primary" loading={guardandoPerfil}>
                  Guardar
                </Button>
              </div>
            </form>
          )}

          {tab === 'seguridad' && (
            <form onSubmit={handleSavePassword} className="max-w-md space-y-4">
              {passErr && <AlertBanner variant="error">{passErr}</AlertBanner>}
              <Input label="Contraseña actual" type="password" value={passActual} onChange={(e) => setPassActual(e.target.value)} autoComplete="current-password" required />
              <Input label="Nueva contraseña" type="password" value={passNueva} onChange={(e) => setPassNueva(e.target.value)} hint="Mínimo 8 caracteres." autoComplete="new-password" required />
              <Input label="Confirmar nueva contraseña" type="password" value={passConfirm} onChange={(e) => setPassConfirm(e.target.value)} autoComplete="new-password" required />
              <div className="pt-2">
                <Button type="submit" variant="primary" loading={guardandoClave}>
                  Actualizar contraseña
                </Button>
              </div>
            </form>
          )}

          {tab === 'direcciones' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-slate-600">
                  Si la dirección ya se usó en un pedido, se guarda como una dirección nueva para conservar el historial.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingAddr(null);
                    setAddrModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" /> Agregar dirección
                </Button>
              </div>

              {direcciones.error && <AlertBanner variant="error">{direcciones.error}</AlertBanner>}
              {!direcciones.cargando && (direcciones.datos ?? []).length === 0 && (
                <p className="text-sm text-slate-500">No tiene direcciones activas.</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(direcciones.datos ?? []).map((d) => (
                  <div key={d.idDireccion} className="rounded-[12px] border border-slate-200 p-5 flex flex-col justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{d.lineaDireccion}</span>
                        {d.esPrincipal && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-[#0F8B8D] border border-teal-200 shrink-0">Principal</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {d.ciudad}, {d.provincia}
                        {d.codigoPostal ? ` · CP ${d.codigoPostal}` : ''}
                      </p>
                      <div className="text-xs font-medium text-slate-600 pt-1">
                        Zona: {d.nombreZonaEnvio} ({formatCRC(d.tarifa)})
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingAddr(d);
                          setAddrModalOpen(true);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeactivateTarget(d)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <PowerOff className="w-3.5 h-3.5" /> Desactivar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AddressModal
        open={addrModalOpen}
        onClose={() => setAddrModalOpen(false)}
        editingAddress={editingAddr}
        onSaved={() => {
          void direcciones.recargar();
          void recargarCarrito();
        }}
      />

      <ConfirmModal
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (deactivateTarget) void desactivarDireccion(deactivateTarget);
          setDeactivateTarget(null);
        }}
        title="Desactivar dirección"
        message={`¿Seguro que desea desactivar la dirección "${deactivateTarget?.lineaDireccion ?? ''}"?`}
        confirmLabel="Desactivar"
        variant="danger"
      />
    </div>
  );
};
