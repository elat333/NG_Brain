import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import { useTaskManager } from './hooks/useTaskManager';
import { TaskModalsContainer } from './components/modals/TaskModalsContainer';
import { EyeOff, Video, AlignLeft, 
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
  Trash2,
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
  Bookmark,
  Briefcase,
  Bot,
  BookOpen,
  Target,
  Sliders,
  Package,
  Globe,
  UploadCloud,
  Megaphone,
  GraduationCap,
  BarChart2,
  LogOut,
  LayoutTemplate,
  PlusCircle,
  TableProperties,
  Maximize2,
  Monitor,
  Award,
  Link2,
  Boxes,
  HardHat,
  Wrench,
  ShieldCheck
, MoreVertical, Download, CheckSquare} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DollarSign } from 'lucide-react';
import { TeamMember, Process, ExtractedUpdates, Task, Project, SuggestedActivity, MemberDraft, Deliverable, Company, PersonCategory, Industry, Role, ProcessLink, ProcessNote, ManagementNote, ManagementStrategyData, ManagementAIGovernanceData, ProductItem } from './types';
import { initialMembers, initialProcesses, initialTasks, initialCompanies, initialIndustries, initialRoles, initialManagementNotes, initialManagementStrategy, initialManagementGovernance, initialProducts } from './lib/initialData';
import { processMemberInput } from './services/aiService';
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
  addDoc,
  onSnapshot, 
  query, 
  where,
  getDocs,
  OperationType,
  handleFirestoreError,
  User as FirebaseUser
} from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
// @ts-ignore
import companyLogo from './assets/images/ng brain ai.jpg';
import { ProcessDashboardView } from './components/processes/ProcessDashboardView';
import { TasksView } from './components/tasks/TasksView';
import { ManagementView } from './components/management/ManagementView';
import { ImportacionesView } from './components/importaciones/ImportacionesView';
import { MarketingView } from './components/marketing/MarketingView';
import { TrainingView } from './components/training/TrainingView';
import { SalesView } from './components/sales/SalesView';
import { AcreditacionView } from './components/acreditacion/AcreditacionView';
import { ProductsView } from './components/products/ProductsView';
import { QHSEView } from './components/qhse/QHSEView';
import { CompanyEditorView } from './components/common/CompanyEditorView';
import { MemberEditorView } from './components/common/MemberEditorView';
import { SettingsContainerView } from './components/settings/SettingsContainerView';
import { AppSidebar, NavButton, SubNavButton } from './components/layout/AppSidebar';
import { AppHeader } from './components/layout/AppHeader';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectsView } from './components/projects/ProjectsView';
import DirectoryView from './components/directory/DirectoryView';
import { PlannerView } from './components/planner/PlannerView';
import { TranscriptView } from './components/transcript/TranscriptView';
import { EntityModalsContainer } from './components/modals/EntityModalsContainer';
import { MarketingSubTab } from './components/MarketingModule';
import { CapacitacionSubTab } from './components/CapacitacionModule';
import { ProductSubTab } from './components/ProductosModule';
import { QHSESubTab } from './components/QHSEModule';
import { processAndCompressImage } from './lib/imageUtils';
import { normalizeText } from './lib/textUtils';
import { parseLocalDate } from './lib/dateUtils';
import { getModuleAccess, isTaskVisibleForMember, isTaskBlocked } from './lib/permissions';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>({ email: 'e.siavichay@novagreen.ec', uid: '123', displayName: 'Test User' } as any);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transcript' | 'tasks' | 'planner' | 'projects' | 'settings' | 'directory' | 'process_dashboard' | 'gerencia' | 'importaciones' | 'marketing' | 'ventas' | 'capacitacion' | 'acreditacion' | 'productos' | 'qhse'>('dashboard');
  const [expandedNavModule, setExpandedNavModule] = useState<string | null>(null);

  const toggleNavModule = (moduleKey: string, onNavigate?: () => void) => {
    if (expandedNavModule === moduleKey) {
      setExpandedNavModule(null);
    } else {
      setExpandedNavModule(moduleKey);
      if (onNavigate) {
        onNavigate();
      }
    }
  };
  const [ventasSubTab, setVentasSubTab] = useState<'links' | 'notes' | 'crm' | 'pipeline' | 'quotes' | 'goals'>('links');
  const [lastTab, setLastTab] = useState<string | null>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<'roles' | 'processes' | 'members' | 'general'>('general');
  const [showProcessPermissions, setShowProcessPermissions] = useState<boolean>(false);
  const [directorySubTab, setDirectorySubTab] = useState<'people' | 'companies' | 'industries'>('people');
  const [processSubTab, setProcessSubTab] = useState<'summary' | 'projects' | 'links' | 'notes'>('summary');
  const [managementSubTab, setManagementSubTab] = useState<'consultant' | 'notes' | 'strategy' | 'governance' | 'links'>('consultant');
  const [importacionesSubTab, setImportacionesSubTab] = useState<'products' | 'suppliers' | 'proformas' | 'upload_proforma'>('products');
  
  const [marketingSubTab, setMarketingSubTab] = useState<MarketingSubTab>('campaigns');
  const [capacitacionSubTab, setCapacitacionSubTab] = useState<CapacitacionSubTab>('calendar');
  const [acreditacionSubTab, setAcreditacionSubTab] = useState<'links' | 'notes' | 'allies' | 'certifications'>('links');
  const [productosSubTab, setProductosSubTab] = useState<ProductSubTab>('todos');
  const [qhseSubTab, setQhseSubTab] = useState<QHSESubTab>('links');

  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [showFicha, setShowFicha] = useState<boolean>(false);
  
  const [draftIsSystemAdmin, setDraftIsSystemAdmin] = useState<boolean>(false);
  const [draftModuleAccess, setDraftModuleAccess] = useState<Record<string, 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador'>>({});
  const [draftSupervisedMembersForLinks, setDraftSupervisedMembersForLinks] = useState<string[]>([]);
  const [draftCanViewAllCompanyLinks, setDraftCanViewAllCompanyLinks] = useState<boolean>(false);
  const [linksSupervisorSearch, setLinksSupervisorSearch] = useState<string>('');
  const [lastInitializedMemberId, setLastInitializedMemberId] = useState<string>('');
  const [pendingExitAction, setPendingExitAction] = useState<{
    type: 'tab' | 'subtab' | 'member';
    targetTab?: 'dashboard' | 'transcript' | 'tasks' | 'planner' | 'projects' | 'settings' | 'directory' | 'process_dashboard' | 'gerencia' | 'importaciones' | 'marketing' | 'ventas' | 'capacitacion' | 'acreditacion' | 'productos' | 'qhse';
    targetSettingsSubTab?: 'roles' | 'processes' | 'members' | 'general';
    targetMemberId?: string;
  } | null>(null);

  const [selectedRoleId, setSelectedRoleId] = useState<string>('role-admin');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [permSearch, setPermSearch] = useState<string>('');

  // Sincronización completa con Firestore y estado global
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
  } = useFirestoreSync(user);

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

  const currentMember = React.useMemo(() => {
    if (!user || !user.email) return null;
    const found = members.find(m => m.email?.toLowerCase() === user.email?.toLowerCase());
    if (found) {
      if (user.email.toLowerCase() === 'e.siavichay@novagreen.ec') {
        return { ...found, isSystemAdmin: true, systemRoleId: 'role-admin' };
      }
      return found;
    }

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

  const accessibleProcesses = React.useMemo(() => {
    if (!currentMember) return processes;
    const isSysAdmin = currentMember.isSystemAdmin || currentMember.systemRoleId === 'role-admin';
    const generalProcessDashboardAccess = getModuleAccess(currentMember, roles, 'process_dashboard', members.length === 0);

    if (isSysAdmin || generalProcessDashboardAccess === 'administrador') {
      return processes;
    }

    const filtered = processes.filter(p => {
      if (currentMember.processId === p.id) return true;

      const tasksAccess = getModuleAccess(currentMember, roles, `tasks_${p.id}`);
      const projectsAccess = getModuleAccess(currentMember, roles, `projects_${p.id}`);
      const processAccess = getModuleAccess(currentMember, roles, `process_${p.id}`);

      return tasksAccess !== 'ninguno' || projectsAccess !== 'ninguno' || processAccess !== 'ninguno';
    });

    if (filtered.length === 0 && processes.length > 0) {
      return processes;
    }

    return filtered;
  }, [processes, currentMember, roles, members.length]);

  const resolvedPermissionsMember = React.useMemo(() => {
    const filtered = sortedMembers.filter(m => (m.categories || []).includes('miembro'));
    return sortedMembers.find(m => m.id === selectedMemberId) || filtered[0];
  }, [selectedMemberId, sortedMembers]);

  useEffect(() => {
    if (resolvedPermissionsMember) {
      if (resolvedPermissionsMember.id !== lastInitializedMemberId) {
        setDraftIsSystemAdmin(resolvedPermissionsMember.isSystemAdmin || resolvedPermissionsMember.systemRoleId === 'role-admin');
        setDraftModuleAccess(resolvedPermissionsMember.moduleAccess || {});
        setDraftSupervisedMembersForLinks(resolvedPermissionsMember.supervisedMembersForLinks || []);
        setDraftCanViewAllCompanyLinks(resolvedPermissionsMember.canViewAllCompanyLinks || false);
        setLastInitializedMemberId(resolvedPermissionsMember.id);
      }
    } else {
      setDraftIsSystemAdmin(false);
      setDraftModuleAccess({});
      setDraftSupervisedMembersForLinks([]);
      setDraftCanViewAllCompanyLinks(false);
      setLastInitializedMemberId('');
    }
  }, [resolvedPermissionsMember, lastInitializedMemberId]);

  useEffect(() => {
    if (accessibleProcesses.length > 0) {
      const isCurrentlyAccessible = accessibleProcesses.some(p => p.id === selectedProcessId);
      if (!isCurrentlyAccessible || !selectedProcessId) {
        const memberProcess = accessibleProcesses.find(p => p.id === currentMember?.processId);
        if (memberProcess) {
          setSelectedProcessId(memberProcess.id);
        } else {
          setSelectedProcessId(accessibleProcesses[0].id);
        }
      }
    }
  }, [accessibleProcesses, selectedProcessId, currentMember]);

  const hasUnsavedPermissionsChanges = React.useMemo(() => {
    if (!resolvedPermissionsMember) return false;
    const originalIsAdmin = resolvedPermissionsMember.isSystemAdmin || resolvedPermissionsMember.systemRoleId === 'role-admin';
    if (draftIsSystemAdmin !== originalIsAdmin) return true;

    const originalCanViewAll = resolvedPermissionsMember.canViewAllCompanyLinks || false;
    if (draftCanViewAllCompanyLinks !== originalCanViewAll) return true;

    const originalSupervised = resolvedPermissionsMember.supervisedMembersForLinks || [];
    if (originalSupervised.length !== draftSupervisedMembersForLinks.length) return true;
    if (draftSupervisedMembersForLinks.some(id => !originalSupervised.includes(id))) return true;
    
    const originalAccess = resolvedPermissionsMember.moduleAccess || {};
    const allKeys = Array.from(new Set([...Object.keys(originalAccess), ...Object.keys(draftModuleAccess)]));
    for (const key of allKeys) {
      const origVal = originalAccess[key] || 'ninguno';
      const draftVal = draftModuleAccess[key] || 'ninguno';
      if (origVal !== draftVal) return true;
    }
    return false;
  }, [resolvedPermissionsMember, draftIsSystemAdmin, draftModuleAccess, draftSupervisedMembersForLinks, draftCanViewAllCompanyLinks]);

  const savePermissions = async (memberId: string) => {
    try {
      const finalRoleId = draftIsSystemAdmin ? 'role-admin' : 'role-colaborador';
      
      // Clean up general projects permission to enforce process-specific rules
      const cleanedModuleAccess = { ...draftModuleAccess };
      cleanedModuleAccess['projects'] = 'ninguno';

      await updateDoc(doc(db, 'members', memberId), {
        isSystemAdmin: draftIsSystemAdmin,
        systemRoleId: finalRoleId,
        moduleAccess: cleanedModuleAccess,
        supervisedMembersForLinks: draftSupervisedMembersForLinks,
        canViewAllCompanyLinks: draftCanViewAllCompanyLinks
      });
      // Force refresh on draft
      setLastInitializedMemberId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `members/${memberId}`);
    }
  };

  const handleTabClick = (tab: 'dashboard' | 'transcript' | 'tasks' | 'planner' | 'projects' | 'settings' | 'directory' | 'process_dashboard' | 'gerencia' | 'importaciones' | 'marketing' | 'ventas' | 'capacitacion' | 'acreditacion' | 'productos' | 'qhse', directorySub?: 'people' | 'companies' | 'industries' | 'calendar' | 'trainers' | 'physical_spaces' | 'virtual_spaces' | 'management' | 'crm' | 'pipeline' | 'quotes' | 'goals') => {
    if (activeTab === 'settings' && settingsSubTab === 'roles' && hasUnsavedPermissionsChanges) {
      setPendingExitAction({
        type: 'tab',
        targetTab: tab
      });
    } else {
      setActiveTab(tab);
      if (tab === 'directory' && directorySub) {
        setDirectorySubTab(directorySub as 'people' | 'companies' | 'industries');
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

  const handleCopyImage = async (imageUrl: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('Blob creation failed');
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          alert('Imagen copiada al portapapeles');
        } catch (err) {
          console.error('Error al escribir al portapapeles:', err);
          alert('No se pudo copiar la imagen. El navegador puede no soportarlo.');
        }
      }, 'image/png');
    } catch (err) {
      console.error('Error al procesar imagen para copiar:', err);
      alert('Hubo un error al preparar la imagen para copiar.');
    }
  };

  // Auto-redirect to first accessible tab if current Tab is restricted
  useEffect(() => {
    if (!currentMember) return;
    const access = getModuleAccess(currentMember, roles, activeTab, members.length === 0);
    if (access === 'ninguno') {
      const tabs: ('dashboard' | 'transcript' | 'tasks' | 'planner' | 'projects' | 'settings' | 'directory' | 'process_dashboard' | 'gerencia' | 'importaciones' | 'marketing')[] = [
        'dashboard', 'gerencia', 'process_dashboard', 'marketing', 'importaciones', 'tasks', 'planner', 'projects', 'directory', 'transcript', 'settings'
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

  const logoUrl = companyLogo;

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

  const [searchQuery, setSearchQuery] = useState('');
  const [taskViewMode, setTaskViewMode] = useState<'board' | 'list' | 'calendar'>('board');
  const [tasksSubTab, setTasksSubTab] = useState<'board' | 'permissions'>('board');
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [showAllDoneTasks, setShowAllDoneTasks] = useState<boolean>(false);
  const [showTaskMenu, setShowTaskMenu] = useState(false);
  const [showTimeInputs, setShowTimeInputs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Gestor desacoplado de lógica y modales de Tareas
  const {
    isAddingTask,
    setIsAddingTask,
    editingTask,
    setEditingTask,
    showTaskHistory,
    setShowTaskHistory,
    taskToDelete,
    setTaskToDelete,
    isDeletingTask,
    showUnsavedTaskChangesModal,
    setShowUnsavedTaskChangesModal,
    newTaskData,
    setNewTaskData,
    openAddTaskModal,
    openEditTask,
    createActivityAsTask,
    handleAddTask,
    handleUpdateTask,
    updateTaskStatus,
    handleDeleteTask,
    confirmDeleteTask,
    handleRequestCloseTaskModal,
    handleForceCloseTaskModal,
    isNewTask,
    isProcessLeader,
    canEditMetadataField,
    canEditStatusField,
    canEditPlanning,
    canEditExecution
  } = useTaskManager({
    tasks,
    projects,
    processes,
    members,
    roles,
    currentMember,
    getModuleAccess,
    isTaskBlocked,
    activeTab,
    setActiveTab,
    lastTab,
    setLastTab
  });

  const exportTasksBackup = (taskList: Task[]) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(taskList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `respaldo-tareas-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    description: '',
    processId: '',
    status: 'activo' as 'activo' | 'completado' | 'pausado',
    city: ''
  });

  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);

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


  const handleCreateCompanyForCRM = async (company: Partial<Company>): Promise<string> => {
    const id = `comp-${Date.now()}`;
    await setDoc(doc(db, 'companies', id), { ...company, id });
    return id;
  };

  const handleCreateMemberForCRM = async (member: Partial<TeamMember>): Promise<string> => {
    const id = `mem-${Date.now()}`;
    await setDoc(doc(db, 'members', id), { ...member, id });
    return id;
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

  
  const handleExportTasks = () => {
    const exportData = filteredTasks.map(t => ({
      id: t.id, title: t.title, description: t.description, status: t.status,
      priority: t.priority, plannedDate: t.plannedDate, dueDate: t.dueDate,
      plannedStartTime: t.plannedStartTime, plannedEndTime: t.plannedEndTime,
      actualEndDate: t.actualEndDate, plannedHours: t.plannedHours, actualHours: t.actualHours,
      processId: t.processId, memberId: t.memberId
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "tareas.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setShowTaskMenu(false);
  };

  const handleImportTasks = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          for (const task of data) {
            if (task.title && task.status) {
              await addDoc(collection(db, 'tasks'), {
                ...task,
                id: undefined, 
                createdAt: new Date().toISOString(),
              });
            }
          }
          alert('Tareas importadas exitosamente');
        }
      } catch (err) {
        alert('Error al importar tareas. Asegúrese de que sea un archivo JSON válido.');
      }
    };
    reader.readAsText(file);
    setShowTaskMenu(false);
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

    setIsAddingProject(false);
    setEditingProject(null);
    setNewProjectData({ name: '', description: '', processId: '', status: 'activo', city: '' });
  };

  const handleDeleteProject = (projOrId: Project | string) => {
    const proj = typeof projOrId === 'string' ? projects.find(p => p.id === projOrId) : projOrId;
    if (!proj) return;
    const access = getModuleAccess(currentMember, roles, proj.processId ? `projects_${proj.processId}` : 'projects');
    const isUserAdmin = currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin';
    if (!isUserAdmin && access !== 'administrador' && access !== 'lider') {
      alert('No tienes permisos suficientes para eliminar este proyecto.');
      return;
    }
    setProjectToDelete(proj);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeletingProject(true);
    try {
      await deleteDoc(doc(db, 'projects', projectToDelete.id));

      // Also clean up task associations if any
      const linkedTasks = tasks.filter(t => t.projectId === projectToDelete.id);
      for (const t of linkedTasks) {
        try {
          await updateDoc(doc(db, 'tasks', t.id), { projectId: '' });
        } catch {
          // Ignore individual unlinking errors
        }
      }
      setProjectToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'projects');
    } finally {
      setIsDeletingProject(false);
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

  const filteredMembers = useMemo(() => {
    return members.filter(m => 
      normalizeText(m.name).includes(normalizeText(searchQuery)) || 
      normalizeText(m.role).includes(normalizeText(searchQuery))
    );
  }, [members, searchQuery]);

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

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
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
  }, [tasks, searchQuery, activeProjectFilter, smartFilters, taskViewMode, tableFilters, currentMember, roles]);

  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];
    if (taskViewMode === 'list' && tableSort.column && tableSort.direction) {
      const { column, direction } = tableSort;
      const isAsc = direction === 'asc';
      
      list.sort((a, b) => {
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
    return list;
  }, [filteredTasks, taskViewMode, tableSort, processes, projects, members]);

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
      <AppSidebar
        logoUrl={logoUrl}
        activeTab={activeTab}
        expandedNavModule={expandedNavModule}
        setExpandedNavModule={setExpandedNavModule}
        toggleNavModule={toggleNavModule}
        handleTabClick={handleTabClick}
        getModuleAccess={getModuleAccess}
        currentMember={currentMember}
        roles={roles}
        user={user}
        members={members}
        logout={logout}
        bootstrapData={bootstrapData}
        isInitializingData={isInitializingData}
        localDataFound={localDataFound}
        migrateFromLocalStorage={migrateFromLocalStorage}
        isMigrating={isMigrating}
        tasksSubTab={tasksSubTab}
        setTasksSubTab={setTasksSubTab}
        handleExportTasks={handleExportTasks}
        fileInputRef={fileInputRef}
        processSubTab={processSubTab}
        setProcessSubTab={setProcessSubTab}
        managementSubTab={managementSubTab}
        setManagementSubTab={setManagementSubTab}
        acreditacionSubTab={acreditacionSubTab}
        setAcreditacionSubTab={setAcreditacionSubTab}
        capacitacionSubTab={capacitacionSubTab}
        setCapacitacionSubTab={setCapacitacionSubTab}
        qhseSubTab={qhseSubTab}
        setQhseSubTab={setQhseSubTab}
        marketingSubTab={marketingSubTab}
        setMarketingSubTab={setMarketingSubTab}
        ventasSubTab={ventasSubTab}
        setVentasSubTab={setVentasSubTab}
        productosSubTab={productosSubTab}
        setProductosSubTab={setProductosSubTab}
        directorySubTab={directorySubTab}
        setDirectorySubTab={setDirectorySubTab}
        importacionesSubTab={importacionesSubTab}
        setImportacionesSubTab={setImportacionesSubTab}
        settingsSubTab={settingsSubTab}
        handleSettingsSubTabClick={handleSettingsSubTabClick}
      />
      {/* Main Content */}
      <main className="md:ml-64 h-screen flex flex-col overflow-hidden">
        <AppHeader
          activeTab={activeTab}
          settingsSubTab={settingsSubTab}
          setSettingsSubTab={setSettingsSubTab}
          isReadOnly={isReadOnly}
          selectedProcessId={selectedProcessId}
          setSelectedProcessId={setSelectedProcessId}
          processes={processes}
          processSubTab={processSubTab}
          setProcessSubTab={setProcessSubTab}
          tasksSubTab={tasksSubTab}
          setTasksSubTab={setTasksSubTab}
          taskViewMode={taskViewMode}
          setTaskViewMode={setTaskViewMode}
          openTaskModal={() => openAddTaskModal('backlog')}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          members={members}
          currentMember={currentMember}
          tasks={tasks}
          filteredTasks={filteredTasks}
          directorySubTab={directorySubTab}
          setDirectorySubTab={setDirectorySubTab}
          managementSubTab={managementSubTab}
          setManagementSubTab={setManagementSubTab}
          acreditacionSubTab={acreditacionSubTab}
          setAcreditacionSubTab={setAcreditacionSubTab}
          capacitacionSubTab={capacitacionSubTab}
          setCapacitacionSubTab={setCapacitacionSubTab}
          qhseSubTab={qhseSubTab}
          setQhseSubTab={setQhseSubTab}
          importacionesSubTab={importacionesSubTab}
          setImportacionesSubTab={setImportacionesSubTab}
          marketingSubTab={marketingSubTab}
          setMarketingSubTab={setMarketingSubTab}
          ventasSubTab={ventasSubTab}
          setVentasSubTab={setVentasSubTab}
          productosSubTab={productosSubTab}
          setProductosSubTab={setProductosSubTab}
          isInitializingData={isInitializingData}
          localDataFound={localDataFound}
          isMigrating={isMigrating}
          bootstrapData={bootstrapData}
          migrateFromLocalStorage={migrateFromLocalStorage}
          handleExportTasks={handleExportTasks}
          fileInputRef={fileInputRef}
          accessibleProcesses={accessibleProcesses}
          showFicha={showFicha}
          setShowFicha={setShowFicha}
          projects={projects}
          roles={roles}
          getModuleAccess={getModuleAccess}
          smartFilters={smartFilters}
          setSmartFilters={setSmartFilters}
          showSmartDropdown={showSmartDropdown}
          setShowSmartDropdown={setShowSmartDropdown}
          activeSuggestionCategory={activeSuggestionCategory}
          setActiveSuggestionCategory={setActiveSuggestionCategory}
          sortedMembers={sortedMembers}
          isAddingMember={isAddingMember}
          editingMember={editingMember}
          setEditingMember={setEditingMember}
          setNewMemberData={setNewMemberData}
          setIsAddingMember={setIsAddingMember}
          setIsMemberAssistantOpen={setIsMemberAssistantOpen}
          setEditingProcess={setEditingProcess}
          setNewProcessData={setNewProcessData}
          setIsAddingProcess={setIsAddingProcess}
          showCompletedProjects={showCompletedProjects}
          setShowCompletedProjects={setShowCompletedProjects}
          canCreateProjects={canCreateProjects}
          setEditingProject={setEditingProject}
          setNewProjectData={setNewProjectData}
          setIsAddingProject={setIsAddingProject}
          isAddingTask={isAddingTask}
          editingTask={editingTask}
          handleImportTasks={handleImportTasks}
          exportTasksBackup={exportTasksBackup}
          setEditingCompany={setEditingCompany}
          setNewCompanyData={setNewCompanyData}
          setIsAddingCompany={setIsAddingCompany}
        />

        <div className={`flex-1 ${activeTab === 'gerencia' && managementSubTab === 'consultant' ? 'overflow-hidden flex flex-col p-4 md:p-6' : 'overflow-y-auto custom-scrollbar ' + (activeTab === 'tasks' || (activeTab === 'gerencia' && (managementSubTab === 'notes' || managementSubTab === 'links')) || (activeTab === 'marketing' && (marketingSubTab === 'notes' || marketingSubTab === 'links')) || (activeTab === 'ventas' && (ventasSubTab === 'notes' || ventasSubTab === 'links')) || (activeTab === 'capacitacion' && (capacitacionSubTab === 'notes' || capacitacionSubTab === 'links')) || (activeTab === 'acreditacion' && (acreditacionSubTab === 'notes' || acreditacionSubTab === 'links')) || (activeTab === 'qhse' && (qhseSubTab === 'notes' || qhseSubTab === 'links')) || (activeTab === 'importaciones' && ((importacionesSubTab as any) === 'notes' || (importacionesSubTab as any) === 'links')) || (activeTab === 'productos' && ((productosSubTab as any) === 'notes' || (productosSubTab as any) === 'links')) ? 'pt-2.5 px-6 pb-6' : 'p-6')}`}>
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
                         activeTab === 'gerencia' ? 'Gerencia' :
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
              <motion.div
                key={`tab-view-${activeTab}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="w-full"
              >
                {activeTab === 'gerencia' && (
                  <ManagementView
                    currentMember={currentMember}
                    members={members}
                    processes={processes}
                    notes={managementNotes}
                    strategy={managementStrategy}
                    governance={managementGovernance}
                    onUpdateNotes={handleUpdateManagementNotes}
                    onUpdateStrategy={handleUpdateManagementStrategy}
                    onUpdateGovernance={handleUpdateManagementGovernance}
                    accessLevel={getModuleAccess(currentMember, roles, 'gerencia')}
                    activeSubTab={managementSubTab}
                    setActiveSubTab={setManagementSubTab}
                  />
                )}
                {activeTab === 'process_dashboard' && (
                  <ProcessDashboardView
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
                    onOpenTask={openEditTask}
                  />
                )}                {activeTab === 'ventas' && (
                  <SalesView
                    currentMember={currentMember}
                    members={members}
                    companies={companies}
                    processes={processes}
                    activeSubTab={ventasSubTab}
                    onSubTabChange={(tab) => setVentasSubTab(tab)}
                    onCreateCompany={handleCreateCompanyForCRM}
                    onCreateMember={handleCreateMemberForCRM}
                  />
                )}
                {activeTab === 'capacitacion' && (
                  <TrainingView
                    currentMember={currentMember}
                    activeSubTab={capacitacionSubTab}
                    onSubTabChange={(tab) => setCapacitacionSubTab(tab)}
                    members={members}
                    onCreateMember={handleCreateMemberForCRM}
                  />
                )}
                {activeTab === 'acreditacion' && (
                  <AcreditacionView
                    currentMember={currentMember}
                    members={members}
                    companies={companies}
                    industries={industries}
                    activeSubTab={acreditacionSubTab}
                    onSubTabChange={(tab) => setAcreditacionSubTab(tab)}
                  />
                )}
                {activeTab === 'productos' && (
                  <ProductsView
                    currentMember={currentMember}
                    products={products}
                    companies={companies}
                    members={members}
                    activeSubTab={productosSubTab}
                    onSubTabChange={(tab) => setProductosSubTab(tab)}
                    accessLevel={getModuleAccess(currentMember, roles, 'productos')}
                  />
                )}
                {activeTab === 'qhse' && (
                  <QHSEView
                    currentMember={currentMember}
                    members={members}
                    companies={companies}
                    activeSubTab={qhseSubTab}
                    onSubTabChange={(tab) => setQhseSubTab(tab)}
                    accessLevel={getModuleAccess(currentMember, roles, 'qhse')}
                  />
                )}
                {activeTab === 'importaciones' && (
                  <ImportacionesView
                    companies={companies}
                    currentMember={currentMember}
                    accessLevel={getModuleAccess(currentMember, roles, 'importaciones')}
                    activeSubTab={importacionesSubTab}
                    onSubTabChange={(tab) => setImportacionesSubTab(tab)}
                  />
                )}
                {activeTab === 'marketing' && (
                  <MarketingView
                    currentMember={currentMember}
                    members={members}
                    processes={processes}
                    tasks={tasks}
                    projects={projects}
                    companies={companies}
                    accessLevel={getModuleAccess(currentMember, roles, 'marketing')}
                    activeSubTab={marketingSubTab}
                    onSubTabChange={(tab) => setMarketingSubTab(tab)}
                    onAddTask={async (taskData) => {
                      const taskId = taskData.id || `task-${Date.now()}`;
                      await setDoc(doc(db, 'tasks', taskId), { ...taskData, id: taskId });
                      return taskId;
                    }}
                    onAddProject={async (projData) => {
                      const pId = projData.id || `proj-${Date.now()}`;
                      await setDoc(doc(db, 'projects', pId), { ...projData, id: pId });
                      return pId;
                    }}
                    onOpenTask={openEditTask}
                    onOpenCreateTaskModal={(initialOverrides) => openAddTaskModal('backlog', initialOverrides)}
                  />
                )}
                {activeTab === 'dashboard' && (
                  <DashboardView
                    members={members}
                    processes={processes}
                    onNavigateToTranscript={() => handleTabClick('transcript')}
                    onNavigateToProcess={(processId) => {
                      setSelectedProcessId(processId);
                      handleTabClick('process_dashboard');
                    }}
                  />
                )}

          {activeTab === 'directory' && (
            <DirectoryView
              directorySubTab={directorySubTab}
              setDirectorySubTab={setDirectorySubTab}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              members={members}
              sortedMembers={sortedMembers}
              companies={companies}
              industries={industries}
              setIndustries={setIndustries}
              processes={processes}
              roles={roles}
              isAddingMember={isAddingMember}
              setIsAddingMember={setIsAddingMember}
              editingMember={editingMember}
              setEditingMember={setEditingMember}
              newMemberData={newMemberData}
              setNewMemberData={setNewMemberData}
              handleAddMember={handleAddMember}
              openEditMember={openEditMember}
              handleDeleteMember={handleDeleteMember}
              isAddingCompany={isAddingCompany}
              setIsAddingCompany={setIsAddingCompany}
              editingCompany={editingCompany}
              setEditingCompany={setEditingCompany}
              newCompanyData={newCompanyData}
              setNewCompanyData={setNewCompanyData}
              handleAddCompany={handleAddCompany}
              openEditCompany={openEditCompany}
              handleDeleteCompany={handleDeleteCompany}
              setViewingCompany={setViewingCompany}
              normalizeText={normalizeText}
            />
          )}

          {activeTab === 'transcript' && (
            <TranscriptView 
              members={members}
              processes={processes}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
            />
          )}
          {activeTab === 'projects' && (
            <ProjectsView
              processes={processes}
              projects={projects}
              tasks={tasks}
              currentMember={currentMember}
              roles={roles}
              showCompletedProjects={showCompletedProjects}
              getModuleAccess={getModuleAccess}
              isTaskVisibleForMember={isTaskVisibleForMember}
              openEditProject={openEditProject}
              handleDeleteProject={handleDeleteProject}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              filteredTasks={filteredTasks}
              sortedTasks={sortedTasks}
              members={members}
              sortedMembers={sortedMembers}
              processes={processes}
              projects={projects}
              tasksSubTab={tasksSubTab}
              taskViewMode={taskViewMode}
              tableFilters={tableFilters}
              setTableFilters={setTableFilters}
              tableSort={tableSort}
              setTableSort={setTableSort}
              handleTableSort={handleTableSort}
              collapsedColumns={collapsedColumns}
              setCollapsedColumns={setCollapsedColumns}
              showAllDoneTasks={showAllDoneTasks}
              setShowAllDoneTasks={setShowAllDoneTasks}
              openAddTaskModal={openAddTaskModal}
              openEditTask={openEditTask}
              updateTaskStatus={updateTaskStatus}
              handleDeleteTask={handleDeleteTask}
              parseLocalDate={parseLocalDate}
            />
          )}

          {activeTab === 'planner' && (
            <PlannerView 
              members={members}
              processes={processes}
              onCreateActivityAsTask={createActivityAsTask}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsContainerView
              settingsSubTab={settingsSubTab}
              members={members}
              sortedMembers={sortedMembers}
              processes={processes}
              companies={companies}
              roles={roles}
              permSearch={permSearch}
              setPermSearch={setPermSearch}
              selectedMemberId={selectedMemberId}
              handleMemberClick={handleMemberClick}
              draftIsSystemAdmin={draftIsSystemAdmin}
              setDraftIsSystemAdmin={setDraftIsSystemAdmin}
              draftModuleAccess={draftModuleAccess}
              setDraftModuleAccess={setDraftModuleAccess}
              hasUnsavedPermissionsChanges={hasUnsavedPermissionsChanges}
              savePermissions={savePermissions}
              setLastInitializedMemberId={setLastInitializedMemberId}
              draftCanViewAllCompanyLinks={draftCanViewAllCompanyLinks}
              setDraftCanViewAllCompanyLinks={setDraftCanViewAllCompanyLinks}
              draftSupervisedMembersForLinks={draftSupervisedMembersForLinks}
              setDraftSupervisedMembersForLinks={setDraftSupervisedMembersForLinks}
              linksSupervisorSearch={linksSupervisorSearch}
              setLinksSupervisorSearch={setLinksSupervisorSearch}
              setIsAddingProcess={setIsAddingProcess}
              setEditingProcess={setEditingProcess}
              setNewProcessData={setNewProcessData}
              openEditProcess={openEditProcess}
              handleDeleteProcess={handleDeleteProcess}
              isAddingMember={isAddingMember}
              setIsAddingMember={setIsAddingMember}
              editingMember={editingMember}
              setEditingMember={setEditingMember}
              newMemberData={newMemberData}
              setNewMemberData={setNewMemberData}
              handleAddMember={handleAddMember}
              openEditMember={openEditMember}
              handleDeleteMember={handleDeleteMember}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              normalizeText={normalizeText}
            />
          )}
              </motion.div>
            )}
        </AnimatePresence>

        <EntityModalsContainer
          isAddingProcess={isAddingProcess}
          editingProcess={editingProcess}
          newProcessData={newProcessData}
          setNewProcessData={setNewProcessData}
          onAddProcess={handleAddProcess}
          onCloseProcessModal={() => {
            setIsAddingProcess(false);
            setEditingProcess(null);
          }}
          isAddingProject={isAddingProject}
          editingProject={editingProject}
          newProjectData={newProjectData}
          setNewProjectData={setNewProjectData}
          processes={processes}
          currentMember={currentMember}
          roles={roles}
          getModuleAccess={getModuleAccess}
          onUpdateProject={handleUpdateProject}
          onAddProject={handleAddProject}
          onCloseProjectModal={() => {
            setIsAddingProject(false);
            setEditingProject(null);
          }}
          projectToDelete={projectToDelete}
          tasks={tasks}
          isDeletingProject={isDeletingProject}
          onConfirmDeleteProject={confirmDeleteProject}
          onCancelDeleteProject={() => setProjectToDelete(null)}
          pendingExitAction={pendingExitAction}
          resolvedPermissionsMember={resolvedPermissionsMember}
          onCancelPendingExit={() => setPendingExitAction(null)}
          onDiscardPendingExit={() => {
            setLastInitializedMemberId('');
            const action = pendingExitAction;
            setPendingExitAction(null);
            if (action) {
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
            }
          }}
          onSavePendingExit={async () => {
            if (resolvedPermissionsMember) {
              await savePermissions(resolvedPermissionsMember.id);
            }
            const action = pendingExitAction;
            setPendingExitAction(null);
            if (action) {
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
            }
          }}
        />

        <TaskModalsContainer
          isAddingTask={isAddingTask}
          editingTask={editingTask}
          newTaskData={newTaskData}
          setNewTaskData={setNewTaskData}
          handleAddTask={handleAddTask}
          handleUpdateTask={handleUpdateTask}
          handleRequestCloseTaskModal={handleRequestCloseTaskModal}
          handleForceCloseTaskModal={handleForceCloseTaskModal}
          currentMember={currentMember}
          roles={roles}
          processes={processes}
          projects={projects}
          members={members}
          tasks={tasks}
          isNewTask={isNewTask}
          isProcessLeader={isProcessLeader}
          canEditMetadataField={canEditMetadataField}
          canEditStatusField={canEditStatusField}
          canEditPlanning={canEditPlanning}
          canEditExecution={canEditExecution}
          showTaskHistory={showTaskHistory}
          setShowTaskHistory={setShowTaskHistory}
          setTasks={setTasks}
          setEditingTask={setEditingTask}
          handleDeleteTask={handleDeleteTask}
          showUnsavedTaskChangesModal={showUnsavedTaskChangesModal}
          setShowUnsavedTaskChangesModal={setShowUnsavedTaskChangesModal}
          taskToDelete={taskToDelete}
          isDeletingTask={isDeletingTask}
          confirmDeleteTask={confirmDeleteTask}
          setTaskToDelete={setTaskToDelete}
        />
      </div>
    </main>
  </div>
  );
}
