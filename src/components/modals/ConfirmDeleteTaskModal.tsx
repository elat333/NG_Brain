import React from 'react';
import { motion } from 'motion/react';
import { Trash } from 'lucide-react';
import { Task } from '../../types';

interface ConfirmDeleteTaskModalProps {
  task: Task | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteTaskModal: React.FC<ConfirmDeleteTaskModalProps> = ({
  task,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!task) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[80] flex items-center justify-center p-4"
      onClick={() => {
        if (!isDeleting) onCancel();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 text-center"
      >
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
          <Trash size={28} />
        </div>
        <h3 className="text-lg font-black text-gray-900 mb-2">
          ¿Eliminar esta tarea?
        </h3>
        <p className="text-xs text-gray-500 mb-2 leading-relaxed font-medium">
          Estás a punto de eliminar la tarea:
        </p>
        <p className="text-xs font-bold text-gray-800 bg-gray-50 py-2.5 px-3 rounded-xl border border-gray-100 mb-6 truncate">
          {task.title}
        </p>
        <div className="space-y-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="w-full py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-all shadow-md shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Trash size={16} />
            <span>{isDeleting ? 'Eliminando...' : 'Sí, eliminar tarea'}</span>
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ConfirmDeleteTaskModal;
