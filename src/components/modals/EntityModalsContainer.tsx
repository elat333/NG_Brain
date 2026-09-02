import React from 'react';
import { AnimatePresence } from 'motion/react';
import { Process, Project, TeamMember, SystemRole, Task } from '../../types';
import { ProcessModal } from './ProcessModal';
import { ProjectModal } from './ProjectModal';
import { ConfirmDeleteProjectModal } from './ConfirmDeleteProjectModal';
import { PendingExitPermissionsModal, PendingExitAction } from './PendingExitPermissionsModal';

interface EntityModalsContainerProps {
  // Process Modal
  isAddingProcess: boolean;
  editingProcess: Process | null;
  newProcessData: { name: string; description: string; goals: string };
  setNewProcessData: React.Dispatch<React.SetStateAction<{ name: string; description: string; goals: string }>>;
  onAddProcess: (e: React.FormEvent) => void;
  onCloseProcessModal: () => void;

  // Project Modal
  isAddingProject: boolean;
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
  onUpdateProject: (e: React.FormEvent) => void;
  onAddProject: (e: React.FormEvent) => void;
  onCloseProjectModal: () => void;

  // Confirm Delete Project Modal
  projectToDelete: Project | null;
  tasks: Task[];
  isDeletingProject: boolean;
  onConfirmDeleteProject: () => void;
  onCancelDeleteProject: () => void;

  // Pending Exit Permissions Modal
  pendingExitAction: PendingExitAction | null;
  resolvedPermissionsMember: TeamMember | null | undefined;
  onCancelPendingExit: () => void;
  onDiscardPendingExit: () => void;
  onSavePendingExit: () => Promise<void>;
}

export const EntityModalsContainer: React.FC<EntityModalsContainerProps> = ({
  isAddingProcess,
  editingProcess,
  newProcessData,
  setNewProcessData,
  onAddProcess,
  onCloseProcessModal,

  isAddingProject,
  editingProject,
  newProjectData,
  setNewProjectData,
  processes,
  currentMember,
  roles,
  getModuleAccess,
  onUpdateProject,
  onAddProject,
  onCloseProjectModal,

  projectToDelete,
  tasks,
  isDeletingProject,
  onConfirmDeleteProject,
  onCancelDeleteProject,

  pendingExitAction,
  resolvedPermissionsMember,
  onCancelPendingExit,
  onDiscardPendingExit,
  onSavePendingExit,
}) => {
  return (
    <>
      <AnimatePresence>
        <PendingExitPermissionsModal
          pendingExitAction={pendingExitAction}
          resolvedPermissionsMember={resolvedPermissionsMember}
          onCancel={onCancelPendingExit}
          onDiscardAndProceed={onDiscardPendingExit}
          onSaveAndProceed={onSavePendingExit}
        />
      </AnimatePresence>

      <AnimatePresence>
        <ProcessModal
          isOpen={isAddingProcess}
          editingProcess={editingProcess}
          newProcessData={newProcessData}
          setNewProcessData={setNewProcessData}
          onSubmit={onAddProcess}
          onClose={onCloseProcessModal}
        />

        <ProjectModal
          isOpen={isAddingProject || !!editingProject}
          editingProject={editingProject}
          newProjectData={newProjectData}
          setNewProjectData={setNewProjectData}
          processes={processes}
          currentMember={currentMember}
          roles={roles}
          getModuleAccess={getModuleAccess}
          onSubmit={editingProject ? onUpdateProject : onAddProject}
          onClose={onCloseProjectModal}
        />

        <ConfirmDeleteProjectModal
          project={projectToDelete}
          processes={processes}
          tasks={tasks}
          isDeleting={isDeletingProject}
          onConfirm={onConfirmDeleteProject}
          onCancel={onCancelDeleteProject}
        />
      </AnimatePresence>
    </>
  );
};
