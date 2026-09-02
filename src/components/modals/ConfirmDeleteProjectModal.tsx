import React from 'react';
import { motion } from 'motion/react';
import { FolderKanban, AlertCircle, Trash } from 'lucide-react';
import { Project, Process, Task } from '../../types';

interface ConfirmDeleteProjectModalProps {
  project: Project | null;
  processes: Process[];
  tasks: Task[];
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteProjectModal: React.FC<ConfirmDeleteProjectModalProps> = ({
  project,
  processes,
  tasks,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!project) return null;

  const linkedTasksCount = tasks.filter(t => t.projectId === project.id).length;
  const processName = processes.find(p => p.id === project.processId)?.name || 'General';

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
          <FolderKanban size={28} />
        </div>
        <h3 className="text-lg font-black text-gray-900 mb-2">
          ¿Eliminar este proyecto?
        </h3>
        <p className="text-xs text-gray-500 mb-3 leading-relaxed font-medium">
          Estás a punto de eliminar permanentemente el proyecto:
        </p>
        <div className="bg-gray-50 py-3 px-4 rounded-2xl border border-gray-100 mb-4 text-left">
          <p className="text-xs font-black text-gray-900 truncate">
            {project.name}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            Proceso: <span className="font-bold text-gray-700">{processName}</span>
          </p>
        </div>

        {linkedTasksCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-6 text-left flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium text-amber-800 leading-tight">
              Hay <strong>{linkedTasksCount} tareas vinculadas</strong>. Se conservarán en el sistema pero quedarán desvinculadas del proyecto.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="w-full py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-all shadow-md shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Trash size={16} />
            <span>{isDeleting ? 'Eliminando...' : 'Sí, eliminar proyecto'}</span>
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

export default ConfirmDeleteProjectModal;
