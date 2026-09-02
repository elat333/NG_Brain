import React from 'react';
import { motion } from 'motion/react';
import ProcessDashboard from '../ProcessDashboard';
import { Process, TeamMember, Task, Project, Role } from '../../types';

export interface ProcessDashboardViewProps {
  currentMember: TeamMember | null | undefined;
  processes: Process[];
  members: TeamMember[];
  tasks: Task[];
  projects: Project[];
  roles: Role[];
  processLinks: any[];
  processNotes: any[];
  activeSubTab?: 'summary' | 'projects' | 'links' | 'notes' | any;
  setActiveSubTab: (tab: any) => void;
  selectedProcessId: string | null;
  setSelectedProcessId: (id: string | null) => void;
  showFicha: boolean;
  setShowFicha: (show: boolean) => void;
  onOpenTask: (task: Task) => void;
}

export const ProcessDashboardView: React.FC<ProcessDashboardViewProps> = ({
  currentMember,
  processes,
  members,
  tasks,
  projects,
  roles,
  processLinks,
  processNotes,
  activeSubTab,
  setActiveSubTab,
  selectedProcessId,
  setSelectedProcessId,
  showFicha,
  setShowFicha,
  onOpenTask
}) => {
  return (
    <motion.div
      key="process_dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-7xl mx-auto w-full"
    >
      <ProcessDashboard
        currentMember={currentMember}
        processes={processes}
        members={members}
        tasks={tasks}
        projects={projects}
        roles={roles}
        processLinks={processLinks}
        processNotes={processNotes}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        selectedProcessId={selectedProcessId}
        setSelectedProcessId={setSelectedProcessId}
        showFicha={showFicha}
        setShowFicha={setShowFicha}
        onOpenTask={onOpenTask}
      />
    </motion.div>
  );
};
