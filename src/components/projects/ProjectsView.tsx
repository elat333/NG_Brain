import React from 'react';
import { motion } from 'motion/react';
import { FolderKanban } from 'lucide-react';
import { Process, Project, Task, TeamMember, Role } from '../../types';
import { ProjectCard } from './ProjectCard';

export interface ProjectsViewProps {
  processes: Process[];
  projects: Project[];
  tasks: Task[];
  members?: TeamMember[];
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
  members = [],
  currentMember,
  roles,
  showCompletedProjects,
  getModuleAccess,
  isTaskVisibleForMember,
  openEditProject,
  handleDeleteProject
}) => {
  const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');

  // Filter projects by member visibility
  const isProjectVisibleForMember = (project: Project, processAccess: string): boolean => {
    if (isUserAdmin) return true;
    if (!currentMember) return false;

    // Si tiene permiso de lector, colaborador, líder o admin en el proceso, ve TODOS los proyectos del proceso
    if (processAccess === 'lector' || processAccess === 'colaborador' || processAccess === 'lider' || processAccess === 'administrador') {
      return true;
    }

    // Si tiene 'ninguno', solo puede ver los proyectos donde esté asignado directamente
    const isLeader = project.leaderId === currentMember.id;
    const isAuxiliary = Boolean(project.auxiliaryMemberIds?.includes(currentMember.id));
    const isAssignedInProjectTasks = tasks.some(
      t => t.projectId === project.id && (
        t.memberId === currentMember.id || 
        (t.auxiliaryIds && t.auxiliaryIds.includes(currentMember.id)) ||
        t.auxiliaryId === currentMember.id
      )
    );

    return Boolean(isLeader || isAuxiliary || isAssignedInProjectTasks);
  };

  const visibleProcesses = processes.filter(proc => {
    if (isUserAdmin) return true;
    const processAccess = getModuleAccess(currentMember, roles, `projects_${proc.id}`);
    if (processAccess !== 'ninguno') return true;
    // Si tiene 'ninguno', solo mostrar el proceso si tiene al menos un proyecto asignado visible
    return projects.some(p => p.processId === proc.id && isProjectVisibleForMember(p, processAccess));
  });

  return (
    <motion.div
      key="projects"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-12"
    >
      {visibleProcesses.map((proc, procIdx) => {
        const processAccess = getModuleAccess(currentMember, roles, `projects_${proc.id}`);
        const canManageProcess = isUserAdmin || processAccess === 'lider' || processAccess === 'administrador';

        const processProjects = projects.filter(
          p => p.processId === proc.id && (showCompletedProjects || p.status !== 'completado') && isProjectVisibleForMember(p, processAccess)
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
                const canEdit = canManageProcess;
                const canDelete = canManageProcess;

                return (
                  <ProjectCard
                    key={`proj_card_${project.id || projIdx}_${projIdx}`}
                    project={project}
                    tasks={tasks.filter(t => t.projectId === project.id && isTaskVisibleForMember(t, currentMember, roles))}
                    members={members}
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

      {visibleProcesses.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-gray-400">No tienes acceso a proyectos en ningún proceso o no hay proyectos asignados a tu usuario.</p>
        </div>
      )}
    </motion.div>
  );
};
