import React from 'react';
import { motion } from 'motion/react';
import { TeamMember, Company, Process, Role } from '../../types';
import { ImportacionesModule, ImportacionesSubTab } from '../ImportacionesModule';
import { ModulePermissionsTab } from '../common/ModulePermissionsTab';

interface ImportacionesViewProps {
  currentMember: TeamMember | null | undefined;
  companies: Company[];
  members?: TeamMember[];
  processes?: Process[];
  roles?: Role[];
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  activeSubTab: ImportacionesSubTab;
  onSubTabChange: (tab: ImportacionesSubTab) => void;
}

export const ImportacionesView: React.FC<ImportacionesViewProps> = ({
  currentMember,
  companies,
  members = [],
  processes = [],
  roles = [],
  accessLevel,
  activeSubTab,
  onSubTabChange,
}) => {
  return (
    <motion.div
      key="importaciones"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-7xl mx-auto w-full"
    >
      {activeSubTab === 'permissions' ? (
        <ModulePermissionsTab
          moduleId="importaciones"
          moduleName="Comercio Exterior e Importaciones"
          currentMember={currentMember}
          members={members}
          processes={processes}
          roles={roles}
        />
      ) : (
        <ImportacionesModule
          companies={companies}
          currentMember={currentMember}
          accessLevel={accessLevel}
          activeSubTab={activeSubTab}
          onSubTabChange={onSubTabChange}
        />
      )}
    </motion.div>
  );
};
