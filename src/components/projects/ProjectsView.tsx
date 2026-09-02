import React from 'react';
import { motion } from 'motion/react';
import { FolderKanban } from 'lucide-react';
import { Process, Project, Task, TeamMember, Role } from '../../types';
import { ProjectCard } from './ProjectCard';

export interface ProjectsViewProps {
  processes: Process[];
  projects: Project[];
  tasks: Task[];
  currentMember: TeamMember | null | undefined;
  roles: Role[];
  showCompletedProjects: boolean;
  getModuleAccess: (member: TeamMember | null | undefined, roles: Role[], moduleId: string) => string;
  isTaskVisibleForMember: (task: Task, member: TeamMember | null | undefined, roles: Role[]) => boolean;
  openEditProject: (project: Project) => void;
  handleDeleteProject: (projOrId: Project | string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  processes,
  projects,
  tasks,
  currentMember,
  roles,
  showCompletedProjects,
  getModuleAccess,
  isTaskVisibleForMember,
  openEditProject,
  handleDeleteProject
}) => {
  return (
    <motion.div
      key="projects"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-12"
    >
      {processes.map((proc, procIdx) => {
        const processProjects = projects.filter(
          p => p.processId === proc.id && (showCompletedProjects || p.status !== 'completado')
        );
        return (
          <div key={`proj_view_proc_${proc.id || procIdx}_${procIdx}`} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-8 w-1 bg-[#2563EB] rounded-full" />
              <h3 className="text-xl font-bold text-[#111827]">{proc.name}</h3>
              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-md">
                {processProjects.length} {processProjects.length === 1 ? 'Proyecto' : 'Proyectos'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processProjects.map((project, projIdx) => {
                const projectAccess = getModuleAccess(currentMember, roles, `projects_${project.processId}`);
                const isUserAdmin = currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin';
                const canEdit = isUserAdmin || projectAccess === 'lider' || projectAccess === 'administrador';
                const canDelete = isUserAdmin || projectAccess === 'administrador' || projectAccess === 'lider';
                return (
                  <ProjectCard
                    key={`proj_card_${project.id || projIdx}_${projIdx}`}
                    project={project}
                    tasks={tasks.filter(t => t.projectId === project.id && isTaskVisibleForMember(t, currentMember, roles))}
                    onEdit={openEditProject}
                    onDelete={handleDeleteProject}
                    canEdit={canEdit}
                    canDelete={canDelete}
                  />
                );
              })}
              {processProjects.length === 0 && (
                <div className="col-span-full py-8 px-8 border-2 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center text-gray-400 bg-white/50">
                  <FolderKanban size={32} className="mb-2 opacity-20" />
                  <p className="text-sm">No hay proyectos activos en este proceso</p>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {processes.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-gray-400">Crea un proceso primero para poder gestionar proyectos.</p>
        </div>
      )}
    </motion.div>
  );
};
