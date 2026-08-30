import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Link2
} from 'lucide-react';
import { 
  Company, 
  TeamMember 
} from '../types';
import { PersonalLinksView } from './common/PersonalLinksView';
import { PersonalNotesView } from './common/PersonalNotesView';

export type QHSESubTab = 'links' | 'notes';

interface QHSEModuleProps {
  currentMember: TeamMember | null;
  members: TeamMember[];
  companies: Company[];
  activeSubTab?: QHSESubTab;
  onSubTabChange?: (tab: QHSESubTab) => void;
  accessLevel?: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
}

export const QHSEModule: React.FC<QHSEModuleProps> = ({
  currentMember,
  members,
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
      </AnimatePresence>
    </div>
  );
};
