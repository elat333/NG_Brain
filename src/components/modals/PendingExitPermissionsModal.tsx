import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Save } from 'lucide-react';
import { TeamMember } from '../../types';

export interface PendingExitAction {
  type: 'tab' | 'subtab' | 'member';
  targetTab?: any;
  targetSettingsSubTab?: any;
  targetMemberId?: string;
}

interface PendingExitPermissionsModalProps {
  pendingExitAction: PendingExitAction | null;
  resolvedPermissionsMember: TeamMember | null | undefined;
  onCancel: () => void;
  onDiscardAndProceed: () => void;
  onSaveAndProceed: () => Promise<void>;
}

export const PendingExitPermissionsModal: React.FC<PendingExitPermissionsModalProps> = ({
  pendingExitAction,
  resolvedPermissionsMember,
  onCancel,
  onDiscardAndProceed,
  onSaveAndProceed,
}) => {
  if (!pendingExitAction) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-50 p-7 space-y-6"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl flex-shrink-0 shadow-inner">
            <ShieldAlert size={26} className="animate-wiggle" />
          </div>
          <div className="space-y-1 bg-white">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">¿Salir sin guardar permisos?</h3>
            <p className="text-xs text-slate-500 font-bold leading-relaxed">
              Has modificado los niveles de acceso para <span className="text-slate-800 font-black">{resolvedPermissionsMember?.name}</span> pero no has guardado los cambios. Si sales ahora, se perderán de manera irreversible.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-2 border border-slate-100 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
          Selecciona una opción para continuar con la navegación.
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-3 hover:bg-slate-50 text-slate-500 hover:text-gray-700 text-xs font-black uppercase tracking-wider rounded-2xl transition-all text-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onDiscardAndProceed}
            className="w-full sm:w-auto px-5 py-3 bg-red-50 hover:bg-red-100/80 text-red-600 text-xs font-black uppercase tracking-wider rounded-2xl transition-all border border-red-200/40 text-center"
          >
            Salir sin guardar
          </button>
          <button
            type="button"
            onClick={onSaveAndProceed}
            className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-green-100 hover:shadow-green-200 transition-all text-center flex items-center justify-center gap-2"
          >
            <Save size={14} /> Guardar y salir
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
