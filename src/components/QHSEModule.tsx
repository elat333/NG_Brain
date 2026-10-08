import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Link2,
  Layers,
  ClipboardCheck
} from 'lucide-react';
import { 
  Company, 
  TeamMember,
  Process,
  Project,
  RoleDefinition
} from '../types';
import { PersonalLinksView } from './common/PersonalLinksView';
import { PersonalNotesView } from './common/PersonalNotesView';
import { ModulePermissionsTab } from './common/ModulePermissionsTab';
import { ScaffoldInspectionsView } from './qhse/ScaffoldInspectionsView';

export type QHSESubTab = 'inspections' | 'links' | 'notes' | 'permissions';

interface QHSEModuleProps {
  currentMember: TeamMember | null | undefined;
  members: TeamMember[];
  companies: Company[];
  processes?: Process[];
  projects?: Project[];
  roles?: RoleDefinition[];
  activeSubTab?: QHSESubTab;
  onSubTabChange?: (tab: QHSESubTab) => void;
  accessLevel?: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
}

export const QHSEModule: React.FC<QHSEModuleProps> = ({
  currentMember,
  members,
  companies,
  processes = [],
  projects = [],
  roles = [],
  activeSubTab = 'inspections',
  accessLevel = 'colaborador',
}) => {
  const isReadOnly = accessLevel === 'lector';

  return (
    <div id="qhse-module-root" className="w-full space-y-6">
      {/* Sub-view Content Rendering */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'inspections' && (
          <motion.div
            key="qhse-inspections"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <ScaffoldInspectionsView
              projects={projects}
              members={members}
              currentMember={currentMember}
              roles={roles}
            />
          </motion.div>
        )}

        {activeSubTab === 'links' && (
          <motion.div
            key="qhse-links"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <PersonalLinksView
              moduleName="QHSE"
              currentMember={currentMember}
              members={members}
              accentColor="emerald"
            />
          </motion.div>
        )}

        {activeSubTab === 'notes' && (
          <motion.div
            key="qhse-notes"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <PersonalNotesView
              moduleName="QHSE"
              currentMember={currentMember}
              members={members}
              accentColor="emerald"
            />
          </motion.div>
        )}

        {activeSubTab === 'permissions' && (
          <motion.div
            key="qhse-permissions"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <ModulePermissionsTab
              moduleId="qhse"
              moduleName="QHSE"
              currentMember={currentMember}
              members={members}
              processes={processes}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
