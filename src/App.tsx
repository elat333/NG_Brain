/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  FileText, 
  Plus, 
  Sparkles, 
  ChevronRight, 
  Search, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  History,
  MessageSquareQuote,
  UserPlus,
  Edit,
  X,
  Mic,
  MicOff,
  Calendar,
  MessageSquare,
  ListTodo,
  Zap,
  Info,
  Check,
  Trash,
  UserMinus,
  Ban,
  Lock,
  FolderKanban,
  Layers,
  User,
  Activity,
  Link as LinkIcon,
  Copy,
  Settings,
  Shield,
  Contact,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Table,
  Trello,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  Filter,
  Eye,
  ShieldAlert,
  Save,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TeamMember, Process, ExtractedUpdates, Task, Project, SuggestedActivity, MemberDraft, Deliverable, Company, PersonCategory, Industry, Role, ProcessLink, ProcessNote } from './types';
import { initialMembers, initialProcesses, initialTasks, initialCompanies, initialIndustries, initialRoles } from './lib/initialData';
import { analyzeTranscript, getPlanningSuggestions, processMemberInput } from './services/aiService';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  OperationType,
  handleFirestoreError,
  User as FirebaseUser
} from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
// @ts-ignore
import companyLogo from './assets/images/ng brain ai.jpg';
import ProcessDashboard from './components/ProcessDashboard';
import TaskCalendarView from './components/TaskCalendarView';

// Helper functions
const parseLocalDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed in JS
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
};

const isTaskBlocked = (id: string, allTasks: Task[]): { isBlocked: boolean; blockers: Task[] } => {
  const task = allTasks.find(t => t.id === id);
  if (!task || !task.blockedByTaskIds || task.blockedByTaskIds.length === 0) return { isBlocked: false, blockers: [] };
  
  const activeBlockers = allTasks.filter(t => task.blockedByTaskIds?.includes(t.id) && t.status !== 'done');
  return {
    isBlocked: activeBlockers.length > 0,
    blockers: activeBlockers
  };
};

const isTaskVisibleForMember = (
  task: Task,
  currentMember: TeamMember | null | undefined,
  roles: Role[] | undefined
): boolean => {
  if (!currentMember) return true;

  if (currentMember.isSystemAdmin || currentMember.systemRoleId === 'role-admin') {
    return true;
  }

  // Get specific access for this task's process (using fallback to general 'tasks' if unassigned or not set)
  const moduleIdForTask = task.processId ? `tasks_${task.processId}` : 'tasks';
  const access = getModuleAccess(currentMember, roles, moduleIdForTask);

  // If they have no access ('ninguno'), they can only see the task if they are directly assigned or auxiliary
  if (access === 'ninguno') {
    const isPrimaryAssignee = task.memberId === currentMember.id;
    const isAuxiliaryAssignee = task.auxiliaryId === currentMember.id || (task.auxiliaryIds && task.auxiliaryIds.includes(currentMember.id));
    return isPrimaryAssignee || isAuxiliaryAssignee;
  }

  // If they are a collaborator
  if (access === 'colaborador') {
    const isPrimaryAssignee = task.memberId === currentMember.id;
    const isAuxiliaryAssignee = task.auxiliaryId === currentMember.id || (task.auxiliaryIds && task.auxiliaryIds.includes(currentMember.id));
    const isBacklogUnassignedOfMyProcess = 
      task.status === 'backlog' && 
      task.processId === currentMember.processId && 
      (!task.memberId || task.memberId === '');
    return isPrimaryAssignee || isAuxiliaryAssignee || isBacklogUnassignedOfMyProcess;
  }

  // Lector, Lider, Administrador can see all tasks of this process
  return true;
};

const getModuleAccess = (
  member: TeamMember | null | undefined,
  roles: Role[] | undefined,
  moduleId: string,
  isDatabaseEmpty: boolean = false
): 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador' => {
  if (!member) {
    // If the database is completely empty, default to administrador to allow the first user to bootstrap.
    // Otherwise, default to ninguno to prevent unauthorized access and flashes.
    return isDatabaseEmpty ? 'administrador' : 'ninguno';
  }
  
  if (member.isSystemAdmin || member.systemRoleId === 'role-admin') {
    return 'administrador';
  }

  // Handle process_dashboard (Gestión XD) module special case
  if (moduleId === 'process_dashboard') {
    const generalAccess = member.moduleAccess ? member.moduleAccess['process_dashboard'] : undefined;
    if (generalAccess !== undefined && generalAccess !== 'ninguno') {
      return generalAccess;
    }
    if (member.moduleAccess) {
      const keys = Object.keys(member.moduleAccess);
      const specificLevels = keys
        .filter(k => k.startsWith('process_dashboard_'))
        .map(k => member.moduleAccess![k]);
      
      if (specificLevels.includes('administrador')) return 'administrador';
      if (specificLevels.includes('lider')) return 'lider';
      if (specificLevels.includes('colaborador')) return 'colaborador';
      if (specificLevels.includes('lector')) return 'lector';
    }
    if (generalAccess !== undefined) return generalAccess;
    return 'lector';
  }

  // Handle process_dashboard_ process-specific module ID
  if (moduleId.startsWith('process_dashboard_')) {
    if (member.moduleAccess && member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    const generalAccess = member.moduleAccess ? member.moduleAccess['process_dashboard'] : undefined;
    if (generalAccess !== undefined) {
      return generalAccess;
    }
    return 'lector';
  }

  // Handle tasks module special case
  if (moduleId === 'tasks') {
    const generalAccess = member.moduleAccess ? member.moduleAccess['tasks'] : undefined;
    if (generalAccess !== undefined && generalAccess !== 'ninguno') {
      return generalAccess;
    }
    if (member.moduleAccess) {
      const keys = Object.keys(member.moduleAccess);
      const specificLevels = keys
        .filter(k => k.startsWith('tasks_'))
        .map(k => member.moduleAccess![k]);
      
      if (specificLevels.includes('administrador')) return 'administrador';
      if (specificLevels.includes('lider')) return 'lider';
      if (specificLevels.includes('colaborador')) return 'colaborador';
      if (specificLevels.includes('lector')) return 'lector';
    }
    if (generalAccess !== undefined) return generalAccess;
  }

  // Handle tasks_ process-specific module ID
  if (moduleId.startsWith('tasks_')) {
    if (member.moduleAccess && member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    // Fallback to general tasks access
    const generalTasksAccess = member.moduleAccess ? member.moduleAccess['tasks'] : undefined;
    if (generalTasksAccess !== undefined) {
      return generalTasksAccess;
    }
    return 'ninguno';
  }

  // Handle projects module special case
  if (moduleId === 'projects') {
    if (member.moduleAccess) {
      const keys = Object.keys(member.moduleAccess);
      const specificLevels = keys
        .filter(k => k.startsWith('projects_'))
        .map(k => member.moduleAccess![k]);
      
      if (specificLevels.includes('administrador')) return 'administrador';
      if (specificLevels.includes('lider')) return 'lider';
      if (specificLevels.includes('colaborador')) return 'colaborador';
      if (specificLevels.includes('lector')) return 'lector';
    }
    return 'ninguno';
  }

  // Handle projects_ process-specific module ID
  if (moduleId.startsWith('projects_')) {
    if (member.moduleAccess && member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    return 'ninguno';
  }
  
  // If the member has an explicit moduleAccess object, that object is the absolute source of truth
  if (member.moduleAccess) {
    if (member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    // Any module not explicitly permitted in a custom structure defaults to none
    return 'ninguno';
  }
  
  return 'ninguno';
};

const normalizeText = (text: string): string => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isInitializingData, setIsInitializingData] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transcript' | 'tasks' | 'planner' | 'projects' | 'settings' | 'directory' | 'process_dashboard'>('dashboard');
  const [lastTab, setLastTab] = useState<string | null>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<'roles' | 'processes' | 'members' | 'general'>('general');
  const [showProcessPermissions, setShowProcessPermissions] = useState<boolean>(false);
  const [directorySubTab, setDirectorySubTab] = useState<'people' | 'companies' | 'industries'>('people');
  const [processSubTab, setProcessSubTab] = useState<'summary' | 'projects' | 'links' | 'notes'>('summary');
  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [showFicha, setShowFicha] = useState<boolean>(false);
  
  const [draftIsSystemAdmin, setDraftIsSystemAdmin] = useState<boolean>(false);
  const [draftModuleAccess, setDraftModuleAccess] = useState<Record<string, 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador'>>({});
  const [lastInitializedMemberId, setLastInitializedMemberId] = useState<string>('');
  const [pendingExitAction, setPendingExitAction] = useState<{
    type: 'tab' | 'subtab' | 'member';
    targetTab?: 'dashboard' | 'transcript' | 'tasks' | 'planner' | 'projects' | 'settings' | 'directory' | 'process_dashboard';
    targetSettingsSubTab?: 'roles' | 'processes' | 'members' | 'general';
    targetMemberId?: string;
  } | null>(null);

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('role-admin');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [permSearch, setPermSearch] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [processLinks, setProcessLinks] = useState<ProcessLink[]>([]);
  const [processNotes, setProcessNotes] = useState<ProcessNote[]>([]);
  
  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));
  }, [members]);

  const currentMember = React.useMemo(() => {
    if (!user || !user.email) return null;
    const found = members.find(m => m.email?.toLowerCase() === user.email?.toLowerCase());
    if (found) return found;

    // Fallback/bootstrap for super admin so they can access and manage the platform fully
    if (user.email.toLowerCase() === 'e.siavichay@novagreen.ec') {
      return {
        id: 'super-admin-bootstrap',
        name: user.displayName || 'Super Admin',
        email: user.email,
        role: 'Administrador Global',
        categories: ['miembro'],
        systemRoleId: 'role-admin',
        isSystemAdmin: true,
        companyAssociations: [],
        skills: [],
        responsibilities: []
      } as any;
    }
    return null;
  }, [user, members]);

  const activeTabAccess = React.useMemo(() => {
    return getModuleAccess(currentMember, roles, activeTab, members.length === 0);
  }, [currentMember, roles, activeTab, members]);

  const isReadOnly = React.useMemo(() => {
    return activeTabAccess === 'lector';
  }, [activeTabAccess]);

  const canCreateProjects = React.useMemo(() => {
    const generalAccess = getModuleAccess(currentMember, roles, 'projects');
    if (generalAccess === 'lider' || generalAccess === 'administrador') return true;
    
    if (currentMember?.moduleAccess) {
      return Object.keys(currentMember.moduleAccess).some(k => 
        k.startsWith('projects_') && 
        (currentMember.moduleAccess![k] === 'lider' || currentMember.moduleAccess![k] === 'administrador')
      );
    }
    return false;
  }, [currentMember, roles]);

  const resolvedPermissionsMember = React.useMemo(() => {
    const filtered = sortedMembers.filter(m => (m.categories || []).includes('miembro'));
    return sortedMembers.find(m => m.id === selectedMemberId) || filtered[0];
  }, [selectedMemberId, sortedMembers]);

  useEffect(() => {
    if (resolvedPermissionsMember) {
      if (resolvedPermissionsMember.id !== lastInitializedMemberId) {
        setDraftIsSystemAdmin(resolvedPermissionsMember.isSystemAdmin || resolvedPermissionsMember.systemRoleId === 'role-admin');
        setDraftModuleAccess(resolvedPermissionsMember.moduleAccess || {});
        setLastInitializedMemberId(resolvedPermissionsMember.id);
      }
    } else {
      setDraftIsSystemAdmin(false);
      setDraftModuleAccess({});
      setLastInitializedMemberId('');
    }
  }, [resolvedPermissionsMember, lastInitializedMemberId]);

  useEffect(() => {
    if (!selectedProcessId && processes.length > 0) {
      if (currentMember?.processId) {
        setSelectedProcessId(currentMember.processId);
      } else {
        setSelectedProcessId(processes[0].id);
      }
    }
  }, [processes, currentMember, selectedProcessId]);

  const hasUnsavedPermissionsChanges = React.useMemo(() => {
    if (!resolvedPermissionsMember) return false;
    const originalIsAdmin = resolvedPermissionsMember.isSystemAdmin || resolvedPermissionsMember.systemRoleId === 'role-admin';
    if (draftIsSystemAdmin !== originalIsAdmin) return true;
    
    const originalAccess = resolvedPermissionsMember.moduleAccess || {};
    const allKeys = Array.from(new Set([...Object.keys(originalAccess), ...Object.keys(draftModuleAccess)]));
    for (const key of allKeys) {
      const origVal = originalAccess[key] || 'ninguno';
      const draftVal = draftModuleAccess[key] || 'ninguno';
      if (origVal !== draftVal) return true;
    }
    return false;
  }, [resolvedPermissionsMember, draftIsSystemAdmin, draftModuleAccess]);

  const savePermissions = async (memberId: string) => {
    try {
      const finalRoleId = draftIsSystemAdmin ? 'role-admin' : 'role-colaborador';
      
      // Clean up general projects permission to enforce process-specific rules
      const cleanedModuleAccess = { ...draftModuleAccess };
      cleanedModuleAccess['projects'] = 'ninguno';

      await updateDoc(doc(db, 'members', memberId), {
        isSystemAdmin: draftIsSystemAdmin,
        systemRoleId: finalRoleId,
        moduleAccess: cleanedModuleAccess
      });
      // Force refresh on draft
      setLastInitializedMemberId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `members/${memberId}`);
    }
  };

  const handleTabClick = (tab: 'dashboard' | 'transcript' | 'tasks' | 'planner' | 'projects' | 'settings' | 'directory' | 'process_dashboard', directorySub?: 'people' | 'companies' | 'industries') => {
    if (activeTab === 'settings' && settingsSubTab === 'roles' && hasUnsavedPermissionsChanges) {
      setPendingExitAction({
        type: 'tab',
        targetTab: tab
      });
    } else {
      setActiveTab(tab);
      if (tab === 'directory' && directorySub) {
        setDirectorySubTab(directorySub);
      } else if (tab === 'settings') {
        const hasSettingsSettingsAccess = getModuleAccess(currentMember, roles, 'settings', members.length === 0) !== 'ninguno';
        if (hasSettingsSettingsAccess) {
          setSettingsSubTab('general');
        }
      }
    }
  };

  const handleSettingsSubTabClick = (subTab: 'roles' | 'processes' | 'members' | 'general') => {
    if (activeTab === 'settings' && settingsSubTab === 'roles' && hasUnsavedPermissionsChanges) {
      setPendingExitAction({
        type: 'subtab',
        targetSettingsSubTab: subTab
      });
    } else {
      setSettingsSubTab(subTab);
    }
  };

  const handleMemberClick = (memberId: string) => {
    if (activeTab === 'settings' && settingsSubTab === 'roles' && hasUnsavedPermissionsChanges) {
      setPendingExitAction({
        type: 'member',
        targetMemberId: memberId
      });
    } else {
      setSelectedMemberId(memberId);
    }
  };

  // Auto-redirect to first accessible tab if current Tab is restricted
  useEffect(() => {
    if (!currentMember) return;
    const access = getModuleAccess(currentMember, roles, activeTab, members.length === 0);
    if (access === 'ninguno') {
      const tabs: ('dashboard' | 'transcript' | 'tasks' | 'planner' | 'projects' | 'settings' | 'directory')[] = [
        'dashboard', 'tasks', 'planner', 'projects', 'directory', 'transcript', 'settings'
      ];
      const fallbackTab = tabs.find(t => getModuleAccess(currentMember, roles, t, members.length === 0) !== 'ninguno');
      if (fallbackTab) {
        setActiveTab(fallbackTab);
      }
    }
  }, [currentMember, roles, activeTab, members]);
  
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const collections = [
      { name: 'members', setState: setMembers, initial: initialMembers },
      { name: 'processes', setState: setProcesses, initial: initialProcesses },
      { name: 'tasks', setState: setTasks, initial: initialTasks },
      { name: 'projects', setState: setProjects, initial: [] },
      { name: 'companies', setState: setCompanies, initial: initialCompanies },
      { name: 'industries', setState: setIndustries, initial: initialIndustries },
      { name: 'roles', setState: setRoles, initial: initialRoles },
      { name: 'process_links', setState: setProcessLinks, initial: [] },
      { name: 'process_notes', setState: setProcessNotes, initial: [] },
    ];

    const unsubscribes = collections.map(col => {
      return onSnapshot(collection(db, col.name), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data() } as any));
        col.setState(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, col.name);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  // Synchronize Google user email mapping to the Member document ID in Firestore for Security Rules
  useEffect(() => {
    if (!user || !user.email || members.length === 0) return;
    const found = members.find(m => m.email?.toLowerCase() === user.email?.toLowerCase());
    if (found) {
      const emailDocId = user.email.toLowerCase();
      const writeMapping = async () => {
        try {
          await setDoc(doc(db, 'user_mappings', emailDocId), { memberId: found.id });
        } catch (e) {
          console.warn("Silent mapping sync:", e);
        }
      };
      writeMapping();
    }
  }, [user, members]);

  const [isMigrating, setIsMigrating] = useState(false);
  const [localDataFound, setLocalDataFound] = useState(false);
  const logoUrl = companyLogo;

  useEffect(() => {
    // Check if there's any data in localStorage that could be migrated
    const keysToCheck = [
      'teampulse_members', 'tp_members', 'ng_members', 'members',
      'teampulse_tasks', 'tp_tasks', 'ng_tasks', 'tasks',
      'teampulse_projects', 'tp_projects', 'ng_projects', 'projects',
      'teampulse_processes', 'tp_processes', 'ng_processes', 'processes',
      'teampulse_companies', 'tp_companies', 'ng_companies', 'companies'
    ];
    const found = keysToCheck.some(key => {
      const data = localStorage.getItem(key);
      try {
        return data && JSON.parse(data).length > 0;
      } catch {
        return false;
      }
    });
    setLocalDataFound(found);
  }, []);

  const migrateFromLocalStorage = async () => {
    if (!user) return;
    if (!window.confirm('Se han detectado datos guardados en este navegador. ¿Deseas migrarlos a tu cuenta de Novagreen IA? Esto no borrará los datos técnicos, pero subirá tu información a la nube.')) return;
    
    setIsMigrating(true);
    try {
      const collections = [
        { local: 'teampulse_members', cloud: 'members' },
        { local: 'tp_members', cloud: 'members' },
        { local: 'ng_members', cloud: 'members' },
        { local: 'members', cloud: 'members' },
        
        { local: 'teampulse_tasks', cloud: 'tasks' },
        { local: 'tp_tasks', cloud: 'tasks' },
        { local: 'ng_tasks', cloud: 'tasks' },
        { local: 'tasks', cloud: 'tasks' },
        
        { local: 'teampulse_projects', cloud: 'projects' },
        { local: 'tp_projects', cloud: 'projects' },
        { local: 'ng_projects', cloud: 'projects' },
        { local: 'projects', cloud: 'projects' },

        { local: 'teampulse_processes', cloud: 'processes' },
        { local: 'tp_processes', cloud: 'processes' },
        { local: 'ng_processes', cloud: 'processes' },
        { local: 'processes', cloud: 'processes' },

        { local: 'teampulse_companies', cloud: 'companies' },
        { local: 'tp_companies', cloud: 'companies' },
        { local: 'ng_companies', cloud: 'companies' },
        { local: 'companies', cloud: 'companies' },

        { local: 'teampulse_industries', cloud: 'industries' },
        { local: 'industries', cloud: 'industries' },

        { local: 'teampulse_roles', cloud: 'roles' },
        { local: 'roles', cloud: 'roles' },
      ];

      let migratedCount = 0;
      for (const col of collections) {
        const localData = localStorage.getItem(col.local);
        if (localData) {
          try {
            const data = JSON.parse(localData);
            if (Array.isArray(data)) {
              for (const item of data) {
                if (item.id) {
                  await setDoc(doc(db, col.cloud, item.id), item);
                  migratedCount++;
                }
              }
            }
          } catch (e) {
            console.error(`Error migrating ${col.local}`, e);
          }
        }
      }

      if (migratedCount > 0) {
        alert(`${migratedCount} elementos migrados correctamente a la nube. El sistema se actualizará ahora.`);
        setLocalDataFound(false);
      } else {
        alert('No se encontraron datos estructurados compatibles para migrar. Intenta cargar los datos iniciales si la cuenta está vacía.');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'migration');
    } finally {
      setIsMigrating(false);
    }
  };

  const bootstrapData = async () => {
    if (!user) return;
    setIsInitializingData(true);
    try {
      const collectionsToBootstrap = [
        { name: 'members', data: initialMembers },
        { name: 'processes', data: initialProcesses },
        { name: 'tasks', data: initialTasks },
        { name: 'companies', data: initialCompanies },
        { name: 'industries', data: initialIndustries },
        { name: 'roles', data: initialRoles },
      ];

      for (const col of collectionsToBootstrap) {
        for (const item of col.data) {
          await setDoc(doc(db, col.name, item.id), item);
        }
      }
      alert('Datos inicializados correctamente en Firebase.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bootstrap');
    } finally {
      setIsInitializingData(false);
    }
  };

  const handleMemberAssistantAnalyze = async () => {
    if (!memberAssistantInput.trim()) return;
    setIsAnalyzingMemberInput(true);
    try {
      const draft = await processMemberInput(memberAssistantInput, members, processes);
      setSuggestedMemberDraft(draft);
    } catch (error) {
      console.error('Member Assistant analysis failed', error);
    } finally {
      setIsAnalyzingMemberInput(false);
    }
  };

  const applyMemberDraft = async () => {
    if (!suggestedMemberDraft) return;

    try {
      if (suggestedMemberDraft.type === 'create') {
        const id = `mem-${Date.now()}`;
        const newMember: TeamMember = {
          id,
          name: suggestedMemberDraft.data.name || 'Nuevo Miembro',
          role: suggestedMemberDraft.data.role || 'Rol Pendiente',
          systemRoleId: '',
          categories: ['miembro'],
          processId: suggestedMemberDraft.data.processId || processes[0]?.id || 'default',
          companyAssociations: (suggestedMemberDraft.data as any).companyAssociations || [],
          identificationId: suggestedMemberDraft.data.identificationId || '',
          hasRuc: suggestedMemberDraft.data.hasRuc || false,
          ruc: suggestedMemberDraft.data.hasRuc ? `${suggestedMemberDraft.data.identificationId}001` : '',
          skills: suggestedMemberDraft.data.skills || [],
          responsibilities: suggestedMemberDraft.data.responsibilities || [],
          epp: suggestedMemberDraft.data.epp || [],
          recentAchievements: [],
          avatar: `https://picsum.photos/seed/${(suggestedMemberDraft.data.name || 'new').replace(/\s/g, '')}/150/150`,
          personality: suggestedMemberDraft.data.personality || '',
          notes: suggestedMemberDraft.data.notes || '',
          email: suggestedMemberDraft.data.email || '',
          phone: suggestedMemberDraft.data.phone || ''
        };
        await setDoc(doc(db, 'members', id), newMember);
      } else if (suggestedMemberDraft.type === 'update' && suggestedMemberDraft.memberId) {
        const m = members.find(mem => mem.id === suggestedMemberDraft.memberId);
        if (m) {
          const updated = {
            ...m,
            ...suggestedMemberDraft.data,
            ruc: (suggestedMemberDraft.data.hasRuc !== undefined ? suggestedMemberDraft.data.hasRuc : m.hasRuc)
              ? `${suggestedMemberDraft.data.identificationId || m.identificationId}001`
              : (suggestedMemberDraft.data.hasRuc === false ? '' : m.ruc),
            skills: suggestedMemberDraft.data.skills ? Array.from(new Set([...m.skills, ...suggestedMemberDraft.data.skills])) : m.skills,
            responsibilities: suggestedMemberDraft.data.responsibilities ? Array.from(new Set([...m.responsibilities, ...suggestedMemberDraft.data.responsibilities])) : m.responsibilities,
            epp: suggestedMemberDraft.data.epp ? Array.from(new Set([...(m.epp || []), ...suggestedMemberDraft.data.epp])) : m.epp,
          };
          await updateDoc(doc(db, 'members', m.id), updated);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'members');
    }

    setSuggestedMemberDraft(null);
    setMemberAssistantInput('');
    setIsMemberAssistantOpen(false);
  };

  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedUpdates, setExtractedUpdates] = useState<ExtractedUpdates | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskViewMode, setTaskViewMode] = useState<'board' | 'list' | 'calendar'>('board');
  const [isListDragging, setIsListDragging] = useState(false);
  const [isBoardDragging, setIsBoardDragging] = useState(false);
  const [tableFilters, setTableFilters] = useState({
    title: '',
    status: '',
    processId: '',
    projectId: '',
    memberId: '',
    auxiliaryId: '',
    revisorId: '',
  });

  const [tableSort, setTableSort] = useState<{
    column: 'title' | 'status' | 'process' | 'project' | 'member' | 'auxiliary' | 'revisor' | 'hours' | 'dueDate' | null;
    direction: 'asc' | 'desc' | null;
  }>({
    column: null,
    direction: null,
  });
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newMemberData, setNewMemberData] = useState({
    name: '',
    role: '',
    systemRoleId: '',
    isSystemAdmin: false,
    moduleAccess: undefined as { [moduleId: string]: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador' } | undefined,
    categories: ['miembro'] as PersonCategory[],
    processId: '',
    companyAssociations: [] as { companyId: string, role: string }[],
    identificationId: '',
    hasRuc: false,
    ruc: '',
    skills: '',
    responsibilities: '',
    personality: '',
    notes: '',
    email: '',
    phone: '',
    epp: ''
  });

  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [newCompanyData, setNewCompanyData] = useState({
    name: '',
    ruc: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    mainAddress: '', // Matrix address (Dirección Matriz)
    branchAddresses: [] as string[],
    industries: [] as string[],
    notes: ''
  });

  const [isAddingProcess, setIsAddingProcess] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [isMemberAssistantOpen, setIsMemberAssistantOpen] = useState(false);
  const [memberAssistantInput, setMemberAssistantInput] = useState('');
  const [isAnalyzingMemberInput, setIsAnalyzingMemberInput] = useState(false);
  const [suggestedMemberDraft, setSuggestedMemberDraft] = useState<MemberDraft | null>(null);

  const [processToDelete, setProcessToDelete] = useState<Process | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [reassignToId, setReassignToId] = useState<string>('unassigned');

  const [newProcessData, setNewProcessData] = useState({
    name: '',
    description: '',
    goals: ''
  });

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showTaskHistory, setShowTaskHistory] = useState(false);
  const [showAddAuxDropdown, setShowAddAuxDropdown] = useState(false);
  const [auxSearchQuery, setAuxSearchQuery] = useState('');
  const [showAddBlockerDropdown, setShowAddBlockerDropdown] = useState(false);
  const [blockerSearchQuery, setBlockerSearchQuery] = useState('');
  const [blockerSelectedProjectId, setBlockerSelectedProjectId] = useState('all');
  const [blockerSelectedProcessId, setBlockerSelectedProcessId] = useState('all');
  const [showAddBlocksDropdown, setShowAddBlocksDropdown] = useState(false);
  const [blocksSearchQuery, setBlocksSearchQuery] = useState('');
  const [blocksSelectedProjectId, setBlocksSelectedProjectId] = useState('all');
  const [blocksSelectedProcessId, setBlocksSelectedProcessId] = useState('all');
  const [newTaskData, setNewTaskData] = useState({
    id: '',
    title: '',
    description: '',
    storyDescription: '',
    acceptanceCriteria: '',
    priority: 'media' as Task['priority'],
    plannedDate: '',
    plannedEndDate: '',
    memberId: '',
    auxiliaryId: '',
    auxiliaryIds: [] as string[],
    revisorId: '',
    processId: '',
    projectId: '',
    status: 'backlog' as Task['status'],
    deliverables: [] as Deliverable[],
    plannedHours: 0,
    actualHours: 0,
    dueDate: '',
    blockedByTaskIds: [] as string[]
  });

  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    description: '',
    processId: '',
    status: 'activo' as 'activo' | 'completado' | 'pausado',
    city: ''
  });

  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);

  // Planner Assistant State
  const [plannerInput, setPlannerInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [suggestedActivities, setSuggestedActivities] = useState<SuggestedActivity[]>([]);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'es-ES';

      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setPlannerInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognition?.stop();
      setIsRecording(false);
    } else {
      setPlannerInput('');
      recognition?.start();
      setIsRecording(true);
    }
  };

  const handlePlanningAnalysis = async () => {
    if (!plannerInput.trim()) return;
    setIsPlanning(true);
    try {
      const suggestions = await getPlanningSuggestions(plannerInput, members, processes);
      setSuggestedActivities(suggestions);
    } catch (error) {
      console.error('Planning analysis failed', error);
    } finally {
      setIsPlanning(false);
    }
  };

  const createActivityAsTask = (activity: SuggestedActivity) => {
    setEditingTask(null);
    setNewTaskData({
      id: `task-${Date.now()}`,
      title: activity.title,
      description: activity.description,
      status: 'backlog',
      processId: activity.processId || processes[0]?.id || '',
      memberId: activity.memberId || '',
      auxiliaryId: '',
      auxiliaryIds: [],
      projectId: '',
      deliverables: [],
      plannedHours: 0,
      actualHours: 0,
      dueDate: '',
      blockedByTaskIds: []
    });
    setLastTab(activeTab);
    setIsAddingTask(true);
    setActiveTab('tasks');
  };

  const deleteSuggestedActivity = (id: string) => {
    if (window.confirm('¿Realmente deseas borrar esta actividad sugerida?')) {
      setSuggestedActivities(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setIsAnalyzing(true);
    try {
      const updates = await analyzeTranscript(transcript, members, processes);
      setExtractedUpdates(updates);
    } catch (error) {
      console.error('Analysis failed', error);
      alert('Hubo un error al analizar la transcripción.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyUpdates = async () => {
    if (!extractedUpdates) return;

    try {
      // Apply member updates
      for (const update of extractedUpdates.memberUpdates) {
        const member = members.find(m => m.id === update.memberId);
        if (member) {
          await updateDoc(doc(db, 'members', member.id), {
            role: update.roleUpdate || member.role,
            skills: Array.from(new Set([...member.skills, ...(update.newSkills || [])])),
            responsibilities: Array.from(new Set([...member.responsibilities, ...(update.newResponsibilities || [])])),
            epp: Array.from(new Set([...(member.epp || []), ...(update.epp || [])])),
            recentAchievements: [...(update.achievements || []), ...member.recentAchievements].slice(0, 5)
          });
        }
      }

      // Apply process updates
      for (const update of extractedUpdates.processUpdates) {
        const proc = processes.find(p => p.id === update.processId);
        if (proc) {
          await updateDoc(doc(db, 'processes', proc.id), {
            description: update.descriptionUpdate || proc.description,
            goals: Array.from(new Set([...proc.goals, ...(update.newGoals || [])]))
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'extracted_updates');
    }

    setExtractedUpdates(null);
    setTranscript('');
    setActiveTab('dashboard');
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberData.name) return;

    try {
      if (editingMember) {
        await updateDoc(doc(db, 'members', editingMember.id), {
          name: newMemberData.name,
          role: newMemberData.role,
          systemRoleId: newMemberData.systemRoleId,
          isSystemAdmin: newMemberData.isSystemAdmin || false,
          moduleAccess: newMemberData.moduleAccess || null,
          categories: Array.isArray(newMemberData.categories) ? newMemberData.categories : ['miembro'],
          processId: newMemberData.processId || '',
          companyAssociations: newMemberData.companyAssociations || [],
          identificationId: newMemberData.identificationId || '',
          hasRuc: newMemberData.hasRuc || false,
          ruc: newMemberData.hasRuc ? `${newMemberData.identificationId}001` : '',
          skills: typeof newMemberData.skills === 'string' ? newMemberData.skills.split(',').map(s => s.trim()).filter(s => s !== '') : [],
          responsibilities: typeof newMemberData.responsibilities === 'string' ? newMemberData.responsibilities.split(',').map(r => r.trim()).filter(r => r !== '') : [],
          personality: newMemberData.personality || '',
          notes: newMemberData.notes || '',
          email: newMemberData.email || '',
          phone: newMemberData.phone || '',
          epp: typeof newMemberData.epp === 'string' ? newMemberData.epp.split(',').map(e => e.trim()).filter(e => e !== '') : []
        });
      } else {
        const id = `mem-${Date.now()}`;
        const newMember: TeamMember = {
          id,
          name: newMemberData.name,
          role: newMemberData.role,
          systemRoleId: newMemberData.systemRoleId,
          isSystemAdmin: newMemberData.isSystemAdmin || false,
          moduleAccess: newMemberData.moduleAccess || null,
          categories: Array.isArray(newMemberData.categories) ? newMemberData.categories : ['miembro'],
          processId: newMemberData.processId || '',
          companyAssociations: newMemberData.companyAssociations || [],
          identificationId: newMemberData.identificationId || '',
          hasRuc: newMemberData.hasRuc || false,
          ruc: newMemberData.hasRuc ? `${newMemberData.identificationId}001` : '',
          skills: typeof newMemberData.skills === 'string' ? newMemberData.skills.split(',').map(s => s.trim()).filter(s => s !== '') : [],
          responsibilities: typeof newMemberData.responsibilities === 'string' ? newMemberData.responsibilities.split(',').map(r => r.trim()).filter(r => r !== '') : [],
          recentAchievements: [],
          avatar: `https://picsum.photos/seed/${newMemberData.name.replace(/\s/g, '')}/150/150`,
          personality: newMemberData.personality || '',
          notes: newMemberData.notes || '',
          email: newMemberData.email || '',
          phone: newMemberData.phone || '',
          epp: typeof newMemberData.epp === 'string' ? newMemberData.epp.split(',').map(e => e.trim()).filter(e => e !== '') : []
        };
        await setDoc(doc(db, 'members', id), newMember);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'members');
    }

    setIsAddingMember(false);
    setEditingMember(null);
    setNewMemberData({
      name: '',
      role: '',
      systemRoleId: '',
      isSystemAdmin: false,
      moduleAccess: undefined,
      categories: ['miembro'],
      processId: '',
      companyAssociations: [],
      identificationId: '',
      hasRuc: false,
      ruc: '',
      skills: '',
      responsibilities: '',
      personality: '',
      notes: '',
      email: '',
      phone: '',
      epp: ''
    });
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      await deleteDoc(doc(db, 'members', memberToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'members');
    }
    setMemberToDelete(null);
  };

  const handleDeleteMember = (member: TeamMember) => {
    setMemberToDelete(member);
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyData.name || !newCompanyData.ruc) return;

    try {
      // Manage industries list
      const companyIndustries = newCompanyData.industries || [];
      for (const indName of companyIndustries) {
        if (!industries.some(i => normalizeText(i.name) === normalizeText(indName))) {
          const id = `ind-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          await setDoc(doc(db, 'industries', id), {
            id,
            name: indName,
            createdAt: new Date().toISOString()
          });
        }
      }

      if (editingCompany) {
        await updateDoc(doc(db, 'companies', editingCompany.id), {
          ...newCompanyData,
          mainAddress: newCompanyData.mainAddress,
          address: newCompanyData.mainAddress // for compatibility
        });
      } else {
        const id = `comp-${Date.now()}`;
        const newCompany: Company = {
          id,
          ...newCompanyData,
          address: newCompanyData.mainAddress, // for compatibility
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'companies', id), newCompany);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'companies');
    }

    setIsAddingCompany(false);
    setEditingCompany(null);
    setNewCompanyData({
      name: '',
      ruc: '',
      description: '',
      email: '',
      phone: '',
      website: '',
      mainAddress: '',
      branchAddresses: [],
      industries: [],
      notes: ''
    });
  };

  const openEditCompany = (company: Company) => {
    setEditingCompany(company);
    setNewCompanyData({
      name: company.name,
      ruc: company.ruc,
      description: company.description || '',
      email: company.email || '',
      phone: company.phone || '',
      website: company.website || '',
      mainAddress: company.mainAddress || company.address || '',
      branchAddresses: company.branchAddresses || [],
      industries: company.industries || [],
      notes: company.notes || ''
    });
    setIsAddingCompany(true);
  };

  const handleDeleteCompany = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta compañía?')) {
      try {
        await deleteDoc(doc(db, 'companies', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'companies');
      }
    }
  };

  const handleAddProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcessData.name) return;

    try {
      if (editingProcess) {
        await updateDoc(doc(db, 'processes', editingProcess.id), {
          name: newProcessData.name,
          description: newProcessData.description,
          goals: newProcessData.goals.split(',').map(g => g.trim()).filter(g => g !== '')
        });
      } else {
        const id = `proc-${Date.now()}`;
        const newProc: Process = {
          id,
          name: newProcessData.name,
          description: newProcessData.description,
          goals: newProcessData.goals.split(',').map(g => g.trim()).filter(g => g !== '')
        };
        await setDoc(doc(db, 'processes', id), newProc);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'processes');
    }

    setIsAddingProcess(false);
    setEditingProcess(null);
    setNewProcessData({ name: '', description: '', goals: '' });
  };

  const confirmDeleteProcess = async () => {
    if (!processToDelete) return;

    try {
      await deleteDoc(doc(db, 'processes', processToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'processes');
    }

    setProcessToDelete(null);
    setReassignToId('unassigned');
  };

  const handleDeleteProcess = (id: string) => {
    const proc = processes.find(p => p.id === id);
    if (proc) {
      setProcessToDelete(proc);
    }
  };

  const openAddTaskModal = (status: Task['status'] = 'backlog') => {
    setEditingTask(null);
    setShowTaskHistory(false);
    setNewTaskData({
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      description: '',
      storyDescription: '',
      acceptanceCriteria: '',
      priority: 'media' as Task['priority'],
      plannedDate: '',
      plannedEndDate: '',
      memberId: '',
      auxiliaryId: '',
      auxiliaryIds: [],
      revisorId: '',
      processId: '',
      projectId: '',
      status,
      deliverables: [],
      plannedHours: 0,
      actualHours: 0,
      dueDate: '',
      blockedByTaskIds: []
    });
    setIsAddingTask(true);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskData.title || !newTaskData.processId) return;
    const taskAccess = getModuleAccess(currentMember, roles, `tasks_${newTaskData.processId}`);
    if (taskAccess !== 'colaborador' && taskAccess !== 'lider' && taskAccess !== 'administrador') {
      alert('Error: No dispones de privilegios para crear tareas en este proceso.');
      return;
    }

    try {
      const id = newTaskData.id || `task-${Date.now()}`;
      const initialHistoryItem = {
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        userId: currentMember?.id || 'unknown',
        userName: currentMember?.name || 'Usuario desconocido',
        action: 'create' as const,
        details: 'Creó la tarea'
      };

      const newTask: Task = {
        id,
        title: newTaskData.title,
        description: newTaskData.description || '',
        storyDescription: newTaskData.storyDescription || '',
        acceptanceCriteria: newTaskData.acceptanceCriteria || '',
        priority: newTaskData.priority || 'media',
        plannedDate: newTaskData.plannedDate || '',
        plannedEndDate: newTaskData.plannedEndDate || '',
        status: newTaskData.status,
        processId: newTaskData.processId,
        memberId: newTaskData.memberId || '',
        auxiliaryId: newTaskData.auxiliaryId || '',
        auxiliaryIds: newTaskData.auxiliaryIds || [],
        revisorId: newTaskData.revisorId || '',
        projectId: newTaskData.projectId || '',
        deliverables: newTaskData.deliverables,
        plannedHours: newTaskData.plannedHours || 0,
        actualHours: newTaskData.actualHours || 0,
        dueDate: newTaskData.dueDate || '',
        blockedByTaskIds: newTaskData.blockedByTaskIds,
        createdAt: new Date().toISOString(),
        history: [initialHistoryItem]
      };

      await setDoc(doc(db, 'tasks', id), newTask);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tasks');
    }

    setIsAddingTask(false);
    setShowAddAuxDropdown(false);
    setAuxSearchQuery('');
    if (lastTab) {
      setActiveTab(lastTab as any);
      setLastTab(null);
    }
    setNewTaskData({
      id: '',
      title: '',
      description: '',
      storyDescription: '',
      acceptanceCriteria: '',
      priority: 'media',
      plannedDate: '',
      plannedEndDate: '',
      memberId: '',
      auxiliaryId: '',
      auxiliaryIds: [],
      revisorId: '',
      processId: '',
      projectId: '',
      status: 'backlog',
      deliverables: [],
      plannedHours: 0,
      actualHours: 0,
      dueDate: '',
      blockedByTaskIds: []
    });
  };
  
  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !newTaskData.title || !newTaskData.processId) return;
    const taskAccess = getModuleAccess(currentMember, roles, `tasks_${newTaskData.processId}`);
    const isDirectAssignee = currentMember && (
      editingTask.memberId === currentMember.id || 
      editingTask.auxiliaryId === currentMember.id ||
      (editingTask.auxiliaryIds && editingTask.auxiliaryIds.includes(currentMember.id))
    );
    if (taskAccess !== 'colaborador' && taskAccess !== 'lider' && taskAccess !== 'administrador' && !isDirectAssignee) {
      alert('Error: No dispones de privilegios para actualizar tareas en este proceso.');
      return;
    }

    // Validate reviewer permissions for status transition
    const statusChanged = editingTask.status !== newTaskData.status;
    if (statusChanged && (newTaskData.status === 'done' || newTaskData.status === 'correction')) {
      const isUserAdmin = currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin';
      const isProcessLeader = taskAccess === 'lider' || taskAccess === 'administrador';
      const selectedRevisorId = newTaskData.revisorId || editingTask.revisorId || '';
      
      if (selectedRevisorId) {
        if (!currentMember || (currentMember.id !== selectedRevisorId && !isProcessLeader && !isUserAdmin)) {
          const revisorMember = members.find(m => m.id === selectedRevisorId);
          const revisorName = revisorMember ? revisorMember.name : 'el revisor asignado';
          alert(`Error: Solo el Revisor designado (${revisorName}) o un líder/administrador puede pasar esta tarea a Completada o enviarla a Corrección.`);
          return;
        }
      } else {
        if (!isProcessLeader && !isUserAdmin) {
          alert('Error: Solo un líder de proceso o administrador puede pasar la tarea a Completada o enviarla a Corrección.');
          return;
        }
      }
    }

    try {
      const statusLabels: Record<string, string> = {
        backlog: 'Backlog',
        todo: 'Por Hacer',
        in_progress: 'En Progreso',
        blocked: 'Bloqueado',
        review: 'En Revisión',
        done: 'Completado',
        rejected: 'Rechazado',
        correction: 'Corrección'
      };

      const changes: string[] = [];
      if (editingTask.title !== newTaskData.title) {
        changes.push(`Modificó el título a "${newTaskData.title}"`);
      }
      if (editingTask.status !== newTaskData.status) {
        const oldState = statusLabels[editingTask.status] || editingTask.status;
        const newState = statusLabels[newTaskData.status] || newTaskData.status;
        changes.push(`Cambió el estado de "${oldState}" a "${newState}"`);
      }
      if ((editingTask.description || '') !== (newTaskData.description || '')) {
        changes.push('Modificó la descripción');
      }
      if ((editingTask.storyDescription || '') !== (newTaskData.storyDescription || '')) {
        changes.push('Modificó la descripción de la historia');
      }
      if ((editingTask.acceptanceCriteria || '') !== (newTaskData.acceptanceCriteria || '')) {
        changes.push('Modificó los criterios de aceptación');
      }
      if (editingTask.memberId !== newTaskData.memberId) {
        const prevMember = members.find(m => m.id === editingTask.memberId)?.name || 'Sin Asignar';
        const nextMember = members.find(m => m.id === newTaskData.memberId)?.name || 'Sin Asignar';
        changes.push(`Cambió el responsable de "${prevMember}" a "${nextMember}"`);
      }
      if ((editingTask.plannedDate || '') !== (newTaskData.plannedDate || '')) {
        changes.push(`Modificó inicio planificado a ${newTaskData.plannedDate || 'Sin fecha'}`);
      }
      if ((editingTask.plannedEndDate || '') !== (newTaskData.plannedEndDate || '')) {
        changes.push(`Modificó fin planificado a ${newTaskData.plannedEndDate || 'Sin fecha'}`);
      }
      if ((editingTask.dueDate || '') !== (newTaskData.dueDate || '')) {
        changes.push(`Modificó fecha de entrega a ${newTaskData.dueDate || 'Sin fecha'}`);
      }

      const existingHistory = editingTask.history || [];
      let updatedHistory = [...existingHistory];
      if (changes.length > 0) {
        updatedHistory.push({
          id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toISOString(),
          userId: currentMember?.id || 'unknown',
          userName: currentMember?.name || 'Usuario desconocido',
          action: 'field_update' as const,
          details: changes.join(', ')
        });
      }

      await updateDoc(doc(db, 'tasks', editingTask.id), { 
        title: newTaskData.title,
        description: newTaskData.description || '',
        storyDescription: newTaskData.storyDescription || '',
        acceptanceCriteria: newTaskData.acceptanceCriteria || '',
        priority: newTaskData.priority || 'media',
        plannedDate: newTaskData.plannedDate || '',
        plannedEndDate: newTaskData.plannedEndDate || '',
        memberId: newTaskData.memberId || '',
        auxiliaryId: newTaskData.auxiliaryId || '',
        auxiliaryIds: newTaskData.auxiliaryIds || [],
        revisorId: newTaskData.revisorId || '',
        projectId: newTaskData.projectId || '',
        status: newTaskData.status as any,
        deliverables: newTaskData.deliverables,
        plannedHours: newTaskData.plannedHours || 0,
        actualHours: newTaskData.actualHours || 0,
        dueDate: newTaskData.dueDate || '',
        blockedByTaskIds: newTaskData.blockedByTaskIds,
        history: updatedHistory
      });
    } catch (error: any) {
      console.error("Error updating task: ", error);
      alert(`Error al guardar la tarea en Firestore: ${error?.message || "Verifique que tiene permisos correspondientes en el proceso."}`);
      handleFirestoreError(error, OperationType.UPDATE, 'tasks');
    }

    setEditingTask(null);
    setIsAddingTask(false);
    setShowAddAuxDropdown(false);
    setAuxSearchQuery('');
    if (lastTab) {
      setActiveTab(lastTab as any);
      setLastTab(null);
    }
    setNewTaskData({
      id: '',
      title: '',
      description: '',
      storyDescription: '',
      acceptanceCriteria: '',
      priority: 'media',
      plannedDate: '',
      plannedEndDate: '',
      memberId: '',
      auxiliaryId: '',
      auxiliaryIds: [],
      revisorId: '',
      processId: '',
      projectId: '',
      status: 'backlog',
      deliverables: [],
      plannedHours: 0,
      actualHours: 0,
      dueDate: '',
      blockedByTaskIds: []
    });
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskHistory(false);
    setNewTaskData({
      title: task.title,
      description: task.description || '',
      storyDescription: task.storyDescription || '',
      acceptanceCriteria: task.acceptanceCriteria || '',
      priority: task.priority || 'media',
      plannedDate: task.plannedDate || '',
      plannedEndDate: task.plannedEndDate || '',
      processId: task.processId,
      memberId: task.memberId || '',
      auxiliaryId: task.auxiliaryId || '',
      auxiliaryIds: task.auxiliaryIds || (task.auxiliaryId ? [task.auxiliaryId] : []),
      revisorId: task.revisorId || '',
      projectId: task.projectId || '',
      status: task.status,
      deliverables: task.deliverables || [],
      plannedHours: task.plannedHours || 0,
      actualHours: task.actualHours || 0,
      dueDate: task.dueDate || '',
      blockedByTaskIds: task.blockedByTaskIds || [],
      id: task.id
    });
  };

  const updateTaskStatus = async (id: string, newStatus: Task['status']) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const taskAccess = getModuleAccess(currentMember, roles, task.processId ? `tasks_${task.processId}` : 'tasks');
    const isDirectAssignee = currentMember && (
      task.memberId === currentMember.id || 
      task.auxiliaryId === currentMember.id ||
      (task.auxiliaryIds && task.auxiliaryIds.includes(currentMember.id))
    );
    if (taskAccess !== 'colaborador' && taskAccess !== 'lider' && taskAccess !== 'administrador' && !isDirectAssignee) {
      alert('Error: No dispones de privilegios para cambiar el estado de las tareas.');
      return;
    }

    // Validate reviewer permissions for status transition
    if (newStatus === 'done' || newStatus === 'correction') {
      const isUserAdmin = currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin';
      const isProcessLeader = taskAccess === 'lider' || taskAccess === 'administrador';
      const selectedRevisorId = task.revisorId || '';
      
      if (selectedRevisorId) {
        if (!currentMember || (currentMember.id !== selectedRevisorId && !isProcessLeader && !isUserAdmin)) {
          const revisorMember = members.find(m => m.id === selectedRevisorId);
          const revisorName = revisorMember ? revisorMember.name : 'el revisor asignado';
          alert(`Error: Solo el Revisor designado (${revisorName}) o un líder/administrador puede pasar esta tarea a Completada o enviarla a Corrección.`);
          return;
        }
      } else {
        if (!isProcessLeader && !isUserAdmin) {
          alert('Error: Solo un líder de proceso o administrador puede pasar la tarea a Completada o enviarla a Corrección.');
          return;
        }
      }
    }

    if (newStatus === 'in_progress') {
      const { isBlocked, blockers } = isTaskBlocked(id, tasks);
      if (isBlocked) {
        alert(`ESTA TAREA ESTÁ BLOQUEADA\n\nPara poder iniciar esta tarea se debe terminar primero:\n• ${blockers.map(t => t.title).join('\n• ')}`);
        return;
      }
    }
    try {
      const statusLabels: Record<string, string> = {
        backlog: 'Backlog',
        todo: 'Por Hacer',
        in_progress: 'En Progreso',
        blocked: 'Bloqueado',
        review: 'En Revisión',
        done: 'Completado',
        rejected: 'Rechazado',
        correction: 'Corrección'
      };

      const existingHistory = task.history || [];
      const oldState = statusLabels[task.status] || task.status;
      const newState = statusLabels[newStatus] || newStatus;
      const statusHistoryItem = {
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        userId: currentMember?.id || 'unknown',
        userName: currentMember?.name || 'Usuario desconocido',
        action: 'status_change' as const,
        details: `Cambió el estado de "${oldState}" a "${newState}"`
      };
      const updatedHistory = [...existingHistory, statusHistoryItem];

      await updateDoc(doc(db, 'tasks', id), { 
        status: newStatus,
        history: updatedHistory
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'tasks');
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectData.name || !newProjectData.processId) return;

    const access = getModuleAccess(currentMember, roles, `projects_${newProjectData.processId}`);
    if (access !== 'lider' && access !== 'administrador') {
      alert('Error: No dispones de privilegios de líder o administrador para crear proyectos en este proceso.');
      return;
    }

    try {
      const id = `proj-${Date.now()}`;
      const project: Project = {
        id,
        name: newProjectData.name,
        description: newProjectData.description,
        processId: newProjectData.processId,
        status: newProjectData.status,
        city: newProjectData.city,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'projects', id), project);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'projects');
    }

    setIsAddingProject(false);
    setNewProjectData({ name: '', description: '', processId: '', status: 'activo', city: '' });
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !newProjectData.name || !newProjectData.processId) return;

    const oldAccess = getModuleAccess(currentMember, roles, `projects_${editingProject.processId}`);
    const newAccess = getModuleAccess(currentMember, roles, `projects_${newProjectData.processId}`);
    if (oldAccess !== 'lider' && oldAccess !== 'administrador') {
      alert('Error: No dispones de privilegios para editar proyectos en el proceso original.');
      return;
    }
    if (newAccess !== 'lider' && newAccess !== 'administrador') {
      alert('Error: No dispones de privilegios para asignar proyectos al proceso seleccionado.');
      return;
    }

    try {
      await updateDoc(doc(db, 'projects', editingProject.id), {
        name: newProjectData.name,
        description: newProjectData.description,
        processId: newProjectData.processId,
        status: newProjectData.status,
        city: newProjectData.city
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }

    setEditingProject(null);
    setNewProjectData({ name: '', description: '', processId: '', status: 'activo', city: '' });
  };

  const deleteProject = async (id: string) => {
    const proj = projects.find(p => p.id === id);
    const access = getModuleAccess(currentMember, roles, proj?.processId ? `projects_${proj.processId}` : 'projects');
    if (access !== 'administrador') {
      alert('Error: Solo los Administradores pueden eliminar proyectos.');
      return;
    }
    if (window.confirm('¿Estás seguro de que deseas eliminar este proyecto? Las tareas asociadas perderán su vinculación con el proyecto.')) {
      try {
        await deleteDoc(doc(db, 'projects', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'projects');
      }
    }
  };

  const openEditProject = (proj: Project) => {
    setEditingProject(proj);
    setNewProjectData({
      name: proj.name,
      description: proj.description,
      processId: proj.processId,
      status: proj.status,
      city: proj.city || ''
    });
    setIsAddingProject(true);
  };

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const handleDeleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      setTaskToDelete(task);
    }
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    const taskAccess = getModuleAccess(currentMember, roles, taskToDelete.processId ? `tasks_${taskToDelete.processId}` : 'tasks');
    if (taskAccess !== 'lider' && taskAccess !== 'administrador') {
      alert('Error: Solo los Líderes de este Proceso o Administradores pueden eliminar tareas.');
      setTaskToDelete(null);
      return;
    }
    try {
      await deleteDoc(doc(db, 'tasks', taskToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tasks');
    }
    setTaskToDelete(null);
  };

  const openEditProcess = (proc: Process) => {
    setEditingProcess(proc);
    setNewProcessData({
      name: proc.name,
      description: proc.description,
      goals: proc.goals.join(', ')
    });
    setIsAddingProcess(true);
  };

  const openEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setNewMemberData({
      name: member.name,
      role: member.role,
      systemRoleId: member.systemRoleId || '',
      isSystemAdmin: member.isSystemAdmin || false,
      moduleAccess: member.moduleAccess,
      categories: member.categories || [],
      processId: member.processId || '',
      companyAssociations: member.companyAssociations || [],
      identificationId: member.identificationId || '',
      hasRuc: member.hasRuc || false,
      ruc: member.ruc || '',
      skills: member.skills.join(', '),
      responsibilities: member.responsibilities.join(', '),
      personality: member.personality || '',
      notes: member.notes || '',
      email: member.email || '',
      phone: member.phone || '',
      epp: (member.epp || []).join(', ')
    });
    setIsAddingMember(true);
  };

  const filteredMembers = members.filter(m => 
    normalizeText(m.name).includes(normalizeText(searchQuery)) || 
    normalizeText(m.role).includes(normalizeText(searchQuery))
  );

  const [activeProjectFilter, setActiveProjectFilter] = useState<string | null>(null);
  const [activeMemberFilter, setActiveMemberFilter] = useState<string | null>(null);
  const [smartFilters, setSmartFilters] = useState<{
    projectId: string | null;
    memberId: string | null;
    processId: string | null;
    auxiliaryId: string | null;
    status: string | null;
  }>({
    projectId: null,
    memberId: null,
    processId: null,
    auxiliaryId: null,
    status: null,
  });
  const [showSmartDropdown, setShowSmartDropdown] = useState(false);
  const [activeSuggestionCategory, setActiveSuggestionCategory] = useState<'all' | 'project' | 'member' | 'process' | 'auxiliary' | 'status'>('all');

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = normalizeText(t.title).includes(normalizeText(searchQuery)) || 
                         normalizeText(t.description || '').includes(normalizeText(searchQuery));
    const matchesProject = (!activeProjectFilter || t.projectId === activeProjectFilter) &&
                           (!smartFilters.projectId || t.projectId === smartFilters.projectId);
    const matchesMember = (!activeMemberFilter || t.memberId === activeMemberFilter) &&
                          (!smartFilters.memberId || t.memberId === smartFilters.memberId);
    
    const matchesSmartProcess = !smartFilters.processId || t.processId === smartFilters.processId;
    const matchesSmartAuxiliary = !smartFilters.auxiliaryId || t.auxiliaryId === smartFilters.auxiliaryId || (t.auxiliaryIds && t.auxiliaryIds.includes(smartFilters.auxiliaryId));
    const matchesSmartStatus = !smartFilters.status || t.status === smartFilters.status;
    
    const matchesBasic = matchesSearch && matchesProject && matchesMember && matchesSmartProcess && matchesSmartAuxiliary && matchesSmartStatus;
    if (!matchesBasic) return false;

    // Apply inline table filters (only used in list mode, but nice to enforce if states are set)
    if (taskViewMode === 'list') {
      const matchesTableTitle = !tableFilters.title || normalizeText(t.title).includes(normalizeText(tableFilters.title)) || normalizeText(t.description || '').includes(normalizeText(tableFilters.title));
      const matchesTableStatus = !tableFilters.status || t.status === tableFilters.status;
      const matchesTableProcess = !tableFilters.processId || t.processId === tableFilters.processId;
      const matchesTableProject = !tableFilters.projectId || t.projectId === tableFilters.projectId;
      const matchesTableMember = !tableFilters.memberId || t.memberId === tableFilters.memberId;
      const matchesTableAuxiliary = !tableFilters.auxiliaryId || t.auxiliaryId === tableFilters.auxiliaryId || (t.auxiliaryIds && t.auxiliaryIds.includes(tableFilters.auxiliaryId));
      const matchesTableRevisor = !tableFilters.revisorId || t.revisorId === tableFilters.revisorId;
      
      if (!matchesTableTitle || !matchesTableStatus || !matchesTableProcess || !matchesTableProject || !matchesTableMember || !matchesTableAuxiliary || !matchesTableRevisor) {
        return false;
      }
    }

    return isTaskVisibleForMember(t, currentMember, roles);
  });

  const sortedTasks = [...filteredTasks];
  if (taskViewMode === 'list' && tableSort.column && tableSort.direction) {
    const { column, direction } = tableSort;
    const isAsc = direction === 'asc';
    
    sortedTasks.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      
      if (column === 'title') {
        valA = a.title || '';
        valB = b.title || '';
      } else if (column === 'status') {
        const statusMap: Record<string, string> = {
          backlog: 'product backlog',
          todo: 'por hacer',
          in_progress: 'en progreso',
          blocked: 'bloqueada',
          review: 'en revision',
          done: 'completada',
          rejected: 'rechazada'
        };
        valA = statusMap[a.status] || '';
        valB = statusMap[b.status] || '';
      } else if (column === 'process') {
        valA = processes.find(p => p.id === a.processId)?.name || '';
        valB = processes.find(p => p.id === b.processId)?.name || '';
      } else if (column === 'project') {
        valA = projects.find(p => p.id === a.projectId)?.name || '';
        valB = projects.find(p => p.id === b.projectId)?.name || '';
      } else if (column === 'member') {
        valA = members.find(m => m.id === a.memberId)?.name || '';
        valB = members.find(m => m.id === b.memberId)?.name || '';
      } else if (column === 'auxiliary') {
        valA = members.find(m => m.id === a.auxiliaryId)?.name || '';
        valB = members.find(m => m.id === b.auxiliaryId)?.name || '';
      } else if (column === 'revisor') {
        valA = members.find(m => m.id === a.revisorId)?.name || '';
        valB = members.find(m => m.id === b.revisorId)?.name || '';
      } else if (column === 'hours') {
        valA = a.actualHours || 0;
        valB = b.actualHours || 0;
      } else if (column === 'dueDate') {
        valA = a.dueDate || '9999-12-31';
        valB = b.dueDate || '9999-12-31';
      }
      
      if (typeof valA === 'string') {
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return isAsc ? (valA - valB) : (valB - valA);
      }
    });
  }

  const handleTableSort = (column: typeof tableSort.column) => {
    setTableSort(prev => {
      if (prev.column === column) {
        if (prev.direction === 'asc') {
          return { column, direction: 'desc' };
        }
        return { column: null, direction: null };
      }
      return { column, direction: 'asc' };
    });
  };

  const isUserAdmin = currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin';
  const isNewTask = !editingTask;
  const isPrimaryAssignee = currentMember && editingTask && editingTask.memberId === currentMember.id;
  const taskAccess = getModuleAccess(currentMember, roles, newTaskData.processId ? `tasks_${newTaskData.processId}` : 'tasks');
  const isProcessLeader = !!(isUserAdmin || taskAccess === 'lider' || taskAccess === 'administrador');
  const canEditMetadataField = isNewTask || isProcessLeader;
  const canEditStatusField = isNewTask || isProcessLeader || taskAccess === 'colaborador';

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-8">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
        />
        <p className="text-sm font-bold text-gray-500 animate-pulse uppercase tracking-widest">Cargando Teampulse AI...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-lg w-full text-center"
        >
          <div 
            className="w-24 h-24 rounded-[2rem] flex items-center justify-center overflow-hidden mx-auto mb-8 shadow-2xl shadow-ng-lime/20 border-4 border-white"
          >
            <img src={logoUrl} alt="Novagreen Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-4xl font-black text-ng-black mb-4 tracking-tight">Novagreen IA</h1>
          <p className="text-ng-black/40 font-bold mb-10 leading-relaxed uppercase text-xs tracking-widest">
            La plataforma inteligente para la gestión de equipos y optimización de procesos. 
            Inicia sesión con tu cuenta corporativa para continuar.
          </p>
          <button 
            type="button"
            onClick={() => loginWithGoogle()}
            className="flex items-center justify-center gap-4 w-full py-5 bg-white border-2 border-gray-100 rounded-3xl text-ng-black font-black hover:bg-gray-50 hover:border-ng-lime transition-all shadow-sm group"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all" />
            Ingresar con Google
          </button>
          
          <div className="mt-12 pt-8 border-t border-gray-50 space-y-4">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-loose">
              Al ingresar aceptas nuestros <a href="#" className="text-ng-green hover:underline">términos de servicio</a> y <a href="#" className="text-ng-green hover:underline">política de privacidad</a>.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-ng-black border-r border-ng-gray/10 z-10 hidden md:flex flex-col">
        <div className="p-6">
          <div 
            className="flex items-center gap-3 text-ng-lime mb-10"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-ng-lime/10 transition-all duration-300">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <span className="font-black text-xl tracking-tighter text-white">Novagreen IA</span>
          </div>

          <nav className="space-y-1">
            {getModuleAccess(currentMember, roles, 'dashboard') !== 'ninguno' && (
              <NavButton 
                active={activeTab === 'dashboard'} 
                icon={<TrendingUp size={20} />} 
                label="Resumen" 
                onClick={() => handleTabClick('dashboard')} 
              />
            )}
            {getModuleAccess(currentMember, roles, 'tasks') !== 'ninguno' && (
              <NavButton 
                active={activeTab === 'tasks'} 
                icon={<CheckCircle2 size={20} />} 
                label="Tareas" 
                onClick={() => handleTabClick('tasks')} 
              />
            )}
            {getModuleAccess(currentMember, roles, 'planner') !== 'ninguno' && (
              <NavButton 
                active={activeTab === 'planner'} 
                icon={<Calendar size={20} />} 
                label="Planificador IA" 
                onClick={() => handleTabClick('planner')} 
              />
            )}
            {getModuleAccess(currentMember, roles, 'projects') !== 'ninguno' && (
              <NavButton 
                active={activeTab === 'projects'} 
                icon={<FolderKanban size={20} />} 
                label="Proyectos" 
                onClick={() => handleTabClick('projects')} 
              />
            )}
            {getModuleAccess(currentMember, roles, 'process_dashboard') !== 'ninguno' && (
              <>
                <NavButton 
                  active={activeTab === 'process_dashboard'} 
                  icon={<Activity size={20} />} 
                  label="Gestión XD" 
                  onClick={() => handleTabClick('process_dashboard')} 
                />
                <AnimatePresence>
                  {activeTab === 'process_dashboard' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-1 space-y-1 overflow-hidden"
                    >
                      <SubNavButton 
                        active={processSubTab === 'summary'} 
                        label="Horas y Tareas" 
                        icon={<Clock size={14} />}
                        onClick={() => {
                          handleTabClick('process_dashboard');
                          setProcessSubTab('summary');
                        }} 
                      />
                      <SubNavButton 
                        active={processSubTab === 'projects'} 
                        label="Bases de Proyectos" 
                        icon={<FolderKanban size={14} />}
                        onClick={() => {
                          handleTabClick('process_dashboard');
                          setProcessSubTab('projects');
                        }} 
                      />
                      <SubNavButton 
                        active={processSubTab === 'links'} 
                        label="Enlaces de Interés" 
                        icon={<Bookmark size={14} />}
                        onClick={() => {
                          handleTabClick('process_dashboard');
                          setProcessSubTab('links');
                        }} 
                      />
                      <SubNavButton 
                        active={processSubTab === 'notes'} 
                        label="Notas" 
                        icon={<FileText size={14} />}
                        onClick={() => {
                          handleTabClick('process_dashboard');
                          setProcessSubTab('notes');
                        }} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
            {getModuleAccess(currentMember, roles, 'directory') !== 'ninguno' && (
              <NavButton 
                active={activeTab === 'directory'} 
                icon={<Contact size={20} />} 
                label="Directorio" 
                onClick={() => handleTabClick('directory', 'people')} 
              />
            )}
            <AnimatePresence>
              {activeTab === 'directory' && getModuleAccess(currentMember, roles, 'directory') !== 'ninguno' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-8 mt-1 space-y-1 overflow-hidden"
                >
                  <SubNavButton 
                    active={directorySubTab === 'people'} 
                    label="Personas" 
                    icon={<User size={14} />}
                    onClick={() => setDirectorySubTab('people')} 
                  />
                  <SubNavButton 
                    active={directorySubTab === 'companies'} 
                    label="Compañías" 
                    icon={<Building2 size={14} />}
                    onClick={() => setDirectorySubTab('companies')} 
                  />
                  <SubNavButton 
                    active={directorySubTab === 'industries'} 
                    label="Industrias" 
                    icon={<Layers size={14} />}
                    onClick={() => setDirectorySubTab('industries')} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {getModuleAccess(currentMember, roles, 'transcript') !== 'ninguno' && (
              <NavButton 
                active={activeTab === 'transcript'} 
                icon={<Sparkles size={20} />} 
                label="Analizar Reunión" 
                onClick={() => handleTabClick('transcript')} 
              />
            )}
            {getModuleAccess(currentMember, roles, 'settings') !== 'ninguno' && (
              <NavButton 
                active={activeTab === 'settings'} 
                icon={<Settings size={20} />} 
                label="Configuración" 
                onClick={() => handleTabClick('settings')} 
              />
            )}
            <AnimatePresence>
              {activeTab === 'settings' && getModuleAccess(currentMember, roles, 'settings') !== 'ninguno' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-8 mt-1 space-y-1 overflow-hidden"
                >
                  <SubNavButton 
                    active={settingsSubTab === 'roles'} 
                    label="Permisos" 
                    icon={<Shield size={14} />}
                    onClick={() => handleSettingsSubTabClick('roles')} 
                  />
                  <SubNavButton 
                    active={settingsSubTab === 'processes'} 
                    label="Procesos" 
                    icon={<Building2 size={14} />}
                    onClick={() => handleSettingsSubTabClick('processes')} 
                  />
                  <SubNavButton 
                    active={settingsSubTab === 'members'} 
                    label="Equipo" 
                    icon={<Users size={14} />}
                    onClick={() => handleSettingsSubTabClick('members')} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-ng-gray/10">
          <div className="bg-ng-gray/5 p-4 rounded-xl border border-ng-gray/10">
            <h4 className="text-xs font-semibold text-ng-lime uppercase tracking-wider mb-2">Estado del Agente</h4>
            <div className="flex items-center gap-2 text-sm text-ng-gray mb-4">
              <div className="w-2 h-2 rounded-full bg-ng-lime animate-pulse" />
              Conectado y Escuchando
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-ng-gray/10 mt-2">
              <div className="flex items-center gap-3">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-8 h-8 rounded-lg border border-ng-gray/20" alt={user.displayName || 'User'} />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-white truncate">{user.displayName}</p>
                  <p className="text-[9px] font-bold text-ng-lime truncate opacity-70">{user.email}</p>
                  {currentMember ? (
                    <span className="text-[8px] bg-purple-600 text-white font-black uppercase tracking-wider py-0.5 px-1.5 rounded block mt-1 w-max">
                      Mapeado: {currentMember.name}
                    </span>
                  ) : (
                    <span className="text-[8px] bg-red-600 text-white font-black uppercase tracking-wider py-0.5 px-1.5 rounded block mt-1 w-max animate-pulse">
                      Sin Miembro Asociado
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => logout()}
                className="flex items-center gap-2 w-full py-2 px-3 bg-red-500/10 text-red-500 text-[10px] font-black rounded-lg hover:bg-red-500/20 transition-all uppercase tracking-widest mt-2"
              >
                <X size={14} />
                Cerrar Sesión
              </button>
              {members.length === 0 && (
                <div className="flex flex-col gap-1 mt-2">
                  <button 
                    onClick={() => bootstrapData()}
                    disabled={isInitializingData}
                    className="text-[8px] font-bold text-ng-gray/50 hover:text-ng-lime transition-all uppercase tracking-tighter text-left"
                  >
                    {isInitializingData ? 'Inicializando...' : '¿Sin datos? Cargar iniciales'}
                  </button>
                  {localDataFound && (
                    <button 
                      onClick={() => migrateFromLocalStorage()}
                      disabled={isMigrating}
                      className="text-[8px] font-bold text-ng-lime/60 hover:text-ng-lime transition-all uppercase tracking-tighter text-left flex items-center gap-1"
                    >
                      <Zap size={8} />
                      {isMigrating ? 'Migrando...' : 'Recuperar datos locales'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 h-screen flex flex-col overflow-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 bg-white text-ng-black border-b border-gray-100 shadow-sm relative z-30">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {activeTab === 'dashboard' && 'Panel de Control'}
              {activeTab === 'process_dashboard' && 'Gestión de Procesos'}
              {activeTab === 'transcript' && 'Análisis de Transcripciones'}
              {activeTab === 'projects' && 'Gestión de Proyectos'}
              {activeTab === 'tasks' && 'Seguimiento de Tareas'}
              {activeTab === 'planner' && 'Asistente de Planificación'}
              {activeTab === 'directory' && (
                directorySubTab === 'people' ? 'Directorio de Personas' : 
                directorySubTab === 'companies' ? 'Directorio de Compañías' : 
                'Industrias y Sectores'
              )}
              {activeTab === 'settings' && (
                settingsSubTab === 'roles' ? 'Permisos por Integrante' :
                settingsSubTab === 'processes' ? 'Gestión de Procesos' :
                settingsSubTab === 'members' ? 'Gestión de Equipo' :
                'Configuración del Sistema'
              )}
            </h1>
            <p className="text-ng-black/40 text-[10px] font-bold uppercase tracking-widest mt-1">
              Inteligencia colectiva para un futuro sostenible
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {activeTab === 'process_dashboard' && (
              <div className="flex items-center gap-2 bg-slate-50/50 p-1 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-2 whitespace-nowrap">Proceso:</span>
                <div className="relative">
                  <select
                    id="header-process-selector"
                    value={selectedProcessId}
                    onChange={(e) => {
                      setSelectedProcessId(e.target.value);
                    }}
                    className="appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-black py-2 px-3.5 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime/30 transition-all cursor-pointer min-w-[140px]"
                  >
                    {processes.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                    <ChevronRight size={14} className="rotate-90" />
                  </div>
                </div>

                <button
                  onClick={() => setShowFicha(!showFicha)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shrink-0 ${
                    showFicha
                      ? 'bg-slate-950 text-white border-slate-950 shadow-md shadow-slate-950/10'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Info size={14} />
                  <span>{showFicha ? 'Ocultar Ficha' : 'Ver Ficha'}</span>
                </button>
              </div>
            )}
            {activeTab === 'tasks' ? (
              <div className="relative z-50 min-w-[320px] max-w-[480px] md:min-w-[400px]">
                {/* Backdrop handle */}
                {showSmartDropdown && (
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => {
                      setShowSmartDropdown(false);
                      setActiveSuggestionCategory('all');
                    }} 
                  />
                )}

                {/* Smart Search Bar (Omnibox - Option 3) */}
                <div className="relative z-50 bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 px-3 flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-ng-lime/30 focus-within:border-ng-lime transition-all">
                  <div className="flex items-center gap-1.5 text-gray-400 pl-0.5 animate-pulse">
                    <Filter size={13} className="text-gray-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400 hidden sm:inline mr-0.5">Filtros:</span>
                  </div>

                  {/* Active smart filter pills */}
                  <div className="flex flex-wrap gap-1 items-center">
                    {smartFilters.projectId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-100/60 shadow-xs">
                        <FolderKanban size={10} />
                        <span>Prog: {projects.find(p => p.id === smartFilters.projectId)?.name || 'Desconocido'}</span>
                        <button 
                          onClick={() => setSmartFilters(prev => ({ ...prev, projectId: null }))}
                          className="hover:bg-blue-200 p-0.5 rounded-full text-blue-500 hover:text-blue-800 transition-colors cursor-pointer"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    )}
                    {smartFilters.memberId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-lg text-[11px] font-bold border border-purple-100/60 shadow-xs">
                        <User size={10} />
                        <span>Resp: {members.find(m => m.id === smartFilters.memberId)?.name || 'Desconocido'}</span>
                        <button 
                          onClick={() => setSmartFilters(prev => ({ ...prev, memberId: null }))}
                          className="hover:bg-purple-200 p-0.5 rounded-full text-purple-500 hover:text-purple-800 transition-colors cursor-pointer"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    )}
                    {smartFilters.processId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-[11px] font-bold border border-amber-100/60 shadow-xs">
                        <Building2 size={10} />
                        <span>Proc: {processes.find(p => p.id === smartFilters.processId)?.name || 'Desconocido'}</span>
                        <button 
                          onClick={() => setSmartFilters(prev => ({ ...prev, processId: null }))}
                          className="hover:bg-amber-200 p-0.5 rounded-full text-amber-500 hover:text-amber-800 transition-colors cursor-pointer"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    )}
                    {smartFilters.auxiliaryId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[11px] font-bold border border-indigo-100/60 shadow-xs">
                        <Users size={10} />
                        <span>Aux: {members.find(m => m.id === smartFilters.auxiliaryId)?.name || 'Desconocido'}</span>
                        <button 
                          onClick={() => setSmartFilters(prev => ({ ...prev, auxiliaryId: null }))}
                          className="hover:bg-indigo-200 p-0.5 rounded-full text-indigo-500 hover:text-indigo-800 transition-colors cursor-pointer"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    )}
                    {smartFilters.status && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded-lg text-[11px] font-bold border border-teal-100/60 shadow-xs">
                        <CheckCircle2 size={10} />
                        <span className="capitalize text-[11px]">
                          Est: {
                            smartFilters.status === 'backlog' ? 'Product Backlog' :
                            smartFilters.status === 'todo' ? 'Por Hacer' :
                            smartFilters.status === 'in_progress' ? 'En Progreso' :
                            smartFilters.status === 'blocked' ? 'Bloqueada' :
                            smartFilters.status === 'review' ? 'En Revisión' :
                            smartFilters.status === 'done' ? 'Completada' : 'Rechazada'
                          }
                        </span>
                        <button 
                          onClick={() => setSmartFilters(prev => ({ ...prev, status: null }))}
                          className="hover:bg-teal-200 p-0.5 rounded-full text-teal-500 hover:text-teal-800 transition-colors cursor-pointer"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    )}
                  </div>

                  {/* Flex input wrapper */}
                  <div className="flex-1 min-w-[120px] relative font-sans">
                    <input 
                      type="text"
                      onFocus={() => {
                        setShowSmartDropdown(true);
                        setActiveSuggestionCategory('all');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setShowSmartDropdown(false);
                        }
                      }}
                      className="w-full bg-transparent focus:outline-none text-xs text-gray-800 placeholder:text-gray-400 font-medium py-1"
                      placeholder={
                        Object.values(smartFilters).some(v => v !== null)
                          ? "Filtros activos. Buscar más o filtrar..."
                          : "Buscar o hacer clic para filtrar por Proyecto, Responsable..."
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Reset controls */}
                  {(searchQuery || Object.values(smartFilters).some(v => v !== null)) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSmartFilters({
                          projectId: null,
                          memberId: null,
                          processId: null,
                          auxiliaryId: null,
                          status: null,
                        });
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100/80 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-xs border border-red-100/30"
                    >
                      <X size={10} />
                      Limpiar
                    </button>
                  )}
                </div>

                {/* SMART DROPDOWN POPOVER */}
                {showSmartDropdown && (
                  <div className="absolute top-full right-0 mt-1.5 w-full bg-white rounded-2xl border border-gray-100 shadow-2xl z-50 overflow-hidden animate-fade-in text-left">
                    {activeSuggestionCategory === 'all' && (
                      <div className="p-2.5">
                        <div className="px-3 py-1.5 border-b border-gray-50 flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Buscar o filtrar por categoría</span>
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Omnibox</span>
                        </div>

                        {/* Search keyword action */}
                        {searchQuery && (
                          <div className="mb-2 bg-blue-50/40 p-1.5 rounded-xl border border-blue-100/30">
                            <button
                              onClick={() => {
                                setShowSmartDropdown(false);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-lg text-left hover:bg-gray-50 text-xs text-slate-800 font-bold border border-blue-100 shadow-xs transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <Search size={13} className="text-blue-600 animate-pulse" />
                                <span>Buscar por texto: <span className="text-blue-700 font-black">"{searchQuery}"</span></span>
                              </span>
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md uppercase tracking-wider">Buscar (Enter)</span>
                            </button>
                          </div>
                        )}

                        {/* Search matches suggestion category lists */}
                        {searchQuery && (
                          <div className="mb-2 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100/50">
                            <span className="block px-2.5 py-1 text-[9px] font-black text-blue-600 tracking-wider uppercase">Filtros encontrados: "{searchQuery}"</span>
                            <div className="space-y-0.5 mt-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                              {projects.filter(p => normalizeText(p.name).includes(normalizeText(searchQuery))).map(p => (
                                <button 
                                  key={p.id}
                                  onClick={() => {
                                    setSmartFilters(prev => ({ ...prev, projectId: p.id }));
                                    setSearchQuery('');
                                    setShowSmartDropdown(false);
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-blue-50/50 text-xs text-gray-700 font-semibold transition-colors cursor-pointer"
                                >
                                  <span className="flex items-center gap-2"><FolderKanban size={13} className="text-blue-500" /> Proyecto: <span className="text-slate-900 font-black">{p.name}</span></span>
                                  <Plus size={12} className="text-gray-400" />
                                </button>
                              ))}
                              {sortedMembers.filter(m => normalizeText(m.name).includes(normalizeText(searchQuery))).map(m => (
                                <React.Fragment key={m.id}>
                                  <button 
                                    onClick={() => {
                                      setSmartFilters(prev => ({ ...prev, memberId: m.id }));
                                      setSearchQuery('');
                                      setShowSmartDropdown(false);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-purple-50/50 text-xs text-gray-700 font-semibold transition-colors cursor-pointer"
                                  >
                                    <span className="flex items-center gap-2"><User size={13} className="text-purple-500" /> Responsable: <span className="text-slate-900 font-black">{m.name}</span></span>
                                    <Plus size={12} className="text-gray-400" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setSmartFilters(prev => ({ ...prev, auxiliaryId: m.id }));
                                      setSearchQuery('');
                                      setShowSmartDropdown(false);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-indigo-50/50 text-xs text-gray-700 font-semibold transition-colors cursor-pointer"
                                  >
                                    <span className="flex items-center gap-2"><Users size={13} className="text-indigo-500" /> Auxiliar: <span className="text-slate-900 font-black">{m.name}</span></span>
                                    <Plus size={12} className="text-gray-400" />
                                  </button>
                                </React.Fragment>
                              ))}
                              {processes.filter(p => normalizeText(p.name).includes(normalizeText(searchQuery))).map(p => (
                                <button 
                                  key={p.id}
                                  onClick={() => {
                                    setSmartFilters(prev => ({ ...prev, processId: p.id }));
                                    setSearchQuery('');
                                    setShowSmartDropdown(false);
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-amber-50/50 text-xs text-gray-700 font-semibold transition-colors cursor-pointer"
                                >
                                  <span className="flex items-center gap-2"><Building2 size={13} className="text-amber-500" /> Proceso: <span className="text-slate-900 font-black">{p.name}</span></span>
                                  <Plus size={12} className="text-gray-400" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Main Suggestion Categories */}
                        <div className="space-y-0.5">
                          <button
                            onClick={() => setActiveSuggestionCategory('project')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-gray-50 text-xs text-gray-700 font-semibold transition-all group cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors"><FolderKanban size={13} /></span>
                              <span>Filtrar por Proyecto...</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {smartFilters.projectId && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                              <ChevronRight size={13} className="text-gray-400" />
                            </div>
                          </button>

                          <button
                            onClick={() => setActiveSuggestionCategory('member')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-gray-50 text-xs text-gray-700 font-semibold transition-all group cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors"><User size={13} /></span>
                              <span>Filtrar por Responsable...</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {smartFilters.memberId && <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />}
                              <ChevronRight size={13} className="text-gray-400" />
                            </div>
                          </button>

                          <button
                            onClick={() => setActiveSuggestionCategory('process')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-gray-50 text-xs text-gray-700 font-semibold transition-all group cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition-colors"><Building2 size={13} /></span>
                              <span>Filtrar por Proceso...</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {smartFilters.processId && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />}
                              <ChevronRight size={13} className="text-gray-400" />
                            </div>
                          </button>

                          <button
                            onClick={() => setActiveSuggestionCategory('auxiliary')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-gray-50 text-xs text-gray-700 font-semibold transition-all group cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors"><Users size={13} /></span>
                              <span>Filtrar por Auxiliar...</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {smartFilters.auxiliaryId && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                              <ChevronRight size={13} className="text-gray-400" />
                            </div>
                          </button>

                          <button
                            onClick={() => setActiveSuggestionCategory('status')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-gray-50 text-xs text-gray-700 font-semibold transition-all group cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="p-1.5 bg-teal-50 text-teal-600 rounded-lg group-hover:bg-teal-100 transition-colors"><CheckCircle2 size={13} /></span>
                              <span>Filtrar por Estado de Tarea...</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {smartFilters.status && <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />}
                              <ChevronRight size={13} className="text-gray-400" />
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {activeSuggestionCategory === 'project' && (
                      <div className="p-2.5 max-h-[300px] overflow-y-auto custom-scrollbar font-sans">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-50 mb-1.5 px-1 font-sans">
                          <button 
                            onClick={() => setActiveSuggestionCategory('all')}
                            className="text-[9px] font-black uppercase text-gray-500 hover:text-black py-1 px-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                          >
                            ← Volver
                          </button>
                          <span className="text-[9px] font-black uppercase tracking-wider text-blue-500">Filtrar por proyecto</span>
                        </div>
                        <div className="space-y-0.5 font-sans">
                          {projects.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSmartFilters(prev => ({ ...prev, projectId: p.id }));
                                setShowSmartDropdown(false);
                                setActiveSuggestionCategory('all');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                smartFilters.projectId === p.id 
                                  ? 'bg-blue-50 text-blue-700 font-bold' 
                                  : 'text-gray-700 hover:bg-gray-50 font-semibold'
                              }`}
                            >
                              <span className="flex items-center gap-2"><FolderKanban size={13} className="opacity-70" /> {p.name}</span>
                              {smartFilters.projectId === p.id && <Check size={12} className="text-blue-600" />}
                            </button>
                          ))}
                          {projects.length === 0 && (
                            <p className="p-4 text-center text-xs text-gray-400 font-semibold">No hay proyectos para filtrar</p>
                          )}
                        </div>
                      </div>
                    )}

                    {activeSuggestionCategory === 'member' && (
                      <div className="p-2.5 max-h-[300px] overflow-y-auto custom-scrollbar font-sans">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-50 mb-1.5 px-1 font-sans">
                          <button 
                            onClick={() => setActiveSuggestionCategory('all')}
                            className="text-[9px] font-black uppercase text-gray-500 hover:text-black py-1 px-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                          >
                            ← Volver
                          </button>
                          <span className="text-[9px] font-black uppercase tracking-wider text-purple-500">Filtrar por responsable</span>
                        </div>
                        <div className="space-y-0.5 font-sans">
                          {sortedMembers.map(m => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setSmartFilters(prev => ({ ...prev, memberId: m.id }));
                                setShowSmartDropdown(false);
                                setActiveSuggestionCategory('all');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                smartFilters.memberId === m.id 
                                  ? 'bg-purple-50 text-purple-700 font-bold' 
                                  : 'text-gray-700 hover:bg-gray-50 font-semibold'
                              }`}
                            >
                              <span className="flex items-center gap-2"><User size={13} className="opacity-70" /> {m.name}</span>
                              {smartFilters.memberId === m.id && <Check size={12} className="text-purple-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeSuggestionCategory === 'process' && (
                      <div className="p-2.5 max-h-[300px] overflow-y-auto custom-scrollbar font-sans font-sans">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-50 mb-1.5 px-1 font-sans">
                          <button 
                            onClick={() => setActiveSuggestionCategory('all')}
                            className="text-[9px] font-black uppercase text-gray-500 hover:text-black py-1 px-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                          >
                            ← Volver
                          </button>
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">Filtrar por proceso</span>
                        </div>
                        <div className="space-y-0.5 font-sans">
                          {processes.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSmartFilters(prev => ({ ...prev, processId: p.id }));
                                setShowSmartDropdown(false);
                                setActiveSuggestionCategory('all');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                smartFilters.processId === p.id 
                                  ? 'bg-amber-50 text-amber-700 font-bold' 
                                  : 'text-gray-700 hover:bg-gray-50 font-semibold'
                              }`}
                            >
                              <span className="flex items-center gap-2"><Building2 size={13} className="opacity-70" /> {p.name}</span>
                              {smartFilters.processId === p.id && <Check size={12} className="text-amber-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeSuggestionCategory === 'auxiliary' && (
                      <div className="p-2.5 max-h-[300px] overflow-y-auto custom-scrollbar font-sans">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-50 mb-1.5 px-1 font-sans">
                          <button 
                            onClick={() => setActiveSuggestionCategory('all')}
                            className="text-[9px] font-black uppercase text-gray-500 hover:text-black py-1 px-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                          >
                            ← Volver
                          </button>
                          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500">Filtrar por auxiliar</span>
                        </div>
                        <div className="space-y-0.5 font-sans">
                          {sortedMembers.map(m => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setSmartFilters(prev => ({ ...prev, auxiliaryId: m.id }));
                                setShowSmartDropdown(false);
                                setActiveSuggestionCategory('all');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                smartFilters.auxiliaryId === m.id 
                                  ? 'bg-indigo-50 text-indigo-700 font-bold' 
                                  : 'text-gray-700 hover:bg-gray-50 font-semibold'
                              }`}
                            >
                              <span className="flex items-center gap-2"><Users size={13} className="opacity-70" /> {m.name}</span>
                              {smartFilters.auxiliaryId === m.id && <Check size={12} className="text-indigo-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeSuggestionCategory === 'status' && (
                      <div className="p-2.5 max-h-[300px] overflow-y-auto custom-scrollbar font-sans">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-50 mb-1.5 px-1 font-sans">
                          <button 
                            onClick={() => setActiveSuggestionCategory('all')}
                            className="text-[9px] font-black uppercase text-gray-500 hover:text-black py-1 px-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                          >
                            ← Volver
                          </button>
                          <span className="text-[9px] font-black uppercase tracking-wider text-teal-500">Filtrar por estado</span>
                        </div>
                        <div className="space-y-0.5 font-sans">
                          {[
                            { id: 'backlog', label: 'Product Backlog' },
                            { id: 'todo', label: 'Por Hacer' },
                            { id: 'in_progress', label: 'En Progreso' },
                            { id: 'blocked', label: 'Bloqueada' },
                            { id: 'review', label: 'En Revisión' },
                            { id: 'done', label: 'Completada' },
                            { id: 'rejected', label: 'Rechazada' },
                          ].map(st => (
                            <button
                              key={st.id}
                              onClick={() => {
                                setSmartFilters(prev => ({ ...prev, status: st.id }));
                                setShowSmartDropdown(false);
                                setActiveSuggestionCategory('all');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                smartFilters.status === st.id 
                                  ? 'bg-teal-50 text-teal-700 font-bold' 
                                  : 'text-gray-700 hover:bg-gray-50 font-semibold'
                              }`}
                            >
                              <span className="flex items-center gap-2"><CheckCircle2 size={13} className="opacity-70" /> {st.label}</span>
                              {smartFilters.status === st.id && <Check size={12} className="text-teal-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar..."
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-ng-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ng-lime focus:border-transparent transition-all w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
            {activeTab === 'settings' && settingsSubTab === 'members' && !isAddingMember && !editingMember && (
              <>
                <button 
                  onClick={() => setIsMemberAssistantOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-ng-black text-ng-lime text-sm font-bold rounded-lg hover:bg-ng-black/90 transition-all shadow-xl group"
                >
                  <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                  Asistente Maestro
                </button>
                <button 
                  onClick={() => {
                    setEditingMember(null);
                    setNewMemberData({
                      name: '',
                      role: '',
                      systemRoleId: '',
                      isSystemAdmin: false,
                      moduleAccess: undefined,
                      categories: ['miembro'],
                      processId: '',
                      companyAssociations: [],
                      identificationId: '',
                      hasRuc: false,
                      ruc: '',
                      skills: '',
                      responsibilities: '',
                      personality: '',
                      notes: '',
                      email: '',
                      phone: '',
                      epp: ''
                    });
                    setIsAddingMember(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-ng-lime text-ng-black text-sm font-bold rounded-lg hover:opacity-90 transition-all shadow-xl"
                >
                  <UserPlus size={18} />
                  Nuevo Miembro
                </button>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {activeTab === 'settings' && settingsSubTab === 'processes' && !isReadOnly && (
              <button 
                onClick={() => {
                  setEditingProcess(null);
                  setNewProcessData({ name: '', description: '', goals: '' });
                  setIsAddingProcess(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-ng-lime text-ng-black text-sm font-bold rounded-lg hover:opacity-90 transition-all shadow-sm"
              >
                <Building2 size={18} />
                Nuevo Proceso
              </button>
            )}
            {activeTab === 'projects' && canCreateProjects && (
              <button 
                onClick={() => {
                  setEditingProject(null);
                  const allowedProcs = processes.filter(p => {
                    const access = getModuleAccess(currentMember, roles, `projects_${p.id}`);
                    return access === 'lider' || access === 'administrador';
                  });
                  const defaultProcessId = allowedProcs.length === 1 ? allowedProcs[0].id : '';
                  setNewProjectData({ name: '', description: '', processId: defaultProcessId, status: 'activo', city: '' });
                  setIsAddingProject(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-ng-lime text-ng-black text-sm font-bold rounded-lg hover:opacity-90 transition-all shadow-sm"
              >
                <FolderKanban size={18} />
                Nuevo Proyecto
              </button>
            )}
            {activeTab === 'tasks' && (
              <div className="flex items-center gap-3">
                {!isAddingTask && !editingTask && (
                  <>
                    <div className="flex bg-gray-100 border border-gray-200/50 rounded-xl p-1 gap-1 shadow-inner">
                      <button
                        onClick={() => setTaskViewMode('board')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                          taskViewMode === 'board'
                            ? 'bg-ng-lime text-ng-black shadow-sm font-black'
                            : 'text-gray-500 hover:text-gray-950 hover:bg-white/60 font-bold'
                        }`}
                        title="Ver como Tablero Kanban"
                      >
                        <Trello size={14} />
                        Tablero
                      </button>
                      <button
                        onClick={() => setTaskViewMode('list')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                          taskViewMode === 'list'
                            ? 'bg-ng-lime text-ng-black shadow-sm font-black'
                            : 'text-gray-500 hover:text-gray-950 hover:bg-white/60 font-bold'
                        }`}
                        title="Ver como Lista"
                      >
                        <Table size={14} />
                        Lista
                      </button>
                      <button
                        onClick={() => setTaskViewMode('calendar')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                          taskViewMode === 'calendar'
                            ? 'bg-ng-lime text-ng-black shadow-sm font-black'
                            : 'text-gray-500 hover:text-gray-950 hover:bg-white/60 font-bold'
                        }`}
                        title="Ver como Calendario"
                      >
                        <Calendar size={14} />
                        Calendario
                      </button>
                    </div>
                    
                    {!isReadOnly && (
                      <button 
                        onClick={() => openAddTaskModal()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-ng-lime text-ng-black text-xs font-black rounded-xl hover:opacity-90 transition-all shadow-lg shadow-ng-lime/10 uppercase tracking-widest"
                      >
                        <Plus size={18} />
                        Nueva Tarea
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'directory' && !isReadOnly && (
              <div className="flex items-center gap-4">
                {directorySubTab !== 'industries' && (
                  <button 
                    onClick={() => {
                      if (directorySubTab === 'people') {
                        setEditingMember(null);
                        setNewMemberData({
                          name: '',
                          role: '',
                          systemRoleId: '',
                          isSystemAdmin: false,
                          moduleAccess: undefined,
                          categories: ['contacto'],
                          processId: '',
                          companyAssociations: [],
                          identificationId: '',
                          hasRuc: false,
                          ruc: '',
                          skills: '',
                          responsibilities: '',
                          personality: '',
                          notes: '',
                          email: '',
                          phone: '',
                          epp: ''
                        });
                        setIsAddingMember(true);
                      } else {
                        setEditingCompany(null);
                        setNewCompanyData({
                          name: '',
                          ruc: '',
                          email: '',
                          phone: '',
                          website: '',
                          mainAddress: '',
                          branchAddresses: [],
                          industries: [],
                          notes: ''
                        });
                        setIsAddingCompany(true);
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-ng-lime text-ng-black text-xs font-black rounded-xl hover:opacity-90 transition-all shadow-lg shadow-ng-lime/10 uppercase tracking-widest"
                  >
                    <Plus size={18} />
                    {directorySubTab === 'people' ? 'Nueva Persona' : 'Nueva Compañía'}
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto custom-scrollbar ${activeTab === 'tasks' ? 'pt-3 px-8 pb-8' : 'p-8'}`}>
          <AnimatePresence mode="wait">
            {activeTabAccess === 'ninguno' ? (
              <motion.div
                key="restricted-access"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-center min-h-[60vh] p-4"
              >
                <div id="restricted-card" className="max-w-md w-full bg-white p-8 rounded-[2rem] border border-gray-100 shadow-2xl shadow-gray-100 text-center space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-amber-500" />
                  
                  <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 shadow-inner">
                    <ShieldAlert size={32} />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Acceso Restringido</h2>
                    <p className="text-sm font-medium text-slate-400">
                      No tienes los permisos requeridos para ingresar a este módulo.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left space-y-3">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
                      <Lock size={12} className="text-red-400" /> Información de Tu Acceso
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-slate-400">Rol Actual:</div>
                      <div className="font-extrabold text-slate-700 capitalize text-left">
                        {currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin' ? 'Administrador del Sistema' : 'Acceso Personalizado'}
                      </div>
                      <div className="text-slate-400 text-left">Módulo:</div>
                      <div className="font-extrabold text-slate-700 capitalize text-left">
                        {activeTab === 'dashboard' ? 'Resumen' :
                         activeTab === 'tasks' ? 'Tareas' :
                         activeTab === 'planner' ? 'Planificador IA' :
                         activeTab === 'projects' ? 'Proyectos' :
                         activeTab === 'directory' ? 'Directorio' :
                         activeTab === 'transcript' ? 'Analizar Reunión' :
                         'Configuración'}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    Por favor, solicita a un Administrador o Líder de Proceso que te asigne acceso en la <strong className="text-slate-600">Matriz de Permisos</strong> dentro de Configuración.
                  </p>
                </div>
              </motion.div>
            ) : (
              <>
                {activeTab === 'process_dashboard' && (
                  <motion.div
                    key="process_dashboard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-7xl mx-auto w-full"
                  >
                    <ProcessDashboard
                      currentMember={currentMember}
                      processes={processes}
                      members={members}
                      tasks={tasks}
                      projects={projects}
                      roles={roles}
                      processLinks={processLinks}
                      processNotes={processNotes}
                      activeSubTab={processSubTab}
                      setActiveSubTab={setProcessSubTab}
                      selectedProcessId={selectedProcessId}
                      setSelectedProcessId={setSelectedProcessId}
                      showFicha={showFicha}
                      setShowFicha={setShowFicha}
                    />
                  </motion.div>
                )}
                {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Stats Grid */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard 
                  title="Miembros del Equipo" 
                  value={members.length.toString()} 
                  icon={<Users className="text-blue-600" />} 
                  trend="+2 este mes"
                />
                <StatCard 
                  title="Procesos Activos" 
                  value={processes.length.toString()} 
                  icon={<Building2 className="text-purple-600" />} 
                  trend="Estructura óptima"
                />
                <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-ng-gray shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-ng-green opacity-0 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-ng-black">
                    <Clock size={20} className="text-ng-green" />
                    Insight Recientes de IA
                  </h3>
                  <div className="space-y-4">
                    <AIInsightItem 
                      title="Actualización de Perfil"
                      desc="Elena Rodriguez añadió 'GCP Architecture' a sus habilidades."
                      time="Hace 2 horas"
                    />
                    <AIInsightItem 
                      title="Nuevo Objetivo"
                      desc="El proceso de Desarrollo de Software tiene un nuevo objetivo de migración."
                      time="Hace 5 horas"
                    />
                    <AIInsightItem 
                      title="Logro Detectado"
                      desc="Lucas Smith completó la campaña SEO trimestral."
                      time="Ayer"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Actions / New Analysis */}
              <div className="space-y-6">
                <div className="bg-ng-black text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                  <Sparkles className="absolute right-[-10px] top-[-10px] w-32 h-32 text-ng-lime opacity-5 group-hover:opacity-10 transition-opacity duration-500" />
                  <h3 className="text-lg font-black mb-2 tracking-tight">¿Nueva Reunión?</h3>
                  <p className="text-ng-gray/60 text-sm mb-6 font-medium">Pega la transcripción y deja que la IA actualice los perfiles automáticamente.</p>
                  <button 
                    onClick={() => handleTabClick('transcript')}
                    className="w-full py-3 bg-ng-lime text-ng-black font-black rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest shadow-lg shadow-ng-lime/10"
                  >
                    Empezar Análisis
                    <ArrowRight size={18} />
                  </button>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-ng-gray shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-ng-green opacity-0 group-hover:opacity-100 transition-opacity" />
                  <h3 className="font-black mb-4 text-ng-black uppercase text-xs tracking-widest">Procesos Vigentes</h3>
                  <div className="space-y-3">
                    {processes.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-ng-lime/10 transition-colors cursor-pointer group/item">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-ng-green" />
                          <span className="text-sm font-bold text-ng-black/70 group-hover/item:text-ng-black">{p.name}</span>
                        </div>
                        <ChevronRight size={16} className="text-ng-gray group-hover/item:text-ng-green" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {activeTab === 'directory' && (
            <motion.div 
              key="directory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {(isAddingMember || editingMember) ? (
                <MemberEditorView 
                  editingMember={editingMember}
                  newMemberData={newMemberData}
                  setNewMemberData={setNewMemberData}
                  processes={processes}
                  companies={companies}
                  roles={roles}
                  onCancel={() => {
                    setIsAddingMember(false);
                    setEditingMember(null);
                    setNewMemberData({
                      name: '',
                      role: '',
                      systemRoleId: '',
                      isSystemAdmin: false,
                      moduleAccess: undefined,
                      categories: ['contacto'],
                      processId: '',
                      companyAssociations: [],
                      identificationId: '',
                      hasRuc: false,
                      ruc: '',
                      skills: '',
                      responsibilities: '',
                      personality: '',
                      notes: '',
                      email: '',
                      phone: '',
                      epp: ''
                    });
                  }}
                  onSave={handleAddMember}
                />
              ) : (isAddingCompany || editingCompany) ? (
                <CompanyEditorView 
                  editingCompany={editingCompany}
                  newCompanyData={newCompanyData}
                  setNewCompanyData={setNewCompanyData}
                  allIndustries={industries}
                  onCancel={() => {
                    setIsAddingCompany(false);
                    setEditingCompany(null);
                    setNewCompanyData({
                      name: '', ruc: '', industry: '', email: '', phone: '', website: '', address: '', notes: ''
                    });
                  }}
                  onSave={handleAddCompany}
                />
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-8">
                    <button 
                      onClick={() => setDirectorySubTab('people')}
                      className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${directorySubTab === 'people' ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/20' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
                    >
                      Personas
                    </button>
                    <button 
                      onClick={() => setDirectorySubTab('companies')}
                      className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${directorySubTab === 'companies' ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/20' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
                    >
                      Compañías
                    </button>
                    <button 
                      onClick={() => setDirectorySubTab('industries')}
                      className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${directorySubTab === 'industries' ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/20' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
                    >
                      Industrias
                    </button>
                  </div>

                  {directorySubTab === 'people' ? (
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-50">
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Persona</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Categoría</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Cargo</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Empresa / RUC</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contacto</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {sortedMembers.filter(m => 
                            normalizeText(m.name).includes(normalizeText(searchQuery)) || 
                            normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                            (m.categories || []).some(cat => normalizeText(cat).includes(normalizeText(searchQuery))) ||
                            normalizeText(m.notes || '').includes(normalizeText(searchQuery))
                          ).map(member => {
                            const company = companies.find(c => c.id === member.companyId);
                            return (
                              <tr key={member.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={member.avatar || `https://picsum.photos/seed/${member.name.replace(/\s/g, '')}/100/100`} 
                                      className="w-10 h-10 rounded-xl object-cover shadow-sm"
                                      alt=""
                                    />
                                    <span className="font-bold text-gray-800">{member.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-1">
                                    {(member.categories || []).map(cat => (
                                      <span key={cat} className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border border-blue-50 bg-white text-blue-600`}>
                                        {cat}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm font-medium text-gray-500">{member.role || '-'}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-gray-700">{company?.name || 'Independiente'}</p>
                                    {member.ruc && <p className="text-[10px] font-medium text-gray-400">RUC: {member.ruc}</p>}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="space-y-1">
                                    {member.email && <div className="flex items-center gap-2 text-[11px] text-gray-500"><Mail size={12} className="text-gray-300" />{member.email}</div>}
                                    {member.phone && <div className="flex items-center gap-2 text-[11px] text-gray-500"><Phone size={12} className="text-gray-300" />{member.phone}</div>}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                      onClick={() => openEditMember(member)}
                                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg shadow-sm"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteMember(member)}
                                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg shadow-sm"
                                    >
                                      <Trash size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : directorySubTab === 'companies' ? (
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-50">
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Compañía</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">RUC</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Sector</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Dirección</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contacto</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {companies.filter(c => 
                            normalizeText(c.name).includes(normalizeText(searchQuery)) || 
                            normalizeText(c.ruc).includes(normalizeText(searchQuery)) ||
                            normalizeText(c.industry || '').includes(normalizeText(searchQuery)) ||
                            (c.industries || []).some(ind => normalizeText(ind).includes(normalizeText(searchQuery))) ||
                            normalizeText(c.description || '').includes(normalizeText(searchQuery)) ||
                            normalizeText(c.notes || '').includes(normalizeText(searchQuery))
                          ).map(company => (
                            <tr key={company.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewingCompany(company)}>
                                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                    <Building2 size={20} />
                                  </div>
                                  <span className="font-bold text-gray-800 hover:text-blue-600 transition-colors">{company.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-500">{company.ruc}</td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {(company.industries && company.industries.length > 0) ? (
                                    company.industries.slice(0, 2).map((ind, i) => (
                                      <span key={i} className="text-[9px] font-bold text-slate-500 px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100 uppercase tracking-widest">
                                        {ind}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[9px] font-bold text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100 uppercase tracking-widest">
                                      N/A
                                    </span>
                                  )}
                                  {company.industries && company.industries.length > 2 && (
                                    <span className="text-[9px] font-bold text-slate-400 px-1.5 py-0.5">+ {company.industries.length - 2}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-gray-700 max-w-[200px] truncate">{company.mainAddress || company.address || '-'}</p>
                                  {company.branchAddresses && company.branchAddresses.length > 0 && (
                                    <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                      <Building2 size={10} />
                                      {company.branchAddresses.length} sucursal(es)
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  {company.email && <div className="flex items-center gap-2 text-[11px] text-gray-500"><Mail size={12} className="text-gray-300" />{company.email}</div>}
                                  {company.phone && <div className="flex items-center gap-2 text-[11px] text-gray-500"><Phone size={12} className="text-gray-300" />{company.phone}</div>}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                  <button 
                                    onClick={() => openEditCompany(company)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg shadow-sm"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteCompany(company.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg shadow-sm"
                                  >
                                    <Trash size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {companies.length === 0 && (
                        <div className="py-20 text-center">
                          <Building2 size={48} className="mx-auto text-gray-200 mb-4" />
                          <p className="text-gray-400 font-medium">No hay compañías registradas.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {industries.filter(ind => 
                        normalizeText(ind.name).includes(normalizeText(searchQuery))
                      ).map(industry => {
                        const associatedCompaniesCount = companies.filter(c => c.industries?.includes(industry.name)).length;
                        return (
                          <div key={industry.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-2 h-full bg-blue-500/20 group-hover:bg-blue-500 transition-colors" />
                             <div className="flex items-start justify-between mb-4">
                               <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                 <Layers size={20} />
                               </div>
                               <button 
                                 onClick={() => {
                                   if (window.confirm('¿Deseas eliminar este sector? Solo se eliminará de la lista maestra.')) {
                                     setIndustries(prev => prev.filter(ind => ind.id !== industry.id));
                                   }
                                 }}
                                 className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                               >
                                 <Trash size={14} />
                               </button>
                             </div>
                             <h4 className="font-bold text-gray-800 mb-1">{industry.name}</h4>
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                               <Building2 size={12} />
                               {associatedCompaniesCount} compañía(s) vinculada(s)
                             </p>
                          </div>
                        );
                      })}
                      {industries.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                          <Layers size={48} className="mx-auto text-gray-200 mb-4" />
                          <p className="text-gray-400 font-medium">No hay industrias o sectores registrados.</p>
                        </div>
                      )}
                    </div>
                  )}
            </>
          )}
        </motion.div>
      )}

      {activeTab === 'transcript' && (
            <motion.div 
              key="transcript"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto"
            >
              {!extractedUpdates ? (
                <div className="bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Procesador de Transcripciones</h2>
                      <p className="text-gray-500 text-sm">IA analiza el contexto de las conversaciones corporativas.</p>
                    </div>
                  </div>

                  <textarea 
                    className="w-full h-80 p-6 bg-gray-50 border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all resize-none text-gray-700 leading-relaxed font-mono text-sm"
                    placeholder="Pega aquí la transcripción de la reunión (Voz a Texto, Zoom, Teams, etc.)..."
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                  />

                  <div className="mt-8 flex items-center justify-between">
                    <p className="text-xs text-gray-400 max-w-sm">
                      La IA buscará menciones de habilidades, cambios en roles, responsabilidades asignadas y actualizaciones de departamentos.
                    </p>
                    <button 
                      onClick={handleAnalyze}
                      disabled={!transcript.trim() || isAnalyzing}
                      className={`px-8 py-4 bg-[#2563EB] text-white font-bold rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] ${(!transcript.trim() || isAnalyzing) ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-blue-200'}`}
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Analizando Contexto...
                        </>
                      ) : (
                        <>
                          Extraer Insights
                          <Sparkles size={20} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-[#E5E7EB]">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Insights Encontrados</h2>
                        <p className="text-gray-500 text-sm">Revisa los cambios propuestos antes de aplicarlos.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setExtractedUpdates(null)}
                        className="px-6 py-3 text-gray-500 font-semibold hover:text-gray-700 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={applyUpdates}
                        className="px-8 py-3 bg-green-600 text-white font-bold rounded-2xl shadow-lg shadow-green-100 hover:bg-green-700 transition-all hover:scale-105 active:scale-95"
                      >
                        Aplicar Cambios
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-bold flex items-center gap-2 text-gray-700 px-2">
                        <Users size={18} /> Miembros Actualizados ({extractedUpdates.memberUpdates.length})
                      </h3>
                      {extractedUpdates.memberUpdates.length === 0 && (
                        <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
                          No se detectaron cambios para miembros específicos.
                        </div>
                      )}
                      {extractedUpdates.memberUpdates.map(u => {
                        const member = members.find(m => m.id === u.memberId);
                        return (
                          <div key={u.memberId} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
                              <img src={member?.avatar} alt={member?.name} className="w-10 h-10 rounded-full" />
                              <span className="font-bold">{member?.name}</span>
                            </div>
                            <div className="space-y-3">
                              {u.newSkills && u.newSkills.length > 0 && (
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-blue-500 block mb-1">Nuevas Habilidades</span>
                                  <div className="flex flex-wrap gap-2">
                                    {u.newSkills.map(s => <span key={s} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">{s}</span>)}
                                  </div>
                                </div>
                              )}
                              {u.achievements && u.achievements.length > 0 && (
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-green-500 block mb-1">Logros</span>
                                  <ul className="text-xs text-gray-600 space-y-1">
                                    {u.achievements.map(a => <li key={a} className="flex gap-2"><span>•</span> {a}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-bold flex items-center gap-2 text-gray-700 px-2">
                        <Building2 size={18} /> Procesos Actualizados ({extractedUpdates.processUpdates.length})
                      </h3>
                      {extractedUpdates.processUpdates.length === 0 && (
                        <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
                          No se detectaron cambios para los procesos.
                        </div>
                      )}
                      {extractedUpdates.processUpdates.map(u => {
                        const proc = processes.find(p => p.id === u.processId);
                        return (
                          <div key={u.processId} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
                              <div className="w-3 h-3 rounded-full bg-purple-500" />
                              <span className="font-bold">{proc?.name}</span>
                            </div>
                            <div className="space-y-3">
                              {u.descriptionUpdate && (
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-purple-500 block mb-1">Actualización de Misión</span>
                                  <p className="text-xs text-gray-600">"{u.descriptionUpdate}"</p>
                                </div>
                              )}
                              {u.newGoals && u.newGoals.length > 0 && (
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-orange-500 block mb-1">Nuevos Objetivos</span>
                                  <ul className="text-xs text-gray-600 space-y-1">
                                    {u.newGoals.map(g => <li key={g} className="flex gap-2"><span>•</span> {g}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                </div>
              )}
            </motion.div>
          )}
          {activeTab === 'projects' && (
            <motion.div 
              key="projects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              {processes.map(proc => {
                const processProjects = projects.filter(p => p.processId === proc.id);
                return (
                  <div key={proc.id} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-1 bg-[#2563EB] rounded-full" />
                      <h3 className="text-xl font-bold text-[#111827]">{proc.name}</h3>
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-md">
                        {processProjects.length} {processProjects.length === 1 ? 'Proyecto' : 'Proyectos'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {processProjects.map(project => {
                        const projectAccess = getModuleAccess(currentMember, roles, `projects_${project.processId}`);
                        const canEdit = projectAccess === 'lider' || projectAccess === 'administrador';
                        const canDelete = projectAccess === 'administrador';
                        return (
                          <ProjectCard 
                            key={project.id} 
                            project={project}
                            tasks={tasks.filter(t => t.projectId === project.id && isTaskVisibleForMember(t, currentMember, roles))}
                            onEdit={openEditProject}
                            onDelete={deleteProject}
                            canEdit={canEdit}
                            canDelete={canDelete}
                          />
                        );
                      })}
                      {processProjects.length === 0 && (
                        <div className="col-span-full py-8 px-8 border-2 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center text-gray-400 bg-white/50">
                          <FolderKanban size={32} className="mb-2 opacity-20" />
                          <p className="text-sm">No hay proyectos activos en este proceso</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {processes.length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-gray-400">Crea un proceso primero para poder gestionar proyectos.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div 
              key="tasks"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col h-[calc(100vh-140px)] relative"
            >
              {taskViewMode === 'board' ? (
                <div 
                  className={`flex overflow-x-auto gap-6 pb-4 h-full custom-scrollbar select-none ${
                    isBoardDragging ? 'cursor-grabbing' : 'cursor-default'
                  }`}
                  onMouseDown={(e) => {
                    if (e.button === 1) { // Middle mouse button
                      e.preventDefault();
                      setIsBoardDragging(true);
                      const container = e.currentTarget;
                      const startX = e.pageX - container.offsetLeft;
                      const scrollLeft = container.scrollLeft;

                      const onMouseMove = (moveEvent: MouseEvent) => {
                        const x = moveEvent.pageX - container.offsetLeft;
                        const walk = (x - startX) * 1.5; // Drag speed
                        container.scrollLeft = scrollLeft - walk;
                      };

                      const onMouseUp = () => {
                        setIsBoardDragging(false);
                        window.removeEventListener('mousemove', onMouseMove);
                        window.removeEventListener('mouseup', onMouseUp);
                      };

                      window.addEventListener('mousemove', onMouseMove);
                      window.addEventListener('mouseup', onMouseUp);
                    }
                  }}
                >
                  {[
                    { id: 'backlog', label: 'Product Backlog', color: 'text-slate-400', bg: 'bg-slate-50' },
                    { id: 'todo', label: 'Por Hacer', color: 'text-gray-500', bg: 'bg-gray-50' },
                    { id: 'in_progress', label: 'En Progreso', color: 'text-blue-500', bg: 'bg-blue-50' },
                    { id: 'blocked', label: 'Bloqueada', color: 'text-red-500', bg: 'bg-red-50' },
                    { id: 'review', label: 'En Revisión', color: 'text-purple-500', bg: 'bg-purple-50' },
                    { id: 'correction', label: 'Para Corrección', color: 'text-amber-500', bg: 'bg-amber-50' },
                    { id: 'done', label: 'Completada', color: 'text-green-500', bg: 'bg-green-50' },
                    { id: 'rejected', label: 'Rechazada', color: 'text-orange-500', bg: 'bg-orange-50' }
                  ].map(column => (
                    <div key={column.id} className="min-w-[320px] max-w-[320px] flex flex-col gap-4 h-full">
                      <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm sticky top-0 z-10 transition-all group">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${column.color.replace('text-', 'bg-')}`} />
                          <h3 className={`font-bold uppercase tracking-wider text-[10px] ${column.color}`}>{column.label}</h3>
                        </div>
                        <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full group-hover:bg-gray-200 transition-colors">
                          {filteredTasks.filter(t => t.status === column.id).length}
                        </span>
                      </div>
                      <div className={`flex-1 overflow-y-auto space-y-4 p-2 rounded-[2rem] ${column.bg}/30 border-2 border-dashed border-gray-100/50 hover:bg-white/40 transition-colors custom-scrollbar`}>
                        {filteredTasks.filter(t => t.status === column.id).map(task => (
                          <TaskCard 
                            key={task.id} 
                            task={task} 
                            allTasks={tasks}
                            member={members.find(m => m.id === task.memberId)} 
                            auxiliary={members.find(m => m.id === task.auxiliaryId)}
                            auxiliaries={task.auxiliaryIds ? members.filter(m => task.auxiliaryIds?.includes(m.id)) : (task.auxiliaryId ? members.filter(m => m.id === task.auxiliaryId) : [])}
                            revisor={members.find(m => m.id === task.revisorId)}
                            process={processes.find(p => p.id === task.processId)} 
                            project={projects.find(p => p.id === task.projectId)}
                            onUpdateStatus={updateTaskStatus} 
                            onEdit={openEditTask} 
                            onDelete={handleDeleteTask} 
                          />
                        ))}
                        {filteredTasks.filter(t => t.status === column.id).length === 0 && (
                          <button 
                            onClick={() => openAddTaskModal(column.id as any)}
                            className="w-full h-32 flex flex-col items-center justify-center text-gray-300 text-xs gap-3 opacity-50 hover:opacity-100 hover:bg-white/50 hover:text-blue-500 rounded-[1.5rem] transition-all border-2 border-transparent hover:border-blue-100 group"
                          >
                            <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                              <Plus size={20} />
                            </div>
                            <span className="font-bold uppercase tracking-widest text-[9px]">Añadir Tarea</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : taskViewMode === 'calendar' ? (
                <TaskCalendarView 
                  tasks={filteredTasks}
                  members={members}
                  processes={processes}
                  projects={projects}
                  onEdit={openEditTask}
                  onUpdateStatus={updateTaskStatus}
                  onAddTask={openAddTaskModal}
                />
              ) : (
                <div 
                  className={`flex-1 overflow-auto bg-white rounded-[2rem] border border-gray-100 shadow-xl custom-scrollbar mb-4 select-none ${
                    isListDragging ? 'cursor-grabbing' : 'cursor-default'
                  }`}
                  onMouseDown={(e) => {
                    if (e.button === 1) { // Middle mouse button
                      e.preventDefault();
                      setIsListDragging(true);
                      const container = e.currentTarget;
                      const startX = e.pageX - container.offsetLeft;
                      const scrollLeft = container.scrollLeft;

                      const onMouseMove = (moveEvent: MouseEvent) => {
                        const x = moveEvent.pageX - container.offsetLeft;
                        const walk = (x - startX) * 1.5; // Drag speed
                        container.scrollLeft = scrollLeft - walk;
                      };

                      const onMouseUp = () => {
                        setIsListDragging(false);
                        window.removeEventListener('mousemove', onMouseMove);
                        window.removeEventListener('mouseup', onMouseUp);
                      };

                      window.addEventListener('mousemove', onMouseMove);
                      window.addEventListener('mouseup', onMouseUp);
                    }
                  }}
                >
                  <table className="w-full text-left border-collapse min-w-[1250px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50 sticky top-0 z-20 backdrop-blur-md">
                        {/* Tarea / Descripción Column Header */}
                        <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[24%] align-top border-r border-gray-100/50">
                          <div 
                            onClick={() => handleTableSort('title')}
                            className="flex items-center gap-1.5 font-black text-gray-500 uppercase tracking-[0.15em] cursor-pointer hover:text-gray-900 transition-colors mb-2.5 group"
                          >
                            Tarea / Descripción
                            {tableSort.column === 'title' ? (
                              tableSort.direction === 'asc' ? <ArrowUp size={11} className="text-blue-600 animate-bounce" /> : <ArrowDown size={11} className="text-blue-600 animate-bounce" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 opacity-60 group-hover:opacity-100 transition-all" />
                            )}
                          </div>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                            <input
                              type="text"
                              placeholder="Buscar por nombre/desc..."
                              className="w-full pl-7.5 pr-6 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                              value={tableFilters.title}
                              onChange={(e) => setTableFilters(prev => ({ ...prev, title: e.target.value }))}
                            />
                            {tableFilters.title && (
                              <button 
                                onClick={() => setTableFilters(prev => ({ ...prev, title: '' }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        </th>

                        {/* Estado Column Header */}
                        <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[14%] align-top border-r border-gray-100/50">
                          <div 
                            onClick={() => handleTableSort('status')}
                            className="flex items-center gap-1.5 font-black text-gray-500 uppercase tracking-[0.15em] cursor-pointer hover:text-gray-900 transition-colors mb-2.5 group"
                          >
                            Estado
                            {tableSort.column === 'status' ? (
                              tableSort.direction === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 opacity-60 group-hover:opacity-100 transition-all" />
                            )}
                          </div>
                          <div className="relative">
                            <select
                              className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                              value={tableFilters.status}
                              onChange={(e) => setTableFilters(prev => ({ ...prev, status: e.target.value }))}
                            >
                              <option value="" className="font-sans font-bold">TODOS</option>
                              <option value="backlog" className="font-sans text-slate-700 font-bold">Product Backlog</option>
                              <option value="todo" className="font-sans text-gray-700 font-bold">Por Hacer</option>
                              <option value="in_progress" className="font-sans text-blue-700 font-bold">En Progreso</option>
                              <option value="blocked" className="font-sans text-red-700 font-bold">Bloqueada</option>
                              <option value="review" className="font-sans text-purple-700 font-bold">En Revisión</option>
                              <option value="correction" className="font-sans text-amber-700 font-bold">Para Corrección</option>
                              <option value="done" className="font-sans text-green-700 font-bold">Completada</option>
                              <option value="rejected" className="font-sans text-orange-700 font-bold">Rechazada</option>
                            </select>
                          </div>
                        </th>

                        {/* Proceso Column Header */}
                        <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[12%] align-top border-r border-gray-100/50">
                          <div 
                            onClick={() => handleTableSort('process')}
                            className="flex items-center gap-1.5 font-black text-gray-500 uppercase tracking-[0.15em] cursor-pointer hover:text-gray-900 transition-colors mb-2.5 group"
                          >
                            Proceso
                            {tableSort.column === 'process' ? (
                              tableSort.direction === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 opacity-60 group-hover:opacity-100 transition-all" />
                            )}
                          </div>
                          <div className="relative">
                            <select
                              className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                              value={tableFilters.processId}
                              onChange={(e) => setTableFilters(prev => ({ ...prev, processId: e.target.value }))}
                            >
                              <option value="" className="font-bold">TODOS</option>
                              {processes.map(p => (
                                <option key={p.id} value={p.id} className="font-medium">{p.name}</option>
                              ))}
                            </select>
                          </div>
                        </th>

                        {/* Proyecto Column Header */}
                        <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[12%] align-top border-r border-gray-100/50">
                          <div 
                            onClick={() => handleTableSort('project')}
                            className="flex items-center gap-1.5 font-black text-gray-500 uppercase tracking-[0.15em] cursor-pointer hover:text-gray-900 transition-colors mb-2.5 group"
                          >
                            Proyecto
                            {tableSort.column === 'project' ? (
                              tableSort.direction === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 opacity-60 group-hover:opacity-100 transition-all" />
                            )}
                          </div>
                          <div className="relative">
                            <select
                              className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                              value={tableFilters.projectId}
                              onChange={(e) => setTableFilters(prev => ({ ...prev, projectId: e.target.value }))}
                            >
                              <option value="" className="font-bold">TODOS</option>
                              {projects.map(pj => (
                                <option key={pj.id} value={pj.id} className="font-medium">{pj.name}</option>
                              ))}
                            </select>
                          </div>
                        </th>

                        {/* Responsable Column Header */}
                        <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[13%] align-top border-r border-gray-100/50">
                          <div 
                            onClick={() => handleTableSort('member')}
                            className="flex items-center gap-1.5 font-black text-gray-500 uppercase tracking-[0.15em] cursor-pointer hover:text-gray-900 transition-colors mb-2.5 group"
                          >
                            Responsable
                            {tableSort.column === 'member' ? (
                              tableSort.direction === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 opacity-60 group-hover:opacity-100 transition-all" />
                            )}
                          </div>
                          <div className="relative">
                            <select
                              className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                              value={tableFilters.memberId}
                              onChange={(e) => setTableFilters(prev => ({ ...prev, memberId: e.target.value }))}
                            >
                              <option value="" className="font-bold">TODOS</option>
                              {sortedMembers.map(m => (
                                <option key={m.id} value={m.id} className="font-medium">{m.name}</option>
                              ))}
                            </select>
                          </div>
                        </th>

                        {/* Auxiliar Column Header */}
                        <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[13%] align-top border-r border-gray-100/50">
                          <div 
                            onClick={() => handleTableSort('auxiliary')}
                            className="flex items-center gap-1.5 font-black text-gray-500 uppercase tracking-[0.15em] cursor-pointer hover:text-gray-900 transition-colors mb-2.5 group"
                          >
                            Auxiliar
                            {tableSort.column === 'auxiliary' ? (
                              tableSort.direction === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 opacity-60 group-hover:opacity-100 transition-all" />
                            )}
                          </div>
                          <div className="relative">
                            <select
                              className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                              value={tableFilters.auxiliaryId}
                              onChange={(e) => setTableFilters(prev => ({ ...prev, auxiliaryId: e.target.value }))}
                            >
                              <option value="" className="font-bold">TODOS</option>
                              {sortedMembers.map(m => (
                                <option key={m.id} value={m.id} className="font-medium">{m.name}</option>
                              ))}
                            </select>
                          </div>
                        </th>

                        {/* Revisor Column Header */}
                        <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[13%] align-top border-r border-gray-100/50">
                          <div 
                            onClick={() => handleTableSort('revisor')}
                            className="flex items-center gap-1.5 font-black text-gray-500 uppercase tracking-[0.15em] cursor-pointer hover:text-gray-900 transition-colors mb-2.5 group"
                          >
                            Revisor
                            {tableSort.column === 'revisor' ? (
                              tableSort.direction === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 opacity-60 group-hover:opacity-100 transition-all" />
                            )}
                          </div>
                          <div className="relative">
                            <select
                              className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                              value={tableFilters.revisorId || ''}
                              onChange={(e) => setTableFilters(prev => ({ ...prev, revisorId: e.target.value }))}
                            >
                              <option value="" className="font-bold">TODOS</option>
                              {sortedMembers.map(m => (
                                <option key={m.id} value={m.id} className="font-medium">{m.name}</option>
                              ))}
                            </select>
                          </div>
                        </th>

                        {/* Plan/Real Column Header */}
                        <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[8%] align-top border-r border-gray-100/50">
                          <div 
                            onClick={() => handleTableSort('hours')}
                            className="flex items-center gap-1.5 font-black text-gray-500 uppercase tracking-[0.15em] cursor-pointer hover:text-gray-900 transition-colors mb-2.5 group"
                          >
                            Horas
                            {tableSort.column === 'hours' ? (
                              tableSort.direction === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 opacity-60 group-hover:opacity-100 transition-all" />
                            )}
                          </div>
                          <div className="text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-2 select-none">
                            Real/Pl.
                          </div>
                        </th>

                        {/* Límite Column Header */}
                        <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[8%] align-top border-r border-gray-100/50">
                          <div 
                            onClick={() => handleTableSort('dueDate')}
                            className="flex items-center gap-1.5 font-black text-gray-500 uppercase tracking-[0.15em] cursor-pointer hover:text-gray-900 transition-colors mb-2.5 group"
                          >
                            Límite
                            {tableSort.column === 'dueDate' ? (
                              tableSort.direction === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300 opacity-60 group-hover:opacity-100 transition-all" />
                            )}
                          </div>
                          <div className="text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-2 select-none">
                            Entrega
                          </div>
                        </th>

                        {/* Acción Column Header */}
                        <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[7%] text-right align-top">
                          <div className="font-black text-gray-500 uppercase tracking-[0.15em] mb-3 pr-1.5">
                            Acción
                          </div>
                          {(tableFilters.title || tableFilters.status || tableFilters.processId || tableFilters.projectId || tableFilters.memberId || tableFilters.auxiliaryId || tableFilters.revisorId || tableSort.column) ? (
                            <button
                              onClick={() => {
                                setTableFilters({
                                  title: '',
                                  status: '',
                                  processId: '',
                                  projectId: '',
                                  memberId: '',
                                  auxiliaryId: '',
                                  revisorId: '',
                                });
                                setTableSort({
                                  column: null,
                                  direction: null,
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200/50 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                              title="Restablecer todos los filtros"
                            >
                              <X size={10} />
                              Reset
                            </button>
                          ) : (
                            <div className="text-[8px] text-gray-300 font-black uppercase tracking-widest py-1 mt-1 pr-1.5 leading-none select-none">
                              Acción
                            </div>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedTasks.map(task => {
                        const member = members.find(m => m.id === task.memberId);
                        const auxiliary = members.find(m => m.id === task.auxiliaryId);
                        const taskAuxiliaries = task.auxiliaryIds ? members.filter(m => task.auxiliaryIds?.includes(m.id)) : (auxiliary ? [auxiliary] : []);
                        const process = processes.find(p => p.id === task.processId);
                        const project = projects.find(p => p.id === task.projectId);
                        
                        return (
                          <tr key={task.id} className="hover:bg-gray-50/50 transition-colors group">
                            {/* Tarea Cell */}
                            <td className="px-6 py-4.5 align-middle">
                              <div 
                                onClick={() => openEditTask(task)}
                                className="font-black text-gray-900 leading-snug cursor-pointer hover:text-blue-600 transition-colors text-sm mb-0.5 line-clamp-2"
                                title="Haga clic para editar"
                              >
                                {task.title}
                              </div>
                              <p className="text-xs text-gray-400 line-clamp-1 max-w-[280px]" title={task.description}>
                                {task.description || 'Sin descripción'}
                              </p>
                            </td>
                            
                            {/* Estado Inline Selector Cell */}
                            <td className="px-6 py-4.5 align-middle">
                              <select
                                value={task.status}
                                onChange={(e) => updateTaskStatus(task.id, e.target.value as any)}
                                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl border-2 border-transparent hover:border-black/5 transition-all cursor-pointer font-sans focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                                  task.status === 'done' ? 'bg-green-100 text-green-700' :
                                  task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                  task.status === 'blocked' ? 'bg-red-100 text-red-700' :
                                  task.status === 'review' ? 'bg-purple-100 text-purple-700' :
                                  task.status === 'correction' ? 'bg-amber-100 text-amber-700' :
                                  task.status === 'backlog' ? 'bg-slate-100 text-slate-700' :
                                  task.status === 'todo' ? 'bg-gray-100 text-gray-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}
                              >
                                <option value="backlog">Product Backlog</option>
                                <option value="todo">Por Hacer</option>
                                <option value="in_progress">En Progreso</option>
                                <option value="blocked">Bloqueada</option>
                                <option value="review">En Revisión</option>
                                <option value="correction">Para Corrección</option>
                                <option value="done">Completada</option>
                                <option value="rejected">Rechazada</option>
                              </select>
                            </td>
                            
                            {/* Proceso Cell */}
                            <td className="px-6 py-4.5 align-middle">
                              {process ? (
                                <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 bg-gray-100/75 px-2.5 py-1 rounded-lg">
                                  {process.name}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300 italic">No asignado</span>
                              )}
                            </td>
                            
                            {/* Proyecto Cell */}
                            <td className="px-6 py-4.5 align-middle">
                              {project ? (
                                <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                                  {project.name}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300 italic">No asignado</span>
                              )}
                            </td>
                            
                            {/* Responsable Cell */}
                            <td className="px-6 py-4.5 align-middle">
                              {member ? (
                                <div className="flex items-center gap-2">
                                  <img 
                                    src={member.avatar || `https://picsum.photos/seed/${member.name.replace(/\s/g, '')}/54/54`}
                                    className="w-6.5 h-6.5 rounded-lg object-cover"
                                    alt={member.name}
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-900 leading-none">{member.name}</span>
                                    <span className="text-[9px] text-gray-400 font-semibold">{member.role}</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Sin asignar</span>
                              )}
                            </td>
                            
                            {/* Auxiliar Cell */}
                            <td className="px-6 py-4.5 align-middle">
                              {taskAuxiliaries.length > 0 ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex -space-x-2 overflow-hidden py-1">
                                    {taskAuxiliaries.slice(0, 3).map((aux, aIdx) => (
                                      <img 
                                        key={aux.id}
                                        src={aux.avatar || `https://picsum.photos/seed/${aux.name.replace(/\s/g, '')}/54/54`}
                                        className="w-7 h-7 rounded-lg object-cover ring-2 ring-white hover:z-10 hover:scale-105 transition-all"
                                        alt={aux.name}
                                        title={aux.name}
                                        referrerPolicy="no-referrer"
                                      />
                                    ))}
                                    {taskAuxiliaries.length > 3 && (
                                      <div className="w-7 h-7 rounded-lg bg-gray-100 ring-2 ring-white flex items-center justify-center text-[10px] font-black text-gray-600">
                                        +{taskAuxiliaries.length - 3}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col max-w-[120px]">
                                    <span className="text-[11px] font-bold text-gray-700 truncate" title={taskAuxiliaries.map(a => a.name).join(', ')}>
                                      {taskAuxiliaries.slice(0, 2).map(a => a.name.split(' ')[0]).join(' + ')}
                                      {taskAuxiliaries.length > 2 ? ` + ${taskAuxiliaries.length - 2}` : ''}
                                    </span>
                                    <span className="text-[9px] text-gray-400 font-semibold">{taskAuxiliaries.length === 1 ? 'Auxiliar' : 'Auxiliares'}</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300 font-medium">-</span>
                              )}
                            </td>

                            {/* Revisor Cell */}
                            <td className="px-6 py-4.5 align-middle">
                              {(() => {
                                const rev = members.find(m => m.id === task.revisorId);
                                return rev ? (
                                  <div className="flex items-center gap-2">
                                    <img 
                                      src={rev.avatar || `https://picsum.photos/seed/${rev.name.replace(/\s/g, '')}/54/54`}
                                      className="w-6.5 h-6.5 rounded-lg object-cover ring-2 ring-emerald-500/10"
                                      alt={rev.name}
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-gray-900 leading-none">{rev.name}</span>
                                      <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-tight">{rev.role}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">No asignado</span>
                                );
                              })()}
                            </td>
                            
                            {/* Horas Cell */}
                            <td className="px-6 py-4.5 align-middle font-mono text-xs text-gray-700">
                              <div className="flex flex-col">
                                <div className="flex items-baseline gap-0.5">
                                  <span className="font-black text-gray-900">{task.actualHours || 0}h</span>
                                  <span className="text-gray-400 text-[10px]">/{task.plannedHours || 0}h</span>
                                </div>
                                <span className="text-[8px] text-gray-400 font-black uppercase tracking-wider">Real / Plan</span>
                              </div>
                            </td>
                            
                            {/* Fecha Límite Cell */}
                            <td className="px-6 py-4.5 align-middle text-xs font-black text-gray-900">
                              {task.dueDate ? (
                                <span className="uppercase text-xs font-black">
                                  {parseLocalDate(task.dueDate)?.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                </span>
                              ) : (
                                <span className="text-gray-300 font-medium">Sin fecha</span>
                              )}
                            </td>
                            
                            {/* Acciones Cell */}
                            <td className="px-6 py-4.5 align-middle text-right">
                              <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openEditTask(task)}
                                  className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
                                  title="Editar"
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                                  title="Eliminar"
                                >
                                  <Trash size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {sortedTasks.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                            No hay tareas asociadas que coincidan con los filtros
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'planner' && (
            <motion.div 
              key="planner"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-5xl mx-auto space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Input Section */}
                <div className="lg:col-span-12">
                  <div className="bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Calendar size={120} />
                    </div>
                    
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                          <MessageSquare size={24} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">Planificación Semanal con IA</h2>
                          <p className="text-gray-500 text-sm">Habla o escribe tus planes para que Gemini sugiera actividades accionables.</p>
                        </div>
                      </div>

                      <div className="relative">
                        <textarea 
                          className="w-full h-48 p-6 bg-gray-50 border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all resize-none text-gray-700 leading-relaxed text-lg"
                          placeholder="Ej: Esta semana quiero lanzar el nuevo dashboard, Elena se encargará del frontend y Lucas del SEO..."
                          value={plannerInput}
                          onChange={(e) => setPlannerInput(e.target.value)}
                        />
                        
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                          <button 
                            onClick={toggleRecording}
                            className={`p-4 rounded-full transition-all shadow-lg flex items-center justify-center ${
                              isRecording 
                              ? 'bg-red-500 text-white animate-pulse' 
                              : 'bg-white text-blue-600 border border-blue-100 hover:bg-blue-50'
                            }`}
                            title={isRecording ? 'Detener Grabación' : 'Iniciar Grabación de Voz'}
                          >
                            {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
                          </button>
                          
                          <button 
                            onClick={handlePlanningAnalysis}
                            disabled={!plannerInput.trim() || isPlanning}
                            className={`px-8 py-4 bg-[#2563EB] text-white font-bold rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                              (!plannerInput.trim() || isPlanning) ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-blue-200'
                            }`}
                          >
                            {isPlanning ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Analizando...
                              </>
                            ) : (
                              <>
                                Generar Actividades
                                <Sparkles size={20} />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Suggestions Section */}
                <div className="lg:col-span-12">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                      <ListTodo size={18} className="text-[#2563EB]" />
                      Actividades Sugeridas ({suggestedActivities.length})
                    </h3>
                  </div>

                  {suggestedActivities.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-[#E5E7EB] text-center space-y-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-300">
                        <Sparkles size={32} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">No hay sugerencias aún</h4>
                        <p className="text-sm text-gray-400 max-w-xs mx-auto">Escribe o graba tus planes arriba para ver cómo Gemini los organiza en tareas.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {suggestedActivities.map((activity) => (
                        <motion.div 
                          key={activity.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-all group border-l-4 border-l-blue-500"
                        >
                          <div className="flex justify-between items-start mb-3">
                            {activity.suggestedDay && (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                                {activity.suggestedDay}
                              </span>
                            )}
                            <div className="flex gap-2">
                              {activity.memberId && (
                                <img 
                                  src={members.find(m => m.id === activity.memberId)?.avatar} 
                                  className="w-6 h-6 rounded-full border border-gray-100" 
                                  title={members.find(m => m.id === activity.memberId)?.name}
                                />
                              )}
                              {activity.processId && (
                                <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 text-[10px] font-bold">
                                  {processes.find(p => p.id === activity.processId)?.name.charAt(0)}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <h4 className="font-bold text-gray-900 mb-2">{activity.title}</h4>
                          <p className="text-sm text-gray-600 line-clamp-3 mb-6 flex-1">
                            {activity.description}
                          </p>

                          <div className="flex gap-2">
                            <button 
                              onClick={() => createActivityAsTask(activity)}
                              className="flex-1 py-3 bg-gray-50 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 hover:text-white transition-all border border-gray-100"
                            >
                              <Plus size={18} />
                              Crear como Tarea
                            </button>
                            <button 
                              onClick={() => deleteSuggestedActivity(activity.id)}
                              className="px-4 py-3 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-gray-100"
                              title="Borrar sugerencia"
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              {settingsSubTab === 'general' && (
                <div className="bg-white p-12 rounded-[3rem] border border-[#E5E7EB] shadow-xl text-center space-y-6">
                  <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto text-blue-600 shadow-inner">
                    <Settings size={48} className="animate-[spin_10s_linear_infinite]" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 mb-2">Configuración del Sistema</h2>
                    <p className="text-gray-500 max-w-sm mx-auto font-medium">Personaliza los parámetros globales de Novagreen IA y gestiona las integraciones de Gemini.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-left group hover:bg-white hover:shadow-md transition-all cursor-not-allowed opacity-60">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 mb-4 shadow-sm">
                        <BrainCircuit size={20} />
                      </div>
                      <h4 className="font-bold text-gray-800 mb-1">Modelo de IA</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gemini 1.5 Flash</p>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-left group hover:bg-white hover:shadow-md transition-all cursor-not-allowed opacity-60">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 mb-4 shadow-sm">
                        <Zap size={20} />
                      </div>
                      <h4 className="font-bold text-gray-800 mb-1">Frecuencia de Análisis</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tiempo Real (Streaming)</p>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-100">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Módulo de Configuración v1.0.4</p>
                  </div>
                </div>
              )}

              {settingsSubTab === 'roles' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-white p-6 rounded-[2.5rem] border border-[#E5E7EB] shadow-xl space-y-5 flex flex-col h-[75vh]">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <Users size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-gray-900 leading-tight">Integrantes del Equipo</h2>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Ajuste de permisos</p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                        <Search size={16} className="text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Buscar integrante..."
                          value={permSearch}
                          onChange={(e) => setPermSearch(e.target.value)}
                          className="bg-transparent border-none outline-none text-xs font-bold text-gray-700 w-full placeholder:text-gray-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                      {(() => {
                        const filtered = sortedMembers.filter(m => {
                          if (!m.name) return false;
                          const isMember = (m.categories || []).includes('miembro');
                          return isMember && normalizeText(m.name).includes(normalizeText(permSearch));
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-8 text-gray-400 font-medium text-xs">
                              No se encontraron integrantes
                            </div>
                          );
                        }

                        return filtered.map((member) => {
                          const isAdmin = member.isSystemAdmin || member.systemRoleId === 'role-admin';
                          const isSelected = selectedMemberId ? selectedMemberId === member.id : member.id === filtered[0]?.id;
                          const processName = processes.find(p => p.id === member.processId)?.name || 'Sin Proceso';

                          return (
                            <button
                              key={member.id}
                              onClick={() => handleMemberClick(member.id)}
                              className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between group ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                                  : 'bg-gray-50 border-transparent text-gray-800 hover:bg-white hover:border-gray-100 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img 
                                  src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`} 
                                  className="w-9 h-9 rounded-xl object-cover flex-shrink-0" 
                                  alt={member.name}
                                />
                                <div className="min-w-0">
                                  <p className={`text-xs font-black truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                    {member.name}
                                  </p>
                                  <p className={`text-[9px] uppercase font-bold tracking-wider truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {member.role || 'Sin Cargo'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isAdmin ? (
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600'
                                  }`}>
                                    Admin
                                  </span>
                                ) : (
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                    isSelected ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-600'
                                  }`}>
                                    Custom
                                  </span>
                                )}
                                <ChevronRight size={12} className={isSelected ? 'text-white' : 'text-gray-300'} />
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div className="lg:col-span-2 bg-white p-8 md:p-10 rounded-[2.5rem] border border-[#E5E7EB] shadow-2xl relative overflow-hidden h-[75vh] overflow-y-auto custom-scrollbar">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
                    
                    {(() => {
                      const filteredMembers = sortedMembers.filter(m => (m.categories || []).includes('miembro'));
                      const member = sortedMembers.find(m => m.id === selectedMemberId) || filteredMembers[0];
                      
                      if (!member) {
                        return (
                          <div className="text-center py-20 text-gray-400 font-medium text-sm">
                            Por favor, agrega un miembro al equipo en la pestaña "Equipo" para poder configurar sus permisos.
                          </div>
                        );
                      }
                      
                      const processName = processes.find(p => p.id === member.processId)?.name || 'Sin Proceso Asignado';

                      return (
                        <div className="space-y-8 relative z-10">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                            <div className="flex items-center gap-4">
                              <img 
                                src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`} 
                                alt={member.name} 
                                className="w-16 h-16 rounded-2xl object-cover shadow-sm border-2 border-slate-50 flex-shrink-0" 
                              />
                              <div className="min-w-0">
                                <h3 className="text-xl font-black text-gray-900 leading-tight truncate">{member.name}</h3>
                                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                  <User size={12} className="text-blue-500" /> {member.role || 'Sin Cargo'}
                                </p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                  Proceso: <span className="text-slate-700">{processName}</span>
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-50 border border-blue-100 px-4 py-2.5 rounded-2xl text-center flex flex-col justify-center hidden sm:flex">
                                <span className="text-[8px] font-black uppercase text-blue-500 tracking-widest mb-0.5">Tipo de Cuenta</span>
                                <span className={`text-xs font-black uppercase ${draftIsSystemAdmin ? 'text-red-600' : 'text-blue-600'}`}>
                                  {draftIsSystemAdmin ? 'Administrador' : 'Acceso Personalizado'}
                                </span>
                              </div>
                              
                              <div>
                                {hasUnsavedPermissionsChanges ? (
                                  <button
                                    type="button"
                                    onClick={() => savePermissions(member.id)}
                                    className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-green-100 hover:shadow-green-200 transition-all flex items-center gap-2"
                                  >
                                    <Save size={14} className="animate-pulse" /> Guardar permisos
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    className="px-5 py-3 bg-slate-100 text-slate-400 text-[10px] font-semibold uppercase tracking-wider rounded-2xl flex items-center gap-2 cursor-not-allowed"
                                  >
                                    <Check size={14} /> Guardar permisos
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Global Role Select Card */}
                          <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                            <div>
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Shield size={14} className={draftIsSystemAdmin ? 'text-red-500' : 'text-blue-500'} /> Configuración de Rol Global
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-1 font-semibold leading-relaxed">
                                Determina si este integrante tiene privilegios ilimitados de administración en todo el sistema.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setDraftIsSystemAdmin(true);
                                }}
                                className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                                  draftIsSystemAdmin 
                                    ? 'bg-white border-red-500 ring-2 ring-red-50 text-slate-800 shadow-sm'
                                    : 'bg-white/40 border-slate-200 text-slate-400 hover:bg-white hover:border-slate-300 hover:text-slate-600'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <div className={`p-1 rounded ${draftIsSystemAdmin ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <Shield size={12} />
                                  </div>
                                  <span className="font-extrabold text-[10px] uppercase tracking-wider">Administrador Global</span>
                                </div>
                                <p className="text-[9px] font-bold leading-relaxed text-slate-400">
                                  Acceso total para hacer y deshacer. Control operativo en todos los módulos sin restricciones.
                                </p>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setDraftIsSystemAdmin(false);
                                  if (Object.keys(draftModuleAccess || {}).length === 0) {
                                    setDraftModuleAccess(member.moduleAccess || {
                                      dashboard: 'lector',
                                      tasks: 'colaborador',
                                      planner: 'lector',
                                      projects: 'ninguno',
                                      directory: 'lector',
                                      transcript: 'lector',
                                      settings: 'ninguno'
                                    });
                                  }
                                }}
                                className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                                  !draftIsSystemAdmin 
                                    ? 'bg-white border-blue-500 ring-2 ring-blue-50 text-slate-800 shadow-sm'
                                    : 'bg-white/40 border-slate-200 text-slate-400 hover:bg-white hover:border-slate-300 hover:text-slate-600'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <div className={`p-1 rounded ${!draftIsSystemAdmin ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <Settings size={12} />
                                  </div>
                                  <span className="font-extrabold text-[10px] uppercase tracking-wider">Acceso por Módulos</span>
                                </div>
                                <p className="text-[9px] font-bold leading-relaxed text-slate-400">
                                  Matriz de permisos granulados. El usuario puede tener privilegios únicos por módulo del sistema.
                                </p>
                              </button>
                            </div>
                          </div>

                          {/* Module access matrix */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Lock size={12} className="text-blue-500" /> Matriz de Niveles de Acceso por Módulo
                              </h4>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                Define el perfil de permisos operativos (Ninguno, Lector, Colaborador, Líder o Administrador) para cada área.
                              </p>
                            </div>

                            {draftIsSystemAdmin ? (
                              <div className="p-6 bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl text-center space-y-2">
                                <Shield size={32} className="mx-auto text-amber-500" />
                                <div>
                                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Modo Administrador Global Activo</h5>
                                  <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed font-semibold">
                                    Este integrante posee acceso sin límites para "hacer y deshacer". Todos los módulos se encuentran asignados a nivel total.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-slate-100">
                                {/* Desktop Table Headers */}
                                <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50/75 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  <div className="col-span-5 flex items-center">Módulo o Área del Sistema</div>
                                  <div className="col-span-7 flex justify-end pr-8">Nivel de Acceso Asignado</div>
                                </div>

                                {[
                                  { id: 'dashboard', name: 'Resumen o Dashboard', desc: 'Panel de control con métricas generales del equipo.', icon: <TrendingUp size={16} /> },
                                  { id: 'tasks', name: 'Seguimiento de Tareas', desc: 'Permisos de tareas gestionados individualmente para cada proceso específico.', icon: <CheckCircle2 size={16} />, isTasksParent: true },
                                  { id: 'planner', name: 'Planificador Inteligente IA', desc: 'Planificación inteligente asistida por modelos Gemini.', icon: <Calendar size={16} /> },
                                  { id: 'projects', name: 'Gestión de Proyectos', desc: 'Administración de campañas y portafolio de proyectos.', icon: <FolderKanban size={16} />, isProjectsParent: true },
                                  { id: 'process_dashboard', name: 'Gestión XD (Procesos)', desc: 'Administración y seguimiento de horas, enlaces, bases y minutas por proceso.', icon: <Activity size={16} />, isProcessDashboardParent: true },
                                  { id: 'directory', name: 'Directorio de Contactos', desc: 'Información técnica de contactos y ficha de integrante.', icon: <Contact size={16} /> },
                                  { id: 'transcript', name: 'Analizador de Minutas IA', desc: 'Procesamiento de audios de reuniones and minutas.', icon: <Sparkles size={16} /> },
                                  { id: 'settings', name: 'Configuración y Procesos', desc: 'Permisos de equipo y control administrativo general.', icon: <Settings size={16} /> },
                                ].map(mod => {
                                  const currentAccessVal = draftModuleAccess[mod.id] || 'ninguno';

                                  return (
                                    <div key={mod.id} className="p-5 md:px-6 md:py-4 bg-white hover:bg-slate-50/20 transition-all">
                                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                        {/* Left side info */}
                                        <div className="md:col-span-5 flex items-start gap-3">
                                          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
                                            {mod.icon}
                                          </div>
                                          <div className="min-w-0 pr-2">
                                            <h5 className="text-[11px] font-black text-slate-800 leading-tight uppercase tracking-wider">{mod.name}</h5>
                                            <p className="text-[9px] text-slate-400 mt-0.5 leading-snug font-semibold">{mod.desc}</p>
                                          </div>
                                        </div>

                                        {/* Right side selector */}
                                        <div className="md:col-span-7 flex justify-end w-full">
                                          {mod.id === 'tasks' || mod.id === 'projects' || mod.id === 'process_dashboard' ? (
                                             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm select-none">
                                               <Sparkles size={11} className="text-blue-500 animate-pulse" /> Resuelto por Proceso
                                             </div>
                                           ) : (
                                             <div className="flex bg-slate-100 p-0.5 rounded-xl w-full max-w-md gap-0.5 border border-slate-200/40">
                                            {[
                                              { val: 'ninguno', label: 'Ninguno' },
                                              { val: 'lector', label: 'Lector' },
                                              { val: 'colaborador', label: 'Colab.' },
                                              { val: 'lider', label: 'Líder' },
                                              { val: 'administrador', label: 'Admin.' }
                                            ].map(opt => {
                                              const isSelected = currentAccessVal === opt.val;
                                              return (
                                                <button
                                                  key={opt.val}
                                                  type="button"
                                                  onClick={() => {
                                                    setDraftModuleAccess(prev => ({
                                                      ...prev,
                                                      [mod.id]: opt.val as any
                                                    }));
                                                  }}
                                                  className={`flex-1 text-center py-2 px-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                    isSelected
                                                      ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                        opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                        opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                        opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                        'bg-green-600 text-white shadow-sm'
                                                      : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                  }`}
                                                >
                                                  {opt.label}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        )}</div>
                                      </div>

                                      {/* If it's the tasks parent module, render process permissions underneath */}
                                      {mod.isTasksParent && (
                                        <div className="mt-3.5 border-t border-dashed border-slate-100 pt-3">
                                          <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                              <Sparkles size={11} className="text-blue-500" /> Permisos por Proceso Activo
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-400 italic">
                                              * Los integrantes heredarán acceso a la sección de Tareas de acuerdo al rol configurado en cada proceso.
                                            </span>
                                          </div>

                                          {true && (
                                            <div className="mt-3.5 pl-4 pr-1.5 py-3.5 bg-slate-50/50 border border-slate-200/50 border-dashed rounded-xl space-y-3">
                                              {/* Tareas Sin Proceso Asignado */}
                                              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border-b border-dashed border-slate-200/60 pb-3">
                                                <div className="md:col-span-5 flex items-center gap-2">
                                                  <span className="text-slate-400 font-bold text-xs">↳</span>
                                                  <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">Tareas Sin Proceso o sin Asignar</span>
                                                      <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-200/50 py-0.5 px-1.5 rounded font-black uppercase tracking-wider flex-shrink-0">Global / General</span>
                                                    </div>
                                                    <span className="text-[8px] text-slate-400 font-bold leading-normal mt-0.5">Controla el acceso de las personas a tareas que no tienen un proceso o asignado específico</span>
                                                  </div>
                                                </div>
                                                <div className="md:col-span-7 flex justify-end w-full">
                                                  <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full max-w-sm gap-0.5">
                                                    {[
                                                      { val: 'ninguno', label: 'Ninguno' },
                                                      { val: 'lector', label: 'Lector' },
                                                      { val: 'colaborador', label: 'Colab.' },
                                                      { val: 'lider', label: 'Líder' },
                                                      { val: 'administrador', label: 'Admin.' }
                                                    ].map(opt => {
                                                      const isSelected = (draftModuleAccess['tasks'] || 'ninguno') === opt.val;
                                                      return (
                                                        <button
                                                          key={opt.val}
                                                          type="button"
                                                          onClick={() => {
                                                            setDraftModuleAccess(prev => ({
                                                              ...prev,
                                                              tasks: opt.val as any
                                                            }));
                                                          }}
                                                          className={`flex-1 text-center py-1.5 px-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                            isSelected
                                                              ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                                opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                                opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                                opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                                'bg-green-600 text-white shadow-sm'
                                                              : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                          }`}
                                                        >
                                                          {opt.label}
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              </div>

                                              {processes.length === 0 ? (
                                                <p className="text-[10px] text-slate-400 font-semibold italic pl-2">No hay procesos registrados para configurar.</p>
                                              ) : (
                                                processes.map(proc => {
                                                  const procModId = `tasks_${proc.id}`;
                                                  const currentProcAccessVal = draftModuleAccess[procModId] || 'ninguno';

                                                  return (
                                                    <div key={proc.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                                      <div className="md:col-span-5 flex items-center gap-2">
                                                        <span className="text-slate-400 font-bold text-xs">↳</span>
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">{proc.name}</span>
                                                          <span className="text-[8px] bg-slate-200/50 text-slate-500 py-0.5 px-1.5 rounded font-black uppercase tracking-wider flex-shrink-0">Proceso</span>
                                                        </div>
                                                      </div>
                                                      <div className="md:col-span-7 flex justify-end w-full">
                                                        <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full max-w-sm gap-0.5">
                                                          {[
                                                            { val: 'ninguno', label: 'Ninguno' },
                                                            { val: 'lector', label: 'Lector' },
                                                            { val: 'colaborador', label: 'Colab.' },
                                                            { val: 'lider', label: 'Líder' },
                                                            { val: 'administrador', label: 'Admin.' }
                                                          ].map(opt => {
                                                            const isSelected = currentProcAccessVal === opt.val;
                                                            return (
                                                              <button
                                                                key={opt.val}
                                                                type="button"
                                                                onClick={() => {
                                                                  setDraftModuleAccess(prev => ({
                                                                    ...prev,
                                                                    [procModId]: opt.val as any
                                                                  }));
                                                                }}
                                                                className={`flex-1 text-center py-1.5 px-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                                  isSelected
                                                                    ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                                      opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                                      opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                                      opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                                      'bg-green-600 text-white shadow-sm'
                                                                    : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                                }`}
                                                              >
                                                                {opt.label}
                                                              </button>
                                                            );
                                                          })}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  );
                                                })
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* If it's the process_dashboard parent module, render process permissions underneath */}
                                      {mod.isProcessDashboardParent && (
                                        <div className="mt-3.5 border-t border-dashed border-slate-100 pt-3">
                                          <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                              <Sparkles size={11} className="text-blue-500" /> Permisos de Gestión XD por Proceso Activo
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-400 italic">
                                              * Los integrantes heredarán acceso a la sección de Gestión XD de acuerdo al rol configurado en cada proceso.
                                            </span>
                                          </div>

                                          <div className="mt-3.5 pl-4 pr-1.5 py-3.5 bg-slate-50/50 border border-slate-200/50 border-dashed rounded-xl space-y-3">
                                            {processes.length === 0 ? (
                                              <p className="text-[10px] text-slate-400 font-semibold italic pl-2">No hay procesos registrados para configurar.</p>
                                            ) : (
                                              processes.map(proc => {
                                                const procModId = `process_dashboard_${proc.id}`;
                                                const currentProcAccessVal = draftModuleAccess[procModId] || 'ninguno';

                                                return (
                                                  <div key={proc.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                                    <div className="md:col-span-5 flex items-center gap-2">
                                                      <span className="text-slate-400 font-bold text-xs">↳</span>
                                                      <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">{proc.name}</span>
                                                        <span className="text-[8px] bg-slate-200/50 text-slate-500 py-0.5 px-1.5 rounded font-black uppercase tracking-wider flex-shrink-0">Proceso</span>
                                                      </div>
                                                    </div>
                                                    <div className="md:col-span-7 flex justify-end w-full">
                                                      <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full max-w-sm gap-0.5">
                                                        {[
                                                          { val: 'ninguno', label: 'Ninguno' },
                                                          { val: 'lector', label: 'Lector' },
                                                          { val: 'colaborador', label: 'Colab.' },
                                                          { val: 'lider', label: 'Líder' },
                                                          { val: 'administrador', label: 'Admin.' }
                                                        ].map(opt => {
                                                          const isSelected = currentProcAccessVal === opt.val;
                                                          return (
                                                            <button
                                                              key={opt.val}
                                                              type="button"
                                                              onClick={() => {
                                                                setDraftModuleAccess(prev => ({
                                                                  ...prev,
                                                                  [procModId]: opt.val as any
                                                                }));
                                                              }}
                                                              className={`flex-1 text-center py-1.5 px-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                                isSelected
                                                                  ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                                    opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                                    opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                                    opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                                    'bg-green-600 text-white shadow-sm'
                                                                  : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                              }`}
                                                            >
                                                              {opt.label}
                                                            </button>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* If it's the projects parent module, render process permissions underneath */}
                                      {mod.isProjectsParent && (
                                        <div className="mt-3.5 border-t border-dashed border-slate-100 pt-3">
                                          <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                              <Sparkles size={11} className="text-blue-500" /> Permisos de Proyectos por Proceso Activo
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-400 italic">
                                              * Los integrantes heredarán acceso a la sección de Proyectos de acuerdo al rol configurado en cada proceso.
                                            </span>
                                          </div>

                                          {true && (
                                            <div className="mt-3.5 pl-4 pr-1.5 py-3.5 bg-slate-50/50 border border-slate-200/50 border-dashed rounded-xl space-y-3">

                                              {processes.length === 0 ? (
                                                <p className="text-[10px] text-slate-400 font-semibold italic pl-2">No hay procesos registrados para configurar.</p>
                                              ) : (
                                                processes.map(proc => {
                                                  const procModId = `projects_${proc.id}`;
                                                  const currentProcAccessVal = draftModuleAccess[procModId] || 'ninguno';

                                                  return (
                                                    <div key={proc.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                                      <div className="md:col-span-5 flex items-center gap-2">
                                                        <span className="text-slate-400 font-bold text-xs">↳</span>
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">{proc.name}</span>
                                                          <span className="text-[8px] bg-slate-200/50 text-slate-500 py-0.5 px-1.5 rounded font-black uppercase tracking-wider flex-shrink-0">Proceso</span>
                                                        </div>
                                                      </div>
                                                      <div className="md:col-span-7 flex justify-end w-full">
                                                        <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full max-w-sm gap-0.5">
                                                          {[
                                                            { val: 'ninguno', label: 'Ninguno' },
                                                            { val: 'lector', label: 'Lector' },
                                                            { val: 'colaborador', label: 'Colab.' },
                                                            { val: 'lider', label: 'Líder' },
                                                            { val: 'administrador', label: 'Admin.' }
                                                          ].map(opt => {
                                                            const isSelected = currentProcAccessVal === opt.val;
                                                            return (
                                                              <button
                                                                key={opt.val}
                                                                type="button"
                                                                onClick={() => {
                                                                  setDraftModuleAccess(prev => ({
                                                                    ...prev,
                                                                    [procModId]: opt.val as any
                                                                  }));
                                                                }}
                                                                className={`flex-1 text-center py-1.5 px-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                                  isSelected
                                                                    ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                                      opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                                      opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                                      opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                                      'bg-green-600 text-white shadow-sm'
                                                                    : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                                }`}
                                                              >
                                                                {opt.label}
                                                              </button>
                                                            );
                                                          })}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  );
                                                })
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {hasUnsavedPermissionsChanges && (
                            <div className="sticky bottom-0 left-0 right-0 py-3.5 px-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-4 shadow-2xl z-20 animate-fade-in-up mt-6">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-slate-800 text-amber-500 rounded-lg animate-pulse">
                                  <Sparkles size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-wide">Cambios sin guardar</p>
                                  <p className="text-[9px] font-bold text-slate-400 truncate">Tienes modificaciones de permisos pendientes en {member.name}.</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLastInitializedMemberId('');
                                  }}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                                >
                                  Descartar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => savePermissions(member.id)}
                                  className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-1.5"
                                >
                                  <Save size={12} /> Guardar permisos
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {settingsSubTab === 'processes' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between bg-white p-8 rounded-[3rem] border border-[#E5E7EB] shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-ng-lime/10 text-ng-green rounded-2xl">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-ng-black">Gestión de Procesos</h2>
                        <p className="text-ng-black/40 text-sm font-medium">Estructura operativa y departamentos de la organización.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingProcess(null);
                        setNewProcessData({ name: '', description: '', goals: '' });
                        setIsAddingProcess(true);
                      }}
                      className="px-6 py-3 bg-ng-lime text-ng-black font-black rounded-2xl shadow-lg shadow-ng-lime/20 hover:opacity-90 transition-all flex items-center gap-2 uppercase text-xs tracking-widest"
                    >
                      <Plus size={18} />
                      Añadir Proceso
                    </button>
                  </div>
                  
                  <div className="bg-white p-12 rounded-[3rem] border border-[#E5E7EB] shadow-xl">
                    <div className="space-y-8">
                      {processes.map(proc => (
                        <ProcessDetailCard 
                          key={proc.id} 
                          proc={proc} 
                          members={sortedMembers.filter(m => m.processId === proc.id)}
                          onEdit={openEditProcess}
                          onDelete={handleDeleteProcess}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {settingsSubTab === 'members' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-white p-8 rounded-[3rem] border border-[#E5E7EB] shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-ng-lime/10 text-ng-green rounded-2xl">
                        <Users size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-ng-black">Gestión de Equipo</h2>
                        <p className="text-ng-black/40 text-sm font-medium">Control operativo y perfiles de los integrantes del equipo.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsAddingMember(true)}
                      className="px-6 py-3 bg-ng-lime text-ng-black font-black rounded-2xl shadow-lg shadow-ng-lime/20 hover:opacity-90 transition-all flex items-center gap-2 uppercase text-xs tracking-widest"
                    >
                      <Plus size={18} />
                      Añadir Integrante
                    </button>
                  </div>

                  {(isAddingMember || editingMember) ? (
                    <MemberEditorView 
                      editingMember={editingMember}
                      newMemberData={newMemberData}
                      setNewMemberData={setNewMemberData}
                      processes={processes}
                      companies={companies}
                      roles={roles}
                      onCancel={() => {
                        setIsAddingMember(false);
                        setEditingMember(null);
                        setNewMemberData({
                          name: '', 
                          role: '', 
                          systemRoleId: '', 
                          categories: ['miembro'], 
                          processId: '', 
                          companyAssociations: [], 
                          identificationId: '',
                          hasRuc: false,
                          ruc: '',
                          skills: '', 
                          responsibilities: '', 
                          personality: '', 
                          notes: '', 
                          email: '', 
                          phone: '', 
                          epp: ''
                        });
                      }}
                      onSave={handleAddMember}
                    />
                  ) : (
                    <div className="space-y-12">
                      {processes.map(process => {
                        const processMembers = members.filter(m => {
                          const matchesProcess = m.processId === process.id && (m.categories || []).includes('miembro');
                          const matchesSearch = 
                            normalizeText(m.name).includes(normalizeText(searchQuery)) || 
                            normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                            (m.companyAssociations || []).some(assoc => {
                              const comp = companies.find(c => c.id === assoc.companyId);
                              return normalizeText(comp?.name || '').includes(normalizeText(searchQuery)) ||
                                     normalizeText(assoc.role).includes(normalizeText(searchQuery));
                            }) ||
                            m.identificationId?.includes(searchQuery);
                          return matchesProcess && matchesSearch;
                        });
                        if (processMembers.length === 0) return null;
                        
                        return (
                          <div key={process.id} className="space-y-6">
                            <div className="flex items-center gap-3 px-4">
                              <div className="w-2 h-8 bg-ng-green rounded-full" />
                              <h3 className="text-xl font-black text-ng-black uppercase tracking-wider">{process.name}</h3>
                              <span className="text-sm font-bold text-ng-black/40 bg-gray-100 px-3 py-1 rounded-full">
                                {processMembers.length} integrante{processMembers.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {processMembers.map(member => (
                                <div key={member.id} className="relative group">
                                  <div onClick={() => openEditMember(member)} className="cursor-pointer h-full">
                                    <MemberProfileCard 
                                      member={member} 
                                      processName={process.name}
                                      companies={companies}
                                      roles={roles}
                                    />
                                  </div>
                                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditMember(member);
                                      }}
                                      className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-gray-400 hover:text-blue-600 hover:bg-white transition-all"
                                      title="Editar Perfil"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMember(member);
                                      }}
                                      className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-gray-400 hover:text-red-500 hover:bg-white transition-all"
                                      title="Eliminar Miembro"
                                    >
                                      <Trash size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Unassigned members */}
                      {members.filter(m => {
                        const matchesProcess = (!m.processId || m.processId === 'unassigned') && (m.categories || []).includes('miembro');
                        const matchesSearch = 
                          normalizeText(m.name).includes(normalizeText(searchQuery)) || 
                          normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                          m.companyAssociations?.some(assoc => {
                            const comp = companies.find(c => c.id === assoc.companyId);
                            return normalizeText(comp?.name || '').includes(normalizeText(searchQuery)) ||
                                   normalizeText(assoc.role).includes(normalizeText(searchQuery));
                          }) ||
                          m.identificationId?.includes(searchQuery);
                        return matchesProcess && matchesSearch;
                      }).length > 0 && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-3 px-4">
                            <div className="w-2 h-8 bg-gray-400 rounded-full" />
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-wider">Sin Proceso Asignado</h3>
                            <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                              {members.filter(m => {
                                const matchesProcess = (!m.processId || m.processId === 'unassigned') && (m.categories || []).includes('miembro');
                                const matchesSearch = 
                                  normalizeText(m.name).includes(normalizeText(searchQuery)) || 
                                  normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                                  m.companyAssociations?.some(assoc => {
                                    const comp = companies.find(c => c.id === assoc.companyId);
                                    return normalizeText(comp?.name || '').includes(normalizeText(searchQuery)) ||
                                           normalizeText(assoc.role).includes(normalizeText(searchQuery));
                                  }) ||
                                  m.identificationId?.includes(searchQuery);
                                return matchesProcess && matchesSearch;
                              }).length} integrante(s)
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {members.filter(m => {
                              const matchesProcess = (!m.processId || m.processId === 'unassigned') && (m.categories || []).includes('miembro');
                              const matchesSearch = 
                                normalizeText(m.name).includes(normalizeText(searchQuery)) || 
                                normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                                m.companyAssociations?.some(assoc => {
                                  const comp = companies.find(c => c.id === assoc.companyId);
                                  return normalizeText(comp?.name || '').includes(normalizeText(searchQuery)) ||
                                         normalizeText(assoc.role).includes(normalizeText(searchQuery));
                                }) ||
                                m.identificationId?.includes(searchQuery);
                              return matchesProcess && matchesSearch;
                            }).map(member => (
                              <div key={member.id} className="relative group">
                                <div onClick={() => openEditMember(member)} className="cursor-pointer h-full">
                                  <MemberProfileCard 
                                    member={member} 
                                    processName="Sin Proceso"
                                    companies={companies}
                                    roles={roles}
                                  />
                                </div>
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditMember(member);
                                    }}
                                    className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-gray-400 hover:text-blue-600 hover:bg-white transition-all"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMember(member);
                                    }}
                                    className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-gray-400 hover:text-red-500 hover:bg-white transition-all"
                                  >
                                    <Trash size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          )}
              </>
            )}
        </AnimatePresence>

        <AnimatePresence>
          {pendingExitAction && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-50 p-7 space-y-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl flex-shrink-0 shadow-inner">
                    <ShieldAlert size={26} className="animate-wiggle" />
                  </div>
                  <div className="space-y-1 bg-white">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">¿Salir sin guardar permisos?</h3>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed">
                      Has modificado los niveles de acceso para <span className="text-slate-800 font-black">{resolvedPermissionsMember?.name}</span> pero no has guardado los cambios. Si sales ahora, se perderán de manera irreversible.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-2 border border-slate-100 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                  Selecciona una opción para continuar con la navegación.
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setPendingExitAction(null)}
                    className="w-full sm:w-auto px-5 py-3 hover:bg-slate-50 text-slate-500 hover:text-gray-700 text-xs font-black uppercase tracking-wider rounded-2xl transition-all text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLastInitializedMemberId('');
                      const action = pendingExitAction;
                      setPendingExitAction(null);
                      
                      if (action.type === 'tab' && action.targetTab) {
                        setActiveTab(action.targetTab);
                        if (action.targetTab === 'settings') {
                          setSettingsSubTab('general');
                        }
                      } else if (action.type === 'subtab' && action.targetSettingsSubTab) {
                        setSettingsSubTab(action.targetSettingsSubTab);
                      } else if (action.type === 'member' && action.targetMemberId) {
                        setSelectedMemberId(action.targetMemberId);
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-3 bg-red-50 hover:bg-red-100/80 text-red-600 text-xs font-black uppercase tracking-wider rounded-2xl transition-all border border-red-200/40 text-center"
                  >
                    Salir sin guardar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (resolvedPermissionsMember) {
                        await savePermissions(resolvedPermissionsMember.id);
                      }
                      const action = pendingExitAction;
                      setPendingExitAction(null);
                      
                      if (action.type === 'tab' && action.targetTab) {
                        setActiveTab(action.targetTab);
                        if (action.targetTab === 'settings') {
                          setSettingsSubTab('general');
                        }
                      } else if (action.type === 'subtab' && action.targetSettingsSubTab) {
                        setSettingsSubTab(action.targetSettingsSubTab);
                      } else if (action.type === 'member' && action.targetMemberId) {
                        setSelectedMemberId(action.targetMemberId);
                      }
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-green-100 hover:shadow-green-200 transition-all text-center flex items-center justify-center gap-2"
                  >
                    <Save size={14} /> Guardar y salir
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAddingProcess && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <Building2 size={20} />
                    </div>
                    <h2 className="text-xl font-bold">{editingProcess ? 'Editar' : 'Nuevo'} Proceso</h2>
                  </div>
                  <button 
                    onClick={() => {
                      setIsAddingProcess(false);
                      setEditingProcess(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleAddProcess} className="p-8 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre del Proceso</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: Producto, Ventas..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      value={newProcessData.name}
                      onChange={e => setNewProcessData({...newProcessData, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descripción</label>
                    <textarea 
                      required
                      placeholder="¿De qué se encarga este proceso?"
                      className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                      value={newProcessData.description}
                      onChange={e => setNewProcessData({...newProcessData, description: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Objetivos (separadas por coma)</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Aumentar ventas, Mejorar eficiencia..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      value={newProcessData.goals}
                      onChange={e => setNewProcessData({...newProcessData, goals: e.target.value})}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-purple-600 text-white font-bold rounded-2xl shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all mt-4"
                  >
                    {editingProcess ? 'Guardar Cambios' : 'Crear Proceso'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}

          {(isAddingTask || editingTask) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${editingTask ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                      {editingTask ? <Edit size={24} /> : <CheckCircle2 size={24} />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">{editingTask ? 'Detalles de la Tarea' : 'Nueva Tarea Scrum'}</h2>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Módulo de Gestión de Actividades</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsAddingTask(false);
                      setEditingTask(null);
                      setShowAddAuxDropdown(false);
                      setAuxSearchQuery('');
                      setShowAddBlockerDropdown(false);
                      setBlockerSearchQuery('');
                      setShowAddBlocksDropdown(false);
                      setBlocksSearchQuery('');
                      if (lastTab) {
                        setActiveTab(lastTab as any);
                        setLastTab(null);
                      }
                    }}
                    className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 shadow-sm hover:shadow-md"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={editingTask ? handleUpdateTask : handleAddTask} className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Column: Metadata */}
                    <div className="lg:col-span-4 space-y-6">
                      <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100 space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Layers size={12} className="text-blue-500" /> Proceso
                          </label>
                          <select 
                            required
                            disabled={!canEditMetadataField}
                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-sm font-bold shadow-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            value={newTaskData.processId}
                            onChange={e => setNewTaskData({...newTaskData, processId: e.target.value})}
                          >
                            <option value="">Seleccionar Proceso...</option>
                            {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <User size={12} className="text-purple-500" /> Responsable
                          </label>
                          <select 
                            disabled={!canEditMetadataField}
                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-sm font-bold shadow-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            value={newTaskData.memberId}
                            onChange={e => setNewTaskData({...newTaskData, memberId: e.target.value})}
                          >
                            <option value="">Sin Asignar (Task Pool)</option>
                            {newTaskData.processId ? (
                              <>
                                {sortedMembers.filter(m => m.processId === newTaskData.processId).length > 0 && (
                                  <optgroup label="Miembros del Proceso">
                                    {sortedMembers.filter(m => m.processId === newTaskData.processId).map(m => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                  </optgroup>
                                )}
                                {sortedMembers.filter(m => m.processId !== newTaskData.processId).length > 0 && (
                                  <optgroup label="Otros Miembros del Equipo">
                                    {sortedMembers.filter(m => m.processId !== newTaskData.processId).map(m => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                  </optgroup>
                                )}
                              </>
                            ) : (
                              sortedMembers.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))
                            )}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <CheckCircle2 size={12} className="text-emerald-500" /> Revisor
                          </label>
                          <select 
                            disabled={!canEditMetadataField}
                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-sm font-bold shadow-sm cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            value={newTaskData.revisorId || ''}
                            onChange={e => setNewTaskData({...newTaskData, revisorId: e.target.value})}
                          >
                            <option value="">Sin Asignar (Revisión de Líder/Admin)</option>
                            {sortedMembers.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-3 relative">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                              <Users size={12} className="text-amber-500" /> Auxiliares ({newTaskData.auxiliaryIds?.length || 0})
                            </label>
                            
                            {canEditMetadataField && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddAuxDropdown(!showAddAuxDropdown);
                                  setAuxSearchQuery('');
                                }}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer border transition-all ${
                                  showAddAuxDropdown 
                                    ? 'bg-amber-500 border-amber-500 text-white shadow-md' 
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 shadow-sm'
                                }`}
                              >
                                <UserPlus size={10} />
                                <span>Agregar</span>
                              </button>
                            )}
                          </div>

                          {/* Horizontal flex of assigned auxiliaries */}
                          <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-2xl min-h-[48px] items-center border border-dashed border-gray-200">
                            {(!newTaskData.auxiliaryIds || newTaskData.auxiliaryIds.length === 0) ? (
                              <span className="text-[10px] text-gray-400 italic px-2 select-none py-1">Sin auxiliares asignados. Usa "+ Agregar".</span>
                            ) : (
                              newTaskData.auxiliaryIds.map(id => {
                                const m = sortedMembers.find(member => member.id === id);
                                if (!m) return null;
                                return (
                                  <div 
                                    key={id}
                                    className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-100 rounded-xl pl-1.5 pr-1 py-1 text-[11px] font-bold text-amber-800 transition-all shadow-sm hover:bg-amber-50"
                                  >
                                    <img 
                                      src={m.avatar} 
                                      className="w-4 h-4 rounded-md object-cover select-none" 
                                      referrerPolicy="no-referrer"
                                      alt=""
                                    />
                                    <span className="truncate max-w-[80px]" title={m.name}>{m.name.split(' ')[0]}</span>
                                    {canEditMetadataField && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextIds = (newTaskData.auxiliaryIds || []).filter(currId => currId !== id);
                                          setNewTaskData({
                                            ...newTaskData,
                                            auxiliaryIds: nextIds,
                                            auxiliaryId: nextIds[0] || ''
                                          });
                                        }}
                                        className="p-0.5 hover:bg-amber-150 rounded-md text-amber-500 hover:text-amber-800 transition-colors ml-0.5 cursor-pointer"
                                        title={`Quitar ${m.name}`}
                                      >
                                        <X size={10} strokeWidth={3} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Dropdown Popover */}
                          {showAddAuxDropdown && (
                            <div className="absolute right-0 top-12 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-3 space-y-2.5">
                              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Añadir Miembro Auxiliar</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAddAuxDropdown(false);
                                    setAuxSearchQuery('');
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition cursor-pointer"
                                >
                                  <X size={11} strokeWidth={3} />
                                </button>
                              </div>

                              {/* Mini Search input */}
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Buscar por nombre..."
                                  className="w-full text-[11px] px-2.5 py-1.5 border border-gray-200 bg-gray-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 font-medium"
                                  value={auxSearchQuery}
                                  onChange={e => setAuxSearchQuery(e.target.value)}
                                />
                              </div>

                              {/* Members items */}
                              <div className="max-h-[140px] overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                                {sortedMembers
                                  .filter(m => !newTaskData.memberId || m.id !== newTaskData.memberId)
                                  .filter(m => !auxSearchQuery || m.name.toLowerCase().includes(auxSearchQuery.toLowerCase()))
                                  .map(m => {
                                    const isSelected = !!newTaskData.auxiliaryIds?.includes(m.id);
                                    return (
                                      <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => {
                                          const currentIds = [...(newTaskData.auxiliaryIds || [])];
                                          let nextIds = [];
                                          if (isSelected) {
                                            nextIds = currentIds.filter(id => id !== m.id);
                                          } else {
                                            nextIds = [...currentIds, m.id];
                                          }
                                          setNewTaskData({
                                            ...newTaskData,
                                            auxiliaryIds: nextIds,
                                            auxiliaryId: nextIds[0] || ''
                                          });
                                        }}
                                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer ${
                                          isSelected 
                                            ? 'bg-amber-50/70 border-amber-200 text-amber-800' 
                                            : 'bg-white border-transparent hover:bg-gray-50 text-gray-700'
                                        }`}
                                      >
                                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                          isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-200 bg-white'
                                        }`}>
                                          {isSelected && <Check size={8} strokeWidth={4} />}
                                        </div>
                                        <img 
                                          src={m.avatar} 
                                          className="w-4.5 h-4.5 rounded-md object-cover flex-shrink-0" 
                                          referrerPolicy="no-referrer"
                                          alt=""
                                        />
                                        <span className="truncate flex-1">{m.name}</span>
                                      </button>
                                    );
                                  })
                                }
                                {sortedMembers
                                  .filter(m => !newTaskData.memberId || m.id !== newTaskData.memberId)
                                  .filter(m => !auxSearchQuery || m.name.toLowerCase().includes(auxSearchQuery.toLowerCase()))
                                  .length === 0 && (
                                    <p className="text-[10px] text-gray-400 italic text-center py-2">Sin otros miembros.</p>
                                  )
                                }
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <FolderKanban size={12} className="text-green-500" /> Proyecto
                          </label>
                          <select 
                            disabled={!canEditMetadataField}
                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-sm font-bold shadow-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            value={newTaskData.projectId}
                            onChange={e => setNewTaskData({...newTaskData, projectId: e.target.value})}
                          >
                            <option value="">Historia de Usuario Independiente</option>
                            {projects.filter(p => !newTaskData.processId || p.processId === newTaskData.processId).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Activity size={12} className="text-red-500" /> Estado Scrum
                          </label>
                          <select 
                            required
                            disabled={!canEditStatusField}
                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-sm font-bold shadow-sm capitalize disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            value={newTaskData.status}
                            onChange={e => {
                               const newStatus = e.target.value as any;
                               if (newStatus === 'in_progress' && editingTask) {
                                 const { isBlocked, blockers } = isTaskBlocked(editingTask.id, tasks);
                                 if (isBlocked) {
                                   alert(`ESTA TAREA ESTÁ BLOQUEADA\n\nPara poder iniciar esta tarea se debe terminar primero:\n• ${blockers.map(t => t.title).join('\n• ')}`);
                                   return;
                                 }
                               }
                               setNewTaskData({...newTaskData, status: newStatus});
                            }}
                          >
                            {(() => {
                              const allOptions = [
                                { value: 'backlog', label: '📦 Product Backlog' },
                                { value: 'todo', label: '📋 Por Hacer' },
                                { value: 'in_progress', label: '⚡ En Progreso' },
                                { value: 'blocked', label: '🚫 Bloqueada' },
                                { value: 'review', label: '🔍 En Revisión' },
                                { value: 'correction', label: '🔧 Para Corrección' },
                                { value: 'done', label: '✅ Completada' },
                                { value: 'rejected', label: '❌ Rechazada' }
                              ];

                              if (isNewTask || isProcessLeader) {
                                return allOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ));
                              }

                              if (taskAccess === 'colaborador') {
                                // Only allow 'in_progress', 'review', and current status
                                const filtered = allOptions.filter(opt => 
                                  opt.value === 'in_progress' || 
                                  opt.value === 'review' || 
                                  opt.value === newTaskData.status
                                );
                                return filtered.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ));
                              }

                              // Otherwise, they shouldn't be editing, but if they view it:
                              return allOptions.filter(opt => opt.value === newTaskData.status).map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ));
                            })()}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Zap size={12} className="text-amber-500" /> Prioridad de la Tarea
                          </label>
                          <select 
                            required
                            disabled={!canEditMetadataField}
                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-sm font-bold shadow-sm capitalize disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            value={newTaskData.priority || 'media'}
                            onChange={e => setNewTaskData({...newTaskData, priority: e.target.value})}
                          >
                            <option value="baja">🟢 Baja (Normal)</option>
                            <option value="media">⚡ Media (Estándar)</option>
                            <option value="alta">🔥 Alta (Urgente)</option>
                            <option value="meteoric_crash">☄️ Meteoric Crash (ALERTA MÁXIMA)</option>
                          </select>
                        </div>

                        <div className="space-y-4 pt-4 border-t-2 border-dashed border-gray-100 mt-4">
                            <div className="bg-gray-50/50 p-4 rounded-[2rem] border border-gray-100/50 space-y-4">
                              {/* ¿Quién bloquea esta tarea? */}
                              <div className="space-y-2 relative">
                                <div className="flex items-center justify-between gap-4">
                                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 flex-shrink-0">
                                    <Ban size={10} className="text-red-500" /> BLOQUEADA POR
                                  </label>
                                  
                                  <div className="relative">
                                    {canEditMetadataField && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowAddBlockerDropdown(!showAddBlockerDropdown);
                                          setShowAddBlocksDropdown(false);
                                        }}
                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-700 rounded-xl focus:outline-none text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1"
                                      >
                                        <Plus size={10} strokeWidth={3} /> {showAddBlockerDropdown ? 'Cerrar' : 'Añadir'}
                                      </button>
                                    )}

                                    {showAddBlockerDropdown && (
                                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl p-3 z-50 space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Buscar Bloqueo</div>
                                        
                                        {/* Buscador de texto */}
                                        <input
                                          type="text"
                                          placeholder="Buscar por título..."
                                          value={blockerSearchQuery}
                                          onChange={e => setBlockerSearchQuery(e.target.value)}
                                          className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-400/20"
                                        />

                                        {/* Filtros rápidos: Proyecto y Proceso */}
                                        <div className="grid grid-cols-2 gap-2">
                                          <select
                                            value={blockerSelectedProjectId}
                                            onChange={e => setBlockerSelectedProjectId(e.target.value)}
                                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 text-[10px] rounded-lg text-gray-600 focus:outline-none"
                                          >
                                            <option value="all">Todos los Proy.</option>
                                            {projects.map(p => (
                                              <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                          </select>

                                          <select
                                            value={blockerSelectedProcessId}
                                            onChange={e => setBlockerSelectedProcessId(e.target.value)}
                                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 text-[10px] rounded-lg text-gray-600 focus:outline-none"
                                          >
                                            <option value="all">Todos los Proc.</option>
                                            {processes.map(p => (
                                              <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Resultados de tareas */}
                                        <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pt-1">
                                          {(() => {
                                            const filteredTasks = tasks.filter(t => {
                                              if (t.id === newTaskData.id) return false;
                                              if (newTaskData.blockedByTaskIds?.includes(t.id)) return false;
                                              
                                              // Filtro por texto
                                              if (blockerSearchQuery && !t.title.toLowerCase().includes(blockerSearchQuery.toLowerCase())) {
                                                return false;
                                              }
                                              // Filtro por proyecto
                                              if (blockerSelectedProjectId !== 'all' && t.projectId !== blockerSelectedProjectId) {
                                                return false;
                                              }
                                              // Filtro por proceso
                                              if (blockerSelectedProcessId !== 'all' && t.processId !== blockerSelectedProcessId) {
                                                return false;
                                              }
                                              return true;
                                            }).sort((a, b) => {
                                              const sameProjA = newTaskData.projectId && a.projectId === newTaskData.projectId;
                                              const sameProcA = newTaskData.processId && a.processId === newTaskData.processId;
                                              const sameProjB = newTaskData.projectId && b.projectId === newTaskData.projectId;
                                              const sameProcB = newTaskData.processId && b.processId === newTaskData.processId;

                                              const getScore = (sameProj: any, sameProc: any) => {
                                                if (sameProj && sameProc) return 1;
                                                if (sameProj) return 2;
                                                if (sameProc) return 3;
                                                return 4;
                                              };

                                              const scoreA = getScore(sameProjA, sameProcA);
                                              const scoreB = getScore(sameProjB, sameProcB);

                                              if (scoreA !== scoreB) {
                                                return scoreA - scoreB;
                                              }

                                              const nameA_Proc = (processes.find(p => p.id === a.processId)?.name || '').toLowerCase();
                                              const nameB_Proc = (processes.find(p => p.id === b.processId)?.name || '').toLowerCase();
                                              if (nameA_Proc && !nameB_Proc) return -1;
                                              if (!nameA_Proc && nameB_Proc) return 1;
                                              const procCompare = nameA_Proc.localeCompare(nameB_Proc, 'es', { sensitivity: 'base' });
                                              if (procCompare !== 0) return procCompare;

                                              const nameA_Proj = (projects.find(p => p.id === a.projectId)?.name || '').toLowerCase();
                                              const nameB_Proj = (projects.find(p => p.id === b.projectId)?.name || '').toLowerCase();
                                              if (nameA_Proj && !nameB_Proj) return -1;
                                              if (!nameA_Proj && nameB_Proj) return 1;
                                              const projCompare = nameA_Proj.localeCompare(nameB_Proj, 'es', { sensitivity: 'base' });
                                              if (projCompare !== 0) return projCompare;

                                              return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
                                            });

                                            if (filteredTasks.length === 0) {
                                              return (
                                                <div className="text-center py-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                  No se encontraron tareas
                                                </div>
                                              );
                                            }

                                            return filteredTasks.map(t => {
                                              const tProj = projects.find(p => p.id === t.projectId)?.name;
                                              const tProc = processes.find(p => p.id === t.processId)?.name;
                                              return (
                                                <button
                                                  type="button"
                                                  key={t.id}
                                                  onClick={() => {
                                                    setNewTaskData({
                                                      ...newTaskData,
                                                      blockedByTaskIds: [...(newTaskData.blockedByTaskIds || []), t.id]
                                                    });
                                                    setBlockerSearchQuery('');
                                                    setShowAddBlockerDropdown(false);
                                                  }}
                                                  className="w-full text-left p-2 rounded-xl hover:bg-red-50/50 transition-colors border border-transparent hover:border-red-100 flex flex-col gap-0.5"
                                                >
                                                  <span className="text-xs font-semibold text-gray-800 line-clamp-1">{t.title}</span>
                                                  <div className="flex flex-wrap gap-1 items-center">
                                                    {tProj && (
                                                      <span className="text-[8px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded font-black uppercase">
                                                        {tProj}
                                                      </span>
                                                    )}
                                                    {tProc && (
                                                      <span className="text-[8px] bg-purple-50 text-purple-600 px-1 py-0.5 rounded font-black uppercase">
                                                        {tProc}
                                                      </span>
                                                    )}
                                                  </div>
                                                </button>
                                              );
                                            });
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    {newTaskData.blockedByTaskIds?.map(id => {
                                      const blockedByTask = tasks.find(t => t.id === id);
                                      return (
                                        <div key={id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-red-700 rounded-xl text-[10px] font-black border border-red-100 shadow-sm group animate-in fade-in slide-in-from-left-2">
                                          <span className="truncate max-w-[120px]" title={blockedByTask?.title}>{blockedByTask?.title}</span>
                                          <div className="flex items-center gap-0.5 ml-auto">
                                            <button 
                                              type="button"
                                              onClick={() => {
                                                if (blockedByTask?.title) {
                                                  navigator.clipboard.writeText(blockedByTask.title);
                                                }
                                              }}
                                              className="hover:text-red-900 p-1 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                              title="Copiar nombre"
                                            >
                                              <Copy size={11} />
                                            </button>
                                            {canEditMetadataField && (
                                              <button 
                                                type="button"
                                                onClick={() => setNewTaskData({
                                                  ...newTaskData, 
                                                  blockedByTaskIds: newTaskData.blockedByTaskIds?.filter(tid => tid !== id)
                                                })}
                                                className="hover:text-red-900 p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                              >
                                                <X size={11} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {(!newTaskData.blockedByTaskIds || newTaskData.blockedByTaskIds.length === 0) && (
                                      <div className="w-full py-2 text-center border border-dashed border-gray-200 rounded-xl">
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Sin bloqueos activos</p>
                                      </div>
                                    )}
                                </div>
                              </div>
     
                              {/* ¿A quién bloquea esta tarea? */}
                              <div className="space-y-2 pt-3 border-t border-gray-100 relative">
                                <div className="flex items-center justify-between gap-4">
                                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 flex-shrink-0">
                                    <Activity size={10} className="text-blue-500" /> BLOQUEA A
                                  </label>
                                  
                                  <div className="relative">
                                    {canEditMetadataField && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowAddBlocksDropdown(!showAddBlocksDropdown);
                                          setShowAddBlockerDropdown(false);
                                        }}
                                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-700 rounded-xl focus:outline-none text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1"
                                      >
                                        <Plus size={10} strokeWidth={3} /> {showAddBlocksDropdown ? 'Cerrar' : 'Añadir'}
                                      </button>
                                    )}

                                    {showAddBlocksDropdown && (
                                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl p-3 z-50 space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Buscar Tarea a Bloquear</div>
                                        
                                        {/* Buscador de texto */}
                                        <input
                                          type="text"
                                          placeholder="Buscar por título..."
                                          value={blocksSearchQuery}
                                          onChange={e => setBlocksSearchQuery(e.target.value)}
                                          className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                                        />

                                        {/* Filtros rápidos: Proyecto y Proceso */}
                                        <div className="grid grid-cols-2 gap-2">
                                          <select
                                            value={blocksSelectedProjectId}
                                            onChange={e => setBlocksSelectedProjectId(e.target.value)}
                                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 text-[10px] rounded-lg text-gray-600 focus:outline-none"
                                          >
                                            <option value="all">Todos los Proy.</option>
                                            {projects.map(p => (
                                              <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                          </select>

                                          <select
                                            value={blocksSelectedProcessId}
                                            onChange={e => setBlocksSelectedProcessId(e.target.value)}
                                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 text-[10px] rounded-lg text-gray-600 focus:outline-none"
                                          >
                                            <option value="all">Todos los Proc.</option>
                                            {processes.map(p => (
                                              <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Resultados de tareas */}
                                        <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pt-1">
                                          {(() => {
                                            const filteredTasks = tasks.filter(t => {
                                              if (t.id === newTaskData.id) return false;
                                              if ((t.blockedByTaskIds || []).includes(newTaskData.id)) return false;
                                              
                                              // Filtro por texto
                                              if (blocksSearchQuery && !t.title.toLowerCase().includes(blocksSearchQuery.toLowerCase())) {
                                                return false;
                                              }
                                              // Filtro por proyecto
                                              if (blocksSelectedProjectId !== 'all' && t.projectId !== blocksSelectedProjectId) {
                                                return false;
                                              }
                                              // Filtro por proceso
                                              if (blocksSelectedProcessId !== 'all' && t.processId !== blocksSelectedProcessId) {
                                                return false;
                                              }
                                              return true;
                                            }).sort((a, b) => {
                                              const sameProjA = newTaskData.projectId && a.projectId === newTaskData.projectId;
                                              const sameProcA = newTaskData.processId && a.processId === newTaskData.processId;
                                              const sameProjB = newTaskData.projectId && b.projectId === newTaskData.projectId;
                                              const sameProcB = newTaskData.processId && b.processId === newTaskData.processId;

                                              const getScore = (sameProj: any, sameProc: any) => {
                                                if (sameProj && sameProc) return 1;
                                                if (sameProj) return 2;
                                                if (sameProc) return 3;
                                                return 4;
                                              };

                                              const scoreA = getScore(sameProjA, sameProcA);
                                              const scoreB = getScore(sameProjB, sameProcB);

                                              if (scoreA !== scoreB) {
                                                return scoreA - scoreB;
                                              }

                                              const nameA_Proc = (processes.find(p => p.id === a.processId)?.name || '').toLowerCase();
                                              const nameB_Proc = (processes.find(p => p.id === b.processId)?.name || '').toLowerCase();
                                              if (nameA_Proc && !nameB_Proc) return -1;
                                              if (!nameA_Proc && nameB_Proc) return 1;
                                              const procCompare = nameA_Proc.localeCompare(nameB_Proc, 'es', { sensitivity: 'base' });
                                              if (procCompare !== 0) return procCompare;

                                              const nameA_Proj = (projects.find(p => p.id === a.projectId)?.name || '').toLowerCase();
                                              const nameB_Proj = (projects.find(p => p.id === b.projectId)?.name || '').toLowerCase();
                                              if (nameA_Proj && !nameB_Proj) return -1;
                                              if (!nameA_Proj && nameB_Proj) return 1;
                                              const projCompare = nameA_Proj.localeCompare(nameB_Proj, 'es', { sensitivity: 'base' });
                                              if (projCompare !== 0) return projCompare;

                                              return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
                                            });

                                            if (filteredTasks.length === 0) {
                                              return (
                                                <div className="text-center py-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                  No se encontraron tareas
                                                </div>
                                              );
                                            }

                                            return filteredTasks.map(t => {
                                              const tProj = projects.find(p => p.id === t.projectId)?.name;
                                              const tProc = processes.find(p => p.id === t.processId)?.name;
                                              return (
                                                <button
                                                  type="button"
                                                  key={t.id}
                                                  onClick={() => {
                                                    // Bloquear en estado local
                                                    setTasks(prev => prev.map(pt => {
                                                      if (pt.id === t.id) {
                                                        const currentBlockedBy = pt.blockedByTaskIds || [];
                                                        if (!currentBlockedBy.includes(newTaskData.id)) {
                                                          return { ...pt, blockedByTaskIds: [...currentBlockedBy, newTaskData.id] };
                                                        }
                                                      }
                                                      return pt;
                                                    }));

                                                    // Realizar actualización a DB
                                                    const currentBlockedBy = t.blockedByTaskIds || [];
                                                    if (!currentBlockedBy.includes(newTaskData.id)) {
                                                      updateDoc(doc(db, 'tasks', t.id), {
                                                        blockedByTaskIds: [...currentBlockedBy, newTaskData.id]
                                                      }).catch(err => console.error(err));
                                                    }

                                                    setBlocksSearchQuery('');
                                                    setShowAddBlocksDropdown(false);
                                                  }}
                                                  className="w-full text-left p-2 rounded-xl hover:bg-blue-50/50 transition-colors border border-transparent hover:border-blue-100 flex flex-col gap-0.5"
                                                >
                                                  <span className="text-xs font-semibold text-gray-800 line-clamp-1">{t.title}</span>
                                                  <div className="flex flex-wrap gap-1 items-center">
                                                    {tProj && (
                                                      <span className="text-[8px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded font-black uppercase">
                                                        {tProj}
                                                      </span>
                                                    )}
                                                    {tProc && (
                                                      <span className="text-[8px] bg-purple-50 text-purple-600 px-1 py-0.5 rounded font-black uppercase">
                                                        {tProc}
                                                      </span>
                                                    )}
                                                  </div>
                                                </button>
                                              );
                                            });
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {tasks.filter(t => t.blockedByTaskIds?.includes(newTaskData.id)).length > 0 ? (
                                      tasks.filter(t => t.blockedByTaskIds?.includes(newTaskData.id)).map(t => (
                                        <div key={t.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-blue-700 rounded-xl text-[10px] font-black border border-blue-100 shadow-sm group animate-in fade-in slide-in-from-left-2">
                                          <span className="truncate max-w-[120px]" title={t.title}>{t.title}</span>
                                          <div className="flex items-center gap-0.5 ml-auto">
                                            <button 
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(t.title);
                                              }}
                                              className="hover:text-blue-900 p-1 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                              title="Copiar nombre"
                                            >
                                              <Copy size={11} />
                                            </button>
                                            {canEditMetadataField && (
                                              <button 
                                                type="button"
                                                onClick={() => {
                                                  // Quitar el bloqueo de la otra tarea en listado local
                                                  setTasks(prev => prev.map(pt => pt.id === t.id ? {
                                                    ...pt,
                                                    blockedByTaskIds: pt.blockedByTaskIds?.filter(id => id !== newTaskData.id)
                                                  } : pt));
                                                  
                                                  // Realizar actualización a DB
                                                  updateDoc(doc(db, 'tasks', t.id), {
                                                    blockedByTaskIds: (t.blockedByTaskIds || []).filter(id => id !== newTaskData.id)
                                                  }).catch(err => console.error(err));
                                                }}
                                                className="hover:text-blue-900 p-1 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                              >
                                                <X size={11} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="w-full py-2 text-center border border-dashed border-gray-200 rounded-xl">
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">No bloquea a ninguna tarea</p>
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                      {editingTask && (
                        <button 
                          type="button"
                          onClick={() => {
                            handleDeleteTask(editingTask.id);
                            setEditingTask(null);
                          }}
                          className="w-full flex items-center justify-center gap-3 py-4 bg-red-600 text-white rounded-3xl hover:bg-red-700 transition-all text-xs font-black uppercase tracking-widest shadow-xl shadow-red-200"
                        >
                          <Trash size={18} />
                          Borrar Tarea
                        </button>
                      )}
                    </div>

                    {/* Right Column: Content */}
                    <div className="lg:col-span-8 space-y-8">
                      {(() => {
                        const canEditPlannedDates = isNewTask || isProcessLeader;
                        const canEditDueDate = isNewTask || isProcessLeader || isPrimaryAssignee || (!editingTask?.memberId && taskAccess === 'colaborador');
                        const canEditStoryAndCriteria = isNewTask || isProcessLeader;

                        return (
                          <>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Título de la Historia de Usuario</label>
                              <input 
                                type="text" 
                                required
                                disabled={!canEditStoryAndCriteria}
                                placeholder="Ingrese un título breve de la historia"
                                className={`w-full px-6 py-5 border-2 border-gray-100 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xl font-bold shadow-sm placeholder:text-gray-300 ${
                                  !canEditStoryAndCriteria ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                                }`}
                                value={newTaskData.title}
                                onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
                                  <Clock size={12} className="text-blue-500" /> Horas Plan.
                                </label>
                                <select 
                                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold shadow-sm appearance-none cursor-pointer"
                                  value={newTaskData.plannedHours}
                                  onChange={e => setNewTaskData({...newTaskData, plannedHours: parseFloat(e.target.value) || 0})}
                                >
                                  <option value="0">Sin horas</option>
                                  {[0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40].map(num => (
                                    <option key={num} value={num}>
                                      {num === 0.5 ? '0.5 horas (30 min)' : num === 1 ? '1 hora' : `${num} horas`}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
                                  <Activity size={12} className="text-green-500" /> Horas Reales
                                </label>
                                <input 
                                  type="number" 
                                  min="0"
                                  step="0.5"
                                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold shadow-sm"
                                  value={newTaskData.actualHours}
                                  onChange={e => setNewTaskData({...newTaskData, actualHours: parseFloat(e.target.value) || 0})}
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1 flex items-center gap-2" title="Solo el líder de proceso o administrador puede cambiar esta fecha">
                                  <Calendar size={12} className="text-sky-500" /> Inicio Planificado
                                </label>
                                <input 
                                  type="date" 
                                  disabled={!canEditPlannedDates}
                                  className={`w-full px-5 py-4 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold shadow-sm ${
                                    !canEditPlannedDates ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50'
                                  }`}
                                  value={newTaskData.plannedDate || ''}
                                  onChange={e => setNewTaskData({...newTaskData, plannedDate: e.target.value})}
                                />
                                {!canEditPlannedDates && (
                                  <span className="text-[8px] font-black tracking-tight text-red-500 uppercase block pl-1">Solo Líder de Proceso</span>
                                )}
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1 flex items-center gap-2" title="Solo el líder de proceso o administrador puede cambiar esta fecha (Opcional)">
                                  <Calendar size={12} className="text-emerald-500" /> Fin Planificado
                                </label>
                                <input 
                                  type="date" 
                                  disabled={!canEditPlannedDates}
                                  className={`w-full px-5 py-4 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold shadow-sm ${
                                    !canEditPlannedDates ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50'
                                  }`}
                                  value={newTaskData.plannedEndDate || ''}
                                  onChange={e => setNewTaskData({...newTaskData, plannedEndDate: e.target.value})}
                                />
                                {!canEditPlannedDates && (
                                  <span className="text-[8px] font-black tracking-tight text-red-500 uppercase block pl-1">Solo Líder de Proceso</span>
                                )}
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1 flex items-center gap-2" title="El responsable o el líder de proceso puede cambiar esta fecha">
                                  <Calendar size={12} className="text-purple-500" /> Entrega (Due)
                                </label>
                                <input 
                                  type="date" 
                                  disabled={!canEditDueDate}
                                  className={`w-full px-5 py-4 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold shadow-sm ${
                                    !canEditDueDate ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50'
                                  }`}
                                  value={newTaskData.dueDate || ''}
                                  onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})}
                                />
                                {!canEditDueDate && (
                                  <span className="text-[8px] font-black tracking-tight text-red-500 uppercase block pl-1">Solo Líder de Proceso o Responsable</span>
                                )}
                              </div>
                            </div>

                            {/* Section: Split Description into Description and Acceptance Criteria */}
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Descripción de la historia</label>
                              <textarea 
                                placeholder="Describe el contexto narrativo de la historia de usuario o actividad..."
                                disabled={!canEditStoryAndCriteria}
                                className={`w-full h-32 px-6 py-4 border-2 border-gray-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none text-sm leading-relaxed shadow-sm placeholder:text-gray-300 ${
                                  !canEditStoryAndCriteria ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                                }`}
                                value={newTaskData.storyDescription || ''}
                                onChange={e => setNewTaskData({...newTaskData, storyDescription: e.target.value})}
                              />
                              {!canEditStoryAndCriteria && (
                                <span className="text-[8px] font-black tracking-tight text-red-500 uppercase block pl-1">Solo Líder / Administrador</span>
                              )}
                            </div>

                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Criterios de aceptación</label>
                              <textarea 
                                placeholder="Describe las condiciones o pruebas de aceptación que definen el DoD (Definition of Done)..."
                                disabled={!canEditStoryAndCriteria}
                                className={`w-full h-32 px-6 py-4 border-2 border-gray-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none text-sm leading-relaxed shadow-sm placeholder:text-gray-300 ${
                                  !canEditStoryAndCriteria ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
                                }`}
                                value={newTaskData.acceptanceCriteria || ''}
                                onChange={e => setNewTaskData({...newTaskData, acceptanceCriteria: e.target.value})}
                              />
                              {!canEditStoryAndCriteria && (
                                <span className="text-[8px] font-black tracking-tight text-red-500 uppercase block pl-1">Solo Líder / Administrador</span>
                              )}
                            </div>

                            {/* Relocated Links area at the bottom inside right column */}
                            <div className="space-y-6 pt-4 border-t border-dashed border-gray-100">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                                   <LinkIcon size={14} className="text-blue-500" /> Entregables y Enlaces de Revisión
                                </label>
                                <button 
                                  type="button"
                                  onClick={() => setNewTaskData({
                                    ...newTaskData, 
                                    deliverables: [...(newTaskData.deliverables || []), { id: Date.now().toString(), label: '', url: '' }] 
                                  })}
                                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                                >
                                   <Plus size={14} /> Añadir Entregable
                                </button>
                              </div>
                              
                              <div className="space-y-3">
                                {newTaskData.deliverables?.map((del, idx) => (
                                  <div key={del.id} className="flex gap-3 group">
                                    <input 
                                      placeholder="Nombre (ej: Link Figma)"
                                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                                      value={del.label || ''}
                                      onChange={e => {
                                        const next = [...(newTaskData.deliverables || [])];
                                        next[idx] = { ...next[idx], label: e.target.value };
                                        setNewTaskData({ ...newTaskData, deliverables: next });
                                      }}
                                    />
                                    <input 
                                      placeholder="https://..."
                                      className="flex-[2] px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 transition-all"
                                      value={del.url || ''}
                                      onChange={e => {
                                        const next = [...(newTaskData.deliverables || [])];
                                        next[idx] = { ...next[idx], url: e.target.value };
                                        setNewTaskData({ ...newTaskData, deliverables: next });
                                      }}
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const next = (newTaskData.deliverables || []).filter((_, i) => i !== idx);
                                        setNewTaskData({ ...newTaskData, deliverables: next });
                                      }}
                                      className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                      <Trash size={16} />
                                    </button>
                                  </div>
                                ))}
                                {(!newTaskData.deliverables || newTaskData.deliverables.length === 0) && (
                                  <div className="py-4 text-center border-2 border-dashed border-gray-100 rounded-2xl text-[10px] text-gray-400 font-bold uppercase">
                                    No hay entregables vinculados
                                  </div>
                                )}
                              </div>
                            </div>

                            {editingTask && (
                              <div className="pt-6 border-t border-dashed border-gray-100 space-y-4">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                                     <History size={14} className="text-gray-500" /> Historial de la Tarea
                                  </label>
                                  <button 
                                    type="button"
                                    onClick={() => setShowTaskHistory(!showTaskHistory)}
                                    className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-gray-200 transition-all flex items-center gap-2 border border-gray-200/50"
                                  >
                                    {showTaskHistory ? 'Ocultar Historial' : 'Ver Historial'}
                                  </button>
                                </div>

                                {showTaskHistory && (
                                  <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 space-y-3 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                                    {(editingTask.history && editingTask.history.length > 0) ? (
                                      <div className="space-y-4 relative pl-4 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                                        {editingTask.history.map((item, idx) => (
                                          <div key={item.id || idx} className="relative text-xs">
                                            {/* dot */}
                                            <div className="absolute -left-[14px] top-1.5 w-2 h-2 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                                            <div className="flex items-baseline justify-between gap-4">
                                              <span className="font-bold text-gray-800">{item.userName}</span>
                                              <span className="text-[9px] font-medium text-gray-400 font-mono">
                                                {new Date(item.timestamp).toLocaleString('es-ES', { 
                                                  day: '2-digit', 
                                                  month: '2-digit', 
                                                  hour: '2-digit', 
                                                  minute: '2-digit' 
                                                })}
                                              </span>
                                            </div>
                                            <p className="text-gray-600 mt-0.5">{item.details}</p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="py-4 text-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                        Sin registros en el historial
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-100 bg-white sticky bottom-0 z-10 -m-10 p-10 mt-10">
                    <button 
                      type="submit"
                      className={`w-full py-5 text-ng-black text-lg font-black rounded-3xl shadow-2xl transition-all transform hover:scale-[1.01] active:scale-[0.99] uppercase tracking-widest ${editingTask ? 'bg-ng-lime shadow-ng-lime/20' : 'bg-ng-green text-white shadow-ng-green/20'}`}
                    >
                      {editingTask ? 'ACTUALIZAR HISTORIA DE USUARIO' : 'REGISTRAR EN EL BACKLOG'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {viewingCompany && (
            <CompanyDetailsModal 
              company={viewingCompany} 
              onClose={() => setViewingCompany(null)}
              onEdit={() => {
                const comp = viewingCompany;
                setViewingCompany(null);
                openEditCompany(comp);
              }}
            />
          )}

          {isAddingProject && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${editingProject ? 'bg-blue-50 text-blue-600' : 'bg-blue-50 text-blue-600'}`}>
                      <FolderKanban size={20} />
                    </div>
                    <h2 className="text-xl font-bold">{editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
                  </div>
                  <button 
                    onClick={() => {
                      setIsAddingProject(false);
                      setEditingProject(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={editingProject ? handleUpdateProject : handleAddProject} className="p-8 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre del Proyecto</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: Rediseño Web 2024"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={newProjectData.name}
                      onChange={e => setNewProjectData({...newProjectData, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descripción</label>
                    <textarea 
                      required
                      placeholder="¿De qué trata este proyecto?"
                      className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                      value={newProjectData.description}
                      onChange={e => setNewProjectData({...newProjectData, description: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Proceso</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                      value={newProjectData.processId}
                      onChange={e => setNewProjectData({...newProjectData, processId: e.target.value})}
                    >
                      <option value="">Seleccionar Proceso...</option>
                      {processes
                        .filter(p => {
                          const access = getModuleAccess(currentMember, roles, `projects_${p.id}`);
                          return access === 'lider' || access === 'administrador';
                        })
                        .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                      value={newProjectData.status}
                      onChange={e => setNewProjectData({...newProjectData, status: e.target.value as any})}
                    >
                      <option value="activo">Activo</option>
                      <option value="pausado">Pausado</option>
                      <option value="completado">Completado</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ciudad</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Quito, Guayaquil..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={newProjectData.city}
                      onChange={e => setNewProjectData({...newProjectData, city: e.target.value})}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                  >
                    {editingProject ? 'Guardar Cambios' : 'Crear Proyecto'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}

          {taskToDelete && (
            <DeleteTaskModal 
              task={taskToDelete}
              onClose={() => setTaskToDelete(null)}
              onConfirm={confirmDeleteTask}
            />
          )}

          {processToDelete && (
            <DeleteProcessModal 
              proc={processToDelete}
              members={members.filter(m => m.processId === processToDelete.id)}
              otherProcesses={processes.filter(p => p.id !== processToDelete.id)}
              reassignToId={reassignToId}
              setReassignToId={setReassignToId}
              onClose={() => setProcessToDelete(null)}
              onConfirm={confirmDeleteProcess}
            />
          )}

          {memberToDelete && (
            <DeleteMemberModal 
              member={memberToDelete}
              processName={processes.find(p => p.id === memberToDelete.processId)?.name || 'Sin Proceso'}
              onClose={() => setMemberToDelete(null)}
              onConfirm={confirmDeleteMember}
            />
          )}

          {isMemberAssistantOpen && (
            <MemberAssistantModal 
              onClose={() => {
                setIsMemberAssistantOpen(false);
                setSuggestedMemberDraft(null);
                setMemberAssistantInput('');
              }}
              input={memberAssistantInput}
              setInput={setMemberAssistantInput}
              onAnalyze={handleMemberAssistantAnalyze}
              isAnalyzing={isAnalyzingMemberInput}
              draft={suggestedMemberDraft}
              onApply={applyMemberDraft}
              onCancelDraft={() => setSuggestedMemberDraft(null)}
            />
          )}

          {viewingMember && (
            <MemberDetailsModal 
              member={viewingMember} 
              onClose={() => setViewingMember(null)} 
              tasks={tasks.filter(t => t.memberId === viewingMember.id && isTaskVisibleForMember(t, currentMember, roles))}
              process={processes.find(p => p.id === viewingMember.processId)}
              companies={companies}
              onUpdateMember={(updated) => {
                setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
                setViewingMember(updated);
              }}
            />
          )}
        </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Sub-components

function ProjectCard({ project, tasks, onEdit, onDelete, canEdit, canDelete }: { project: Project, tasks: Task[], onEdit: (p: Project) => void, onDelete: (id: string) => void, canEdit?: boolean, canDelete?: boolean, key?: string | number }) {
  const completedTasks = tasks.filter(t => t.status === 'done');
  const progress = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
  
  const statusColors = {
    activo: 'bg-green-100 text-green-600',
    pausado: 'bg-yellow-100 text-yellow-600',
    completado: 'bg-blue-100 text-blue-600'
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${statusColors[project.status]}`}>
          {project.status}
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
          {canEdit && (
            <button onClick={() => onEdit(project)} className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 rounded-xl transition-colors"><Edit size={14} /></button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(project.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-xl transition-colors"><Trash size={14} /></button>
          )}
        </div>
      </div>
      
      <h4 className="font-bold text-gray-900 mb-2 leading-tight">{project.name}</h4>
      {project.city && (
        <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">
          <MapPin size={10} />
          {project.city}
        </div>
      )}
      <p className="text-xs text-gray-500 mb-6 line-clamp-2 leading-relaxed">{project.description}</p>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between text-[10px] font-bold">
          <span className="text-gray-400 uppercase tracking-wider">Avance</span>
          <span className="text-gray-900">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className={`h-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-600'} transition-all`}
          />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
            <ListTodo size={12} />
            {completedTasks.length} / {tasks.length} Tareas
          </div>
          <div className="text-[10px] font-medium text-gray-400">
            Creado {new Date(project.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
        active 
        ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/20' 
        : 'text-ng-gray/60 hover:text-white hover:bg-white/5'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 20 })}
      <span>{label}</span>
    </button>
  );
}

function SubNavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
        active 
        ? 'text-ng-lime bg-ng-lime/10' 
        : 'text-ng-gray/40 hover:text-ng-gray/80 hover:bg-white/5'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-ng-gray shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-ng-green opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-ng-lime/10 text-ng-green rounded-lg">
          {icon}
        </div>
        <span className="text-xs font-bold text-ng-green bg-ng-lime/20 px-2.5 py-1 rounded-full uppercase leading-none">{trend}</span>
      </div>
      <h3 className="text-ng-black/40 text-[10px] font-black uppercase tracking-widest">{title}</h3>
      <div className="text-3xl font-black mt-1 text-ng-black">{value}</div>
    </div>
  );
}

function MemberAssistantModal({
  onClose,
  input,
  setInput,
  onAnalyze,
  isAnalyzing,
  draft,
  onApply,
  onCancelDraft
}: {
  onClose: () => void;
  input: string;
  setInput: (v: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  draft: MemberDraft | null;
  onApply: () => void;
  onCancelDraft: () => void;
}) {
  const [isRecording, setIsRecording] = useState(false);

  const startSpeech = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return alert("Tu navegador no soporta dictado por voz.");
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setInput(input ? input + ' ' + text : text);
    };
    recognition.start();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Asistente Maestro</h2>
              <p className="text-gray-500 text-sm">Gestiona el talento con la potencia de Gemini</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all text-gray-400 hover:text-gray-600 shadow-sm border border-transparent hover:border-gray-100">
            <X size={24} />
          </button>
        </div>

        <div className="p-10 space-y-6">
          {!draft ? (
            <div className="space-y-6">
              <div className="relative">
                <textarea 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ej: 'Añade a Sara como analista de datos...' u 'Oscar ahora es experto en SQL y ha mejorado su proactividad'"
                  className="w-full h-48 p-6 bg-gray-50 border border-gray-100 rounded-3xl text-gray-800 text-base leading-relaxed focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all resize-none shadow-inner"
                />
                <button 
                  onClick={startSpeech}
                  disabled={isRecording}
                  className={`absolute bottom-6 right-6 p-4 rounded-2xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-blue-600 hover:bg-blue-50 shadow-md'}`}
                >
                  <Mic size={20} />
                </button>
              </div>

              <button 
                onClick={onAnalyze}
                disabled={isAnalyzing || !input.trim()}
                className="w-full py-5 bg-[#2563EB] text-white font-bold rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analizando Perfiles...
                  </>
                ) : (
                  <>
                    <Zap size={20} />
                    Procesar con IA
                  </>
                )}
              </button>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl">
                <div className="flex items-center gap-3 mb-3 text-blue-700">
                  <Info size={18} />
                  <span className="font-bold uppercase text-[10px] tracking-widest">Cambios detectados</span>
                </div>
                <p className="text-blue-900 font-medium leading-relaxed">
                  {draft.explanation}
                </p>
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm overflow-hidden">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Vista Previa de Datos</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {draft.data.name && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase">Nombre</span>
                      <span className="font-bold text-gray-800">{draft.data.name}</span>
                    </div>
                  )}
                  {draft.data.role && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase">Rol</span>
                      <span className="font-bold text-gray-800">{draft.data.role}</span>
                    </div>
                  )}
                  {draft.data.skills && (
                    <div className="col-span-2 p-3 bg-gray-50 rounded-xl">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase">Nuevas Habilidades</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {draft.data.skills.map(s => <span key={s} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md">{s}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={onCancelDraft}
                  className="flex-1 py-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all"
                >
                  Modificar Entrada
                </button>
                <button 
                  onClick={onApply}
                  className="flex-1 py-4 bg-green-600 text-white font-bold rounded-2xl shadow-xl shadow-green-100 hover:bg-green-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  Confirmar Cambios
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function DeleteMemberModal({
  member,
  processName,
  onClose,
  onConfirm
}: {
  member: TeamMember;
  processName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center text-red-600 mb-6 shadow-inner">
              <UserMinus size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Eliminar Miembro</h2>
            <p className="text-gray-500 text-sm leading-relaxed px-4">
              ¿Estás seguro de que deseas eliminar a <span className="font-bold text-gray-800">{member.name}</span>? 
              <br />
              <span className="text-xs mt-1 block">Esta acción no se puede deshacer.</span>
            </p>
          </div>

          <div className="bg-gray-50 rounded-3xl p-6 mb-8 border border-gray-100/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-400 font-bold text-lg">
                {member.name.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">{member.role}</p>
                <p className="text-xs text-gray-500">{processName}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-xl shadow-red-100 hover:bg-red-700 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Eliminar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DeleteProcessModal({
  proc,
  members,
  otherProcesses,
  reassignToId,
  setReassignToId,
  onClose,
  onConfirm
}: {
  proc: Process;
  members: TeamMember[];
  otherProcesses: Process[];
  reassignToId: string;
  setReassignToId: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
              <Trash size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Eliminar Proceso</h2>
              <p className="text-gray-500 text-sm">Estás por eliminar "{proc.name}"</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-orange-600 mt-0.5 shrink-0" />
                <p className="text-orange-900 text-sm leading-relaxed">
                  Hay <strong>{members.length} miembros</strong> asignados a este proceso. ¿Qué deseas hacer con ellos?
                </p>
              </div>
            </div>

            {members.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block ml-1">Destino de los miembros</label>
                <div className="relative group">
                  <select 
                    value={reassignToId}
                    onChange={(e) => setReassignToId(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl appearance-none focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-700"
                  >
                    <option value="unassigned">Dejar sin proceso (Sin asignar)</option>
                    {otherProcesses.map(p => (
                      <option key={p.id} value={p.id}>Mover a: {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button 
                onClick={onClose}
                className="flex-1 py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={onConfirm}
                className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-xl shadow-red-100 hover:bg-red-700 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CompanyDetailsModal({ company, onClose, onEdit }: { company: Company, onClose: () => void, onEdit: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex justify-between items-start mb-10">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-slate-100 text-slate-600 rounded-[2rem]">
                <Building2 size={40} />
              </div>
              <div>
                <h2 className="text-4xl font-black text-gray-900 leading-tight">{company.name}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">RUC: {company.ruc}</span>
                  {company.website && (
                    <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink size={12} /> {company.website}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={onEdit} 
                className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all border border-blue-100/50 shadow-sm"
                title="Editar Compañía"
              >
                <Edit size={24} />
              </button>
              <button 
                onClick={onClose} 
                className="p-4 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-10">
              {company.description && (
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Info size={14} className="text-blue-500" /> Descripción General
                  </h3>
                  <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100/50">
                    <p className="text-gray-600 leading-relaxed font-medium">{company.description}</p>
                  </div>
                </section>
              )}

              <section className="space-y-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <MapPin size={14} className="text-blue-500" /> Sedes y Sucursales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-start gap-4 ring-1 ring-blue-500/5">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Matriz (Dirección Principal)</p>
                      <p className="text-gray-700 font-bold text-sm leading-snug">{company.mainAddress || company.address || 'No registrada'}</p>
                    </div>
                  </div>
                  {(company.branchAddresses || []).map((branch, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-start gap-4">
                      <div className="p-3 bg-gray-50 text-gray-400 rounded-2xl shrink-0">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Sucursal {idx + 1}</p>
                        <p className="text-gray-700 font-bold text-sm leading-snug">{branch}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {company.notes && (
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <AlertCircle size={14} className="text-blue-500" /> Observaciones Adicionales
                  </h3>
                  <div className="bg-amber-50/10 p-8 rounded-[2rem] border border-amber-100/30">
                    <p className="text-gray-600 text-sm">{company.notes}</p>
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-10">
              <section className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Sectores</h3>
                <div className="flex flex-wrap gap-2">
                  {(company.industries || []).map(ind => (
                    <span key={ind} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                      {ind}
                    </span>
                  ))}
                  {(!company.industries || company.industries.length === 0) && company.industry && (
                    <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                      {company.industry}
                    </span>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Datos de Contacto</h3>
                <div className="space-y-4">
                  {company.email && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all group">
                      <Mail className="text-gray-400 group-hover:text-blue-500" size={18} />
                      <span className="text-sm font-bold text-gray-700">{company.email}</span>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all group">
                      <Phone className="text-gray-400 group-hover:text-blue-500" size={18} />
                      <span className="text-sm font-bold text-gray-700">{company.phone}</span>
                    </div>
                  )}
                </div>
              </section>

              <div className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] shadow-xl text-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Sparkles size={16} />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em]">Análisis IA</h4>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  "Esta empresa tiene una fuerte presencia en {company.industries?.[0] || company.industry || 'varios sectores'}. Se recomienda mantener actualizadas las notas de seguimiento para mejorar la relación comercial."
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function MemberEditorView({
  editingMember,
  newMemberData,
  setNewMemberData,
  processes,
  companies,
  roles,
  onCancel,
  onSave
}: {
  editingMember: TeamMember | null;
  newMemberData: any;
  setNewMemberData: (data: any) => void;
  processes: Process[];
  companies: Company[];
  roles: Role[];
  onCancel: () => void;
  onSave: (e: React.FormEvent) => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden"
    >
      <div className="p-8 md:p-12">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-3xl ${editingMember ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
              {editingMember ? <Edit size={28} /> : <UserPlus size={28} />}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {editingMember ? 'Editar Perfil' : 'Añadir Nueva Persona'}
              </h2>
              <p className="text-gray-500">Configura la información detallada según el tipo de relación.</p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-3 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSave} className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
          <div className="space-y-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Clasificación y Contacto</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Tipo de Relación (Selecciona varias si aplica)</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'miembro', label: 'Miembro' },
                    { id: 'cliente', label: 'Cliente' },
                    { id: 'proveedor', label: 'Proveedor' },
                    { id: 'aliado', label: 'Aliado' },
                    { id: 'contacto', label: 'Contacto' },
                    { id: 'otro', label: 'Otro' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        const current = newMemberData.categories || [];
                        const updated = current.includes(cat.id as PersonCategory)
                          ? current.filter(c => c !== cat.id)
                          : [...current, cat.id as PersonCategory];
                        setNewMemberData({...newMemberData, categories: updated});
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        (newMemberData.categories || []).includes(cat.id as PersonCategory)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100'
                          : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Tipo de Cuenta (Permisos)</label>
                <select 
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium appearance-none"
                  value={newMemberData.isSystemAdmin ? 'admin' : 'custom'}
                  onChange={e => {
                    const isAdmin = e.target.value === 'admin';
                    setNewMemberData({
                      ...newMemberData, 
                      isSystemAdmin: isAdmin,
                      systemRoleId: isAdmin ? 'role-admin' : 'role-colaborador',
                      moduleAccess: isAdmin ? undefined : (newMemberData.moduleAccess || {
                        dashboard: 'lector',
                        tasks: 'colaborador',
                        planner: 'lector',
                        projects: 'ninguno',
                        directory: 'lector',
                        transcript: 'lector',
                        settings: 'ninguno'
                      })
                    });
                  }}
                >
                  <option value="custom">Acceso Personalizado / Colaborador</option>
                  <option value="admin">Administrador Global (Acceso Total)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Identificación / Pasaporte</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: 1729384756"
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium"
                  value={newMemberData.identificationId}
                  onChange={e => setNewMemberData({...newMemberData, identificationId: e.target.value})}
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 block">¿Posee RUC?</label>
                <div className="flex items-center gap-4">
                  <button 
                    type="button"
                    onClick={() => setNewMemberData({...newMemberData, hasRuc: !newMemberData.hasRuc})}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                      newMemberData.hasRuc 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                        : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    {newMemberData.hasRuc ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-gray-100" />}
                    <span className="text-xs font-bold uppercase tracking-tight">Sí, tiene RUC</span>
                  </button>
                  {newMemberData.hasRuc && (
                    <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-100 animate-in fade-in slide-in-from-left-2">
                       RUC: {newMemberData.identificationId}001
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nombre Completo</label>
              <input 
                type="text" 
                required
                placeholder="Ej: Juan Pérez"
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium"
                value={newMemberData.name}
                onChange={e => setNewMemberData({...newMemberData, name: e.target.value})}
              />
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Compañías y Cargos Asociados</label>
              <div className="space-y-3">
                {newMemberData.companyAssociations.map((assoc: any, index: number) => (
                  <div key={index} className="flex flex-col md:flex-row gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group animate-in fade-in slide-in-from-top-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide ml-1">Compañía</label>
                      <select 
                        className="w-full px-4 py-3 bg-white border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-all text-sm font-medium appearance-none"
                        value={assoc.companyId}
                        onChange={e => {
                          const updated = [...newMemberData.companyAssociations];
                          updated[index].companyId = e.target.value;
                          setNewMemberData({...newMemberData, companyAssociations: updated});
                        }}
                      >
                        <option value="">Seleccionar compañía...</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide ml-1">Cargo en esta empresa</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Consultor"
                        className="w-full px-4 py-3 bg-white border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-all text-sm font-medium"
                        value={assoc.role}
                        onChange={e => {
                          const updated = [...newMemberData.companyAssociations];
                          updated[index].role = e.target.value;
                          setNewMemberData({...newMemberData, companyAssociations: updated});
                        }}
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const updated = newMemberData.companyAssociations.filter((_: any, i: number) => i !== index);
                        setNewMemberData({...newMemberData, companyAssociations: updated});
                      }}
                      className="absolute -right-2 -top-2 md:relative md:right-0 md:top-0 p-2 bg-white text-red-400 hover:text-red-600 rounded-lg border border-gray-100 shadow-sm transition-all self-end mb-1"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
                
                <button 
                  type="button"
                  onClick={() => {
                    setNewMemberData({
                      ...newMemberData, 
                      companyAssociations: [...(newMemberData.companyAssociations || []), { companyId: '', role: '' }]
                    });
                  }}
                  className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 hover:text-blue-500 hover:border-blue-100 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2 group"
                >
                  <Plus size={18} className="group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold uppercase tracking-widest">Asociar Nueva Compañía</span>
                </button>
              </div>
            </div>

            {(newMemberData.categories || []).includes('miembro') && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Proceso Asignado</label>
                <select 
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium appearance-none"
                  value={newMemberData.processId}
                  onChange={e => setNewMemberData({...newMemberData, processId: e.target.value})}
                >
                  <option value="">Seleccionar proceso...</option>
                  <option value="unassigned">Sin asignar</option>
                  {processes.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
                <input 
                  type="email" 
                  placeholder="ejemplo@correo.com"
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium"
                  value={newMemberData.email}
                  onChange={e => setNewMemberData({...newMemberData, email: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Teléfono</label>
                <input 
                  type="tel" 
                  placeholder="+1 234 567 890"
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium"
                  value={newMemberData.phone}
                  onChange={e => setNewMemberData({...newMemberData, phone: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Competencias y Rol</h3>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Habilidades (separadas por coma)</label>
              <textarea 
                placeholder="Ej: Figma, React, Strategy"
                className="w-full h-24 px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium resize-none"
                value={newMemberData.skills}
                onChange={e => setNewMemberData({...newMemberData, skills: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Responsabilidades</label>
              <textarea 
                placeholder="Ej: Liderar diseño, Reportes semanales..."
                className="w-full h-24 px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium resize-none"
                value={newMemberData.responsibilities}
                onChange={e => setNewMemberData({...newMemberData, responsibilities: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Personalidad y Percepciones</label>
              <textarea 
                placeholder="Contexto sobre cómo trabaja el miembro..."
                className="w-full h-32 px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium resize-none"
                value={newMemberData.personality}
                onChange={e => setNewMemberData({...newMemberData, personality: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Notas Iniciales o Dictado</label>
              <textarea 
                placeholder="Observaciones adicionales, resúmenes o transcripciones..."
                className="w-full h-32 px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium resize-none"
                value={newMemberData.notes}
                onChange={e => setNewMemberData({...newMemberData, notes: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-orange-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <AlertCircle size={14} /> Equipos de Protección Personal (EPP)
              </label>
              <textarea 
                placeholder="Ej: Casco, Guantes, Botas dieléctricas, Gafas..."
                className="w-full h-32 px-6 py-4 bg-orange-50/20 border border-orange-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-orange-100 focus:bg-white focus:border-orange-200 transition-all text-gray-700 font-medium resize-none shadow-sm placeholder:text-orange-200"
                value={newMemberData.epp}
                onChange={e => setNewMemberData({...newMemberData, epp: e.target.value})}
              />
              <p className="text-[10px] text-gray-400 mt-1 ml-1 font-medium">Separa los elementos con comas para que se visualicen individualmente.</p>
            </div>
          </div>

          <div className="lg:col-span-2 pt-6 flex flex-col md:flex-row gap-4 border-t border-gray-50 mt-4">
            <button 
              type="button"
              onClick={onCancel}
              className="px-10 py-5 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all order-2 md:order-1"
            >
              Cancelar y Volver
            </button>
            <button 
              type="submit"
              className="flex-1 py-5 bg-[#2563EB] text-white font-bold rounded-[1.5rem] shadow-xl shadow-blue-100 hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.98] transition-all order-1 md:order-2 flex items-center justify-center gap-3"
            >
              <Check size={20} />
              {editingMember ? 'Guardar Cambios del Perfil' : 'Crear Perfil de Equipo'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

function AIInsightItem({ title, desc, time }: { title: string, desc: string, time: string }) {
  return (
    <div className="flex gap-4 group cursor-default">
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-ng-lime/10 flex items-center justify-center text-ng-green group-hover:bg-ng-lime group-hover:text-ng-black transition-colors duration-300">
          <MessageSquareQuote size={18} />
        </div>
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[1px] h-4 bg-ng-gray/20" />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="font-black text-ng-black text-sm">{title}</span>
          <span className="text-[10px] font-black text-ng-gray uppercase tracking-widest">{time}</span>
        </div>
        <p className="text-xs text-ng-black/60 leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  );
}

interface CompanyCardProps {
  company: Company;
  onEdit: (company: Company) => void;
  onDelete: (id: string) => void;
  key?: string | number;
}

function CompanyCard({ company, onEdit, onDelete }: CompanyCardProps) {
  return (
    <div className="bg-white rounded-[2rem] border border-[#E5E7EB] overflow-hidden shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 group">
      <div className="h-24 bg-gradient-to-r from-slate-700 to-slate-900 relative">
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button 
            onClick={() => onEdit(company)}
            className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all"
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={() => onDelete(company.id)}
            className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500/80 transition-all"
          >
            <Trash size={16} />
          </button>
        </div>
        <div className="absolute -bottom-6 left-6">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-gray-100">
            <Building2 size={32} className="text-slate-700" />
          </div>
        </div>
      </div>
      <div className="px-6 pt-10 pb-6">
        <div className="mb-4">
          <h4 className="text-lg font-bold text-[#111827]">{company.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RUC: {company.ruc}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {company.industries && company.industries.length > 0 ? (
              company.industries.map(ind => (
                <span key={ind} className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-md uppercase tracking-wide border border-slate-100">
                  {ind}
                </span>
              ))
            ) : company.industry ? (
              <span className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-md uppercase tracking-wide border border-slate-100">
                {company.industry}
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-50">
          {company.email && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Mail size={14} className="text-gray-400" />
              {company.email}
            </div>
          )}
          {company.phone && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Phone size={14} className="text-gray-400" />
              {company.phone}
            </div>
          )}
          {company.address && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <MapPin size={14} className="text-gray-400" />
              <span className="line-clamp-1">{company.address}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompanyEditorView({
  editingCompany,
  newCompanyData,
  setNewCompanyData,
  allIndustries,
  onCancel,
  onSave
}: {
  editingCompany: Company | null;
  newCompanyData: any;
  setNewCompanyData: (data: any) => void;
  allIndustries: Industry[];
  onCancel: () => void;
  onSave: (e: React.FormEvent) => void;
}) {
  const [industryInput, setIndustryInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addIndustry = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!(newCompanyData.industries || []).includes(trimmed)) {
      setNewCompanyData({
        ...newCompanyData, 
        industries: [...(newCompanyData.industries || []), trimmed]
      });
    }
    setIndustryInput('');
    setShowSuggestions(false);
  };

  const removeIndustry = (name: string) => {
    setNewCompanyData({
      ...newCompanyData,
      industries: (newCompanyData.industries || []).filter((i: string) => i !== name)
    });
  };

  const filteredSuggestions = allIndustries
    .filter(ind => normalizeText(ind.name).includes(normalizeText(industryInput)))
    .filter(ind => !(newCompanyData.industries || []).includes(ind.name));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden"
    >
      <div className="p-8 md:p-12">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-3xl ${editingCompany ? 'bg-slate-50 text-slate-600' : 'bg-green-50 text-green-600'}`}>
              {editingCompany ? <Building2 size={28} /> : <Plus size={28} />}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {editingCompany ? 'Editar Compañía' : 'Añadir Nueva Compañía'}
              </h2>
              <p className="text-gray-500">Registra una entidad jurídica o persona con RUC.</p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-3 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSave} className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
          <div className="space-y-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Identificación Legal</h3>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Razón Social / Nombre Comercial</label>
              <input 
                type="text" 
                required
                placeholder="Ej: Multinacional S.A."
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium"
                value={newCompanyData.name}
                onChange={e => setNewCompanyData({...newCompanyData, name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">RUC</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: 1790000000001"
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium"
                  value={newCompanyData.ruc}
                  onChange={e => setNewCompanyData({...newCompanyData, ruc: e.target.value})}
                />
              </div>

              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Industrias / Sectores</label>
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border border-transparent rounded-[1.5rem] focus-within:ring-4 focus-within:ring-slate-50 focus-within:bg-white focus-within:border-slate-100 transition-all min-h-[58px]">
                  {(newCompanyData.industries || []).map((ind: string) => (
                    <span key={ind} className="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 group">
                      {ind}
                      <button type="button" onClick={() => removeIndustry(ind)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input 
                    type="text" 
                    placeholder={(newCompanyData.industries || []).length > 0 ? "" : "Ej: Tecnología"}
                    className="flex-1 bg-transparent border-none outline-none text-gray-700 font-medium p-2 text-sm min-w-[100px]"
                    value={industryInput}
                    onChange={e => {
                      setIndustryInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addIndustry(industryInput);
                      }
                    }}
                  />
                </div>
                {showSuggestions && (industryInput || filteredSuggestions.length > 0) && (
                  <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-48 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200">
                    {filteredSuggestions.map(ind => (
                      <button
                        key={ind.id}
                        type="button"
                        onClick={() => addIndustry(ind.name)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl text-sm font-bold text-gray-700 transition-all flex items-center justify-between group"
                      >
                        {ind.name}
                        <Plus size={14} className="text-gray-300 group-hover:text-blue-500" />
                      </button>
                    ))}
                    {industryInput && !allIndustries.some(i => normalizeText(i.name) === normalizeText(industryInput)) && (
                      <button
                        type="button"
                        onClick={() => addIndustry(industryInput)}
                        className="w-full text-left px-4 py-3 bg-blue-50/50 hover:bg-blue-50 rounded-xl text-sm font-bold text-blue-600 transition-all flex items-center gap-2"
                      >
                        <Plus size={14} /> Añadir nueva industria: "{industryInput}"
                      </button>
                    )}
                    {filteredSuggestions.length === 0 && !industryInput && (
                      <div className="px-4 py-3 text-xs text-gray-400">Escribe para buscar o añadir...</div>
                    )}
                  </div>
                )}
                {showSuggestions && <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Descripción de la Compañía</label>
              <textarea 
                placeholder="Describe la actividad principal, historia o propuesta de valor de la empresa..."
                className="w-full h-32 px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium resize-none"
                value={newCompanyData.description}
                onChange={e => setNewCompanyData({...newCompanyData, description: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Dirección Matriz</label>
              <input 
                type="text" 
                placeholder="Ej: Av. Amazonas N32-123..."
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium"
                value={newCompanyData.mainAddress}
                onChange={e => setNewCompanyData({...newCompanyData, mainAddress: e.target.value})}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Sucursales</label>
                <button 
                  type="button"
                  onClick={() => setNewCompanyData({...newCompanyData, branchAddresses: [...(newCompanyData.branchAddresses || []), '']})}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline"
                >
                  <Plus size={12} /> Añadir Sucursal
                </button>
              </div>
              <div className="space-y-3">
                {(newCompanyData.branchAddresses || []).map((branch: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input 
                      type="text" 
                      placeholder={`Sucursal ${idx + 1}`}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-gray-100 transition-all text-sm"
                      value={branch}
                      onChange={e => {
                        const updated = [...newCompanyData.branchAddresses];
                        updated[idx] = e.target.value;
                        setNewCompanyData({...newCompanyData, branchAddresses: updated});
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const updated = newCompanyData.branchAddresses.filter((_: any, i: number) => i !== idx);
                        setNewCompanyData({...newCompanyData, branchAddresses: updated});
                      }}
                      className="p-2 text-gray-300 hover:text-red-500"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Contacto y Web</h3>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email Corporativo</label>
                <input 
                  type="email" 
                  placeholder="admin@compania.com"
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium"
                  value={newCompanyData.email}
                  onChange={e => setNewCompanyData({...newCompanyData, email: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Teléfono</label>
                <input 
                  type="tel" 
                  placeholder="+593 ..."
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium"
                  value={newCompanyData.phone}
                  onChange={e => setNewCompanyData({...newCompanyData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Sitio Web</label>
              <input 
                type="text" 
                placeholder="ej: novagreen.ec"
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium"
                value={newCompanyData.website}
                onChange={e => setNewCompanyData({...newCompanyData, website: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Notas Adicionales</label>
              <textarea 
                placeholder="Información relevante sobre la compañía..."
                className="w-full h-32 px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-slate-50 focus:bg-white focus:border-slate-100 transition-all text-gray-700 font-medium resize-none"
                value={newCompanyData.notes}
                onChange={e => setNewCompanyData({...newCompanyData, notes: e.target.value})}
              />
            </div>
          </div>

          <div className="lg:col-span-2 pt-6 flex flex-col md:flex-row gap-4 border-t border-gray-50 mt-4">
            <button 
              type="button"
              onClick={onCancel}
              className="px-10 py-5 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all order-2 md:order-1"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 py-5 bg-slate-800 text-white font-bold rounded-[1.5rem] shadow-xl shadow-slate-100 hover:bg-slate-900 transition-all order-1 md:order-2 flex items-center justify-center gap-3"
            >
              <Check size={20} />
              {editingCompany ? 'Actualizar Compañía' : 'Registrar Compañía'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

interface MemberProfileCardProps {
  member: TeamMember;
  processName: string;
  companies: Company[];
  roles: Role[];
  key?: string | number;
}

function MemberProfileCard({ member, processName, companies, roles }: MemberProfileCardProps) {
  const categoryColors = {
    miembro: 'bg-blue-50 text-blue-600 border-blue-100',
    cliente: 'bg-green-50 text-green-600 border-green-100',
    proveedor: 'bg-purple-50 text-purple-600 border-purple-100',
    aliado: 'bg-amber-50 text-amber-600 border-amber-100',
    contacto: 'bg-gray-50 text-gray-600 border-gray-100',
    otro: 'bg-slate-50 text-slate-600 border-slate-100'
  };

  return (
    <div className="bg-white rounded-[2rem] border border-[#E5E7EB] overflow-hidden shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 group">
      <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
        <div className="absolute top-4 right-4 flex flex-wrap gap-2 justify-end max-w-[120px]">
          {(member.categories || []).map(cat => (
            <span key={cat} className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border backdrop-blur-md ${categoryColors[cat] || 'bg-white/90'} shadow-sm`}>
              {cat}
            </span>
          ))}
          {(!member.categories || member.categories.length === 0) && (
            <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border backdrop-blur-md ${categoryColors[(member as any).category as PersonCategory || 'contacto']} shadow-sm`}>
              {(member as any).category || 'contacto'}
            </span>
          )}
        </div>
      </div>
      <div className="px-6 pb-6 relative">
        <img 
          src={member.avatar || `https://picsum.photos/seed/${member.name.replace(/\s/g, '')}/150/150`} 
          alt={member.name} 
          className="w-20 h-20 rounded-2xl border-4 border-white absolute -top-10 shadow-lg object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="pt-12">
          <h4 className="text-lg font-bold text-[#111827]">{member.name}</h4>
          <p className="text-sm text-gray-400 font-medium">{member.role}</p>
          
          <div className="mt-2 flex flex-col gap-1.5">
            {member.identificationId && (
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Contact size={10} className="text-blue-500" /> ID: {member.identificationId}
              </p>
            )}
            {member.ruc && (
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Zap size={10} className="text-amber-500" /> RUC: {member.ruc}
              </p>
            )}
            
            <div className="mt-1 space-y-1">
              {member.companyAssociations && member.companyAssociations.length > 0 ? (
                member.companyAssociations.map((assoc, idx) => {
                  const company = companies.find(c => c.id === assoc.companyId);
                  return (
                    <div key={idx} className="flex flex-col gap-0.5 p-2 bg-gray-50/50 rounded-xl border border-gray-100/50 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <Building2 size={10} className="text-blue-500 shrink-0" />
                        <span className="text-[9px] font-black text-gray-700 truncate uppercase tracking-tight">{company?.name || 'Independiente'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pl-3">
                        <User size={8} className="text-gray-400 shrink-0" />
                        <span className="text-[9px] font-medium text-gray-400 italic truncate">{assoc.role || 'Sin cargo'}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 text-[10px] font-bold text-gray-400 rounded-lg border border-gray-100/50">
                  <Building2 size={10} />
                  <span>Independiente</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-3 flex flex-wrap gap-2">
            {(member.isSystemAdmin || member.systemRoleId === 'role-admin') ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-[9px] font-black text-white rounded-full uppercase tracking-[0.1em] shadow-sm">
                <Shield size={10} />
                Administrador
              </div>
            ) : (member.moduleAccess) ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-[9px] font-black text-white rounded-full uppercase tracking-[0.1em] shadow-sm">
                <Shield size={10} />
                Acceso Personalizado
              </div>
            ) : member.systemRoleId ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-[9px] font-black text-white rounded-full uppercase tracking-[0.1em] shadow-sm">
                <Shield size={10} />
                {roles.find(r => r.id === member.systemRoleId)?.name || 'Sin Privilegios'}
              </div>
            ) : null}
            {processName !== 'Sin Proceso' && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[10px] font-black text-blue-600 rounded-full uppercase tracking-widest">
                <Layers size={10} />
                {processName}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Habilidades</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {member.skills.map(skill => (
                <span key={skill} className="px-2 py-1 bg-blue-50 text-[#2563EB] text-[10px] font-bold rounded-md">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Responsabilidades</span>
            <ul className="mt-2 space-y-1">
              {member.responsibilities.slice(0, 3).map((res, i) => (
                <li key={i} className="text-[11px] text-gray-600 flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-gray-300 mt-1.5" />
                  {res}
                </li>
              ))}
            </ul>
          </div>

          {member.epp && member.epp.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] uppercase font-bold text-orange-500 tracking-wider flex items-center gap-1">
                <AlertCircle size={10} /> EPP Requerido
              </span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {member.epp.map(item => (
                  <span key={item} className="px-2 py-0.5 bg-orange-50 text-orange-700 text-[9px] font-bold rounded-md border border-orange-100/50 uppercase">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {member.recentAchievements.length > 0 && (
            <div className="pt-4 border-t border-gray-50">
              <span className="text-[10px] uppercase font-bold text-green-500 tracking-wider flex items-center gap-1">
                <Sparkles size={10} /> Logro Reciente
              </span>
              <p className="text-[11px] text-gray-700 mt-1 font-medium">
                "{member.recentAchievements[0]}"
              </p>
            </div>
          )}

          {member.notes && (
            <div className="pt-4 border-t border-gray-50">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                <Info size={10} /> Notas
              </span>
              <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">
                {member.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProcessDetailCardProps {
  proc: Process;
  members: TeamMember[];
  onEdit: (proc: Process) => void;
  onDelete: (id: string) => void;
  key?: string | number;
}

function ProcessDetailCard({ proc, members, onEdit, onDelete }: ProcessDetailCardProps) {
  return (
    <div className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm group hover:shadow-md transition-all relative">
      <div className="absolute top-6 right-6 flex gap-2">
        <button 
          onClick={() => onEdit(proc)}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
          title="Editar Proceso"
        >
          <Edit size={18} />
        </button>
        <button 
          onClick={() => onDelete(proc.id)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          title="Eliminar Proceso"
        >
          <Trash size={18} />
        </button>
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-colors duration-500">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{proc.name}</h2>
              <p className="text-gray-500 text-sm">{members.length} Miembros activos</p>
            </div>
          </div>
          <p className="text-gray-600 leading-relaxed mb-6">
            {proc.description}
          </p>

          <div className="mt-6">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Equipo en este Proceso</h4>
            <div className="flex flex-wrap gap-3">
              {members.length > 0 ? (
                members.map(m => (
                  <div key={m.id} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                    <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <p className="text-[11px] font-bold text-gray-900 leading-none">{m.name}</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">{m.role}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No hay miembros asignados a este proceso.</p>
              )}
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 bg-gray-50 p-6 rounded-2xl">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Objetivos Estratégicos</h4>
          <div className="space-y-3">
            {proc.goals.map((goal, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                </div>
                <span className="text-xs text-gray-700 font-medium">{goal}</span>
              </div>
            ))}
            <button className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-[10px] font-bold text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-all flex items-center justify-center gap-2 mt-4">
              <Plus size={14} /> Sugerir Objetivo con IA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ 
  task, 
  allTasks,
  member, 
  auxiliary,
  auxiliaries,
  revisor,
  process, 
  project, 
  onUpdateStatus, 
  onEdit, 
  onDelete 
}: { 
  task: Task, 
  allTasks: Task[],
  member?: TeamMember, 
  auxiliary?: TeamMember,
  auxiliaries?: TeamMember[],
  revisor?: TeamMember,
  process?: Process, 
  project?: Project, 
  onUpdateStatus: (id: string, s: Task['status']) => void, 
  onEdit: (t: Task) => void, 
  onDelete: (id: string) => void, 
  key?: string | number 
}) {
  const statusConfig: Record<Task['status'], { label: string, color: string, next: Task['status'] | null, nextLabel: string }> = {
    backlog: { label: 'Product Backlog', color: 'bg-slate-100 text-slate-600', next: 'todo', nextLabel: 'Pasar a Por Hacer' },
    todo: { label: 'Por Hacer', color: 'bg-gray-100 text-gray-600', next: 'in_progress', nextLabel: 'Empezar' },
    in_progress: { label: 'En Progreso', color: 'bg-blue-100 text-blue-600', next: 'review', nextLabel: 'Enviar a Revisión' },
    blocked: { label: 'Bloqueada', color: 'bg-red-100 text-red-600', next: 'in_progress', nextLabel: 'Desbloquear' },
    review: { label: 'En Revisión', color: 'bg-purple-100 text-purple-600', next: 'done', nextLabel: 'Aprobar' },
    correction: { label: 'Para Corrección', color: 'bg-amber-100 text-amber-600', next: 'in_progress', nextLabel: 'Corregir' },
    done: { label: 'Completada', color: 'bg-green-100 text-green-600', next: null, nextLabel: '' },
    rejected: { label: 'Rechazada', color: 'bg-orange-100 text-orange-600', next: 'backlog', nextLabel: 'Restaurar a Backlog' }
  };

  const config = statusConfig[task.status] || statusConfig.backlog;
  const blockInfo = isTaskBlocked(task.id, allTasks);
  const auxMembers = auxiliaries || (auxiliary ? [auxiliary] : []);

  const getTrafficLight = () => {
    if (task.priority === 'meteoric_crash') {
      return {
        color: 'bg-black text-white border-black',
        label: '❗ METEORIC CRASH',
        dotClass: 'bg-black ring-4 ring-black/30 animate-pulse',
        desc: '¡🔴 ALERTA MÁXIMA: Dejar todo y enfocarse únicamente en esta tarea!'
      };
    }
    
    const targetDateStr = task.plannedDate || task.dueDate;
    if (!targetDateStr) {
      return {
        color: 'bg-gray-100 text-gray-500 border-gray-200',
        label: 'Sin planificar',
        dotClass: 'bg-gray-400',
        desc: 'Sin fecha de ejecución'
      };
    }
    
    const target = parseLocalDate(targetDateStr) || new Date();
    const now = new Date();
    
    // Clear hours for precise comparison
    target.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (task.status === 'done') {
      return {
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        label: 'Completada',
        dotClass: 'bg-emerald-500',
        desc: 'Completada con éxito'
      };
    }
    
    if (diffDays < 0) {
      return {
        color: 'bg-red-650 text-white border-red-750',
        label: 'Vencida',
        dotClass: 'bg-white animate-pulse',
        desc: `Retraso de ${Math.abs(diffDays)} día(s)`
      };
    } else if (diffDays === 0) {
      return {
        color: 'bg-red-100 text-red-700 border-red-300',
        label: 'Vence Hoy',
        dotClass: 'bg-red-650 animate-pulse',
        desc: 'Vence hoy mismo'
      };
    } else if (diffDays === 1) {
      return {
        color: 'bg-orange-100 text-orange-700 border-orange-300',
        label: 'Mañana',
        dotClass: 'bg-orange-500 animate-pulse',
        desc: 'Vence mañana'
      };
    } else if (diffDays <= 3) {
      return {
        color: 'bg-amber-100 text-amber-700 border-amber-300',
        label: `${diffDays} días rest.`,
        dotClass: 'bg-amber-500',
        desc: `Quedan ${diffDays} días para ejecutar`
      };
    } else {
      return {
        color: 'bg-green-100 text-green-700 border-green-200',
        label: 'A tiempo',
        dotClass: 'bg-green-500',
        desc: `Tiempo suficiente (${diffDays} días)`
      };
    }
  };

  const getPriorityBadge = () => {
    switch (task.priority) {
      case 'meteoric_crash':
        return { label: '☄️ Meteoric Crash', color: 'bg-black text-red-500 font-black border border-red-600/50 uppercase tracking-tighter text-[9px]' };
      case 'alta':
        return { label: '🔥 Alta', color: 'bg-red-50 text-red-600 font-bold border border-red-100' };
      case 'media':
        return { label: '⚡ Media', color: 'bg-blue-50 text-blue-600 font-bold border border-blue-100' };
      case 'baja':
        return { label: '🟢 Baja', color: 'bg-gray-50 text-gray-500 font-bold border border-gray-100' };
      default:
        return { label: '⚡ Media', color: 'bg-blue-50 text-blue-600 font-bold border border-blue-100' };
    }
  };

  const trafficLight = getTrafficLight();
  const priorityBadge = getPriorityBadge();
  const isMeteoricCrash = task.priority === 'meteoric_crash';

  return (
    <div className={`p-4 md:p-5 lg:p-4 rounded-[1.5rem] border transition-all duration-300 group relative flex flex-col justify-between h-[360px] cursor-pointer hover:-translate-y-1 ${
      isMeteoricCrash 
        ? 'bg-red-50/90 border-red-650 shadow-md shadow-red-200/50 hover:shadow-xl hover:shadow-red-200/80 hover:bg-red-50' 
        : 'bg-white border-gray-100 shadow-sm hover:shadow-lg'
    }`}>
      {/* Top Controls & Semáforo */}
      <div>
        <div className="flex items-center justify-between mb-2">
          {/* Traffic Light Dot Indicator */}
          <div className="flex items-center gap-1.5" title={trafficLight.desc}>
            <span className={`w-2.5 h-2.5 rounded-full ${trafficLight.dotClass}`} />
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">{trafficLight.label}</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }} 
              className="p-1.5 bg-white border border-gray-100 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-100 transition-all opacity-0 group-hover:opacity-100"
              title="Eliminar"
            >
              <Trash size={12} />
            </button>
          </div>
        </div>

        {/* Title & Priority Row */}
        <div className="mb-2">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${priorityBadge.color}`}>
              {priorityBadge.label}
            </span>
            {isMeteoricCrash && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-red-600 text-white uppercase tracking-widest animate-pulse">
                DEJAR TODO
              </span>
            )}
          </div>
          
          <h4 
            onClick={() => onEdit(task)} 
            className={`font-extrabold leading-snug cursor-pointer transition-colors text-sm line-clamp-2 hover:opacity-85 ${
              isMeteoricCrash ? 'text-red-950 font-black' : 'text-gray-900'
            }`}
            title="Detalles y edición"
          >
            {task.title}
          </h4>
        </div>

        {/* Short Text Area (Optimized to take less height) */}
        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
          {task.storyDescription || task.description || 'Sin descripción adicional.'}
        </p>

        {/* Metadata Dual Date Info Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50/50 rounded-xl p-2 border border-gray-100/50">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar size={8} className="text-blue-500" /> Planificada
            </p>
            <p className="text-[10px] font-extrabold text-gray-800 truncate uppercase mt-0.5" title={
              task.plannedEndDate 
                ? `Del ${task.plannedDate} al ${task.plannedEndDate}` 
                : task.plannedDate 
                  ? `Planificada para el ${task.plannedDate}` 
                  : 'Sin planificar'
            }>
              {task.plannedDate ? (
                task.plannedEndDate && task.plannedEndDate !== task.plannedDate ? (
                  `${parseLocalDate(task.plannedDate)?.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} al ${parseLocalDate(task.plannedEndDate)?.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`
                ) : (
                  parseLocalDate(task.plannedDate)?.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
                )
              ) : 'No asignada'}
            </p>
          </div>
          <div className="bg-gray-50/50 rounded-xl p-2 border border-gray-100/50">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar size={8} className="text-purple-500" /> Entrega (Due)
            </p>
            <p className="text-[10px] font-extrabold text-gray-800 truncate uppercase mt-0.5">
              {task.dueDate ? parseLocalDate(task.dueDate)?.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'Sin fecha'}
            </p>
          </div>
        </div>

        {/* Small Progress / Hours Stats */}
        <div className="flex items-center justify-between text-[10px] mb-3 px-1 text-gray-400 font-bold">
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>Horas Plan/Real:</span>
          </div>
          <span className="text-gray-900 font-extrabold">
            {task.actualHours || 0}h <span className="text-gray-300 font-medium">/ {task.plannedHours || 0}h</span>
          </span>
        </div>
      </div>

      {/* Bottom Information (Dependencies and Assignees) */}
      <div>
        {/* Status Indicators */}
        {(blockInfo.isBlocked || allTasks.filter(t => t.blockedByTaskIds?.includes(task.id)).length > 0) && (
          <div className="mb-2 space-y-1">
            {blockInfo.isBlocked && (
              <div className="flex items-center gap-1 bg-red-100/70 border border-red-200/50 text-[9px] font-bold text-red-700 px-2 py-0.5 rounded-lg animate-pulse">
                <Ban size={10} />
                <span className="uppercase truncate">Bloqueada por {blockInfo.blockers.length} {blockInfo.blockers.length === 1 ? 'tarea' : 'tareas'}</span>
              </div>
            )}
            {allTasks.filter(t => t.blockedByTaskIds?.includes(task.id)).length > 0 && (
              <div className="flex items-center gap-1 bg-blue-50 border border-blue-100 text-[9px] font-bold text-blue-700 px-2 py-0.5 rounded-lg">
                <Activity size={10} />
                <span className="uppercase truncate">Bloquea a {allTasks.filter(t => t.blockedByTaskIds?.includes(task.id)).length} tar.</span>
              </div>
            )}
          </div>
        )}

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1 mb-2.5 max-h-[46px] overflow-hidden">
          <div className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${config.color}`}>
            {config.label}
          </div>
          {revisor && (
            <div className="text-[8px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5" title={`Revisor: ${revisor.name}`}>
              <CheckCircle2 size={8} className="text-emerald-500" /> <span className="truncate max-w-[80px]">REV: {revisor.name.split(' ')[0]}</span>
            </div>
          )}
          {project && (
            <div className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5 truncate max-w-[90px]">
              <FolderKanban size={8} /> <span className="truncate">{project.name}</span>
            </div>
          )}
          {task.deliverables && task.deliverables.length > 0 && (
            <div className="text-[8px] font-black text-indigo-600 bg-indigo-50/70 border border-indigo-100/50 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
              <LinkIcon size={8} /> <span>{task.deliverables.length} ENT.</span>
            </div>
          )}
        </div>

        {/* Footer Row (Assignee and Next Step Action Button) */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          {/* Micro Member Profile Bubble */}
          <div className="flex items-center gap-2 max-w-[125px]" title={
            member 
              ? `Responsable: ${member.name}${auxMembers.length > 0 ? `\nAuxiliares:\n• ${auxMembers.map(a => a.name).join('\n• ')}` : ''}` 
              : 'Sin asignar'
          }>
            <div className="relative flex-shrink-0 flex items-center">
              {member ? (
                <img 
                  src={member.avatar} 
                  className="w-6 h-6 rounded-lg ring-1 ring-gray-100 object-cover" 
                  referrerPolicy="no-referrer" 
                  alt={member.name}
                />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                  <User size={10} />
                </div>
              )}
              {/* Stacked Auxiliaries */}
              {auxMembers.length > 0 && (
                <div className="absolute -bottom-1 -right-2.5 flex -space-x-1.5 bg-white/80 backdrop-blur-[2px] rounded-md pl-0.5 pb-0.5">
                  {auxMembers.slice(0, 3).map((aux, idx) => (
                    <img 
                      key={idx}
                      src={aux.avatar} 
                      className="w-3.5 h-3.5 rounded-md ring-[1px] ring-white grayscale object-cover hover:grayscale-0 hover:scale-110 hover:z-30 transition-all cursor-crosshair" 
                      referrerPolicy="no-referrer" 
                      alt={aux.name}
                      title={`Auxiliar: ${aux.name}`}
                      style={{ zIndex: 10 + idx }}
                    />
                  ))}
                  {auxMembers.length > 3 && (
                    <div 
                      className="w-3.5 h-3.5 rounded-md ring-[1px] ring-white bg-slate-200 border border-slate-350 flex items-center justify-center text-[7px] font-black text-slate-700"
                      title={`${auxMembers.length - 3} auxiliares más:\n• ${auxMembers.slice(3).map(a => a.name).join('\n• ')}`}
                      style={{ zIndex: 20 }}
                    >
                      +{auxMembers.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className="text-[10px] font-bold text-gray-700 truncate">{member ? member.name.split(' ')[0] : 'Sin asignar'}</span>
          </div>

          {/* Quick Action Button */}
          {task.status === 'review' ? (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => onUpdateStatus(task.id, 'correction')} 
                className="px-2 py-1.5 text-[9px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/50 rounded-xl transition-all uppercase tracking-wider cursor-pointer active:scale-95"
                title="Enviar a Corrección / Reclamar cambios"
              >
                Corregir
              </button>
              <button 
                onClick={() => onUpdateStatus(task.id, 'done')} 
                className="px-2.5 py-1.5 text-[9px] font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all uppercase tracking-wider cursor-pointer active:scale-95 flex items-center gap-0.5"
                title="Aprobar y Completar tarea"
              >
                Aprobar
              </button>
            </div>
          ) : (
            config.next && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(task.id, config.next!);
                }} 
                className={`px-3 py-1.5 text-[9px] font-black text-white rounded-xl transition-all flex items-center gap-1 uppercase tracking-wider ${
                  (config.next === 'in_progress' && blockInfo.isBlocked)
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-gray-900 hover:bg-blue-600'
                }`}
                title={config.next === 'in_progress' && blockInfo.isBlocked ? `Tarea bloqueada` : config.nextLabel}
              >
                {config.next === 'in_progress' && blockInfo.isBlocked ? <Lock size={10} /> : null}
                <span>{config.next === 'in_progress' && blockInfo.isBlocked ? 'BLOQ' : config.nextLabel.split(' ')[0]}</span>
                <ArrowRight size={10} />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteTaskModal({ task, onClose, onConfirm }: { task: Task, onClose: () => void, onConfirm: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden p-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
            <Trash size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar Tarea?</h2>
          <p className="text-gray-500 text-sm mb-8">
            Estás a punto de eliminar la tarea <span className="font-bold text-gray-700">"{task.title}"</span>. Esta acción no se puede deshacer.
          </p>
          
          <div className="flex w-full gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 py-3 px-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-100 transition-all"
            >
              Sí, Borrar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MemberDetailsModal({ 
  member, 
  onClose, 
  tasks, 
  process, 
  companies,
  onUpdateMember 
}: { 
  member: TeamMember, 
  onClose: () => void, 
  tasks: Task[], 
  process?: Process, 
  companies: Company[],
  onUpdateMember: (m: TeamMember) => void 
}) {
  const [localNotes, setLocalNotes] = useState(member.notes || '');
  const [localPersonality, setLocalPersonality] = useState(member.personality || '');
  const [localEmail, setLocalEmail] = useState(member.email || '');
  const [localPhone, setLocalPhone] = useState(member.phone || '');

  const saveChanges = () => {
    onUpdateMember({
      ...member,
      notes: localNotes,
      personality: localPersonality,
      email: localEmail,
      phone: localPhone
    });
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="relative h-48 bg-gradient-to-r from-blue-600 to-indigo-700">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-all">
            <X size={24} />
          </button>
          <div className="absolute -bottom-12 left-12 flex items-end gap-6">
            <img src={member.avatar} className="w-32 h-32 rounded-3xl border-8 border-white shadow-xl bg-white" />
            <div className="mb-4">
              <h2 className="text-3xl font-bold text-white mb-1">{member.name}</h2>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-lg backdrop-blur-md">{member.role}</span>
                <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-lg backdrop-blur-md uppercase">{process?.name}</span>
                {member.identificationId && (
                  <span className="px-3 py-1 bg-blue-500/30 text-white text-[10px] font-black rounded-lg backdrop-blur-md flex items-center gap-1.5 border border-white/10 uppercase tracking-widest">
                    <Contact size={12} /> {member.identificationId}
                  </span>
                )}
                {member.ruc && (
                  <span className="px-3 py-1 bg-amber-500/30 text-white text-[10px] font-black rounded-lg backdrop-blur-md flex items-center gap-1.5 border border-white/10 uppercase tracking-widest">
                    <Zap size={12} /> RUC: {member.ruc}
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {member.companyAssociations && member.companyAssociations.length > 0 ? (
                  member.companyAssociations.map((assoc, idx) => {
                    const company = companies?.find((c: any) => c.id === assoc.companyId) 
                      || { name: 'Independiente' }; 
                    return (
                      <div key={idx} className="px-3 py-1.5 bg-white/10 border border-white/10 rounded-xl backdrop-blur-md flex items-center gap-2">
                        <Building2 size={12} className="text-blue-300" />
                        <div className="flex flex-col leading-none">
                          <span className="text-[10px] font-black text-white uppercase tracking-tight">{company.name}</span>
                          <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest">{assoc.role || 'Sin cargo'}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest italic bg-white/5 px-3 py-1 rounded-lg">Independiente</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              {/* Profile Details */}
              <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <TrendingUp size={16} /> Perfil y Contacto
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Email</span>
                      <input 
                        type="email"
                        value={localEmail}
                        onChange={e => setLocalEmail(e.target.value)}
                        className="w-full mt-1 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Teléfono</span>
                      <input 
                        type="tel"
                        value={localPhone}
                        onChange={e => setLocalPhone(e.target.value)}
                        className="w-full mt-1 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Personalidad y Percepciones</span>
                    <textarea 
                      value={localPersonality}
                      onChange={e => setLocalPersonality(e.target.value)}
                      className="w-full mt-2 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all h-32 resize-none"
                      placeholder="Registra rasgos de personalidad, motivaciones..."
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Habilidades</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {member.skills.map(s => <span key={s} className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg">{s}</span>)}
                    </div>
                  </div>

                  {member.epp && member.epp.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-orange-500 uppercase flex items-center gap-1">
                        <AlertCircle size={10} /> Equipos de Protección Personal (EPP)
                      </span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {member.epp.map(item => (
                          <span key={item} className="px-3 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-lg border border-orange-100 uppercase">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <MessageSquareQuote size={16} /> Dictados y Notas
                </h3>
                <textarea 
                  value={localNotes}
                  onChange={e => setLocalNotes(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm leading-relaxed h-40 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  placeholder="Escribe o dicta observaciones adicionales aquí..."
                />
                <button className="mt-2 flex items-center gap-2 text-[#2563EB] text-xs font-bold hover:underline">
                  <Plus size={14} /> Añadir Dictado por Voz
                </button>
              </section>
            </div>

            <div className="space-y-8">
              {/* assigned tasks */}
              <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Tareas Asignadas</span>
                  <span className="text-xs font-bold">{tasks.length}</span>
                </h3>
                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <div className="p-8 bg-gray-50 rounded-2xl text-center text-gray-400 border border-dashed border-gray-200 text-sm">
                      Sin tareas activas asignadas.
                    </div>
                  ) : (
                    tasks.map(t => (
                      <div key={t.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-start gap-3 shadow-sm">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${
                          t.status === 'done' ? 'bg-green-500' : 
                          t.status === 'in_progress' ? 'bg-blue-500' : 
                          t.status === 'blocked' ? 'bg-red-500' : 
                          t.status === 'review' ? 'bg-purple-500' : 
                          t.status === 'rejected' ? 'bg-orange-500' : 
                          'bg-gray-300'
                        }`} />
                        <div>
                          <p className="text-sm font-bold text-gray-800">{t.title}</p>
                          <p className="text-[10px] text-gray-500">{t.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Sparkles size={16} /> Logros Recientes
                </h3>
                <div className="space-y-2">
                  {member.recentAchievements.map((a, i) => (
                    <div key={i} className="flex gap-2 text-xs text-gray-600 bg-green-50 p-3 rounded-xl border border-green-100">
                      <Sparkles size={14} className="text-green-500 shrink-0" />
                      {a}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50">
          <button onClick={onClose} className="px-6 py-2 text-gray-500 font-bold hover:text-gray-700">Cerrar</button>
          <button onClick={saveChanges} className="px-8 py-3 bg-[#2563EB] text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all">
            Guardar Perfil Completo
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
