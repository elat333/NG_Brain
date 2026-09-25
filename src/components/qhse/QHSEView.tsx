import React from 'react';
import { motion } from 'motion/react';
import { TeamMember, Company, Process } from '../../types';
import { QHSEModule, QHSESubTab } from '../QHSEModule';

interface QHSEViewProps {
  currentMember: TeamMember | null | undefined;
  members: TeamMember[];
  companies: Company[];
  processes?: Process[];
  activeSubTab: QHSESubTab;
  onSubTabChange: (tab: QHSESubTab) => void;
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
}

export const QHSEView: React.FC<QHSEViewProps> = ({
  currentMember,
  members,
  companies,
  processes = [],
  activeSubTab,
  onSubTabChange,
  accessLevel,
}) => {
  return (
    <motion.div
      key="qhse"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-7xl mx-auto w-full"
    >
      <QHSEModule
        currentMember={currentMember}
        members={members}
        companies={companies}
        processes={processes}
        activeSubTab={activeSubTab}
        onSubTabChange={onSubTabChange}
        accessLevel={accessLevel}
      />
    </motion.div>
  );
};
