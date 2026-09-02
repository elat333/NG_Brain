import React from 'react';
import { FolderKanban, Edit, Trash2 } from 'lucide-react';
import { Project, Task } from '../../types';

export interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  tasks,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true
}) => {
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

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
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {project.status || 'Activo'}
              </span>
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
