import React from 'react';
import { motion } from 'motion/react';
import { TeamMember, Company, Process } from '../../types';
import { VentasModule, VentasSubTab } from '../VentasModule';

interface SalesViewProps {
  currentMember: TeamMember | null | undefined;
  members: TeamMember[];
  companies: Company[];
  processes: Process[];
  activeSubTab: VentasSubTab;
  onSubTabChange: (tab: VentasSubTab) => void;
  onCreateCompany?: (company: Partial<Company>) => Promise<string>;
  onCreateMember?: (member: Partial<TeamMember>) => Promise<string>;
}

export const SalesView: React.FC<SalesViewProps> = ({
  currentMember,
  members,
  companies,
  processes,
  activeSubTab,
  onSubTabChange,
  onCreateCompany,
  onCreateMember,
}) => {
  return (
    <motion.div
      key="ventas"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-7xl mx-auto w-full"
    >
      <VentasModule
        currentMember={currentMember}
        members={members}
        companies={companies}
        processes={processes}
        activeSubTab={activeSubTab}
        onSubTabChange={onSubTabChange}
        onCreateCompany={onCreateCompany}
        onCreateMember={onCreateMember}
      />
    </motion.div>
  );
};
