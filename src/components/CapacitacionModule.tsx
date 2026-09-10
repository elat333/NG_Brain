import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  GraduationCap, 
  MapPin, 
  Laptop, 
  Calendar as CalendarIcon, 
  BookOpen 
} from 'lucide-react';
import { 
  Trainer, 
  TrainingSpace, 
  TrainingPlan, 
  TrainingManagement,
  TeamMember,
  SalesClient,
  MarketingCampaign,
  Company,
  Process,
  Role
} from '../types';

import { TrainersView } from './capacitacion/TrainersView';
import { PhysicalSpacesView } from './capacitacion/PhysicalSpacesView';
import { VirtualSpacesView } from './capacitacion/VirtualSpacesView';
import { TrainingCalendarView } from './capacitacion/TrainingCalendarView';
import { TrainingManagementView } from './capacitacion/TrainingManagementView';
import { PersonalLinksView } from './common/PersonalLinksView';
import { PersonalNotesView } from './common/PersonalNotesView';

export type CapacitacionSubTab = 'trainers' | 'physical_spaces' | 'virtual_spaces' | 'calendar' | 'management' | 'links' | 'notes';

interface CapacitacionModuleProps {
  members?: TeamMember[];
  companies?: Company[];
  processes?: Process[];
  roles?: Role[];
  clients?: SalesClient[];
  campaigns?: MarketingCampaign[]; // Usually App.tsx might not have this in state, we'll fetch them here if not passed.
  activeSubTab?: CapacitacionSubTab;
  onSubTabChange?: (tab: CapacitacionSubTab) => void;
  onCreateMember?: (member: Partial<TeamMember>) => Promise<string>;
  currentMember?: TeamMember | null;
}

export const CapacitacionModule: React.FC<CapacitacionModuleProps> = ({
  members = [],
  companies = [],
  processes = [],
  roles = [],
  clients = [],
  campaigns = [],
  activeSubTab = 'calendar',
  onSubTabChange,
  onCreateMember,
  currentMember
}) => {
  const [currentTab, setCurrentTab] = useState<CapacitacionSubTab>(activeSubTab);
  
  // Local state for module specific data
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [spaces, setSpaces] = useState<TrainingSpace[]>([]);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [managements, setManagements] = useState<TrainingManagement[]>([]);
  const [localCampaigns, setLocalCampaigns] = useState<MarketingCampaign[]>([]);

  useEffect(() => {
    if (activeSubTab && activeSubTab !== currentTab) {
      setCurrentTab(activeSubTab);
    }
  }, [activeSubTab]);

  const handleTabChange = (tab: CapacitacionSubTab) => {
    setCurrentTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  // Fetch data
  useEffect(() => {
    const unsubTrainers = onSnapshot(collection(db, 'trainers'), snapshot => {
      setTrainers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Trainer)));
    });
    const unsubSpaces = onSnapshot(collection(db, 'training_spaces'), snapshot => {
      setSpaces(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TrainingSpace)));
    });
    const unsubPlans = onSnapshot(collection(db, 'training_plans'), snapshot => {
      setPlans(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TrainingPlan)));
    });
    const unsubMgmt = onSnapshot(collection(db, 'training_managements'), snapshot => {
      setManagements(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TrainingManagement)));
    });
    const unsubCamp = onSnapshot(collection(db, 'marketing_campaigns'), snapshot => {
      setLocalCampaigns(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MarketingCampaign)));
    });

    return () => {
      unsubTrainers();
      unsubSpaces();
      unsubPlans();
      unsubMgmt();
      unsubCamp();
    };
  }, []);

  // Handlers
  const handleSaveTrainer = async (t: Partial<Trainer>) => {
    const id = t.id || `tr-${Date.now()}`;
    await setDoc(doc(db, 'trainers', id), { ...t, id });
  };
  const handleDeleteTrainer = async (id: string) => await deleteDoc(doc(db, 'trainers', id));

  const handleSaveSpace = async (s: Partial<TrainingSpace>) => {
    const id = s.id || `sp-${Date.now()}`;
    await setDoc(doc(db, 'training_spaces', id), { ...s, id });
  };
  const handleDeleteSpace = async (id: string) => await deleteDoc(doc(db, 'training_spaces', id));

  const handleSavePlan = async (p: Partial<TrainingPlan>) => {
    const id = p.id || `pl-${Date.now()}`;
    await setDoc(doc(db, 'training_plans', id), { ...p, id });
  };
  const handleDeletePlan = async (id: string) => await deleteDoc(doc(db, 'training_plans', id));

  const handleSaveMgmt = async (m: Partial<TrainingManagement>) => {
    const id = m.id || `mg-${Date.now()}`;
    await setDoc(doc(db, 'training_managements', id), { ...m, id });
  };
  const handleDeleteMgmt = async (id: string) => await deleteDoc(doc(db, 'training_managements', id));

  return (
    <div className="h-[calc(100vh-6rem)] w-full">
      <div className="h-full overflow-y-auto custom-scrollbar pr-2">
        <AnimatePresence mode="wait">
          {currentTab === 'trainers' && (
            <motion.div key="trainers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <TrainersView 
                trainers={trainers} 
                members={members} 
                companies={companies}
                processes={processes}
                roles={roles}
                plans={plans}
                spaces={spaces}
                onSaveTrainer={handleSaveTrainer} 
                onDeleteTrainer={handleDeleteTrainer}
                onCreateMember={onCreateMember}
              />
            </motion.div>
          )}
          {currentTab === 'physical_spaces' && (
            <motion.div key="physical_spaces" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <PhysicalSpacesView 
                spaces={spaces} 
                onSaveSpace={handleSaveSpace} 
                onDeleteSpace={handleDeleteSpace} 
              />
            </motion.div>
          )}
          {currentTab === 'virtual_spaces' && (
            <motion.div key="virtual_spaces" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <VirtualSpacesView 
                spaces={spaces} 
                onSaveSpace={handleSaveSpace} 
                onDeleteSpace={handleDeleteSpace} 
              />
            </motion.div>
          )}
          {currentTab === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <TrainingCalendarView 
                plans={plans} 
                trainers={trainers} 
                spaces={spaces} 
                members={members}
                onSavePlan={handleSavePlan} 
                onDeletePlan={handleDeletePlan} 
              />
            </motion.div>
          )}
          {currentTab === 'management' && (
            <motion.div key="management" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <TrainingManagementView 
                managements={managements} 
                plans={plans}
                clients={clients}
                campaigns={localCampaigns}
                trainers={trainers}
                onSaveManagement={handleSaveMgmt} 
                onDeleteManagement={handleDeleteMgmt} 
              />
            </motion.div>
          )}
          {currentTab === 'links' && (
            <motion.div key="links" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <PersonalLinksView 
                currentMember={currentMember || null} 
                members={members}
                moduleName="Capacitación"
                accentColor="indigo"
              />
            </motion.div>
          )}
          {currentTab === 'notes' && (
            <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <PersonalNotesView 
                currentMember={currentMember || null} 
                members={members}
                moduleName="Capacitación"
                accentColor="indigo"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
