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
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TeamMember, Process, ExtractedUpdates, Task, Project, SuggestedActivity, MemberDraft, Deliverable, Company, PersonCategory, Industry, Role } from './types';
import { initialMembers, initialProcesses, initialTasks, initialCompanies, initialIndustries, initialRoles } from './lib/initialData';
import { analyzeTranscript, getPlanningSuggestions, processMemberInput } from './services/aiService';

// Helper functions
const isTaskBlocked = (id: string, allTasks: Task[]): { isBlocked: boolean; blockers: Task[] } => {
  const task = allTasks.find(t => t.id === id);
  if (!task || !task.blockedByTaskIds || task.blockedByTaskIds.length === 0) return { isBlocked: false, blockers: [] };
  
  const activeBlockers = allTasks.filter(t => task.blockedByTaskIds?.includes(t.id) && t.status !== 'done');
  return {
    isBlocked: activeBlockers.length > 0,
    blockers: activeBlockers
  };
};

const normalizeText = (text: string): string => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export default function App() {
// ... existing state ...

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

  const applyMemberDraft = () => {
    if (!suggestedMemberDraft) return;

    if (suggestedMemberDraft.type === 'create') {
      const newMember: TeamMember = {
        id: `mem-${Date.now()}`,
        name: suggestedMemberDraft.data.name || 'Nuevo Miembro',
        role: suggestedMemberDraft.data.role || 'Rol Pendiente',
        systemRoleId: '',
        categories: ['miembro'],
        processId: suggestedMemberDraft.data.processId || processes[0]?.id || 'default',
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
      setMembers(prev => [...prev, newMember]);
    } else if (suggestedMemberDraft.type === 'update' && suggestedMemberDraft.memberId) {
      setMembers(prev => prev.map(m => {
        if (m.id === suggestedMemberDraft.memberId) {
          return {
            ...m,
            ...suggestedMemberDraft.data,
            // Deep merge for arrays if needed, but for now we follow AI suggestion
            skills: suggestedMemberDraft.data.skills ? Array.from(new Set([...m.skills, ...suggestedMemberDraft.data.skills])) : m.skills,
            responsibilities: suggestedMemberDraft.data.responsibilities ? Array.from(new Set([...m.responsibilities, ...suggestedMemberDraft.data.responsibilities])) : m.responsibilities,
            epp: suggestedMemberDraft.data.epp ? Array.from(new Set([...(m.epp || []), ...suggestedMemberDraft.data.epp])) : m.epp,
          };
        }
        return m;
      }));
    }

    setSuggestedMemberDraft(null);
    setMemberAssistantInput('');
    setIsMemberAssistantOpen(false);
  };
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transcript' | 'tasks' | 'planner' | 'projects' | 'settings' | 'directory'>('dashboard');
  const [lastTab, setLastTab] = useState<string | null>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<'roles' | 'processes' | 'members' | 'general'>('general');
  const [directorySubTab, setDirectorySubTab] = useState<'people' | 'companies' | 'industries'>('people');
  
  const [industries, setIndustries] = useState<Industry[]>(() => {
    const saved = localStorage.getItem('teampulse_industries');
    if (saved) return JSON.parse(saved);
    return initialIndustries;
  });

  const [roles, setRoles] = useState<Role[]>(() => {
    const saved = localStorage.getItem('teampulse_roles');
    if (saved) return JSON.parse(saved);
    return initialRoles;
  });

  const [selectedRoleId, setSelectedRoleId] = useState<string>('role-admin');

  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('teampulse_companies');
    if (saved) return JSON.parse(saved);
    return initialCompanies;
  });

  const [members, setMembers] = useState<TeamMember[]>(() => {
    const saved = localStorage.getItem('teampulse_members');
    if (!saved) return initialMembers;
    try {
      const data = JSON.parse(saved);
      // Migrate individual members
      return data.map((m: any) => ({
        ...m,
        categories: m.categories || [m.category || 'miembro'],
        processId: m.processId || m.departmentId || 'default'
      }));
    } catch (e) {
      return initialMembers;
    }
  });
  const [processes, setProcesses] = useState<Process[]>(() => {
    const savedNew = localStorage.getItem('teampulse_processes');
    if (savedNew) return JSON.parse(savedNew);
    
    // Fallback and migrate from old key
    const savedOld = localStorage.getItem('teampulse_departments');
    if (savedOld) {
      try {
        return JSON.parse(savedOld);
      } catch (e) {
        return initialProcesses;
      }
    }
    
    return initialProcesses;
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('teampulse_tasks');
    if (!saved) return initialTasks;
    try {
      const data = JSON.parse(saved);
      // Migrate individual tasks if they still have departmentId or old statuses
      return data.map((t: any) => {
        let status = t.status;
        // Migrate old statuses to new ones
        if (status === 'pendiente') status = 'backlog';
        if (status === 'en_progreso') status = 'in_progress';
        if (status === 'completada') status = 'done';

        return {
          ...t,
          status,
          processId: t.processId || t.departmentId || 'default',
          projectId: t.projectId || undefined
        };
      });
    } catch (e) {
      return initialTasks;
    }
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('teampulse_projects');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  });
  
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedUpdates, setExtractedUpdates] = useState<ExtractedUpdates | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newMemberData, setNewMemberData] = useState({
    name: '',
    role: '',
    systemRoleId: '',
    categories: ['miembro'] as PersonCategory[],
    processId: '',
    companyId: '',
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
  const [newTaskData, setNewTaskData] = useState({
    id: '',
    title: '',
    description: '',
    memberId: '',
    auxiliaryId: '',
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

  useEffect(() => {
    localStorage.setItem('teampulse_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('teampulse_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('teampulse_industries', JSON.stringify(industries));
  }, [industries]);

  useEffect(() => {
    localStorage.setItem('teampulse_roles', JSON.stringify(roles));
  }, [roles]);

  useEffect(() => {
    localStorage.setItem('teampulse_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('teampulse_processes', JSON.stringify(processes));
  }, [processes]);

  useEffect(() => {
    localStorage.setItem('teampulse_tasks', JSON.stringify(tasks));
  }, [tasks]);

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

  const applyUpdates = () => {
    if (!extractedUpdates) return;

    // Apply member updates
    setMembers(prev => prev.map(member => {
      const update = extractedUpdates.memberUpdates.find(u => u.memberId === member.id);
      if (!update) return member;

      return {
        ...member,
        role: update.roleUpdate || member.role,
        skills: Array.from(new Set([...member.skills, ...(update.newSkills || [])])),
        responsibilities: Array.from(new Set([...member.responsibilities, ...(update.newResponsibilities || [])])),
        epp: Array.from(new Set([...(member.epp || []), ...(update.epp || [])])),
        recentAchievements: [...(update.achievements || []), ...member.recentAchievements].slice(0, 5)
      };
    }));

    // Apply process updates
    setProcesses(prev => prev.map(proc => {
      const update = extractedUpdates.processUpdates.find(u => u.processId === proc.id);
      if (!update) return proc;

      return {
        ...proc,
        description: update.descriptionUpdate || proc.description,
        goals: Array.from(new Set([...proc.goals, ...(update.newGoals || [])]))
      };
    }));

    setExtractedUpdates(null);
    setTranscript('');
    setActiveTab('dashboard');
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberData.name) return;

    if (editingMember) {
      setMembers(prev => prev.map(m => m.id === editingMember.id ? {
        ...m,
        name: newMemberData.name,
        role: newMemberData.role,
        systemRoleId: newMemberData.systemRoleId,
        categories: newMemberData.categories,
        processId: newMemberData.processId || undefined,
        companyId: newMemberData.companyId || undefined,
        ruc: newMemberData.ruc || undefined,
        skills: newMemberData.skills.split(',').map(s => s.trim()).filter(s => s !== ''),
        responsibilities: newMemberData.responsibilities.split(',').map(r => r.trim()).filter(r => r !== ''),
        personality: newMemberData.personality,
        notes: newMemberData.notes,
        email: newMemberData.email,
        phone: newMemberData.phone,
        epp: newMemberData.epp.split(',').map(e => e.trim()).filter(e => e !== '')
      } : m));
    } else {
      const newMember: TeamMember = {
        id: `mem-${Date.now()}`,
        name: newMemberData.name,
        role: newMemberData.role,
        systemRoleId: newMemberData.systemRoleId,
        categories: newMemberData.categories,
        processId: newMemberData.processId || undefined,
        companyId: newMemberData.companyId || undefined,
        ruc: newMemberData.ruc || undefined,
        skills: newMemberData.skills.split(',').map(s => s.trim()).filter(s => s !== ''),
        responsibilities: newMemberData.responsibilities.split(',').map(r => r.trim()).filter(r => r !== ''),
        recentAchievements: [],
        avatar: `https://picsum.photos/seed/${newMemberData.name.replace(/\s/g, '')}/150/150`,
        personality: newMemberData.personality,
        notes: newMemberData.notes,
        email: newMemberData.email,
        phone: newMemberData.phone,
        epp: newMemberData.epp.split(',').map(e => e.trim()).filter(e => e !== '')
      };
      setMembers(prev => [...prev, newMember]);
    }

    setIsAddingMember(false);
    setEditingMember(null);
    setNewMemberData({
      name: '',
      role: '',
      systemRoleId: '',
      categories: ['miembro'],
      processId: '',
      companyId: '',
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

  const handleDeleteMember = (id: string) => {
    const member = members.find(m => m.id === id);
    if (member) {
      setMemberToDelete(member);
    }
  };

  const confirmDeleteMember = () => {
    if (!memberToDelete) return;
    setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
    setMemberToDelete(null);
  };

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyData.name || !newCompanyData.ruc) return;

    // Manage industries list
    const companyIndustries = newCompanyData.industries || [];
    const updatedIndustries = [...industries];
    let industriesChanged = false;

    companyIndustries.forEach(indName => {
      if (!updatedIndustries.some(i => normalizeText(i.name) === normalizeText(indName))) {
        updatedIndustries.push({
          id: `ind-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: indName,
          createdAt: new Date().toISOString()
        });
        industriesChanged = true;
      }
    });

    if (industriesChanged) {
      setIndustries(updatedIndustries);
    }

    if (editingCompany) {
      setCompanies(prev => prev.map(c => c.id === editingCompany.id ? {
        ...c,
        ...newCompanyData,
        mainAddress: newCompanyData.mainAddress,
        address: newCompanyData.mainAddress // for compatibility
      } : c));
    } else {
      const newCompany: Company = {
        id: `comp-${Date.now()}`,
        ...newCompanyData,
        address: newCompanyData.mainAddress, // for compatibility
        createdAt: new Date().toISOString()
      };
      setCompanies(prev => [...prev, newCompany]);
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

  const handleDeleteCompany = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta compañía?')) {
      setCompanies(prev => prev.filter(c => c.id !== id));
      // Optionally unassign members from this company
      setMembers(prev => prev.map(m => m.companyId === id ? { ...m, companyId: undefined } : m));
    }
  };

  const handleAddProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcessData.name) return;

    if (editingProcess) {
      setProcesses(prev => prev.map(p => p.id === editingProcess.id ? {
        ...p,
        name: newProcessData.name,
        description: newProcessData.description,
        goals: newProcessData.goals.split(',').map(g => g.trim()).filter(g => g !== '')
      } : p));
    } else {
      const newProc: Process = {
        id: `proc-${Date.now()}`,
        name: newProcessData.name,
        description: newProcessData.description,
        goals: newProcessData.goals.split(',').map(g => g.trim()).filter(g => g !== '')
      };
      setProcesses(prev => [...prev, newProc]);
    }

    setIsAddingProcess(false);
    setEditingProcess(null);
    setNewProcessData({ name: '', description: '', goals: '' });
  };

  const confirmDeleteProcess = () => {
    if (!processToDelete) return;

    const id = processToDelete.id;
    setProcesses(prev => prev.filter(p => p.id !== id));
    
    setMembers(prev => prev.map(m => {
      if (m.processId === id) {
        return { ...m, processId: reassignToId === 'unassigned' ? 'unassigned' : reassignToId };
      }
      return m;
    }));

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
    setNewTaskData({
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      description: '',
      memberId: '',
      auxiliaryId: '',
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

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskData.title || !newTaskData.processId) return;

    const newTask: Task = {
      id: newTaskData.id || `task-${Date.now()}`,
      title: newTaskData.title,
      description: newTaskData.description,
      status: newTaskData.status,
      processId: newTaskData.processId,
      memberId: newTaskData.memberId || undefined,
      auxiliaryId: newTaskData.auxiliaryId || undefined,
      projectId: newTaskData.projectId || undefined,
      deliverables: newTaskData.deliverables,
      plannedHours: newTaskData.plannedHours || 0,
      actualHours: newTaskData.actualHours || 0,
      dueDate: newTaskData.dueDate || undefined,
      blockedByTaskIds: newTaskData.blockedByTaskIds,
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [...prev, newTask]);
    setIsAddingTask(false);
    if (lastTab) {
      setActiveTab(lastTab as any);
      setLastTab(null);
    }
    setNewTaskData({
      id: '',
      title: '',
      description: '',
      memberId: '',
      auxiliaryId: '',
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
  
  const handleUpdateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !newTaskData.title || !newTaskData.processId) return;

    setTasks(prev => prev.map(t => t.id === editingTask.id ? { 
      ...t, 
      title: newTaskData.title,
      description: newTaskData.description,
      memberId: newTaskData.memberId || undefined,
      auxiliaryId: newTaskData.auxiliaryId || undefined,
      projectId: newTaskData.projectId || undefined,
      status: newTaskData.status as any,
      deliverables: newTaskData.deliverables,
      plannedHours: newTaskData.plannedHours || 0,
      actualHours: newTaskData.actualHours || 0,
      dueDate: newTaskData.dueDate || undefined,
      blockedByTaskIds: newTaskData.blockedByTaskIds
    } : t));

    setEditingTask(null);
    setIsAddingTask(false);
    if (lastTab) {
      setActiveTab(lastTab as any);
      setLastTab(null);
    }
    setNewTaskData({
      id: '',
      title: '',
      description: '',
      memberId: '',
      auxiliaryId: '',
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
    setNewTaskData({
      title: task.title,
      description: task.description,
      processId: task.processId,
      memberId: task.memberId || '',
      auxiliaryId: task.auxiliaryId || '',
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

  const updateTaskStatus = (id: string, newStatus: Task['status']) => {
    if (newStatus === 'in_progress') {
      const { isBlocked, blockers } = isTaskBlocked(id, tasks);
      if (isBlocked) {
        alert(`ESTA TAREA ESTÁ BLOQUEADA\n\nPara poder iniciar esta tarea se debe terminar primero:\n• ${blockers.map(t => t.title).join('\n• ')}`);
        return;
      }
    }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectData.name || !newProjectData.processId) return;

    const project: Project = {
      id: `proj-${Date.now()}`,
      name: newProjectData.name,
      description: newProjectData.description,
      processId: newProjectData.processId,
      status: newProjectData.status,
      city: newProjectData.city,
      createdAt: new Date().toISOString()
    };

    setProjects(prev => [...prev, project]);
    setIsAddingProject(false);
    setNewProjectData({ name: '', description: '', processId: '', status: 'activo', city: '' });
  };

  const handleUpdateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !newProjectData.name || !newProjectData.processId) return;

    setProjects(prev => prev.map(p => p.id === editingProject.id ? {
      ...p,
      name: newProjectData.name,
      description: newProjectData.description,
      processId: newProjectData.processId,
      status: newProjectData.status,
      city: newProjectData.city
    } : p));

    setEditingProject(null);
    setNewProjectData({ name: '', description: '', processId: '', status: 'activo', city: '' });
  };

  const deleteProject = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este proyecto? Las tareas asociadas perderán su vinculación con el proyecto.')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      setTasks(prev => prev.map(t => t.projectId === id ? { ...t, projectId: undefined } : t));
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

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;
    setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
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
      categories: member.categories || [],
      processId: member.processId || '',
      companyId: member.companyId || '',
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

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = normalizeText(t.title).includes(normalizeText(searchQuery)) || 
                         normalizeText(t.description).includes(normalizeText(searchQuery));
    const matchesProject = !activeProjectFilter || t.projectId === activeProjectFilter;
    const matchesMember = !activeMemberFilter || t.memberId === activeMemberFilter;
    
    return matchesSearch && matchesProject && matchesMember;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-[#E5E7EB] z-10 hidden md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 text-[#2563EB] mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white">
              <BrainCircuit size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight">TeamPulse AI</span>
          </div>

          <nav className="space-y-1">
            <NavButton 
              active={activeTab === 'dashboard'} 
              icon={<TrendingUp size={20} />} 
              label="Resumen" 
              onClick={() => setActiveTab('dashboard')} 
            />
            <NavButton 
              active={activeTab === 'tasks'} 
              icon={<CheckCircle2 size={20} />} 
              label="Tareas" 
              onClick={() => setActiveTab('tasks')} 
            />
            <NavButton 
              active={activeTab === 'planner'} 
              icon={<Calendar size={20} />} 
              label="Planificador IA" 
              onClick={() => setActiveTab('planner')} 
            />
            <NavButton 
              active={activeTab === 'projects'} 
              icon={<FolderKanban size={20} />} 
              label="Proyectos" 
              onClick={() => setActiveTab('projects')} 
            />
            <NavButton 
              active={activeTab === 'directory'} 
              icon={<Contact size={20} />} 
              label="Directorio" 
              onClick={() => {
                setActiveTab('directory');
                if (activeTab !== 'directory') setDirectorySubTab('people');
              }} 
            />
            <AnimatePresence>
              {activeTab === 'directory' && (
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
            <NavButton 
              active={activeTab === 'transcript'} 
              icon={<Sparkles size={20} />} 
              label="Analizar Reunión" 
              onClick={() => setActiveTab('transcript')} 
            />
            <NavButton 
              active={activeTab === 'settings'} 
              icon={<Settings size={20} />} 
              label="Configuración" 
              onClick={() => {
                setActiveTab('settings');
                if (activeTab !== 'settings') setSettingsSubTab('general');
              }} 
            />
            <AnimatePresence>
              {activeTab === 'settings' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-8 mt-1 space-y-1 overflow-hidden"
                >
                  <SubNavButton 
                    active={settingsSubTab === 'roles'} 
                    label="Roles" 
                    icon={<Shield size={14} />}
                    onClick={() => setSettingsSubTab('roles')} 
                  />
                  <SubNavButton 
                    active={settingsSubTab === 'processes'} 
                    label="Procesos" 
                    icon={<Building2 size={14} />}
                    onClick={() => setSettingsSubTab('processes')} 
                  />
                  <SubNavButton 
                    active={settingsSubTab === 'members'} 
                    label="Equipo" 
                    icon={<Users size={14} />}
                    onClick={() => setSettingsSubTab('members')} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-[#E5E7EB]">
          <div className="bg-[#EFF6FF] p-4 rounded-xl">
            <h4 className="text-xs font-semibold text-[#1E40AF] uppercase tracking-wider mb-2">Estado del Agente</h4>
            <div className="flex items-center gap-2 text-sm text-[#3B82F6]">
              <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              Conectado y Escuchando
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 h-screen flex flex-col overflow-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 pb-0">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">
              {activeTab === 'dashboard' && 'Panel de Control'}
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
                settingsSubTab === 'roles' ? 'Gestión de Roles' :
                settingsSubTab === 'processes' ? 'Gestión de Procesos' :
                settingsSubTab === 'members' ? 'Gestión de Equipo' :
                'Configuración del Sistema'
              )}
            </h1>
            <p className="text-[#6B7280] text-sm mt-1">
              Información del equipo actualizada por IA en tiempo real.
            </p>
          </div>

          {activeTab === 'settings' && settingsSubTab === 'members' && (
            <div className="flex items-center gap-4">
              {!isAddingMember && !editingMember && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar miembro..."
                      className="pl-10 pr-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => setIsMemberAssistantOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm group"
                  >
                    <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                    Asistente Maestro
                  </button>
                  <button 
                    onClick={() => setIsAddingMember(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] text-[#111827] text-sm font-bold rounded-lg hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <UserPlus size={18} />
                    Nuevo Miembro
                  </button>
                </>
              )}
            </div>
          )}
          {activeTab === 'processes' && (
            <button 
              onClick={() => {
                setEditingProcess(null);
                setNewProcessData({ name: '', description: '', goals: '' });
                setIsAddingProcess(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition-all shadow-sm"
            >
              <Building2 size={18} />
              Nuevo Proceso
            </button>
          )}
          {activeTab === 'projects' && (
            <button 
              onClick={() => {
                setEditingProject(null);
                setNewProjectData({ name: '', description: '', processId: '', status: 'activo' });
                setIsAddingProject(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-sm"
            >
              <FolderKanban size={18} />
              Nuevo Proyecto
            </button>
          )}
          {activeTab === 'tasks' && (
            <div className="flex items-center gap-3">
              {!isAddingTask && !editingTask && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Filtrar tareas..."
                      className="pl-10 pr-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-all w-48"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <select 
                    className="px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm"
                    value={activeProjectFilter || ''}
                    onChange={(e) => setActiveProjectFilter(e.target.value || null)}
                  >
                    <option value="">Todos los Proyectos</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>

                  <select 
                    className="px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm"
                    value={activeMemberFilter || ''}
                    onChange={(e) => setActiveMemberFilter(e.target.value || null)}
                  >
                    <option value="">Todo el Equipo</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>

                  <button 
                    onClick={() => openAddTaskModal()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-100 uppercase tracking-widest"
                  >
                    <Plus size={18} />
                    Nueva Tarea
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'directory' && (
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder={
                    directorySubTab === 'people' ? "Buscar persona..." : 
                    directorySubTab === 'companies' ? "Buscar compañía..." : 
                    "Buscar industria..."
                  }
                  className="pl-10 pr-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-all w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {directorySubTab !== 'industries' && (
                <button 
                  onClick={() => {
                    if (directorySubTab === 'people') {
                      setEditingMember(null);
                      setNewMemberData({
                        name: '',
                        role: '',
                        category: 'contacto',
                        processId: '',
                        companyId: '',
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
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest"
                >
                  <Plus size={18} />
                  {directorySubTab === 'people' ? 'Nueva Persona' : 'Nueva Compañía'}
                </button>
              )}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
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
                <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock size={20} className="text-gray-400" />
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
                <div className="bg-[#2563EB] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                  <Sparkles className="absolute right-[-10px] top-[-10px] w-32 h-32 opacity-10" />
                  <h3 className="text-lg font-bold mb-2">¿Nueva Reunión?</h3>
                  <p className="text-blue-100 text-sm mb-6">Pega la transcripción y deja que la IA actualice los perfiles automáticamente.</p>
                  <button 
                    onClick={() => setActiveTab('transcript')}
                    className="w-full py-3 bg-white text-[#2563EB] font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                  >
                    Empezar Análisis
                    <ArrowRight size={18} />
                  </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
                  <h3 className="font-semibold mb-4">Procesos Vigentes</h3>
                  <div className="space-y-3">
                    {processes.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-sm font-medium">{p.name}</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
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
                      name: '', role: '', systemRoleId: '', categories: ['contacto'], processId: '', companyId: '', ruc: '', 
                      skills: '', responsibilities: '', personality: '', notes: '', email: '', phone: '', epp: ''
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
                      className={`px-6 py-2 rounded-xl font-bold transition-all ${directorySubTab === 'people' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
                    >
                      Personas
                    </button>
                    <button 
                      onClick={() => setDirectorySubTab('companies')}
                      className={`px-6 py-2 rounded-xl font-bold transition-all ${directorySubTab === 'companies' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
                    >
                      Compañías
                    </button>
                    <button 
                      onClick={() => setDirectorySubTab('industries')}
                      className={`px-6 py-2 rounded-xl font-bold transition-all ${directorySubTab === 'industries' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
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
                          {members.filter(m => 
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
                                      onClick={() => handleDeleteMember(member.id)}
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
                        <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 italic">
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
                        <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 italic">
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
                                  <p className="text-xs text-gray-600 italic">"{u.descriptionUpdate}"</p>
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
                      {processProjects.map(project => (
                        <ProjectCard 
                          key={project.id} 
                          project={project}
                          tasks={tasks.filter(t => t.projectId === project.id)}
                          onEdit={openEditProject}
                          onDelete={deleteProject}
                        />
                      ))}
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
              className="flex flex-col h-[calc(100vh-140px)]"
            >
              <div 
                className="flex overflow-x-auto gap-6 pb-4 h-full custom-scrollbar cursor-grab active:cursor-grabbing select-none"
                onMouseDown={(e) => {
                  if (e.button === 1) { // Middle mouse button
                    e.preventDefault();
                    const container = e.currentTarget;
                    const startX = e.pageX - container.offsetLeft;
                    const scrollLeft = container.scrollLeft;

                    const onMouseMove = (moveEvent: MouseEvent) => {
                      const x = moveEvent.pageX - container.offsetLeft;
                      const walk = (x - startX) * 1.5; // Drag speed
                      container.scrollLeft = scrollLeft - walk;
                    };

                    const onMouseUp = () => {
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
                          className="w-full h-32 flex flex-col items-center justify-center text-gray-300 text-xs italic gap-3 opacity-50 hover:opacity-100 hover:bg-white/50 hover:text-blue-500 rounded-[1.5rem] transition-all border-2 border-transparent hover:border-blue-100 group"
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
                    <h2 className="text-3xl font-black text-gray-900 mb-2 italic">Configuración del Sistema</h2>
                    <p className="text-gray-500 max-w-sm mx-auto font-medium">Personaliza los parámetros globales de TeamPulse AI y gestiona las integraciones de Gemini.</p>
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
                  <div className="bg-white p-8 rounded-[3rem] border border-[#E5E7EB] shadow-xl space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <Shield size={24} />
                      </div>
                      <h2 className="text-xl font-black text-gray-900 italic">Roles del Sistema</h2>
                    </div>
                    <div className="space-y-3">
                      {roles.map(role => (
                        <button 
                          key={role.id}
                          onClick={() => setSelectedRoleId(role.id)}
                          className={`w-full p-6 rounded-[2rem] border transition-all text-left flex items-center justify-between group ${
                            selectedRoleId === role.id 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-[1.02]' 
                            : 'bg-gray-50 border-transparent text-gray-800 hover:bg-white hover:shadow-md hover:border-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <Shield size={20} className={selectedRoleId === role.id ? 'text-blue-200' : 'text-blue-600'} />
                            <span className="font-bold tracking-tight">{role.name}</span>
                          </div>
                          <ChevronRight size={18} className={selectedRoleId === role.id ? 'text-white' : 'text-gray-300'} />
                        </button>
                      ))}
                    </div>
                    <div className="pt-6 border-t border-gray-50">
                      <button className="w-full py-4 bg-gray-50 text-gray-400 font-bold rounded-2xl border border-dashed border-gray-200 hover:bg-gray-100 hover:text-gray-600 transition-all flex items-center justify-center gap-2">
                        <Plus size={18} />
                        Añadir Rol Custom
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-2 bg-white p-12 rounded-[3.5rem] border border-[#E5E7EB] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
                    
                    {(() => {
                      const role = roles.find(r => r.id === selectedRoleId);
                      if (!role) return null;
                      const roleMembers = members.filter(m => m.systemRoleId === role.id);
                      
                      return (
                        <div className="space-y-12 relative z-10">
                          <div className="flex justify-between items-start">
                            <div className="space-y-3">
                              <h3 className="text-5xl font-black text-gray-900 leading-tight italic tracking-tighter">{role.name}</h3>
                              <p className="text-gray-500 font-medium max-w-md text-lg leading-relaxed">{role.description}</p>
                            </div>
                            <div className="p-6 bg-blue-600 text-white rounded-[2.5rem] shadow-xl shadow-blue-100">
                              <Shield size={48} />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-gray-100">
                            <div className="space-y-8">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.25em] flex items-center gap-2">
                                  <Sparkles size={16} className="text-blue-500" /> Permisos Operativos
                                </h4>
                                <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Editar</button>
                              </div>
                              <div className="grid grid-cols-1 gap-3">
                                {role.permissions.map(perm => (
                                  <div key={perm} className="flex items-center gap-4 p-5 bg-slate-50 border border-transparent rounded-[1.5rem] group hover:bg-white hover:shadow-xl hover:border-slate-100 transition-all">
                                    <div className="p-2 bg-green-100 text-green-600 rounded-xl">
                                      <Check size={14} strokeWidth={3} />
                                    </div>
                                    <span className="text-sm font-black text-slate-700 uppercase tracking-wider">{perm.replace(/_/g, ' ')}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-8">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.25em] flex items-center gap-2">
                                  <Users size={16} className="text-blue-500" /> Integrantes Asignados
                                </h4>
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">{roleMembers.length} personas</span>
                              </div>

                              {/* Search and Assign Member */}
                              <div className="relative">
                                <div className="flex items-center gap-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                                  <Search size={18} className="text-gray-400" />
                                  <input 
                                    type="text" 
                                    placeholder="Buscar integrante para asignar..."
                                    className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 w-full"
                                    onFocus={(e) => {
                                      const val = e.target.value;
                                      // Trigger suggestions show
                                    }}
                                    onChange={(e) => {
                                      // Search logic handled by locally filtered list
                                      setSearchQuery(e.target.value);
                                    }}
                                  />
                                </div>
                                {searchQuery && (
                                  <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto p-2">
                                    {members
                                      .filter(m => normalizeText(m.name).includes(normalizeText(searchQuery)) && (m.categories || []).includes('miembro'))
                                      .slice(0, 5)
                                      .map(m => (
                                        <button
                                          key={m.id}
                                          onClick={() => {
                                            setMembers(prev => prev.map(member => member.id === m.id ? { ...member, systemRoleId: role.id } : member));
                                            setSearchQuery('');
                                          }}
                                          className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-all text-left group"
                                        >
                                          <img src={m.avatar} alt={m.name} className="w-8 h-8 rounded-lg object-cover" />
                                          <div>
                                            <p className="text-xs font-black text-gray-800">{m.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400">{m.role}</p>
                                          </div>
                                          <Plus size={14} className="ml-auto text-gray-300 group-hover:text-blue-600" />
                                        </button>
                                      ))
                                    }
                                  </div>
                                )}
                              </div>

                              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-4 custom-scrollbar">
                                {roleMembers.map(member => (
                                  <motion.div 
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={member.id} 
                                    className="flex items-center gap-5 p-5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm hover:shadow-lg transition-all group/item"
                                  >
                                    <div className="relative">
                                      <img src={member.avatar} alt={member.name} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
                                    </div>
                                    <div>
                                      <p className="font-black text-gray-900 leading-tight">{member.name}</p>
                                      <p className="text-xs font-bold text-gray-400 tracking-wide mt-0.5">{member.role}</p>
                                    </div>
                                    <div className="ml-auto flex items-center gap-2">
                                      <button 
                                        onClick={() => openEditMember(member)}
                                        className="p-2.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                      >
                                        <Edit size={18} />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          if (window.confirm(`¿Remover a ${member.name} del rol ${role.name}?`)) {
                                            setMembers(prev => prev.map(m => m.id === member.id ? { ...m, systemRoleId: '' } : m));
                                          }
                                        }}
                                        className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/item:opacity-100"
                                      >
                                        <X size={18} />
                                      </button>
                                    </div>
                                  </motion.div>
                                ))}
                                {roleMembers.length === 0 && !searchQuery && (
                                  <div className="py-16 text-center bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                                    <Users size={48} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-sm text-slate-400 font-bold italic">No hay integrantes asignados a este rol.</p>
                                    <p className="text-[10px] text-slate-400 mt-2">Usa el buscador de arriba para asignar uno.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
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
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-gray-900 italic">Gestión de Procesos</h2>
                        <p className="text-gray-500 text-sm font-medium">Estructura operativa y departamentos de la organización.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingProcess(null);
                        setNewProcessData({ name: '', description: '', goals: '' });
                        setIsAddingProcess(true);
                      }}
                      className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
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
                          members={members.filter(m => m.processId === proc.id)}
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
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <Users size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-gray-900 italic">Gestión de Equipo</h2>
                        <p className="text-gray-500 text-sm font-medium">Control operativo y perfiles de los integrantes del equipo.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsAddingMember(true)}
                      className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
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
                          name: '', role: '', systemRoleId: '', categories: ['miembro'], processId: '', companyId: '', ruc: '',
                          skills: '', responsibilities: '', personality: '', notes: '', email: '', phone: '', epp: ''
                        });
                      }}
                      onSave={handleAddMember}
                    />
                  ) : (
                    <div className="space-y-12">
                      {processes.map(process => {
                        const processMembers = members.filter(m => m.processId === process.id && (m.categories || []).includes('miembro'));
                        if (processMembers.length === 0) return null;
                        
                        return (
                          <div key={process.id} className="space-y-6">
                            <div className="flex items-center gap-3 px-4">
                              <div className="w-2 h-8 bg-blue-600 rounded-full" />
                              <h3 className="text-xl font-black text-gray-800 uppercase tracking-wider">{process.name}</h3>
                              <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
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
                                      companyName={companies.find(c => c.id === member.companyId)?.name}
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
                                        handleDeleteMember(member.id);
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
                      {members.filter(m => (!m.processId || m.processId === 'unassigned') && (m.categories || []).includes('miembro')).length > 0 && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-3 px-4">
                            <div className="w-2 h-8 bg-gray-400 rounded-full" />
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-wider">Sin Proceso Asignado</h3>
                            <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                              {members.filter(m => (!m.processId || m.processId === 'unassigned') && (m.categories || []).includes('miembro')).length} integrante(s)
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {members.filter(m => (!m.processId || m.processId === 'unassigned') && (m.categories || []).includes('miembro')).map(member => (
                              <div key={member.id} className="relative group">
                                <div onClick={() => openEditMember(member)} className="cursor-pointer h-full">
                                  <MemberProfileCard 
                                    member={member} 
                                    processName="Sin Proceso"
                                    companyName={companies.find(c => c.id === member.companyId)?.name}
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
                                      handleDeleteMember(member.id);
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
                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-sm font-bold shadow-sm"
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
                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-sm font-bold shadow-sm"
                            value={newTaskData.memberId}
                            onChange={e => setNewTaskData({...newTaskData, memberId: e.target.value})}
                          >
                            <option value="">Sin Asignar (Task Pool)</option>
                            {members.filter(m => !newTaskData.processId || m.processId === newTaskData.processId).map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Plus size={12} className="text-orange-500" /> Auxiliar
                          </label>
                          <select 
                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-sm font-bold shadow-sm"
                            value={newTaskData.auxiliaryId}
                            onChange={e => setNewTaskData({...newTaskData, auxiliaryId: e.target.value})}
                          >
                            <option value="">Sin Auxiliar</option>
                            {members.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <FolderKanban size={12} className="text-green-500" /> Proyecto
                          </label>
                          <select 
                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-sm font-bold shadow-sm"
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
                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-sm font-bold shadow-sm capitalize"
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
                            <option value="backlog">📦 Product Backlog</option>
                            <option value="todo">📋 Por Hacer</option>
                            <option value="in_progress">⚡ En Progreso</option>
                            <option value="blocked">🚫 Bloqueada</option>
                            <option value="review">🔍 En Revisión</option>
                            <option value="done">✅ Completada</option>
                            <option value="rejected">❌ Rechazada</option>
                          </select>
                        </div>

                          <div className="space-y-4 pt-4 border-t-2 border-dashed border-gray-100 mt-4">
                            <div className="bg-gray-50/50 p-4 rounded-[2rem] border border-gray-100/50 space-y-4">
                              {/* ¿Quién bloquea esta tarea? */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-4">
                                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 flex-shrink-0">
                                    <Ban size={10} className="text-red-500" /> BLOQUEADA POR
                                  </label>
                                  <div className="relative flex-1 max-w-[140px]">
                                    <select 
                                      className="w-full px-3 py-1.5 bg-white border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-400 transition-all appearance-none text-[10px] font-bold shadow-sm cursor-pointer pr-8"
                                      value=""
                                      onChange={e => {
                                        if (!e.target.value) return;
                                        if (!newTaskData.blockedByTaskIds?.includes(e.target.value)) {
                                          setNewTaskData({
                                            ...newTaskData, 
                                            blockedByTaskIds: [...(newTaskData.blockedByTaskIds || []), e.target.value]
                                          });
                                        }
                                      }}
                                    >
                                      <option value="">+ Añadir</option>
                                      {tasks
                                        .filter(t => t.id !== newTaskData.id && !newTaskData.blockedByTaskIds?.includes(t.id))
                                        .map(t => (
                                          <option key={t.id} value={t.id}>{t.title}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                      <Plus size={12} />
                                    </div>
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
                                              className="hover:text-red-900 p-1 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                              title="Copiar nombre"
                                            >
                                              <Copy size={11} />
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={() => setNewTaskData({
                                                ...newTaskData, 
                                                blockedByTaskIds: newTaskData.blockedByTaskIds?.filter(tid => tid !== id)
                                              })}
                                              className="hover:text-red-900 p-1 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                              <X size={11} />
                                            </button>
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
                              <div className="space-y-2 pt-3 border-t border-gray-100">
                                <div className="flex items-center justify-between gap-4">
                                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 flex-shrink-0">
                                    <Activity size={10} className="text-blue-500" /> BLOQUEA A
                                  </label>
                                  <div className="relative flex-1 max-w-[140px]">
                                    <select 
                                      className="w-full px-3 py-1.5 bg-white border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 transition-all appearance-none text-[10px] font-bold shadow-sm cursor-pointer pr-8"
                                      value=""
                                      onChange={e => {
                                        const targetTaskId = e.target.value;
                                        if (!targetTaskId) return;
                                        
                                        // Actualizar la tarea objetivo para que esté bloqueada por esta tarea
                                        setTasks(prev => prev.map(t => {
                                          if (t.id === targetTaskId) {
                                            const currentBlockedBy = t.blockedByTaskIds || [];
                                            if (!currentBlockedBy.includes(newTaskData.id)) {
                                              return { ...t, blockedByTaskIds: [...currentBlockedBy, newTaskData.id] };
                                            }
                                          }
                                          return t;
                                        }));
                                      }}
                                    >
                                      <option value="">+ Añadir</option>
                                      {tasks
                                        .filter(t => t.id !== newTaskData.id && !(t.blockedByTaskIds || []).includes(newTaskData.id))
                                        .map(t => (
                                          <option key={t.id} value={t.id}>{t.title}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                      <Activity size={12} />
                                    </div>
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
                                              className="hover:text-blue-900 p-1 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                              title="Copiar nombre"
                                            >
                                              <Copy size={11} />
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={() => {
                                                // Quitar el bloqueo de la otra tarea
                                                setTasks(prev => prev.map(pt => pt.id === t.id ? {
                                                  ...pt,
                                                  blockedByTaskIds: pt.blockedByTaskIds?.filter(id => id !== newTaskData.id)
                                                } : pt));
                                              }}
                                              className="hover:text-blue-900 p-1 hover:bg-blue-100 rounded-lg transition-colors"
                                            >
                                              <X size={11} />
                                            </button>
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
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Resumen / Historia de Usuario</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Como [rol], quiero [acción] para [beneficio]"
                          className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xl font-bold shadow-sm placeholder:text-gray-300"
                          value={newTaskData.title}
                          onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Clock size={12} className="text-blue-500" /> Horas Plan.
                          </label>
                          <select 
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold shadow-sm appearance-none cursor-pointer"
                            value={newTaskData.plannedHours}
                            onChange={e => setNewTaskData({...newTaskData, plannedHours: parseFloat(e.target.value) || 0})}
                          >
                            <option value="0">Sin horas</option>
                            {[1, 2, 3, 5, 8, 13, 21].map(num => (
                              <option key={num} value={num}>{num} {num === 1 ? 'hora' : 'horas'}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
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
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Calendar size={12} className="text-purple-500" /> Fecha de Entrega
                          </label>
                          <input 
                            type="date" 
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold shadow-sm"
                            value={newTaskData.dueDate}
                            onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                             <LinkIcon size={14} className="text-blue-500" /> Entregables y Enlaces
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
                                value={del.label}
                                onChange={e => {
                                  const next = [...(newTaskData.deliverables || [])];
                                  next[idx] = { ...next[idx], label: e.target.value };
                                  setNewTaskData({ ...newTaskData, deliverables: next });
                                }}
                              />
                              <input 
                                placeholder="https://..."
                                className="flex-[2] px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 transition-all"
                                value={del.url}
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

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Criterios de Aceptación / Definición de Hecho (DoD)</label>
                        <textarea 
                          required
                          placeholder="Describe detalladamente los requerimientos y condiciones para completar esta tarea..."
                          className="w-full h-80 px-6 py-5 bg-white border-2 border-gray-100 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none text-sm leading-relaxed shadow-sm placeholder:text-gray-300"
                          value={newTaskData.description}
                          onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-100 bg-white sticky bottom-0 z-10 -m-10 p-10 mt-10">
                    <button 
                      type="submit"
                      className={`w-full py-5 text-white text-lg font-black rounded-3xl shadow-2xl transition-all transform hover:scale-[1.01] active:scale-[0.99] ${editingTask ? 'bg-blue-600 shadow-blue-200 hover:bg-blue-700' : 'bg-green-600 shadow-green-200 hover:bg-green-700'}`}
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
                      {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
              tasks={tasks.filter(t => t.memberId === viewingMember.id)}
              process={processes.find(p => p.id === viewingMember.processId)}
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

function ProjectCard({ project, tasks, onEdit, onDelete }: { project: Project, tasks: Task[], onEdit: (p: Project) => void, onDelete: (id: string) => void, key?: string | number }) {
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
          <button onClick={() => onEdit(project)} className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 rounded-xl transition-colors"><Edit size={14} /></button>
          <button onClick={() => onDelete(project.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-xl transition-colors"><Trash size={14} /></button>
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
          <div className="text-[10px] font-medium text-gray-400 italic">
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
        ? 'bg-[#2563EB] text-white shadow-md shadow-blue-100' 
        : 'text-gray-500 hover:bg-gray-100'
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
        ? 'text-[#2563EB] bg-[#EFF6FF]' 
        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">
          {icon}
        </div>
        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{trend}</span>
      </div>
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <div className="text-3xl font-bold mt-1 text-[#111827]">{value}</div>
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
                    <p className="text-gray-600 text-sm italic">{company.notes}</p>
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
                <p className="text-sm text-slate-300 leading-relaxed italic">
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
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Rol en el Sistema</label>
                <select 
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium appearance-none"
                  value={newMemberData.systemRoleId}
                  onChange={e => setNewMemberData({...newMemberData, systemRoleId: e.target.value})}
                >
                  <option value="">Seleccionar Rol (Opcional)</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">RUC (Si es Persona Natural)</label>
                <input 
                  type="text" 
                  placeholder="Ej: 1729384756001"
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium"
                  value={newMemberData.ruc}
                  onChange={e => setNewMemberData({...newMemberData, ruc: e.target.value})}
                />
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

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Compañía / Organización</label>
              <select 
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium appearance-none"
                value={newMemberData.companyId}
                onChange={e => setNewMemberData({...newMemberData, companyId: e.target.value})}
              >
                <option value="">Ninguna / Independiente</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Cargo / Rol</label>
              <input 
                type="text" 
                placeholder="Ej: UX Designer"
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium"
                value={newMemberData.role}
                onChange={e => setNewMemberData({...newMemberData, role: e.target.value})}
              />
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
              <p className="text-[10px] text-gray-400 mt-1 ml-1 font-medium italic">Separa los elementos con comas para que se visualicen individualmente.</p>
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
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
          <MessageSquareQuote size={18} />
        </div>
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[1px] h-4 bg-gray-100" />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-sm">{title}</span>
          <span className="text-[10px] text-gray-400">{time}</span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
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
                      <div className="px-4 py-3 text-xs text-gray-400 italic">Escribe para buscar o añadir...</div>
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
  companyName?: string;
  roles: Role[];
  key?: string | number;
}

function MemberProfileCard({ member, processName, companyName, roles }: MemberProfileCardProps) {
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
          <p className="text-sm text-gray-500 font-medium">{member.role}</p>
          
          <div className="mt-3 flex flex-wrap gap-2">
            {member.systemRoleId && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-[9px] font-black text-white rounded-full uppercase tracking-[0.1em] shadow-sm">
                <Shield size={10} />
                {roles.find(r => r.id === member.systemRoleId)?.name || 'Rol asignado'}
              </div>
            )}
            {processName !== 'Sin Proceso' && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[10px] font-black text-blue-600 rounded-full uppercase tracking-widest">
                <Layers size={10} />
                {processName}
              </div>
            )}
            {companyName && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-[10px] font-black text-gray-600 rounded-full uppercase tracking-widest">
                <Building2 size={10} />
                {companyName}
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
              <p className="text-[11px] text-gray-700 mt-1 font-medium italic">
                "{member.recentAchievements[0]}"
              </p>
            </div>
          )}

          {member.notes && (
            <div className="pt-4 border-t border-gray-50">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                <Info size={10} /> Notas
              </span>
              <p className="text-[11px] text-gray-600 mt-1 line-clamp-2 italic">
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
                <p className="text-xs text-gray-400 italic">No hay miembros asignados a este proceso.</p>
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
    done: { label: 'Completada', color: 'bg-green-100 text-green-600', next: null, nextLabel: '' },
    rejected: { label: 'Rechazada', color: 'bg-orange-100 text-orange-600', next: 'backlog', nextLabel: 'Restaurar a Backlog' }
  };

  const config = statusConfig[task.status] || statusConfig.backlog;
  const blockInfo = isTaskBlocked(task.id, allTasks);

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative">
      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all flex gap-2 z-10">
        <button 
          onClick={() => onDelete(task.id)} 
          className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
          title="Eliminar"
        >
          <Trash size={14} />
        </button>
      </div>

      {/* Title Header */}
      <div className="mb-4 pr-12">
        <h4 
          onClick={() => onEdit(task)} 
          className="font-black text-gray-900 leading-tight cursor-pointer hover:text-blue-600 transition-colors text-base line-clamp-2"
          title="Editar tarea"
        >
          {task.title}
        </h4>
      </div>

      <p className="text-sm text-gray-500 mb-6 line-clamp-3 leading-relaxed font-medium">
        {task.description}
      </p>

      {/* Time and Date Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100/50 transition-all hover:bg-gray-100/50">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
            <Clock size={8} /> Horas Plan/Real.
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-black text-gray-900">{task.actualHours || 0}</span>
            <span className="text-[10px] font-bold text-gray-400">/ {task.plannedHours || 0}</span>
          </div>
        </div>
        <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100/50 transition-all hover:bg-gray-100/50">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
            <Calendar size={8} /> Fecha de Entrega
          </p>
          <p className="text-xs font-black text-gray-900 truncate uppercase mt-0.5">
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'Sin fecha'}
          </p>
        </div>
      </div>
      
      {/* Dependency Status */}
      {blockInfo.isBlocked && (
        <div className="mb-4 flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl border border-red-100 animate-pulse">
          <Ban size={12} className="flex-shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-tight">Bloqueada por {blockInfo.blockers.length} {blockInfo.blockers.length === 1 ? 'tarea' : 'tareas'}</span>
        </div>
      )}
      
      {/* Impact Status */}
      {allTasks.filter(t => t.blockedByTaskIds?.includes(task.id)).length > 0 && (
        <div className="mb-4 flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
          <Activity size={12} className="flex-shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-tight">Bloquea a {allTasks.filter(t => t.blockedByTaskIds?.includes(task.id)).length} tareas</span>
        </div>
      )}
      
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mb-6">
        <div className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${config.color.replace('bg-', 'bg-').replace('text-', 'text-')}`}>
          {config.label}
        </div>
        {project && (
          <div className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
            <FolderKanban size={10} />
            {project.name}
          </div>
        )}
        {process && (
          <div className="text-[9px] font-black text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
            {process.name}
          </div>
        )}
        {task.deliverables && task.deliverables.length > 0 && (
          <div 
            className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg border border-indigo-100/50"
            title={`${task.deliverables.length} entregables vinculados`}
          >
            <LinkIcon size={10} />
            <span className="text-[9px] font-black uppercase tracking-wider">{task.deliverables.length} ENTREGABLES</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-5 border-t border-gray-100 mt-2">
        <div className="flex gap-2">
          {config.next && (
            <button 
              onClick={() => onUpdateStatus(task.id, config.next!)} 
              className={`px-6 py-2.5 text-[11px] font-black text-white rounded-2xl transition-all shadow-lg flex items-center gap-2 uppercase tracking-widest ${
                (config.next === 'in_progress' && blockInfo.isBlocked)
                ? 'bg-red-500 hover:bg-red-600 shadow-red-200 animate-pulse' 
                : 'bg-gray-900 hover:bg-blue-600 shadow-gray-200 hover:shadow-blue-200'
              }`}
              title={config.next === 'in_progress' && blockInfo.isBlocked ? `Tarea bloqueada por ${blockInfo.blockers.length} tareas` : config.nextLabel}
            >
              {config.next === 'in_progress' && blockInfo.isBlocked ? <Lock size={14} /> : null}
              {config.nextLabel.includes('Pasar') ? 'PASAR' : config.nextLabel.split(' ')[0]}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Personnel Section at the bottom */}
      <div className="mt-6 pt-5 border-t border-dashed border-gray-100 space-y-4">
        {/* Responsible */}
        <div className="flex items-center gap-3">
          <div className="relative">
            {member ? (
              <img 
                src={member.avatar} 
                className="w-8 h-8 rounded-xl ring-2 ring-white object-cover" 
                referrerPolicy="no-referrer" 
                alt={member.name}
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                <User size={14} />
              </div>
            )}
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] leading-none mb-0.5">Responsable Principal</p>
            <p className="text-xs font-bold text-gray-900">{member ? member.name : 'Por asignar'}</p>
          </div>
        </div>

        {/* Assistant */}
        {auxiliary && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={auxiliary.avatar} 
                className="w-8 h-8 rounded-xl ring-2 ring-white grayscale opacity-60 transition-all group-hover:grayscale-0 group-hover:opacity-100" 
                referrerPolicy="no-referrer" 
                alt={auxiliary.name}
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-lg border-2 border-white flex items-center justify-center">
                <Plus size={10} className="text-white" />
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] leading-none mb-0.5">Auxiliar de Apoyo</p>
              <p className="text-xs font-bold text-gray-900">{auxiliary.name}</p>
            </div>
          </div>
        )}
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

function MemberDetailsModal({ member, onClose, tasks, process, onUpdateMember }: { member: TeamMember, onClose: () => void, tasks: Task[], process?: Process, onUpdateMember: (m: TeamMember) => void }) {
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
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-lg backdrop-blur-md">{member.role}</span>
                <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-lg backdrop-blur-md uppercase">{process?.name}</span>
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
                    <div key={i} className="flex gap-2 text-xs text-gray-600 bg-green-50 p-3 rounded-xl border border-green-100 italic">
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
