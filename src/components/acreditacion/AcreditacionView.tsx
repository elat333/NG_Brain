import React from 'react';
import { motion } from 'motion/react';
import { TeamMember, Company, Industry, Process, Role } from '../../types';
import { AcreditacionModule, AcreditacionSubTab } from '../AcreditacionModule';
import { ModulePermissionsTab } from '../common/ModulePermissionsTab';

interface AcreditacionViewProps {
  currentMember: TeamMember | null | undefined;
  members: TeamMember[];
  companies: Company[];
  processes?: Process[];
  roles?: Role[];
  industries?: Industry[];
  activeSubTab: AcreditacionSubTab;
  onSubTabChange: (tab: AcreditacionSubTab) => void;
}

export const AcreditacionView: React.FC<AcreditacionViewProps> = ({
  currentMember,
  members,
  companies,
  processes = [],
  roles = [],
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
      {activeSubTab === 'permissions' ? (
        <ModulePermissionsTab
          moduleId="acreditacion"
          moduleName="Acreditaciones & Organismos"
          currentMember={currentMember}
          members={members}
          processes={processes}
          roles={roles}
        />
      ) : (
        <AcreditacionModule
          currentMember={currentMember}
          members={members}
          companies={companies}
          processes={processes}
          industries={industries}
          activeSubTab={activeSubTab}
          onSubTabChange={onSubTabChange}
        />
      )}
    </motion.div>
  );
};
