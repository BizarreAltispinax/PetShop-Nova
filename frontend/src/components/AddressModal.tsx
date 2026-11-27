import React, { useEffect, useState } from 'react';
import { Direccion } from '../types';
import { useDb } from '../store/db';
import { api, mensajeError } from '../api/client';
import { COSTA_RICA_PROVINCES, formatCRC } from '../utils/format';
import { AlertBanner, Button, Checkbox, Input, Modal, Select } from './ui/DesignSystemKit';

interface AddressModalProps {
  open: boolean;
  onClose: () => void;
  editingAddress?: Direccion | null;
  onSaved?: (idDireccion: number) => void;
}

// Crear o editar una dirección: sp_Direccion_Crear / sp_Direccion_Actualizar.
// Si la dirección ya se usó en un pedido, el SP la desactiva y crea una nueva (devuelve el id nuevo).
export const AddressModal: React.FC<AddressModalProps> = ({ open, onClose, editingAddress, onSaved }) => {
  const { zonas, addToast } = useDb();
  const [idZonaEnvio, setIdZonaEnvio] = useState<number>(0);
  const [lineaDireccion, setLineaDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [provincia, setProvincia] = useState(COSTA_RICA_PROVINCES[0]);
  const [codigoPostal, setCodigoPostal] = useState('');
  const [esPrincipal, setEsPrincipal] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingAddress) {
      setIdZonaEnvio(editingAddress.idZonaEnvio);
      setLineaDireccion(editingAddress.lineaDireccion);
      setCiudad(editingAddress.ciudad);
      setProvincia(editingAddress.provincia);
      setCodigoPostal(editingAddress.codigoPostal ?? '');
      setEsPrincipal(editingAddress.esPrincipal);
    } else {
      setIdZonaEnvio(zonas[0]?.idZonaEnvio ?? 0);
      setLineaDireccion('');
      setCiudad('');
      setProvincia(COSTA_RICA_PROVINCES[0]);
      setCodigoPostal('');
      setEsPrincipal(true);
    }
  }, [open, editingAddress, zonas]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    const cuerpo = {
      idZonaEnvio,
      lineaDireccion: lineaDireccion.trim(),
      ciudad: ciudad.trim(),
      provincia,
      codigoPostal: codigoPostal.trim() || null,
      esPrincipal,
    };
    setGuardando(true);
    try {
      const r = editingAddress
        ? await api.put<{ idDireccion: number }>(`/mi/direcciones/${editingAddress.idDireccion}`, cuerpo)
        : await api.post<{ idDireccion: number }>('/mi/direcciones', cuerpo);
      if (editingAddress && r.idDireccion !== editingAddress.idDireccion) {
        addToast(
          'info',
          'Dirección guardada como nueva',
          'La anterior ya se usó en un pedido: se conservó inactiva para mantener el historial.',
        );
      } else {
        addToast('success', editingAddress ? 'Dirección actualizada' : 'Dirección agregada');
      }
      onSaved?.(r.idDireccion);
      onClose();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingAddress ? 'Editar dirección' : 'Agregar dirección'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" loading={guardando} onClick={() => handleSubmit()}>
            Guardar dirección
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <AlertBanner variant="error">{error}</AlertBanner>}

        {editingAddress && (
          <AlertBanner variant="info">
            Si la dirección ya se usó en un pedido, se guarda como una dirección nueva para conservar el historial.
          </AlertBanner>
        )}

        <Select
          label="Zona de envío"
          value={idZonaEnvio}
          onChange={(e) => setIdZonaEnvio(Number(e.target.value))}
          required
        >
          {zonas.map((z) => (
            <option key={z.idZonaEnvio} value={z.idZonaEnvio}>
              {z.nombreZonaEnvio} — {formatCRC(z.tarifa)}
            </option>
          ))}
        </Select>

        <Input
          label="Línea de dirección"
          placeholder="Señas exactas, residencial, número de casa..."
          value={lineaDireccion}
          onChange={(e) => setLineaDireccion(e.target.value)}
          maxLength={200}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Ciudad / Cantón"
            placeholder="Ej. Montes de Oca"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            maxLength={80}
            required
          />
          <Select label="Provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)} required>
            {COSTA_RICA_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="Código postal (opcional)"
          placeholder="Ej. 11501"
          value={codigoPostal}
          onChange={(e) => setCodigoPostal(e.target.value)}
          maxLength={10}
        />

        <Checkbox checked={esPrincipal} onChange={setEsPrincipal} label="Usar como principal" />
      </form>
    </Modal>
  );
};
