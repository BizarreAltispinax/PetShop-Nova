import React from 'react';
import { ArrowLeft, ShieldAlert, SearchX } from 'lucide-react';
import { Button } from '../components/ui/DesignSystemKit';
import IMG_EMPTY from '../assets/images/empty_pet_illustration_1795496992211.jpg';

export const ForbiddenPage: React.FC<{ onGoHome: () => void }> = ({ onGoHome }) => (
  <div className="min-h-[70vh] flex items-center justify-center px-6 py-16">
    <div className="max-w-md w-full bg-white rounded-[12px] border border-slate-200 p-8 text-center shadow-sm space-y-4">
      <div className="w-14 h-14 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <div className="text-sm font-mono-num font-bold text-red-600">Error 403</div>
      <h1 className="text-2xl font-extrabold text-slate-900">Acceso restringido</h1>
      <p className="text-sm text-slate-600 leading-relaxed">
        No cuenta con permisos de Administrador para acceder a esta ruta. Su sesión actual pertenece al rol Cliente.
      </p>
      <div className="pt-2">
        <Button variant="primary" onClick={onGoHome}>
          <ArrowLeft className="w-4 h-4" /> Volver al catálogo
        </Button>
      </div>
    </div>
  </div>
);

export const NotFoundPage: React.FC<{ onGoHome: () => void }> = ({ onGoHome }) => (
  <div className="min-h-[70vh] flex items-center justify-center px-6 py-16">
    <div className="max-w-md w-full bg-white rounded-[12px] border border-slate-200 p-8 text-center shadow-sm space-y-4">
      <img
        src={IMG_EMPTY}
        alt="Página no encontrada"
        referrerPolicy="no-referrer"
        className="w-32 h-32 mx-auto object-contain"
      />
      <div className="inline-flex items-center gap-1.5 text-sm font-mono-num font-bold text-[#0F8B8D]">
        <SearchX className="w-4 h-4" /> Error 404
      </div>
      <h1 className="text-2xl font-extrabold text-slate-900">Página no encontrada</h1>
      <p className="text-sm text-slate-600 leading-relaxed">
        La ruta o el recurso que intenta consultar no existe en PetShop Nova.
      </p>
      <div className="pt-2">
        <Button variant="primary" onClick={onGoHome}>
          <ArrowLeft className="w-4 h-4" /> Ir al inicio
        </Button>
      </div>
    </div>
  </div>
);
