import React from 'react';
import { motion } from 'motion/react';
import { 
  TeamMember, 
  Process, 
  ManagementNote, 
  ManagementStrategyData, 
  ManagementAIGovernanceData,
  Task
} from '../../types';
import ManagementModule from '../ManagementModule';

interface ManagementViewProps {
  currentMember: TeamMember | null;
  members: TeamMember[];
  processes: Process[];
  notes: ManagementNote[];
  strategy: ManagementStrategyData;
  governance: ManagementAIGovernanceData;
  tasks?: Task[];
  onUpdateNotes: (notes: ManagementNote[]) => void;
  onUpdateStrategy: (strategy: ManagementStrategyData) => void;
  onUpdateGovernance: (gov: ManagementAIGovernanceData) => void;
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  activeSubTab?: 'consultant' | 'notes' | 'strategy' | 'governance' | 'links';
  setActiveSubTab?: (subTab: 'consultant' | 'notes' | 'strategy' | 'governance' | 'links') => void;
}

export const ManagementView: React.FC<ManagementViewProps> = ({
  currentMember,
  members,
  processes,
  notes,
  strategy,
  governance,
  tasks,
  onUpdateNotes,
  onUpdateStrategy,
  onUpdateGovernance,
  accessLevel,
  activeSubTab,
  setActiveSubTab,
}) => {
  return (
    <motion.div
      key="gerencia"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`max-w-7xl mx-auto w-full ${activeSubTab === 'consultant' ? 'h-full flex flex-col' : ''}`}
    >
      <ManagementModule
        currentMember={currentMember}
        members={members}
        processes={processes}
        notes={notes}
        strategy={strategy}
        governance={governance}
        tasks={tasks}
        onUpdateNotes={onUpdateNotes}
        onUpdateStrategy={onUpdateStrategy}
        onUpdateGovernance={onUpdateGovernance}
        accessLevel={accessLevel}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
      />
    </motion.div>
  );
};

