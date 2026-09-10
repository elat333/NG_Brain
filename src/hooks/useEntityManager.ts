import React, { useState, useEffect } from 'react';
import { 
  TeamMember, Company, Process, Project, Role, PersonCategory, MemberDraft 
} from '../types';
import { 
  db, doc, setDoc, updateDoc, deleteDoc, collection, addDoc, 
  OperationType, handleFirestoreError 
} from '../lib/firebase';
import { normalizeText } from '../lib/textUtils';
import { processMemberInput } from '../services/aiService';

interface UseEntityManagerProps {
  industries: { id: string; name: string }[];
  processes: Process[];
  projects: Project[];
  members: TeamMember[];
  tasks: any[];
  roles: Role[];
  currentMember: TeamMember | null;
  getModuleAccess: (
    member: TeamMember | null | undefined, 
    roles: Role[] | undefined, 
    moduleId: string, 
    isDatabaseEmpty?: boolean
  ) => 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  activeTab: string;
  settingsSubTab: string;
  directorySubTab: string;
  processSubTab: string;
  managementSubTab: string;
  ventasSubTab: string;
  capacitacionSubTab: string;
  acreditacionSubTab: string;
  productosSubTab: string;
  qhseSubTab: string;
  importacionesSubTab: string;
}

export function useEntityManager({
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
}: UseEntityManagerProps) {
  // Member Management
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
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

  // Member AI Assistant
  const [isMemberAssistantOpen, setIsMemberAssistantOpen] = useState(false);
  const [memberAssistantInput, setMemberAssistantInput] = useState('');
  const [isAnalyzingMemberInput, setIsAnalyzingMemberInput] = useState(false);
  const [suggestedMemberDraft, setSuggestedMemberDraft] = useState<MemberDraft | null>(null);

  // Company Management
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
    mainAddress: '',
    branchAddresses: [] as string[],
    industries: [] as string[],
    notes: ''
  });

  // Process Management
  const [isAddingProcess, setIsAddingProcess] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [processToDelete, setProcessToDelete] = useState<Process | null>(null);
  const [reassignToId, setReassignToId] = useState<string>('unassigned');
  const [newProcessData, setNewProcessData] = useState({
    name: '',
    description: '',
    goals: ''
  });

  // Project Management
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

  // Automatic reset when changing navigation
  useEffect(() => {
    setIsAddingMember(false);
    setEditingMember(null);
    setViewingMember(null);
    setIsAddingCompany(false);
    setEditingCompany(null);
    setViewingCompany(null);
    setIsAddingProcess(false);
    setEditingProcess(null);
    setIsAddingProject(false);
    setEditingProject(null);
    setProjectToDelete(null);
    setProcessToDelete(null);
    setMemberToDelete(null);
    setIsMemberAssistantOpen(false);
  }, [
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
  ]);

  // Member Handlers
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

  // AI Assistant Handlers
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

  // Company Handlers
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
          address: newCompanyData.mainAddress
        });
      } else {
        const id = `comp-${Date.now()}`;
        const newCompany: Company = {
          id,
          ...newCompanyData,
          address: newCompanyData.mainAddress,
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

  // Process Handlers
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

  const openEditProcess = (proc: Process) => {
    setEditingProcess(proc);
    setNewProcessData({
      name: proc.name,
      description: proc.description,
      goals: proc.goals.join(', ')
    });
    setIsAddingProcess(true);
  };

  // Project Handlers
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

  return {
    // Member State & Actions
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

    // AI Assistant
    isMemberAssistantOpen,
    setIsMemberAssistantOpen,
    memberAssistantInput,
    setMemberAssistantInput,
    isAnalyzingMemberInput,
    suggestedMemberDraft,
    setSuggestedMemberDraft,
    handleMemberAssistantAnalyze,
    applyMemberDraft,

    // Company State & Actions
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

    // Process State & Actions
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

    // Project State & Actions
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
  };
}
