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
  FolderKanban
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TeamMember, Process, ExtractedUpdates, Task, Project, SuggestedActivity, MemberDraft } from './types';
import { initialMembers, initialProcesses, initialTasks } from './lib/initialData';
import { analyzeTranscript, getPlanningSuggestions, processMemberInput } from './services/aiService';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transcript' | 'members' | 'processes' | 'tasks' | 'planner' | 'projects'>('dashboard');
  const [members, setMembers] = useState<TeamMember[]>(() => {
    const saved = localStorage.getItem('teampulse_members');
    if (!saved) return initialMembers;
    try {
      const data = JSON.parse(saved);
      // Migrate individual members if they still have departmentId
      return data.map((m: any) => ({
        ...m,
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
      // Migrate individual tasks if they still have departmentId
      return data.map((t: any) => ({
        ...t,
        processId: t.processId || t.departmentId || 'default',
        projectId: t.projectId || undefined
      }));
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
    processId: '',
    skills: '',
    responsibilities: '',
    personality: '',
    notes: '',
    email: '',
    phone: '',
    epp: ''
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
    title: '',
    description: '',
    memberId: '',
    auxiliaryId: '',
    processId: '',
    projectId: '',
    status: 'pendiente' as 'pendiente' | 'en_progreso' | 'completada'
  });

  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    description: '',
    processId: '',
    status: 'activo' as 'activo' | 'completado' | 'pausado'
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
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: activity.title,
      description: activity.description,
      status: 'pendiente',
      processId: activity.processId || processes[0]?.id || 'default',
      memberId: activity.memberId || undefined,
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [...prev, newTask]);
    setSuggestedActivities(prev => prev.filter(a => a.id !== activity.id));
    
    // Optional: show a small toast or notification if we had one
  };

  useEffect(() => {
    localStorage.setItem('teampulse_members', JSON.stringify(members));
  }, [members]);

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
    if (!newMemberData.name || !newMemberData.role || !newMemberData.processId) return;

    if (editingMember) {
      setMembers(prev => prev.map(m => m.id === editingMember.id ? {
        ...m,
        name: newMemberData.name,
        role: newMemberData.role,
        processId: newMemberData.processId,
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
        processId: newMemberData.processId,
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
      processId: '',
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

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskData.title || !newTaskData.processId) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskData.title,
      description: newTaskData.description,
      status: newTaskData.status,
      processId: newTaskData.processId,
      memberId: newTaskData.memberId || undefined,
      auxiliaryId: newTaskData.auxiliaryId || undefined,
      projectId: newTaskData.projectId || undefined,
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [...prev, newTask]);
    setIsAddingTask(false);
    setNewTaskData({
      title: '',
      description: '',
      memberId: '',
      auxiliaryId: '',
      processId: '',
      projectId: '',
      status: 'pendiente'
    });
  };
  
  const handleUpdateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !newTaskData.title || !newTaskData.processId) return;

    setTasks(prev => prev.map(t => t.id === editingTask.id ? {
      ...t,
      title: newTaskData.title,
      description: newTaskData.description,
      processId: newTaskData.processId,
      memberId: newTaskData.memberId || undefined,
      auxiliaryId: newTaskData.auxiliaryId || undefined,
      projectId: newTaskData.projectId || undefined,
      status: newTaskData.status
    } : t));

    setEditingTask(null);
    setNewTaskData({
      title: '',
      description: '',
      memberId: '',
      auxiliaryId: '',
      processId: '',
      projectId: '',
      status: 'pendiente'
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
      status: task.status
    });
  };

  const updateTaskStatus = (id: string, newStatus: Task['status']) => {
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
      createdAt: new Date().toISOString()
    };

    setProjects(prev => [...prev, project]);
    setIsAddingProject(false);
    setNewProjectData({ name: '', description: '', processId: '', status: 'activo' });
  };

  const handleUpdateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !newProjectData.name || !newProjectData.processId) return;

    setProjects(prev => prev.map(p => p.id === editingProject.id ? {
      ...p,
      name: newProjectData.name,
      description: newProjectData.description,
      processId: newProjectData.processId,
      status: newProjectData.status
    } : p));

    setEditingProject(null);
    setNewProjectData({ name: '', description: '', processId: '', status: 'activo' });
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
      status: proj.status
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
      processId: member.processId,
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
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              active={activeTab === 'transcript'} 
              icon={<Sparkles size={20} />} 
              label="Analizar Reunión" 
              onClick={() => setActiveTab('transcript')} 
            />
            <NavButton 
              active={activeTab === 'members'} 
              icon={<Users size={20} />} 
              label="Equipo" 
              onClick={() => setActiveTab('members')} 
            />
            <NavButton 
              active={activeTab === 'processes'} 
              icon={<Building2 size={20} />} 
              label="Procesos" 
              onClick={() => setActiveTab('processes')} 
            />
            <NavButton 
              active={activeTab === 'projects'} 
              icon={<FolderKanban size={20} />} 
              label="Proyectos" 
              onClick={() => setActiveTab('projects')} 
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
      <main className="md:ml-64 p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">
              {activeTab === 'dashboard' && 'Panel de Control'}
              {activeTab === 'transcript' && 'Análisis de Transcripciones'}
              {activeTab === 'members' && 'Directorio del Equipo'}
              {activeTab === 'processes' && 'Gestión de Procesos'}
              {activeTab === 'projects' && 'Gestión de Proyectos'}
              {activeTab === 'tasks' && 'Seguimiento de Tareas'}
              {activeTab === 'planner' && 'Asistente de Planificación'}
            </h1>
            <p className="text-[#6B7280] text-sm mt-1">
              Información del equipo actualizada por IA en tiempo real.
            </p>
          </div>

          {activeTab === 'members' && (
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
            <button 
              onClick={() => setIsAddingTask(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-all shadow-sm"
            >
              <Plus size={18} />
              Nueva Tarea
            </button>
          )}
        </header>

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
                    {activeTab === 'members' && (
            <motion.div 
              key="members"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {(isAddingMember || editingMember) ? (
                <MemberEditorView 
                  editingMember={editingMember}
                  newMemberData={newMemberData}
                  setNewMemberData={setNewMemberData}
                  processes={processes}
                  onCancel={() => {
                    setIsAddingMember(false);
                    setEditingMember(null);
                    setNewMemberData({
                      name: '', role: '', processId: '', skills: '', responsibilities: '',
                      personality: '', notes: '', email: '', phone: '', epp: ''
                    });
                  }}
                  onSave={handleAddMember}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMembers.map(member => (
                    <div key={member.id} className="relative group">
                      <div onClick={() => openEditMember(member)} className="cursor-pointer h-full">
                        <MemberProfileCard 
                          member={member} 
                          processName={processes.find(p => p.id === member.processId)?.name || 'Sin Proceso'}
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
                  {filteredMembers.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-400">
                      No se encontraron miembros para "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'processes' && (
            <motion.div 
              key="processes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {processes.map(proc => (
                <ProcessDetailCard 
                  key={proc.id} 
                  proc={proc} 
                  members={members.filter(m => m.processId === proc.id)}
                  onEdit={openEditProcess}
                  onDelete={handleDeleteProcess}
                />
              ))}
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
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Pending Tasks */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs">Pendientes</h3>
                    <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {tasks.filter(t => t.status === 'pendiente').length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tasks.filter(t => t.status === 'pendiente').map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        member={members.find(m => m.id === task.memberId)} 
                        auxiliary={members.find(m => m.id === task.auxiliaryId)}
                        process={processes.find(p => p.id === task.processId)} 
                        project={projects.find(p => p.id === task.projectId)}
                        onUpdateStatus={updateTaskStatus} 
                        onEdit={openEditTask} 
                        onDelete={handleDeleteTask} 
                      />
                    ))}
                  </div>
                </div>

                {/* In Progress Tasks */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-bold text-blue-500 uppercase tracking-wider text-xs">En Progreso</h3>
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {tasks.filter(t => t.status === 'en_progreso').length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tasks.filter(t => t.status === 'en_progreso').map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        member={members.find(m => m.id === task.memberId)} 
                        auxiliary={members.find(m => m.id === task.auxiliaryId)}
                        process={processes.find(p => p.id === task.processId)} 
                        project={projects.find(p => p.id === task.projectId)}
                        onUpdateStatus={updateTaskStatus} 
                        onEdit={openEditTask} 
                        onDelete={handleDeleteTask} 
                      />
                    ))}
                  </div>
                </div>

                {/* Completed Tasks */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-bold text-green-500 uppercase tracking-wider text-xs">Completadas</h3>
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {tasks.filter(t => t.status === 'completada').length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tasks.filter(t => t.status === 'completada').map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        member={members.find(m => m.id === task.memberId)} 
                        auxiliary={members.find(m => m.id === task.auxiliaryId)}
                        process={processes.find(p => p.id === task.processId)} 
                        project={projects.find(p => p.id === task.projectId)}
                        onUpdateStatus={updateTaskStatus} 
                        onEdit={openEditTask} 
                        onDelete={handleDeleteTask} 
                      />
                    ))}
                  </div>
                </div>
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

                          <button 
                            onClick={() => createActivityAsTask(activity)}
                            className="w-full py-3 bg-gray-50 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 hover:text-white transition-all border border-gray-100 group-hover:border-transparent"
                          >
                            <Plus size={18} />
                            Crear como Tarea
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
                    <div className={`p-2 rounded-lg ${editingTask ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                      {editingTask ? <Edit size={20} /> : <CheckCircle2 size={20} />}
                    </div>
                    <h2 className="text-xl font-bold">{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
                  </div>
                  <button 
                    onClick={() => {
                      setIsAddingTask(false);
                      setEditingTask(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={editingTask ? handleUpdateTask : handleAddTask} className="p-8 space-y-4">
                  {editingTask && (
                    <button 
                      type="button"
                      onClick={() => {
                        handleDeleteTask(editingTask.id);
                        setEditingTask(null);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-all mb-2 text-sm font-bold"
                    >
                      <Trash size={14} />
                      Eliminar Tarea
                    </button>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Título de la Tarea</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: Finalizar reporte mensual"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      value={newTaskData.title}
                      onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descripción</label>
                    <textarea 
                      required
                      placeholder="Detalles de la tarea..."
                      className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all resize-none"
                      value={newTaskData.description}
                      onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Proceso</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all appearance-none"
                        value={newTaskData.processId}
                        onChange={e => setNewTaskData({...newTaskData, processId: e.target.value})}
                      >
                        <option value="">Seleccionar...</option>
                        {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Responsable</label>
                      <select 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all appearance-none"
                        value={newTaskData.memberId}
                        onChange={e => setNewTaskData({...newTaskData, memberId: e.target.value})}
                      >
                        <option value="">Cualquiera</option>
                        {members.filter(m => !newTaskData.processId || m.processId === newTaskData.processId).map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Auxiliar (Opcional)</label>
                      <select 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all appearance-none"
                        value={newTaskData.auxiliaryId}
                        onChange={e => setNewTaskData({...newTaskData, auxiliaryId: e.target.value})}
                      >
                        <option value="">Ninguno</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Proyecto Relacionado</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all appearance-none"
                      value={newTaskData.projectId}
                      onChange={e => setNewTaskData({...newTaskData, projectId: e.target.value})}
                    >
                      <option value="">Sin Proyecto</option>
                      {projects.filter(p => !newTaskData.processId || p.processId === newTaskData.processId).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {editingTask && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all appearance-none"
                        value={newTaskData.status}
                        onChange={e => setNewTaskData({...newTaskData, status: e.target.value as any})}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en_progreso">En Progreso</option>
                        <option value="completada">Completada</option>
                      </select>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className={`w-full py-4 text-white font-bold rounded-2xl shadow-lg transition-all mt-4 ${editingTask ? 'bg-blue-600 shadow-blue-100 hover:bg-blue-700' : 'bg-green-600 shadow-green-100 hover:bg-green-700'}`}
                  >
                    {editingTask ? 'Guardar Cambios' : 'Crear Tarea'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
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
      </main>
    </div>
  );
}

// Sub-components

function ProjectCard({ project, tasks, onEdit, onDelete }: { project: Project, tasks: Task[], onEdit: (p: Project) => void, onDelete: (id: string) => void, key?: string | number }) {
  const completedTasks = tasks.filter(t => t.status === 'completada');
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

function MemberEditorView({
  editingMember,
  newMemberData,
  setNewMemberData,
  processes,
  onCancel,
  onSave
}: {
  editingMember: TeamMember | null;
  newMemberData: any;
  setNewMemberData: (data: any) => void;
  processes: Process[];
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
                {editingMember ? 'Editar Perfil' : 'Añadir Nuevo Miembro'}
              </h2>
              <p className="text-gray-500">Configura la información detallada del integrante del equipo.</p>
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
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Información Básica</h3>
            
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
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Cargo / Rol</label>
              <input 
                type="text" 
                required
                placeholder="Ej: UX Designer"
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 transition-all text-gray-700 font-medium"
                value={newMemberData.role}
                onChange={e => setNewMemberData({...newMemberData, role: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Proceso Asignado</label>
              <select 
                required
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

interface MemberProfileCardProps {
  member: TeamMember;
  processName: string;
  key?: string | number;
}

function MemberProfileCard({ member, processName }: MemberProfileCardProps) {
  return (
    <div className="bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 group">
      <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600" />
      <div className="px-6 pb-6 relative">
        <img 
          src={member.avatar} 
          alt={member.name} 
          className="w-20 h-20 rounded-2xl border-4 border-white absolute -top-10 shadow-lg object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="pt-12">
          <h4 className="text-lg font-bold text-[#111827]">{member.name}</h4>
          <p className="text-sm text-gray-500 font-medium">{member.role}</p>
          <div className="mt-2 inline-block px-2 py-1 bg-gray-100 text-[10px] font-bold text-gray-600 rounded-md uppercase tracking-wide">
            {processName}
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
  member, 
  auxiliary,
  process, 
  project, 
  onUpdateStatus, 
  onEdit, 
  onDelete 
}: { 
  task: Task, 
  member?: TeamMember, 
  auxiliary?: TeamMember,
  process?: Process, 
  project?: Project, 
  onUpdateStatus: (id: string, s: Task['status']) => void, 
  onEdit: (t: Task) => void, 
  onDelete: (id: string) => void, 
  key?: string | number 
}) {
  const statusColors = {
    pendiente: 'bg-gray-100 text-gray-600',
    en_progreso: 'bg-blue-100 text-blue-600',
    completada: 'bg-green-100 text-green-600'
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
        <button 
          onClick={() => onEdit(task)} 
          className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          title="Editar Tarea"
        >
          <Edit size={18} />
        </button>
        <button 
          onClick={() => onDelete(task.id)} 
          className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
          title="Eliminar"
        >
          <Trash size={14} />
        </button>
      </div>

      <div className="flex items-start justify-between mb-1 pr-16">
        <h4 className="font-bold text-gray-900 leading-tight">{task.title}</h4>
      </div>
      <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">{task.description}</p>
      
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${statusColors[task.status]}`}>
          {task.status.replace('_', ' ')}
        </div>
        {project && (
          <div className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1">
            <FolderKanban size={10} />
            {project.name}
          </div>
        )}
        {process && (
          <div className="text-[10px] font-bold text-gray-400 uppercase">
            • {process.name}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-2">
        <div className="flex items-center gap-3">
          {member && (
            <div className="flex items-center gap-2 group/member" title={`Responsable: ${member.name}`}>
              <img src={member.avatar} className="w-6 h-6 rounded-lg ring-2 ring-white" />
              <div className="hidden sm:block">
                <p className="text-[9px] font-bold text-gray-900 leading-none">{member.name.split(' ')[0]}</p>
                <p className="text-[7px] text-gray-500 uppercase tracking-tighter">Responsable</p>
              </div>
            </div>
          )}
          {auxiliary && (
            <div className="flex items-center gap-2 group/aux" title={`Auxiliar: ${auxiliary.name}`}>
              <div className="relative">
                <img src={auxiliary.avatar} className="w-6 h-6 rounded-lg ring-2 ring-white grayscale opacity-70" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gray-100 rounded-md border border-white flex items-center justify-center">
                  <Plus size={8} className="text-gray-500" />
                </div>
              </div>
              <div className="hidden sm:block">
                <p className="text-[9px] font-bold text-gray-500 leading-none">{auxiliary.name.split(' ')[0]}</p>
                <p className="text-[7px] text-gray-400 uppercase tracking-tighter">Auxiliar</p>
              </div>
            </div>
          )}
          {!member && !auxiliary && (
            <span className="text-[10px] text-gray-400 italic">Sin asignar</span>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={() => onUpdateStatus(task.id, 'en_progreso')} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors" title="En Progreso"><Clock size={16} /></button>
          <button onClick={() => onUpdateStatus(task.id, 'completada')} className="p-1.5 hover:bg-green-50 text-green-500 rounded-lg transition-colors" title="Completada"><CheckCircle2 size={16} /></button>
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
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${t.status === 'completada' ? 'bg-green-500' : t.status === 'en_progreso' ? 'bg-blue-500' : 'bg-gray-300'}`} />
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
