import React from 'react';
import { motion } from 'motion/react';
import { FolderKanban, Edit, X } from 'lucide-react';
import { Process, Project, TeamMember, SystemRole } from '../../types';

interface ProjectModalProps {
  isOpen: boolean;
  editingProject: Project | null;
  newProjectData: {
    name: string;
    description: string;
    processId: string;
    status: 'activo' | 'pausado' | 'completado';
    city?: string;
  };
  setNewProjectData: React.Dispatch<
    React.SetStateAction<{
      name: string;
      description: string;
      processId: string;
      status: 'activo' | 'pausado' | 'completado';
      city?: string;
    }>
  >;
  processes: Process[];
  currentMember: TeamMember | null;
  roles: SystemRole[];
  getModuleAccess: (member: TeamMember | null, roles: SystemRole[], moduleId: string) => string;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  editingProject,
  newProjectData,
  setNewProjectData,
  processes,
  currentMember,
  roles,
  getModuleAccess,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 z-10">
            <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  editingProject ? 'bg-blue-50 text-blue-600' : 'bg-ng-green/10 text-ng-green'
                }`}
              >
                {editingProject ? <Edit size={20} /> : <FolderKanban size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  required
                  placeholder="Nombre del proyecto..."
                  className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-xl font-black tracking-tight text-gray-900 placeholder:text-gray-300 px-0 py-0"
                  value={newProjectData.name}
                  onChange={e => setNewProjectData({ ...newProjectData, name: e.target.value })}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-3 shrink-0 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Proceso Asignado
              </label>
              <select
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
                value={newProjectData.processId}
                onChange={e => setNewProjectData({ ...newProjectData, processId: e.target.value })}
              >
                <option value="">Selecciona un proceso...</option>
                {processes
                  .filter(p => {
                    const access = getModuleAccess(currentMember, roles, `projects_${p.id}`);
                    return access === 'lider' || access === 'administrador';
                  })
                  .map((p, pIdx) => (
                    <option key={`pmodal_proc_${p.id || pIdx}_${pIdx}`} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado</label>
              <select
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
                value={newProjectData.status}
                onChange={e => setNewProjectData({ ...newProjectData, status: e.target.value as any })}
              >
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="completado">Completado</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Ciudad / Ubicación (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Guayaquil, Quito..."
                className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                value={newProjectData.city || ''}
                onChange={e => setNewProjectData({ ...newProjectData, city: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción</label>
              <textarea
                placeholder="Descripción breve del proyecto..."
                className="w-full h-32 px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none text-sm font-medium"
                value={newProjectData.description}
                onChange={e => setNewProjectData({ ...newProjectData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-ng-green text-white text-sm font-bold rounded-xl hover:bg-ng-green/90 transition-colors shadow-sm"
            >
              {editingProject ? 'Guardar Cambios' : 'Crear Proyecto'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default ProjectModal;
