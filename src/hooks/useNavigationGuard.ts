import React, { useState, useMemo, useCallback } from 'react';
import { TeamMember, Company, Process, Project, SystemRole } from '../types';
import { PendingExitAction } from '../components/modals/PendingExitPermissionsModal';

interface UseNavigationGuardProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  settingsSubTab: string;
  setSettingsSubTab: (tab: any) => void;
  directorySubTab: string;
  setDirectorySubTab: (tab: any) => void;
  processSubTab: string;
  setProcessSubTab: (tab: any) => void;
  managementSubTab: string;
  setManagementSubTab: (tab: any) => void;
  ventasSubTab: string;
  setVentasSubTab: (tab: any) => void;
  capacitacionSubTab: string;
  setCapacitacionSubTab: (tab: any) => void;
  acreditacionSubTab: string;
  setAcreditacionSubTab: (tab: any) => void;
  productosSubTab: string;
  setProductosSubTab: (tab: any) => void;
  qhseSubTab: string;
  setQhseSubTab: (tab: any) => void;
  importacionesSubTab: string;
  setImportacionesSubTab: (tab: any) => void;
  tasksSubTab: string;
  setTasksSubTab: (tab: any) => void;
  
  selectedMemberId: string;
  setSelectedMemberId: (id: string) => void;
  currentMember: TeamMember | null;
  roles: SystemRole[];
  members: TeamMember[];
  getModuleAccess: (member: TeamMember | null, roles: SystemRole[], moduleId: string, isSuperAdminDefault?: boolean) => string;

  // Permissions form
  hasUnsavedPermissionsChanges: boolean;
  savePermissions: (memberId: string) => Promise<void>;
  resolvedPermissionsMember?: TeamMember | null;
  setLastInitializedMemberId: (id: string) => void;

  // Member form
  isAddingMember: boolean;
  editingMember: TeamMember | null;
  newMemberData: any;
  setNewMemberData: (data: any) => void;
  setIsAddingMember: (isAdding: boolean) => void;
  setEditingMember: (member: TeamMember | null) => void;
  handleAddMember: (e: React.FormEvent) => Promise<void>;

  // Company form
  isAddingCompany: boolean;
  editingCompany: Company | null;
  newCompanyData: any;
  setNewCompanyData: (data: any) => void;
  setIsAddingCompany: (isAdding: boolean) => void;
  setEditingCompany: (company: Company | null) => void;
  handleAddCompany: (e: React.FormEvent) => Promise<void>;

  // Process form
  isAddingProcess: boolean;
  editingProcess: Process | null;
  newProcessData: { name: string; description: string; goals: string };
  setNewProcessData: (data: any) => void;
  setIsAddingProcess: (isAdding: boolean) => void;
  setEditingProcess: (process: Process | null) => void;
  handleAddProcess: (e: React.FormEvent) => Promise<void>;

  // Project form
  isAddingProject: boolean;
  editingProject: Project | null;
  newProjectData: { name: string; description: string; processId: string; status: any; city?: string };
  setNewProjectData: (data: any) => void;
  setIsAddingProject: (isAdding: boolean) => void;
  setEditingProject: (project: Project | null) => void;
  handleAddProject: (e: React.FormEvent) => Promise<void>;
  handleUpdateProject: (e: React.FormEvent) => Promise<void>;
}

export const useNavigationGuard = ({
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
}: UseNavigationGuardProps) => {
  const [pendingExitAction, setPendingExitAction] = useState<PendingExitAction | null>(null);

  // 1. Detect Member form dirty state
  const hasUnsavedMemberChanges = useMemo(() => {
    if (isAddingMember && !editingMember) {
      return !!(
        newMemberData.name?.trim() ||
        newMemberData.role?.trim() ||
        newMemberData.email?.trim() ||
        newMemberData.phone?.trim() ||
        newMemberData.identificationId?.trim() ||
        newMemberData.notes?.trim() ||
        newMemberData.skills?.trim() ||
        newMemberData.responsibilities?.trim() ||
        (newMemberData.companyAssociations && newMemberData.companyAssociations.length > 0)
      );
    }
    if (editingMember) {
      const origSkills = editingMember.skills?.join(', ') || '';
      const origResp = editingMember.responsibilities?.join(', ') || '';
      const origEpp = editingMember.epp?.join(', ') || '';
      return (
        newMemberData.name !== editingMember.name ||
        newMemberData.role !== editingMember.role ||
        (newMemberData.systemRoleId || '') !== (editingMember.systemRoleId || '') ||
        newMemberData.isSystemAdmin !== (editingMember.isSystemAdmin || false) ||
        (newMemberData.processId || '') !== (editingMember.processId || '') ||
        (newMemberData.identificationId || '') !== (editingMember.identificationId || '') ||
        (newMemberData.notes || '') !== (editingMember.notes || '') ||
        (newMemberData.personality || '') !== (editingMember.personality || '') ||
        (newMemberData.email || '') !== (editingMember.email || '') ||
        (newMemberData.phone || '') !== (editingMember.phone || '') ||
        newMemberData.skills !== origSkills ||
        newMemberData.responsibilities !== origResp ||
        newMemberData.epp !== origEpp
      );
    }
    return false;
  }, [isAddingMember, editingMember, newMemberData]);

  // 2. Detect Company form dirty state
  const hasUnsavedCompanyChanges = useMemo(() => {
    if (isAddingCompany && !editingCompany) {
      return !!(
        newCompanyData.name?.trim() ||
        newCompanyData.ruc?.trim() ||
        newCompanyData.description?.trim() ||
        newCompanyData.email?.trim() ||
        newCompanyData.phone?.trim() ||
        newCompanyData.website?.trim() ||
        newCompanyData.mainAddress?.trim() ||
        newCompanyData.notes?.trim() ||
        (newCompanyData.industries && newCompanyData.industries.length > 0)
      );
    }
    if (editingCompany) {
      return (
        newCompanyData.name !== editingCompany.name ||
        newCompanyData.ruc !== editingCompany.ruc ||
        (newCompanyData.description || '') !== (editingCompany.description || '') ||
        (newCompanyData.email || '') !== (editingCompany.email || '') ||
        (newCompanyData.phone || '') !== (editingCompany.phone || '') ||
        (newCompanyData.website || '') !== (editingCompany.website || '') ||
        (newCompanyData.mainAddress || '') !== (editingCompany.mainAddress || editingCompany.address || '') ||
        (newCompanyData.notes || '') !== (editingCompany.notes || '')
      );
    }
    return false;
  }, [isAddingCompany, editingCompany, newCompanyData]);

  // 3. Detect Process form dirty state
  const hasUnsavedProcessChanges = useMemo(() => {
    if (isAddingProcess && !editingProcess) {
      return !!(
        newProcessData.name?.trim() ||
        newProcessData.description?.trim() ||
        newProcessData.goals?.trim()
      );
    }
    if (editingProcess) {
      return (
        newProcessData.name !== editingProcess.name ||
        newProcessData.description !== editingProcess.description ||
        newProcessData.goals !== (editingProcess.goals?.join(', ') || '')
      );
    }
    return false;
  }, [isAddingProcess, editingProcess, newProcessData]);

  // 4. Detect Project form dirty state
  const hasUnsavedProjectChanges = useMemo(() => {
    if (isAddingProject && !editingProject) {
      return !!(newProjectData.name?.trim() || newProjectData.description?.trim());
    }
    if (editingProject) {
      return (
        newProjectData.name !== editingProject.name ||
        newProjectData.description !== editingProject.description ||
        newProjectData.status !== editingProject.status ||
        newProjectData.processId !== editingProject.processId ||
        newProjectData.city !== editingProject.city
      );
    }
    return false;
  }, [isAddingProject, editingProject, newProjectData]);

  // Determine active dirty form
  const activeDirtyForm = useMemo(() => {
    if (hasUnsavedPermissionsChanges && activeTab === 'settings' && settingsSubTab === 'roles') return 'permissions';
    if ((isAddingMember || editingMember) && hasUnsavedMemberChanges) return 'member';
    if ((isAddingCompany || editingCompany) && hasUnsavedCompanyChanges) return 'company';
    if ((isAddingProcess || editingProcess) && hasUnsavedProcessChanges) return 'process';
    if ((isAddingProject || editingProject) && hasUnsavedProjectChanges) return 'project';
    return null;
  }, [
    hasUnsavedPermissionsChanges, activeTab, settingsSubTab,
    isAddingMember, editingMember, hasUnsavedMemberChanges,
    isAddingCompany, editingCompany, hasUnsavedCompanyChanges,
    isAddingProcess, editingProcess, hasUnsavedProcessChanges,
    isAddingProject, editingProject, hasUnsavedProjectChanges
  ]);

  const executePendingAction = useCallback((action: PendingExitAction) => {
    if (action.onExecute) {
      action.onExecute();
      return;
    }
    if (action.type === 'tab' && action.targetTab) {
      setActiveTab(action.targetTab);
      if (action.targetTab === 'directory' && action.targetDirectorySub) {
        setDirectorySubTab(action.targetDirectorySub);
      } else if (action.targetTab === 'settings') {
        const hasSettingsAccess = getModuleAccess(currentMember, roles, 'settings', members.length === 0) !== 'ninguno';
        if (hasSettingsAccess) {
          setSettingsSubTab('general');
        }
      }
    } else if (action.type === 'settings_subtab' || (action.type === 'subtab' && action.targetSettingsSubTab)) {
      setSettingsSubTab(action.targetSettingsSubTab || action.targetSubTab);
    } else if (action.type === 'directory_subtab' && action.targetDirectorySub) {
      setDirectorySubTab(action.targetDirectorySub);
    } else if (action.type === 'process_subtab' && action.targetSubTab) {
      setProcessSubTab(action.targetSubTab);
    } else if (action.type === 'management_subtab' && action.targetSubTab) {
      setManagementSubTab(action.targetSubTab);
    } else if (action.type === 'ventas_subtab' && action.targetSubTab) {
      setVentasSubTab(action.targetSubTab);
    } else if (action.type === 'capacitacion_subtab' && action.targetSubTab) {
      setCapacitacionSubTab(action.targetSubTab);
    } else if (action.type === 'acreditacion_subtab' && action.targetSubTab) {
      setAcreditacionSubTab(action.targetSubTab);
    } else if (action.type === 'productos_subtab' && action.targetSubTab) {
      setProductosSubTab(action.targetSubTab);
    } else if (action.type === 'qhse_subtab' && action.targetSubTab) {
      setQhseSubTab(action.targetSubTab);
    } else if (action.type === 'importaciones_subtab' && action.targetSubTab) {
      setImportacionesSubTab(action.targetSubTab);
    } else if (action.type === 'tasks_subtab' && action.targetSubTab) {
      setTasksSubTab(action.targetSubTab);
    } else if (action.type === 'member' && action.targetMemberId) {
      setSelectedMemberId(action.targetMemberId);
    }
  }, [
    setActiveTab, setDirectorySubTab, setSettingsSubTab, getModuleAccess, currentMember, roles, members,
    setProcessSubTab, setManagementSubTab, setVentasSubTab, setCapacitacionSubTab,
    setAcreditacionSubTab, setProductosSubTab, setQhseSubTab, setImportacionesSubTab, setTasksSubTab, setSelectedMemberId
  ]);

  const navigateWithUnsavedCheck = useCallback((action: PendingExitAction) => {
    if (activeDirtyForm) {
      setPendingExitAction({
        ...action,
        formType: activeDirtyForm,
        formName: 
          activeDirtyForm === 'member' ? (newMemberData.name || editingMember?.name) :
          activeDirtyForm === 'company' ? (newCompanyData.name || editingCompany?.name) :
          activeDirtyForm === 'process' ? (newProcessData.name || editingProcess?.name) :
          activeDirtyForm === 'project' ? (newProjectData.name || editingProject?.name) :
          activeDirtyForm === 'permissions' ? resolvedPermissionsMember?.name : undefined
      });
    } else {
      executePendingAction(action);
    }
  }, [
    activeDirtyForm, newMemberData, editingMember, newCompanyData, editingCompany,
    newProcessData, editingProcess, newProjectData, editingProject, resolvedPermissionsMember, executePendingAction
  ]);

  const handleTabClick = useCallback((tab: any, directorySub?: any) => {
    navigateWithUnsavedCheck({
      type: 'tab',
      targetTab: tab,
      targetDirectorySub: directorySub
    });
  }, [navigateWithUnsavedCheck]);

  const handleSettingsSubTabClick = useCallback((subTab: any) => {
    navigateWithUnsavedCheck({
      type: 'settings_subtab',
      targetSettingsSubTab: subTab,
      targetSubTab: subTab
    });
  }, [navigateWithUnsavedCheck]);

  const handleDirectorySubTabClick = useCallback((subTab: any) => {
    navigateWithUnsavedCheck({
      type: 'directory_subtab',
      targetDirectorySub: subTab,
      targetSubTab: subTab
    });
  }, [navigateWithUnsavedCheck]);

  const handleProcessSubTabClick = useCallback((subTab: any) => {
    navigateWithUnsavedCheck({
      type: 'process_subtab',
      targetSubTab: subTab
    });
  }, [navigateWithUnsavedCheck]);

  const handleManagementSubTabClick = useCallback((subTab: any) => {
    navigateWithUnsavedCheck({
      type: 'management_subtab',
      targetSubTab: subTab
    });
  }, [navigateWithUnsavedCheck]);

  const handleVentasSubTabClick = useCallback((subTab: any) => {
    navigateWithUnsavedCheck({
      type: 'ventas_subtab',
      targetSubTab: subTab
    });
  }, [navigateWithUnsavedCheck]);

  const handleCapacitacionSubTabClick = useCallback((subTab: any) => {
    navigateWithUnsavedCheck({
      type: 'capacitacion_subtab',
      targetSubTab: subTab
    });
  }, [navigateWithUnsavedCheck]);

  const handleAcreditacionSubTabClick = useCallback((subTab: any) => {
    navigateWithUnsavedCheck({
      type: 'acreditacion_subtab',
      targetSubTab: subTab
    });
  }, [navigateWithUnsavedCheck]);

  const handleProductosSubTabClick = useCallback((subTab: any) => {
    navigateWithUnsavedCheck({
      type: 'productos_subtab',
      targetSubTab: subTab
    });
  }, [navigateWithUnsavedCheck]);

  const handleQhseSubTabClick = useCallback((subTab: any) => {
    navigateWithUnsavedCheck({
      type: 'qhse_subtab',
      targetSubTab: subTab
    });
  }, [navigateWithUnsavedCheck]);

  const handleImportacionesSubTabClick = useCallback((subTab: any) => {
    navigateWithUnsavedCheck({
      type: 'importaciones_subtab',
      targetSubTab: subTab
    });
  }, [navigateWithUnsavedCheck]);

  const handleTasksSubTabClick = useCallback((subTab: any) => {
    navigateWithUnsavedCheck({
      type: 'tasks_subtab',
      targetSubTab: subTab
    });
  }, [navigateWithUnsavedCheck]);

  const handleMemberClick = useCallback((memberId: string) => {
    navigateWithUnsavedCheck({
      type: 'member',
      targetMemberId: memberId
    });
  }, [navigateWithUnsavedCheck]);

  const handleCancelPendingExit = useCallback(() => {
    setPendingExitAction(null);
  }, []);

  const handleDiscardPendingExit = useCallback(() => {
    const action = pendingExitAction;
    if (action?.formType === 'permissions') {
      setLastInitializedMemberId('');
    } else if (action?.formType === 'member') {
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
    } else if (action?.formType === 'company') {
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
    } else if (action?.formType === 'process') {
      setIsAddingProcess(false);
      setEditingProcess(null);
      setNewProcessData({ name: '', description: '', goals: '' });
    } else if (action?.formType === 'project') {
      setIsAddingProject(false);
      setEditingProject(null);
      setNewProjectData({ name: '', description: '', processId: '', status: 'activo' });
    }

    setPendingExitAction(null);
    if (action) {
      executePendingAction(action);
    }
  }, [
    pendingExitAction, setLastInitializedMemberId, setIsAddingMember, setEditingMember, setNewMemberData,
    setIsAddingCompany, setEditingCompany, setNewCompanyData, setIsAddingProcess, setEditingProcess, setNewProcessData,
    setIsAddingProject, setEditingProject, setNewProjectData, executePendingAction
  ]);

  const handleSavePendingExit = useCallback(async () => {
    const action = pendingExitAction;
    const formType = action?.formType;
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;

    try {
      if (formType === 'permissions' && resolvedPermissionsMember) {
        await savePermissions(resolvedPermissionsMember.id);
      } else if (formType === 'member') {
        await handleAddMember(fakeEvent);
      } else if (formType === 'company') {
        await handleAddCompany(fakeEvent);
      } else if (formType === 'process') {
        await handleAddProcess(fakeEvent);
      } else if (formType === 'project') {
        if (editingProject) {
          await handleUpdateProject(fakeEvent);
        } else {
          await handleAddProject(fakeEvent);
        }
      }
    } catch (err) {
      console.error('Error saving before exit:', err);
    }

    setPendingExitAction(null);
    if (action) {
      executePendingAction(action);
    }
  }, [
    pendingExitAction, resolvedPermissionsMember, savePermissions, handleAddMember, handleAddCompany,
    handleAddProcess, editingProject, handleUpdateProject, handleAddProject, executePendingAction
  ]);

  return {
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
  };
};
