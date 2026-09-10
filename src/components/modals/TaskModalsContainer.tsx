import React from 'react';
import { AnimatePresence } from 'motion/react';
import TaskModal from '../TaskModal';
import UnsavedChangesModal from './UnsavedChangesModal';
import ConfirmDeleteTaskModal from './ConfirmDeleteTaskModal';
import { ExportTasksModal } from './ExportTasksModal';
import { Task, TeamMember, Role, Process, Project } from '../../types';

interface TaskModalsContainerProps {
  isAddingTask: boolean;
  editingTask: Task | null;
  newTaskData: any;
  setNewTaskData: React.Dispatch<React.SetStateAction<any>>;
  handleAddTask: (e: React.FormEvent) => Promise<void>;
  handleUpdateTask: (e: React.FormEvent) => Promise<void>;
  handleRequestCloseTaskModal: () => void;
  handleForceCloseTaskModal: () => void;
  currentMember: TeamMember | null | undefined;
  roles: Role[];
  processes: Process[];
  projects: Project[];
  members: TeamMember[];
  tasks: Task[];
  filteredTasks?: Task[];
  isNewTask: boolean;
  isProcessLeader: boolean;
  canEditMetadataField: boolean;
  canEditStatusField: boolean;
  canEditPlanning: boolean;
  canEditExecution: boolean;
  showTaskHistory: boolean;
  setShowTaskHistory: React.Dispatch<React.SetStateAction<boolean>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setEditingTask: React.Dispatch<React.SetStateAction<Task | null>>;
  handleDeleteTask: (id: string) => void;
  showUnsavedTaskChangesModal: boolean;
  setShowUnsavedTaskChangesModal: React.Dispatch<React.SetStateAction<boolean>>;
  taskToDelete: Task | null;
  isDeletingTask: boolean;
  confirmDeleteTask: () => Promise<void>;
  setTaskToDelete: React.Dispatch<React.SetStateAction<Task | null>>;
  isExportModalOpen?: boolean;
  setIsExportModalOpen?: (open: boolean) => void;
}

export const TaskModalsContainer: React.FC<TaskModalsContainerProps> = ({
  isAddingTask,
  editingTask,
  newTaskData,
  setNewTaskData,
  handleAddTask,
  handleUpdateTask,
  handleRequestCloseTaskModal,
  handleForceCloseTaskModal,
  currentMember,
  roles,
  processes,
  projects,
  members,
  tasks,
  filteredTasks = tasks,
  isNewTask,
  isProcessLeader,
  canEditMetadataField,
  canEditStatusField,
  canEditPlanning,
  canEditExecution,
  showTaskHistory,
  setShowTaskHistory,
  setTasks,
  setEditingTask,
  handleDeleteTask,
  showUnsavedTaskChangesModal,
  setShowUnsavedTaskChangesModal,
  taskToDelete,
  isDeletingTask,
  confirmDeleteTask,
  setTaskToDelete,
  isExportModalOpen = false,
  setIsExportModalOpen
}) => {
  return (
    <AnimatePresence>
      {/* Modal de Exportación Avanzada de Tareas */}
      {isExportModalOpen && (
        <ExportTasksModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen?.(false)}
          tasks={tasks}
          filteredTasks={filteredTasks}
          members={members}
          processes={processes}
          projects={projects}
        />
      )}

      {/* Task Modal (Standard & Design Templates) */}
      <TaskModal
        isOpen={isAddingTask || !!editingTask}
        editingTask={editingTask}
        newTaskData={newTaskData}
        setNewTaskData={setNewTaskData}
        onSave={editingTask ? handleUpdateTask : handleAddTask}
        onClose={handleRequestCloseTaskModal}
        currentMember={currentMember}
        roles={roles}
        processes={processes}
        projects={projects}
        members={members}
        tasks={tasks}
        isNewTask={isNewTask}
        isProcessLeader={isProcessLeader}
        canEditMetadataField={canEditMetadataField}
        canEditStatusField={canEditStatusField}
        canEditPlanning={canEditPlanning}
        canEditExecution={canEditExecution}
        showTaskHistory={showTaskHistory}
        setShowTaskHistory={setShowTaskHistory}
        setTasks={setTasks}
        setEditingTask={setEditingTask}
        handleDeleteTask={handleDeleteTask}
      />

      {/* Modal de Advertencia de Cambios No Guardados */}
      <UnsavedChangesModal
        isOpen={showUnsavedTaskChangesModal}
        isEditing={!!editingTask}
        onSaveAndClose={async (e) => {
          try {
            if (editingTask) {
              await handleUpdateTask(e);
            } else {
              await handleAddTask(e);
            }
          } finally {
            setShowUnsavedTaskChangesModal(false);
          }
        }}
        onDiscard={handleForceCloseTaskModal}
        onContinueEditing={() => setShowUnsavedTaskChangesModal(false)}
      />

      {/* Modal de Confirmación de Eliminación de Tarea */}
      <ConfirmDeleteTaskModal
        task={taskToDelete}
        isDeleting={isDeletingTask}
        onConfirm={confirmDeleteTask}
        onCancel={() => setTaskToDelete(null)}
      />
    </AnimatePresence>
  );
};
export default TaskModalsContainer;
