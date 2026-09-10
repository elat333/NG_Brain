import React from 'react';
import { motion } from 'motion/react';
import { TeamMember, Company, Process, Role } from '../../types';
import { CapacitacionModule, CapacitacionSubTab } from '../CapacitacionModule';

interface TrainingViewProps {
  currentMember: TeamMember | null | undefined;
  activeSubTab: CapacitacionSubTab;
  onSubTabChange: (tab: CapacitacionSubTab) => void;
  members: TeamMember[];
  companies?: Company[];
  processes?: Process[];
  roles?: Role[];
  onCreateMember?: (member: Partial<TeamMember>) => Promise<string>;
}

export const TrainingView: React.FC<TrainingViewProps> = ({
  currentMember,
  activeSubTab,
  onSubTabChange,
  members,
  companies = [],
  processes = [],
  roles = [],
  onCreateMember,
}) => {
  return (
    <motion.div
      key="capacitacion"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-7xl mx-auto w-full"
    >
      <CapacitacionModule
        currentMember={currentMember}
        activeSubTab={activeSubTab}
        onSubTabChange={onSubTabChange}
        members={members}
        companies={companies}
        processes={processes}
        roles={roles}
        onCreateMember={onCreateMember}
      />
    </motion.div>
  );
};
