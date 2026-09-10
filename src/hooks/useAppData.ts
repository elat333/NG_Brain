import React, { useState } from 'react';
import { useFirestoreSync } from './useFirestoreSync';
import { 
  User as FirebaseUser,
  db,
  doc,
  setDoc,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { 
  ManagementNote, 
  ManagementStrategyData, 
  ManagementAIGovernanceData 
} from '../types';

export function useAppData(user: FirebaseUser | null) {
  // Sincronización completa con Firestore y estado global
  const firestoreSync = useFirestoreSync(user);

  const {
    industries, setIndustries,
    roles, setRoles,
    companies, setCompanies,
    members, setMembers,
    processes, setProcesses,
    tasks, setTasks,
    projects, setProjects,
    processLinks, setProcessLinks,
    processNotes, setProcessNotes,
    managementNotes, setManagementNotes,
    managementStrategy, setManagementStrategy,
    managementGovernance, setManagementGovernance,
    products, setProducts,
    isMigrating,
    localDataFound,
    isInitializingData,
    migrateFromLocalStorage,
    bootstrapData
  } = firestoreSync;

  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [members]);

  const handleUpdateManagementNotes = async (updatedNotes: ManagementNote[]) => {
    setManagementNotes(updatedNotes);
    try {
      for (const note of updatedNotes) {
        await setDoc(doc(db, 'management_notes', note.id), note);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'management_notes');
    }
  };

  const handleUpdateManagementStrategy = async (updatedStrategy: ManagementStrategyData) => {
    setManagementStrategy(updatedStrategy);
    try {
      await setDoc(doc(db, 'management_strategy', 'default'), updatedStrategy);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'management_strategy');
    }
  };

  const handleUpdateManagementGovernance = async (updatedGovernance: ManagementAIGovernanceData) => {
    setManagementGovernance(updatedGovernance);
    try {
      await setDoc(doc(db, 'management_governance', 'default'), updatedGovernance);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'management_governance');
    }
  };

  return {
    industries, setIndustries,
    roles, setRoles,
    companies, setCompanies,
    members, setMembers,
    sortedMembers,
    processes, setProcesses,
    tasks, setTasks,
    projects, setProjects,
    processLinks, setProcessLinks,
    processNotes, setProcessNotes,
    managementNotes, setManagementNotes,
    managementStrategy, setManagementStrategy,
    managementGovernance, setManagementGovernance,
    products, setProducts,
    isMigrating,
    localDataFound,
    isInitializingData,
    migrateFromLocalStorage,
    bootstrapData,
    handleUpdateManagementNotes,
    handleUpdateManagementStrategy,
    handleUpdateManagementGovernance
  };
}
