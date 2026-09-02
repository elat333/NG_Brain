import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Check, Trash2 } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  isEditing?: boolean;
  onSaveAndClose: (e?: any) => void;
  onDiscardAndClose?: () => void;
  onDiscard?: () => void;
  onContinueEditing: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  isEditing,
  onSaveAndClose,
  onDiscardAndClose,
  onDiscard,
  onContinueEditing,
}) => {
  if (!isOpen) return null;

  const handleDiscard = onDiscard || onDiscardAndClose || (() => {});

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[70] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 text-center"
      >
        <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
          <AlertCircle size={28} />
        </div>
        <h3 className="text-lg font-black text-gray-900 mb-2">
          ¿Tienes cambios sin guardar?
        </h3>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed font-medium">
          Has realizado modificaciones en la historia o tarea. Si decides salir ahora sin guardar, se perderán todos los cambios efectuados.
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={onSaveAndClose}
            className="w-full py-3 bg-ng-lime text-ng-black rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-md shadow-ng-lime/10 flex items-center justify-center gap-2"
          >
            <Check size={16} />
            <span>Guardar cambios y cerrar</span>
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            <span>Descartar cambios</span>
          </button>
          <button
            type="button"
            onClick={onContinueEditing}
            className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-all"
          >
            Continuar editando
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UnsavedChangesModal;
