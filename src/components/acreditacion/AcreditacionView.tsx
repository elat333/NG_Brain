import React from 'react';
import { motion } from 'motion/react';
import { TeamMember, Company, Industry } from '../../types';
import { AcreditacionModule, AcreditacionSubTab } from '../AcreditacionModule';

interface AcreditacionViewProps {
  currentMember: TeamMember | null | undefined;
  members: TeamMember[];
  companies: Company[];
  industries?: Industry[];
  activeSubTab: AcreditacionSubTab;
  onSubTabChange: (tab: AcreditacionSubTab) => void;
}

export const AcreditacionView: React.FC<AcreditacionViewProps> = ({
  currentMember,
  members,
  companies,
  industries,
  activeSubTab,
  onSubTabChange,
}) => {
  return (
    <motion.div
      key="acreditacion"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-7xl mx-auto w-full"
    >
      <AcreditacionModule
        currentMember={currentMember}
        members={members}
        companies={companies}
        industries={industries}
        activeSubTab={activeSubTab}
        onSubTabChange={onSubTabChange}
      />
    </motion.div>
  );
};
