import React from 'react';
import { FolderKanban, Edit, Trash2, User, Users, MapPin } from 'lucide-react';
import { Project, Task, TeamMember } from '../../types';

export interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  members?: TeamMember[];
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  tasks,
  members = [],
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true
}) => {
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const leader = members.find(m => m.id === project.leaderId);
  const auxiliaries = members.filter(m => project.auxiliaryMemberIds?.includes(m.id));

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-ng-green/10 text-ng-green rounded-2xl">
              <FolderKanban size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{project.name}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {project.status || 'Activo'}
                </span>
                {project.city && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                    <MapPin size={10} />
                    {project.city}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <button
                onClick={() => onEdit(project)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-all"
                title="Editar proyecto"
              >
                <Edit size={14} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(project.id)}
                className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-all"
                title="Eliminar proyecto"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {project.description && (
          <p className="text-xs text-gray-500 mt-3 line-clamp-2">{project.description}</p>
        )}

        {/* Assigned Leader & Auxiliaries */}
        {(leader || auxiliaries.length > 0) && (
          <div className="mt-4 pt-3 border-t border-gray-50 space-y-2">
            {leader && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center overflow-hidden shrink-0">
                  {leader.avatar ? (
                    <img src={leader.avatar} alt={leader.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={10} />
                  )}
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Líder:</span>
                  <span className="text-xs font-semibold text-gray-800 truncate">{leader.name}</span>
                </div>
              </div>
            )}

            {auxiliaries.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center -space-x-1.5 overflow-hidden shrink-0">
                  {auxiliaries.slice(0, 4).map(aux => (
                    <div
                      key={`card_aux_${aux.id}`}
                      title={aux.name}
                      className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9px] flex items-center justify-center border-2 border-white overflow-hidden shadow-xs"
                    >
                      {aux.avatar ? (
                        <img src={aux.avatar} alt={aux.name} className="w-full h-full object-cover" />
                      ) : (
                        aux.name.substring(0, 1)
                      )}
                    </div>
                  ))}
                  {auxiliaries.length > 4 && (
                    <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 font-black text-[9px] flex items-center justify-center border-2 border-white shadow-xs">
                      +{auxiliaries.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium text-gray-500">
                  {auxiliaries.length} {auxiliaries.length === 1 ? 'auxiliar asignado' : 'auxiliares asignados'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-50">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-400 font-medium">Progreso ({completedTasks}/{tasks.length})</span>
          <span className="font-bold text-gray-700">{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div className="bg-ng-green h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};
