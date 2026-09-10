import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppData } from './hooks/useAppData';
import { useTaskManager } from './hooks/useTaskManager';
import { useEntityManager } from './hooks/useEntityManager';
import { useNavigationGuard } from './hooks/useNavigationGuard';
import { usePermissionsManager } from './hooks/usePermissionsManager';
import { TaskModalsContainer } from './components/modals/TaskModalsContainer';
import { GlobalModals } from './components/common/GlobalModals';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TeamMember, Process, Task, Project, Company, 
  Industry, Role, ProcessLink, ProcessNote, ManagementNote, 
  ManagementStrategyData, ManagementAIGovernanceData, ProductItem 
} from './types';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  doc, 
  setDoc, 
  updateDoc, 
  OperationType, 
  handleFirestoreError, 
  User as FirebaseUser 
} from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
// @ts-ignore
import companyLogo from './assets/images/ng brain ai.jpg';
import { AppSidebar } from './components/layout/AppSidebar';
import { AppHeader } from './components/layout/AppHeader';
import { AppMainContent } from './components/layout/AppMainContent';
import { EntityModalsContainer } from './components/modals/EntityModalsContainer';
import { MarketingSubTab } from './components/MarketingModule';
import { CapacitacionSubTab } from './components/CapacitacionModule';
import { ProductSubTab } from './components/ProductosModule';
import { QHSESubTab } from './components/QHSEModule';
import { normalizeText } from './lib/textUtils';
import { parseLocalDate } from './lib/dateUtils';
import { getModuleAccess, isTaskVisibleForMember, isTaskBlocked } from './lib/permissions';
import { exportTasksBackup, exportTasksToCsv, handleImportTasksFromFile, copyImageToClipboard } from './lib/taskExportUtils';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useTaskFilters } from './hooks/useTaskFilters';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>({ email: 'e.siavichay@novagreen.ec', uid: '123', displayName: 'Test User' } as any);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Hook desacoplado de navegación y sub-pestañas
  const {
    activeTab,
    setActiveTab,
    lastTab,
    setLastTab,
    expandedNavModule,
    setExpandedNavModule,
    toggleNavModule,
    tasksSubTab,
    setTasksSubTab,
    ventasSubTab,
    setVentasSubTab,
    settingsSubTab,
    setSettingsSubTab,
    directorySubTab,
    setDirectorySubTab,
    processSubTab,
    setProcessSubTab,
    managementSubTab,
    setManagementSubTab,
    importacionesSubTab,
    setImportacionesSubTab,
    marketingSubTab,
    setMarketingSubTab,
    capacitacionSubTab,
    setCapacitacionSubTab,
    acreditacionSubTab,
    setAcreditacionSubTab,
    productosSubTab,
    setProductosSubTab,
    qhseSubTab,
    setQhseSubTab,
    selectedProcessId,
    setSelectedProcessId,
    showFicha,
    setShowFicha,
    showProcessPermissions,
    setShowProcessPermissions
  } = useAppNavigation();

  // Sincronización completa con Firestore y estado global mediante hook desacoplado
  const {
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
    managementNotes,
    managementStrategy,
    managementGovernance,
    products, setProducts,
    isMigrating,
    localDataFound,
    isInitializingData,
    migrateFromLocalStorage,
    bootstrapData,
    handleUpdateManagementNotes,
    handleUpdateManagementStrategy,
    handleUpdateManagementGovernance
  } = useAppData(user);

  // Hook desacoplado de Gestión de Permisos y Roles
  const {
    draftIsSystemAdmin,
    setDraftIsSystemAdmin,
    draftModuleAccess,
    setDraftModuleAccess,
    draftSupervisedMembersForLinks,
    setDraftSupervisedMembersForLinks,
    draftCanViewAllCompanyLinks,
    setDraftCanViewAllCompanyLinks,
    linksSupervisorSearch,
    setLinksSupervisorSearch,
    lastInitializedMemberId,
    setLastInitializedMemberId,
    selectedRoleId,
    setSelectedRoleId,
    selectedMemberId,
    setSelectedMemberId,
    permSearch,
    setPermSearch,
    resolvedPermissionsMember,
    hasUnsavedPermissionsChanges,
    savePermissions
  } = usePermissionsManager({
    sortedMembers
  });

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

  const handleCopyImage = async (imageUrl: string, e?: React.MouseEvent) => {
    await copyImageToClipboard(imageUrl, e);
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

  const [searchQuery, setSearchQuery] = useState('');
  const [taskViewMode, setTaskViewMode] = useState<'board' | 'list' | 'calendar'>('board');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook desacoplado de Filtros y Ordenamiento de Tareas
  const {
    collapsedColumns,
    setCollapsedColumns,
    showAllDoneTasks,
    setShowAllDoneTasks,
    showTaskMenu,
    setShowTaskMenu,
    isExportModalOpen,
    setIsExportModalOpen,
    showTimeInputs,
    setShowTimeInputs,
    isListDragging,
    setIsListDragging,
    isBoardDragging,
    setIsBoardDragging,
    activeProjectFilter,
    setActiveProjectFilter,
    activeMemberFilter,
    setActiveMemberFilter,
    smartFilters,
    setSmartFilters,
    showSmartDropdown,
    setShowSmartDropdown,
    activeSuggestionCategory,
    setActiveSuggestionCategory,
    myActivitiesOnly,
    setMyActivitiesOnly,
    tableFilters,
    setTableFilters,
    tableSort,
    setTableSort,
    handleTableSort,
    myActivitiesCount,
    filteredTasks,
    sortedTasks
  } = useTaskFilters({
    tasks,
    members,
    processes,
    projects,
    roles,
    currentMember,
    taskViewMode,
    searchQuery
  });

  // Gestor desacoplado de lógica y modales de Entidades (Miembros, Empresas, Procesos, Proyectos)
  const {
    isAddingMember,
    setIsAddingMember,
    editingMember,
    setEditingMember,
    viewingMember,
    setViewingMember,
    memberToDelete,
    setMemberToDelete,
    newMemberData,
    setNewMemberData,
    handleAddMember,
    confirmDeleteMember,
    handleDeleteMember,
    openEditMember,
    isMemberAssistantOpen,
    setIsMemberAssistantOpen,
    memberAssistantInput,
    setMemberAssistantInput,
    isAnalyzingMemberInput,
    suggestedMemberDraft,
    setSuggestedMemberDraft,
    handleMemberAssistantAnalyze,
    applyMemberDraft,
    isAddingCompany,
    setIsAddingCompany,
    editingCompany,
    setEditingCompany,
    viewingCompany,
    setViewingCompany,
    newCompanyData,
    setNewCompanyData,
    handleAddCompany,
    openEditCompany,
    handleDeleteCompany,
    handleCreateCompanyForCRM,
    handleCreateMemberForCRM,
    isAddingProcess,
    setIsAddingProcess,
    editingProcess,
    setEditingProcess,
    processToDelete,
    setProcessToDelete,
    reassignToId,
    setReassignToId,
    newProcessData,
    setNewProcessData,
    handleAddProcess,
    confirmDeleteProcess,
    handleDeleteProcess,
    openEditProcess,
    showCompletedProjects,
    setShowCompletedProjects,
    isAddingProject,
    setIsAddingProject,
    editingProject,
    setEditingProject,
    projectToDelete,
    setProjectToDelete,
    isDeletingProject,
    newProjectData,
    setNewProjectData,
    handleAddProject,
    handleUpdateProject,
    handleDeleteProject,
    confirmDeleteProject,
    openEditProject
  } = useEntityManager({
    industries,
    processes,
    projects,
    members,
    tasks,
    roles,
    currentMember,
    getModuleAccess,
    activeTab,
    settingsSubTab,
    directorySubTab,
    processSubTab,
    managementSubTab,
    ventasSubTab,
    capacitacionSubTab,
    acreditacionSubTab,
    productosSubTab,
    qhseSubTab,
    importacionesSubTab
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

  const handleExportTasks = () => {
    setIsExportModalOpen(true);
    setShowTaskMenu(false);
  };

  const handleImportTasks = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImportTasksFromFile(
      file,
      () => alert('Tareas importadas exitosamente'),
      (err) => alert(err)
    );
    setShowTaskMenu(false);
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => 
      normalizeText(m.name).includes(normalizeText(searchQuery)) || 
      normalizeText(m.role).includes(normalizeText(searchQuery))
    );
  }, [members, searchQuery]);

  const {
    pendingExitAction,
    setPendingExitAction,
    activeDirtyForm,
    handleTabClick,
    handleSettingsSubTabClick,
    handleDirectorySubTabClick,
    handleProcessSubTabClick,
    handleManagementSubTabClick,
    handleVentasSubTabClick,
    handleCapacitacionSubTabClick,
    handleAcreditacionSubTabClick,
    handleProductosSubTabClick,
    handleQhseSubTabClick,
    handleImportacionesSubTabClick,
    handleTasksSubTabClick,
    handleMemberClick,
    handleCancelPendingExit,
    handleDiscardPendingExit,
    handleSavePendingExit,
    navigateWithUnsavedCheck
  } = useNavigationGuard({
    activeTab,
    setActiveTab,
    settingsSubTab,
    setSettingsSubTab,
    directorySubTab,
    setDirectorySubTab,
    processSubTab,
    setProcessSubTab,
    managementSubTab,
    setManagementSubTab,
    ventasSubTab,
    setVentasSubTab,
    capacitacionSubTab,
    setCapacitacionSubTab,
    acreditacionSubTab,
    setAcreditacionSubTab,
    productosSubTab,
    setProductosSubTab,
    qhseSubTab,
    setQhseSubTab,
    importacionesSubTab,
    setImportacionesSubTab,
    tasksSubTab,
    setTasksSubTab,
    selectedMemberId,
    setSelectedMemberId,
    currentMember,
    roles,
    members,
    getModuleAccess,
    hasUnsavedPermissionsChanges,
    savePermissions,
    resolvedPermissionsMember,
    setLastInitializedMemberId,
    isAddingMember,
    editingMember,
    newMemberData,
    setNewMemberData,
    setIsAddingMember,
    setEditingMember,
    handleAddMember,
    isAddingCompany,
    editingCompany,
    newCompanyData,
    setNewCompanyData,
    setIsAddingCompany,
    setEditingCompany,
    handleAddCompany,
    isAddingProcess,
    editingProcess,
    newProcessData,
    setNewProcessData,
    setIsAddingProcess,
    setEditingProcess,
    handleAddProcess,
    isAddingProject,
    editingProject,
    newProjectData,
    setNewProjectData,
    setIsAddingProject,
    setEditingProject,
    handleAddProject,
    handleUpdateProject
  });

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
        setTasksSubTab={handleTasksSubTabClick}
        handleExportTasks={handleExportTasks}
        fileInputRef={fileInputRef}
        processSubTab={processSubTab}
        setProcessSubTab={handleProcessSubTabClick}
        managementSubTab={managementSubTab}
        setManagementSubTab={handleManagementSubTabClick}
        acreditacionSubTab={acreditacionSubTab}
        setAcreditacionSubTab={handleAcreditacionSubTabClick}
        capacitacionSubTab={capacitacionSubTab}
        setCapacitacionSubTab={handleCapacitacionSubTabClick}
        qhseSubTab={qhseSubTab}
        setQhseSubTab={handleQhseSubTabClick}
        marketingSubTab={marketingSubTab}
        setMarketingSubTab={setMarketingSubTab}
        ventasSubTab={ventasSubTab}
        setVentasSubTab={handleVentasSubTabClick}
        productosSubTab={productosSubTab}
        setProductosSubTab={handleProductosSubTabClick}
        directorySubTab={directorySubTab}
        setDirectorySubTab={handleDirectorySubTabClick}
        importacionesSubTab={importacionesSubTab}
        setImportacionesSubTab={handleImportacionesSubTabClick}
        settingsSubTab={settingsSubTab}
        handleSettingsSubTabClick={handleSettingsSubTabClick}
      />
      {/* Main Content */}
      <main className="md:ml-64 h-screen flex flex-col overflow-hidden">
        <AppHeader
          activeTab={activeTab}
          settingsSubTab={settingsSubTab}
          setSettingsSubTab={handleSettingsSubTabClick}
          isReadOnly={isReadOnly}
          selectedProcessId={selectedProcessId}
          setSelectedProcessId={setSelectedProcessId}
          processes={processes}
          processSubTab={processSubTab}
          setProcessSubTab={handleProcessSubTabClick}
          tasksSubTab={tasksSubTab}
          setTasksSubTab={handleTasksSubTabClick}
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
          setDirectorySubTab={handleDirectorySubTabClick}
          managementSubTab={managementSubTab}
          setManagementSubTab={handleManagementSubTabClick}
          acreditacionSubTab={acreditacionSubTab}
          setAcreditacionSubTab={handleAcreditacionSubTabClick}
          capacitacionSubTab={capacitacionSubTab}
          setCapacitacionSubTab={handleCapacitacionSubTabClick}
          qhseSubTab={qhseSubTab}
          setQhseSubTab={handleQhseSubTabClick}
          importacionesSubTab={importacionesSubTab}
          setImportacionesSubTab={handleImportacionesSubTabClick}
          marketingSubTab={marketingSubTab}
          setMarketingSubTab={setMarketingSubTab}
          ventasSubTab={ventasSubTab}
          setVentasSubTab={handleVentasSubTabClick}
          productosSubTab={productosSubTab}
          setProductosSubTab={handleProductosSubTabClick}
          isInitializingData={isInitializingData}
          localDataFound={localDataFound}
          isMigrating={isMigrating}
          bootstrapData={bootstrapData}
          migrateFromLocalStorage={migrateFromLocalStorage}
          handleExportTasks={handleExportTasks}
          setIsExportModalOpen={setIsExportModalOpen}
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
          myActivitiesOnly={myActivitiesOnly}
          setMyActivitiesOnly={setMyActivitiesOnly}
          myActivitiesCount={myActivitiesCount}
          handleExportTasksToCsv={() => exportTasksToCsv(filteredTasks, processes, projects, members)}
          setEditingCompany={setEditingCompany}
          setNewCompanyData={setNewCompanyData}
          setIsAddingCompany={setIsAddingCompany}
        />

        <div className={`flex-1 ${activeTab === 'gerencia' && managementSubTab === 'consultant' ? 'overflow-hidden flex flex-col p-4 md:p-6' : 'overflow-y-auto custom-scrollbar ' + (activeTab === 'tasks' || (activeTab === 'gerencia' && (managementSubTab === 'notes' || managementSubTab === 'links')) || (activeTab === 'marketing' && (marketingSubTab === 'notes' || marketingSubTab === 'links')) || (activeTab === 'ventas' && (ventasSubTab === 'notes' || ventasSubTab === 'links')) || (activeTab === 'capacitacion' && (capacitacionSubTab === 'notes' || capacitacionSubTab === 'links')) || (activeTab === 'acreditacion' && (acreditacionSubTab === 'notes' || acreditacionSubTab === 'links')) || (activeTab === 'qhse' && (qhseSubTab === 'notes' || qhseSubTab === 'links')) || (activeTab === 'importaciones' && ((importacionesSubTab as any) === 'notes' || (importacionesSubTab as any) === 'links')) || (activeTab === 'productos' && ((productosSubTab as any) === 'notes' || (productosSubTab as any) === 'links')) ? 'pt-2.5 px-6 pb-6' : 'p-6')}`}>
          <AnimatePresence mode="wait">
            <AppMainContent
              activeTab={activeTab}
              activeTabAccess={activeTabAccess}
              currentMember={currentMember}
              roles={roles}
              members={members}
              sortedMembers={sortedMembers}
              processes={processes}
              projects={projects}
              companies={companies}
              industries={industries}
              setIndustries={setIndustries}
              tasks={tasks}
              filteredTasks={filteredTasks}
              sortedTasks={sortedTasks}
              products={products}
              processLinks={processLinks}
              processNotes={processNotes}
              managementNotes={managementNotes}
              managementStrategy={managementStrategy}
              managementGovernance={managementGovernance}
              getModuleAccess={getModuleAccess}
              isTaskVisibleForMember={isTaskVisibleForMember}
              normalizeText={normalizeText}
              parseLocalDate={parseLocalDate}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              managementSubTab={managementSubTab}
              setManagementSubTab={setManagementSubTab}
              processSubTab={processSubTab}
              setProcessSubTab={setProcessSubTab}
              ventasSubTab={ventasSubTab}
              setVentasSubTab={setVentasSubTab}
              capacitacionSubTab={capacitacionSubTab}
              setCapacitacionSubTab={setCapacitacionSubTab}
              acreditacionSubTab={acreditacionSubTab}
              setAcreditacionSubTab={setAcreditacionSubTab}
              productosSubTab={productosSubTab}
              setProductosSubTab={setProductosSubTab}
              qhseSubTab={qhseSubTab}
              setQhseSubTab={setQhseSubTab}
              importacionesSubTab={importacionesSubTab}
              setImportacionesSubTab={setImportacionesSubTab}
              marketingSubTab={marketingSubTab}
              setMarketingSubTab={setMarketingSubTab}
              directorySubTab={directorySubTab}
              handleDirectorySubTabClick={handleDirectorySubTabClick}
              settingsSubTab={settingsSubTab}
              tasksSubTab={tasksSubTab}
              taskViewMode={taskViewMode}
              selectedProcessId={selectedProcessId}
              setSelectedProcessId={setSelectedProcessId}
              showFicha={showFicha}
              setShowFicha={setShowFicha}
              handleUpdateManagementNotes={handleUpdateManagementNotes}
              handleUpdateManagementStrategy={handleUpdateManagementStrategy}
              handleUpdateManagementGovernance={handleUpdateManagementGovernance}
              handleTabClick={handleTabClick}
              setActiveTab={setActiveTab}
              openAddTaskModal={openAddTaskModal}
              openEditTask={openEditTask}
              updateTaskStatus={updateTaskStatus}
              handleDeleteTask={handleDeleteTask}
              createActivityAsTask={createActivityAsTask}
              tableFilters={tableFilters}
              setTableFilters={setTableFilters}
              tableSort={tableSort}
              setTableSort={setTableSort}
              handleTableSort={handleTableSort}
              collapsedColumns={collapsedColumns}
              setCollapsedColumns={setCollapsedColumns}
              showAllDoneTasks={showAllDoneTasks}
              setShowAllDoneTasks={setShowAllDoneTasks}
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
              handleCreateCompanyForCRM={handleCreateCompanyForCRM}
              handleCreateMemberForCRM={handleCreateMemberForCRM}
              showCompletedProjects={showCompletedProjects}
              openEditProject={openEditProject}
              handleDeleteProject={handleDeleteProject}
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
              onAddTaskMarketing={async (taskData) => {
                const taskId = taskData.id || `task-${Date.now()}`;
                await setDoc(doc(db, 'tasks', taskId), { ...taskData, id: taskId });
                return taskId;
              }}
              onAddProjectMarketing={async (projData) => {
                const pId = projData.id || `proj-${Date.now()}`;
                await setDoc(doc(db, 'projects', pId), { ...projData, id: pId });
                return pId;
              }}
            />
          </AnimatePresence>
        </div>

        <GlobalModals
          isMemberAssistantOpen={isMemberAssistantOpen}
          setIsMemberAssistantOpen={setIsMemberAssistantOpen}
          memberAssistantInput={memberAssistantInput}
          setMemberAssistantInput={setMemberAssistantInput}
          isAnalyzingMemberInput={isAnalyzingMemberInput}
          handleMemberAssistantAnalyze={handleMemberAssistantAnalyze}
          suggestedMemberDraft={suggestedMemberDraft}
          applyMemberDraft={applyMemberDraft}
          memberToDelete={memberToDelete}
          setMemberToDelete={setMemberToDelete}
          confirmDeleteMember={confirmDeleteMember}
        />

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
          onCancelPendingExit={handleCancelPendingExit}
          onDiscardPendingExit={handleDiscardPendingExit}
          onSavePendingExit={handleSavePendingExit}
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
          filteredTasks={filteredTasks}
          isExportModalOpen={isExportModalOpen}
          setIsExportModalOpen={setIsExportModalOpen}
        />
      </main>
    </div>
  );
}
