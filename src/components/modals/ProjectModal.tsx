import React from 'react';
import { motion } from 'motion/react';
import { FolderKanban, Edit, X, User, Users, Check } from 'lucide-react';
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
    leaderId?: string;
    auxiliaryMemberIds?: string[];
  };
  setNewProjectData: React.Dispatch<
    React.SetStateAction<{
      name: string;
      description: string;
      processId: string;
      status: 'activo' | 'pausado' | 'completado';
      city?: string;
      leaderId?: string;
      auxiliaryMemberIds?: string[];
    }>
  >;
  processes: Process[];
  members?: TeamMember[];
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
  members = [],
  currentMember,
  roles,
  getModuleAccess,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  const toggleAuxiliary = (memberId: string) => {
    const current = newProjectData.auxiliaryMemberIds || [];
    if (current.includes(memberId)) {
      setNewProjectData({
        ...newProjectData,
        auxiliaryMemberIds: current.filter(id => id !== memberId)
      });
    } else {
      setNewProjectData({
        ...newProjectData,
        auxiliaryMemberIds: [...current, memberId]
      });
    }
  };

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
                      const access = getModuleAccess(currentMember, roles, `projects_${p.id}`);
                      return isUserAdmin || access === 'lider' || access === 'administrador';
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <User size={13} className="text-indigo-600" />
                  Líder / Responsable del Proyecto
                </label>
                <select
                  className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                  value={newProjectData.leaderId || ''}
                  onChange={e => setNewProjectData({ ...newProjectData, leaderId: e.target.value })}
                >
                  <option value="">Sin responsable específico</option>
                  {members.map(m => (
                    <option key={`proj_leader_opt_${m.id}`} value={m.id}>
                      {m.name} {m.role ? `(${m.role})` : ''}
                    </option>
                  ))}
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
            </div>

            {/* Auxiliares / Colaboradores Asignados */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-emerald-600" />
                  Auxiliares y Colaboradores Asignados
                </span>
                <span className="text-[10px] font-bold text-gray-500 lowercase">
                  {(newProjectData.auxiliaryMemberIds || []).length} seleccionados
                </span>
              </label>
              <div className="p-3 border-2 border-gray-100 rounded-2xl bg-gray-50/50 max-h-44 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2">
                {members.map(m => {
                  const isSelected = (newProjectData.auxiliaryMemberIds || []).includes(m.id);
                  const isLeader = newProjectData.leaderId === m.id;

                  return (
                    <div
                      key={`aux_member_${m.id}`}
                      onClick={() => !isLeader && toggleAuxiliary(m.id)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer border ${
                        isLeader
                          ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900 opacity-70 cursor-not-allowed'
                          : isSelected
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-xs'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] uppercase shrink-0 ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {m.avatar ? (
                            <img src={m.avatar} alt={m.name} className="w-full h-full object-cover rounded-md" />
                          ) : (
                            m.name.substring(0, 2)
                          )}
                        </div>
                        <span className="truncate">{m.name}</span>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        {isLeader ? (
                          <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100 px-1 py-0.5 rounded">Líder</span>
                        ) : isSelected ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción</label>
              <textarea
                placeholder="Descripción breve del proyecto..."
                className="w-full h-24 px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none text-sm font-medium"
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
