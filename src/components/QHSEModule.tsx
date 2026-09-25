import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Link2
} from 'lucide-react';
import { 
  Company, 
  TeamMember,
  Process 
} from '../types';
import { PersonalLinksView } from './common/PersonalLinksView';
import { PersonalNotesView } from './common/PersonalNotesView';
import { ModulePermissionsTab } from './common/ModulePermissionsTab';

export type QHSESubTab = 'links' | 'notes' | 'permissions';

interface QHSEModuleProps {
  currentMember: TeamMember | null;
  members: TeamMember[];
  companies: Company[];
  processes?: Process[];
  activeSubTab?: QHSESubTab;
  onSubTabChange?: (tab: QHSESubTab) => void;
  accessLevel?: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
}

export const QHSEModule: React.FC<QHSEModuleProps> = ({
  currentMember,
  members,
  companies,
  processes = [],
  activeSubTab = 'links',
  accessLevel = 'colaborador',
}) => {
  const isReadOnly = accessLevel === 'lector';

  return (
    <div id="qhse-module-root" className="w-full space-y-6">
      {/* Sub-view Content Rendering */}
      <AnimatePresence mode="wait">
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
