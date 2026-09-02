import React from 'react';
import { motion } from 'motion/react';
import { Building2, X } from 'lucide-react';
import { Process } from '../../types';

interface ProcessModalProps {
  isOpen: boolean;
  editingProcess: Process | null;
  newProcessData: { name: string; description: string; goals: string };
  setNewProcessData: React.Dispatch<React.SetStateAction<{ name: string; description: string; goals: string }>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const ProcessModal: React.FC<ProcessModalProps> = ({
  isOpen,
  editingProcess,
  newProcessData,
  setNewProcessData,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Building2 size={20} />
            </div>
            <h2 className="text-xl font-bold">{editingProcess ? 'Editar' : 'Nuevo'} Proceso</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre del Proceso</label>
            <input
              type="text"
              required
              placeholder="Ej: Producto, Ventas..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              value={newProcessData.name}
              onChange={e => setNewProcessData({ ...newProcessData, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descripción</label>
            <textarea
              required
              placeholder="¿De qué se encarga este proceso?"
              className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
              value={newProcessData.description}
              onChange={e => setNewProcessData({ ...newProcessData, description: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Objetivos (separadas por coma)</label>
            <input
              type="text"
              placeholder="Ej: Aumentar ventas, Mejorar eficiencia..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              value={newProcessData.goals}
              onChange={e => setNewProcessData({ ...newProcessData, goals: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-purple-600 text-white font-bold rounded-2xl shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all mt-4"
          >
            {editingProcess ? 'Guardar Cambios' : 'Crear Proceso'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};
