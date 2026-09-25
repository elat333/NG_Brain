import React from 'react';
import { motion } from 'motion/react';
import { 
  TeamMember, 
  Process, 
  ManagementNote, 
  ManagementStrategyData, 
  ManagementAIGovernanceData,
  Task,
  Role
} from '../../types';
import ManagementModule from '../ManagementModule';
import { ModulePermissionsTab } from '../common/ModulePermissionsTab';

interface ManagementViewProps {
  currentMember: TeamMember | null;
  members: TeamMember[];
  processes: Process[];
  roles?: Role[];
  notes: ManagementNote[];
  strategy: ManagementStrategyData;
  governance: ManagementAIGovernanceData;
  tasks?: Task[];
  onUpdateNotes: (notes: ManagementNote[]) => void;
  onUpdateStrategy: (strategy: ManagementStrategyData) => void;
  onUpdateGovernance: (gov: ManagementAIGovernanceData) => void;
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  activeSubTab?: 'consultant' | 'notes' | 'strategy' | 'governance' | 'links' | 'permissions';
  setActiveSubTab?: (subTab: 'consultant' | 'notes' | 'strategy' | 'governance' | 'links' | 'permissions') => void;
}

export const ManagementView: React.FC<ManagementViewProps> = ({
  currentMember,
  members,
  processes,
  roles = [],
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
      {activeSubTab === 'permissions' ? (
        <ModulePermissionsTab
          moduleId="gerencia"
          moduleName="Gerencia & Dirección Estratégica"
          currentMember={currentMember}
          members={members}
          processes={processes}
          roles={roles}
        />
      ) : (
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
          activeSubTab={activeSubTab as any}
          setActiveSubTab={setActiveSubTab as any}
        />
      )}
    </motion.div>
  );
};

