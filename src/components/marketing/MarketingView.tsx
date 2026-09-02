import React from 'react';
import { motion } from 'motion/react';
import { TeamMember, Process, Task, Project, Company } from '../../types';
import { MarketingModule, MarketingSubTab } from '../MarketingModule';

interface MarketingViewProps {
  currentMember: TeamMember | null | undefined;
  members: TeamMember[];
  processes: Process[];
  tasks: Task[];
  projects: Project[];
  companies: Company[];
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  activeSubTab: MarketingSubTab;
  onSubTabChange: (tab: MarketingSubTab) => void;
  onAddTask: (taskData: any) => Promise<string>;
  onAddProject: (projData: any) => Promise<string>;
  onOpenTask: (task: Task) => void;
  onOpenCreateTaskModal: (initialOverrides?: Partial<Task>) => void;
}

export const MarketingView: React.FC<MarketingViewProps> = ({
  currentMember,
  members,
  processes,
  tasks,
  projects,
  companies,
  accessLevel,
  activeSubTab,
  onSubTabChange,
  onAddTask,
  onAddProject,
  onOpenTask,
  onOpenCreateTaskModal,
}) => {
  return (
    <motion.div
      key="marketing"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-7xl mx-auto w-full"
    >
      <MarketingModule
        currentMember={currentMember}
        members={members}
        processes={processes}
        tasks={tasks}
        projects={projects}
        companies={companies}
        accessLevel={accessLevel}
        activeSubTab={activeSubTab}
        onSubTabChange={onSubTabChange}
        onAddTask={onAddTask}
        onAddProject={onAddProject}
        onOpenTask={onOpenTask}
        onOpenCreateTaskModal={onOpenCreateTaskModal}
      />
    </motion.div>
  );
};
