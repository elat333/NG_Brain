/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  FolderKanban, 
  ExternalLink, 
  Plus, 
  Trash, 
  Edit, 
  Save, 
  X, 
  Activity, 
  Bookmark, 
  FileText, 
  Lock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Folder,
  FolderOpen,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Link as LinkIcon,
  Shield,
  Info,
  Calendar,
  Share2,
  UserPlus,
  Eye,
  Pencil,
  ShieldCheck,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TeamMember, Process, Task, Project, Role, ProcessLink, ProcessNote, NoteShareAccess } from '../types';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  OperationType, 
  handleFirestoreError 
} from '../lib/firebase';

// Helper to determine if a member is a system admin or has process leadership permissions
const getModuleAccess = (
  member: TeamMember | null | undefined,
  roles: Role[] | undefined,
  moduleId: string
): 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador' => {
  if (!member) return 'ninguno';
  if (member.isSystemAdmin || member.systemRoleId === 'role-admin') return 'administrador';
  
  if (member.moduleAccess) {
    if (member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    
    // Fallback to general tasks access for specific tasks modules
    if (moduleId.startsWith('tasks_')) {
      const generalTasksAccess = member.moduleAccess['tasks'];
      if (generalTasksAccess !== undefined) return generalTasksAccess;
    }

    // Fallback to general projects access for specific projects modules
    if (moduleId.startsWith('projects_')) {
      const generalProjectsAccess = member.moduleAccess['projects'];
      if (generalProjectsAccess !== undefined) return generalProjectsAccess;
    }
  }

  return 'ninguno';
};

// Helper function to get Monday and Sunday week info for a given date (Monday to Sunday)
const getWeekInfo = (dateStr?: string) => {
  if (!dateStr) {
    return {
      key: '9999-99-99', // Put unscheduled at the end
      label: 'Sin fecha planificada',
    };
  }
  
  // Parse dateStr (expected YYYY-MM-DD)
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return {
      key: '9999-99-99',
      label: 'Sin fecha planificada',
    };
  }
  
  const yyyyVal = parseInt(parts[0], 10);
  const mmVal = parseInt(parts[1], 10) - 1; // 0-indexed
  const ddVal = parseInt(parts[2], 10);
  
  const date = new Date(yyyyVal, mmVal, ddVal, 12, 0, 0); // Use noon local time to avoid timezone issues
  if (isNaN(date.getTime())) {
    return {
      key: '9999-99-99',
      label: 'Sin fecha planificada',
    };
  }
  
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (d: Date) => {
    const dayNum = d.getDate();
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dayNum} ${months[d.getMonth()]}`;
  };
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = monday.getFullYear();
  const mm = pad(monday.getMonth() + 1);
  const dd = pad(monday.getDate());
  
  return {
    key: `${yyyy}-${mm}-${dd}`,
    label: `Semana del ${formatDate(monday)} al ${formatDate(sunday)}`,
  };
};

interface ProcessDashboardProps {
  currentMember: TeamMember | null | undefined;
  processes: Process[];
  members: TeamMember[];
  tasks: Task[];
  projects: Project[];
  roles: Role[];
  processLinks: ProcessLink[];
  processNotes: ProcessNote[];
  activeSubTab?: 'summary' | 'projects' | 'links' | 'notes';
  setActiveSubTab?: (tab: 'summary' | 'projects' | 'links' | 'notes') => void;
  selectedProcessId?: string;
  setSelectedProcessId?: (id: string) => void;
  showFicha?: boolean;
  setShowFicha?: (show: boolean) => void;
  onOpenTask?: (task: Task) => void;
}

export default function ProcessDashboard({
  currentMember,
  processes,
  members,
  tasks,
  projects,
  roles,
  processLinks,
  processNotes,
  activeSubTab: externalActiveSubTab,
  setActiveSubTab: externalSetActiveSubTab,
  selectedProcessId: externalSelectedProcessId,
  setSelectedProcessId: externalSetSelectedProcessId,
  showFicha: externalShowFicha,
  setShowFicha: externalSetShowFicha,
  onOpenTask
}: ProcessDashboardProps) {
  // Determine list of accessible processes for the current member
  const isSystemAdmin = currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin';
  
  // Available processes to view
  const accessibleProcesses = useMemo(() => {
    if (!currentMember) return processes;
    if (isSystemAdmin || getModuleAccess(currentMember, roles, 'process_dashboard') === 'administrador') {
      return processes;
    }

    const filtered = processes.filter(p => {
      if (currentMember.processId === p.id) return true;

      const tasksAccess = getModuleAccess(currentMember, roles, `tasks_${p.id}`);
      const projectsAccess = getModuleAccess(currentMember, roles, `projects_${p.id}`);
      const processAccess = getModuleAccess(currentMember, roles, `process_${p.id}`);

      return tasksAccess !== 'ninguno' || projectsAccess !== 'ninguno' || processAccess !== 'ninguno';
    });

    return filtered.length > 0 ? filtered : processes;
  }, [processes, currentMember, roles, isSystemAdmin]);

  // Selected Process State
  const [localSelectedProcessId, setLocalSelectedProcessId] = useState<string>(() => {
    if (currentMember?.processId) return currentMember.processId;
    return processes[0]?.id || '';
  });

  const [localShowFicha, setLocalShowFicha] = useState<boolean>(false);

  const selectedProcessId = externalSelectedProcessId !== undefined ? externalSelectedProcessId : localSelectedProcessId;
  const setSelectedProcessId = externalSetSelectedProcessId !== undefined ? externalSetSelectedProcessId : setLocalSelectedProcessId;
  const showFicha = externalShowFicha !== undefined ? externalShowFicha : localShowFicha;
  const setShowFicha = externalSetShowFicha !== undefined ? externalSetShowFicha : setLocalShowFicha;

  // Current selected process
  const selectedProcess = useMemo(() => {
    return processes.find(p => p.id === selectedProcessId);
  }, [processes, selectedProcessId]);

  // Sub-modules state: 'summary' (Hours and tasks), 'projects' (Project progress), 'links' (Bookmarks), 'notes' (Markdown documents)
  const [localActiveSubTab, setLocalActiveSubTab] = useState<'summary' | 'projects' | 'links' | 'notes'>('summary');

  const activeSubTab = externalActiveSubTab !== undefined ? externalActiveSubTab : localActiveSubTab;
  const setActiveSubTab = externalSetActiveSubTab !== undefined ? externalSetActiveSubTab : setLocalActiveSubTab;

  // Check current member permissions for the selected process
  const processAccessLevel = useMemo(() => {
    if (!currentMember) return 'ninguno';
    if (isSystemAdmin) return 'administrador';
    
    // Check if leader/administrator of tasks or projects for this process
    const tasksAccess = getModuleAccess(currentMember, roles, `tasks_${selectedProcessId}`);
    const projectsAccess = getModuleAccess(currentMember, roles, `projects_${selectedProcessId}`);
    
    if (tasksAccess === 'administrador' || projectsAccess === 'administrador') return 'administrador';
    if (tasksAccess === 'lider' || projectsAccess === 'lider') return 'lider';
    if (tasksAccess === 'colaborador' || projectsAccess === 'colaborador') return 'colaborador';
    if (tasksAccess === 'lector' || projectsAccess === 'lector') return 'lector';
    
    // Fallback to member's own process
    if (currentMember.processId === selectedProcessId) return 'colaborador';
    
    return 'lector'; // Allow collaborative reading of other processes' dashboards
  }, [currentMember, roles, selectedProcessId, isSystemAdmin]);

  const canEditLinks = processAccessLevel === 'administrador' || processAccessLevel === 'lider';
  const canEditNotes = processAccessLevel === 'administrador' || processAccessLevel === 'lider' || processAccessLevel === 'colaborador' || currentMember?.processId === selectedProcessId;

  // Viewing detail of a member (Hours slide-out)
  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);

  // --- Notes Management ---
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('');
  const [customNoteCategory, setCustomNoteCategory] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [noteToShare, setNoteToShare] = useState<ProcessNote | null>(null);
  const [selectedShareMemberId, setSelectedShareMemberId] = useState('');
  const [selectedShareAccess, setSelectedShareAccess] = useState<'ver' | 'editar'>('ver');

  // Links Share & Category Editing States
  const [expandedLinkCategories, setExpandedLinkCategories] = useState<Record<string, boolean>>({});
  const [editingLinkCategory, setEditingLinkCategory] = useState<string | null>(null);
  const [newCategoryNameInput, setNewCategoryNameInput] = useState<string>('');

  const [isLinkShareModalOpen, setIsLinkShareModalOpen] = useState(false);
  const [linkToShare, setLinkToShare] = useState<ProcessLink | null>(null);
  const [selectedLinkShareMemberId, setSelectedLinkShareMemberId] = useState('');
  const [selectedLinkShareAccess, setSelectedLinkShareAccess] = useState<'ver' | 'editar'>('ver');

  const [isCategoryShareModalOpen, setIsCategoryShareModalOpen] = useState(false);
  const [categoryToShare, setCategoryToShare] = useState<{ name: string; links: ProcessLink[] } | null>(null);
  const [selectedCategoryShareMemberId, setSelectedCategoryShareMemberId] = useState('');
  const [selectedCategoryShareAccess, setSelectedCategoryShareAccess] = useState<'ver' | 'editar'>('ver');

  // Keep noteToShare in sync with real-time updates
  useEffect(() => {
    if (noteToShare) {
      const updated = processNotes.find(n => n.id === noteToShare.id);
      if (updated) {
        setNoteToShare(updated);
      }
    }
  }, [processNotes]);

  // Keep linkToShare in sync with real-time updates
  useEffect(() => {
    if (linkToShare) {
      const updated = processLinks.find(l => l.id === linkToShare.id);
      if (updated) {
        setLinkToShare(updated);
      }
    }
  }, [processLinks]);

  // Clear sub-details when selectedProcessId changes
  useEffect(() => {
    setViewingMemberId(null);
    setSelectedNoteId(null);
    setIsEditingNote(false);
    setNoteCategory('');
    setCustomNoteCategory('');
    setEditingLinkCategory(null);
    setNewCategoryNameInput('');
  }, [selectedProcessId]);

  // Filters tasks for the selected process
  const processTasks = useMemo(() => {
    return tasks.filter(t => t.processId === selectedProcessId);
  }, [tasks, selectedProcessId]);

  // Filters projects for the selected process
  const processProjects = useMemo(() => {
    return projects.filter(p => p.processId === selectedProcessId);
  }, [projects, selectedProcessId]);

  // Filters members assigned to the selected process
  const processMembers = useMemo(() => {
    return members.filter(m => m.processId === selectedProcessId);
  }, [members, selectedProcessId]);

  // Filters links for the selected process OR shared with current member
  const filteredLinks = useMemo(() => {
    return processLinks.filter(l => {
      const isThisProcess = l.processId === selectedProcessId;
      const isSharedWithMe = l.sharedWith?.some(s => s.memberId === currentMember?.id);
      return isThisProcess || isSharedWithMe;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [processLinks, selectedProcessId, currentMember]);

  // Keep categoryToShare in sync with real-time updates
  useEffect(() => {
    if (categoryToShare) {
      const currentCategoryLinks = filteredLinks.filter(l => {
        const isSharedFromOtherProcess = l.processId !== selectedProcessId && l.sharedWith?.some(s => s.memberId === currentMember?.id);
        const cat = isSharedFromOtherProcess 
          ? 'Compartidos Conmigo' 
          : (l.category && l.category.trim() ? l.category.trim() : 'General');
        return cat === categoryToShare.name;
      });
      setCategoryToShare(prev => prev ? { name: prev.name, links: currentCategoryLinks } : null);
    }
  }, [filteredLinks, selectedProcessId, currentMember]);

  // Filters notes for the selected process OR shared with current member
  const filteredNotes = useMemo(() => {
    return processNotes.filter(n => {
      const isThisProcess = n.processId === selectedProcessId;
      const isSharedWithMe = n.sharedWith?.some(s => s.memberId === currentMember?.id);
      return isThisProcess || isSharedWithMe;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [processNotes, selectedProcessId, currentMember]);

  // Calculates metrics per team member of the process
  const memberMetrics = useMemo(() => {
    return processMembers.map(member => {
      const memberTasks = processTasks.filter(t => t.memberId === member.id);
      const completedTasks = memberTasks.filter(t => t.status === 'done');
      
      const totalPlannedHours = memberTasks.reduce((sum, t) => sum + (t.plannedHours || 0), 0);
      const totalActualHours = memberTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
      
      return {
        member,
        totalTasks: memberTasks.length,
        completedTasks: completedTasks.length,
        plannedHours: totalPlannedHours,
        actualHours: totalActualHours,
      };
    });
  }, [processMembers, processTasks]);

  // Viewing member detail object
  const viewingMemberDetail = useMemo(() => {
    if (!viewingMemberId) return null;
    const metric = memberMetrics.find(m => m.member.id === viewingMemberId);
    if (!metric) return null;
    
    const memberTasks = processTasks.filter(t => t.memberId === viewingMemberId);
    return {
      ...metric,
      tasks: memberTasks
    };
  }, [viewingMemberId, memberMetrics, processTasks]);

  // Calculates weekly hours breakdown for the selected member
  const weeklyHours = useMemo(() => {
    if (!viewingMemberDetail) return [];
    
    const groups: Record<string, { label: string; planned: number; actual: number; tasksCount: number }> = {};
    
    viewingMemberDetail.tasks.forEach(task => {
      // Resolve date: use plannedDate, fallback to dueDate, fallback to createdAt
      const dateStr = task.plannedDate || task.dueDate || (task.createdAt ? task.createdAt.substring(0, 10) : undefined);
      const { key, label } = getWeekInfo(dateStr);
      
      if (!groups[key]) {
        groups[key] = { label, planned: 0, actual: 0, tasksCount: 0 };
      }
      
      groups[key].planned += task.plannedHours || 0;
      groups[key].actual += task.actualHours || 0;
      groups[key].tasksCount += 1;
    });
    
    return Object.entries(groups)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => {
        if (a.key === '9999-99-99') return 1;
        if (b.key === '9999-99-99') return -1;
        return b.key.localeCompare(a.key);
      });
  }, [viewingMemberDetail]);

  // --- Links Management ---
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkCode, setNewLinkCode] = useState('');
  const [newLinkDescription, setNewLinkDescription] = useState('');
  const [newLinkCategory, setNewLinkCategory] = useState('');
  const [customLinkCategory, setCustomLinkCategory] = useState('');

  // Edit Link Modal State
  const [isEditLinkModalOpen, setIsEditLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ProcessLink | null>(null);
  const [editLinkTitle, setEditLinkTitle] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [editLinkCode, setEditLinkCode] = useState('');
  const [editLinkDescription, setEditLinkDescription] = useState('');
  const [editLinkCategory, setEditLinkCategory] = useState('');
  const [editCustomLinkCategory, setEditCustomLinkCategory] = useState('');

  const linkCategories = useMemo(() => {
    const cats = new Set<string>();
    filteredLinks.forEach(l => {
      if (l.category && l.category.trim()) {
        cats.add(l.category.trim());
      }
    });
    return Array.from(cats).sort();
  }, [filteredLinks]);

  const groupedLinks = useMemo<Record<string, ProcessLink[]>>(() => {
    const groups: Record<string, ProcessLink[]> = {};
    filteredLinks.forEach(link => {
      const isSharedFromOtherProcess = link.processId !== selectedProcessId && link.sharedWith?.some(s => s.memberId === currentMember?.id);
      const cat = isSharedFromOtherProcess 
        ? 'Compartidos Conmigo' 
        : (link.category && link.category.trim() ? link.category.trim() : 'General');

      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(link);
    });
    // Sort keys so General is first, Compartidos Conmigo is second, then alphabetical
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'General') return -1;
      if (b === 'General') return 1;
      if (a === 'Compartidos Conmigo') return -1;
      if (b === 'Compartidos Conmigo') return 1;
      return a.localeCompare(b);
    });
    const sortedGroups: Record<string, ProcessLink[]> = {};
    sortedKeys.forEach(k => {
      sortedGroups[k] = groups[k];
    });
    return sortedGroups;
  }, [filteredLinks, selectedProcessId, currentMember]);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    
    // Simple URL validation prefixing
    let formattedUrl = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const finalCategory = newLinkCategory === 'custom' ? customLinkCategory.trim() : newLinkCategory.trim();

    try {
      const id = `link-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newLink: ProcessLink = {
        id,
        title: newLinkTitle.trim(),
        url: formattedUrl,
        code: newLinkCode.trim() || undefined,
        description: newLinkDescription.trim() || undefined,
        processId: selectedProcessId,
        createdByMemberId: currentMember?.id || 'unknown',
        createdAt: new Date().toISOString(),
        category: finalCategory || 'General',
        sharedWith: []
      };
      
      await setDoc(doc(db, 'process_links', id), newLink);
      setNewLinkTitle('');
      setNewLinkUrl('');
      setNewLinkCode('');
      setNewLinkDescription('');
      setNewLinkCategory('');
      setCustomLinkCategory('');
      setShowAddLink(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'process_links');
    }
  };

  const handleOpenEditLink = (link: ProcessLink) => {
    setEditingLink(link);
    setEditLinkTitle(link.title || '');
    setEditLinkUrl(link.url || '');
    setEditLinkCode(link.code || '');
    setEditLinkDescription(link.description || '');
    
    const existingCat = link.category && link.category.trim() ? link.category.trim() : 'General';
    if (linkCategories.includes(existingCat) || existingCat === 'General') {
      setEditLinkCategory(existingCat === 'General' ? '' : existingCat);
      setEditCustomLinkCategory('');
    } else {
      setEditLinkCategory('custom');
      setEditCustomLinkCategory(existingCat);
    }
    setIsEditLinkModalOpen(true);
  };

  const handleSaveEditLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink || !editLinkTitle.trim() || !editLinkUrl.trim()) return;

    let formattedUrl = editLinkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const finalCategory = editLinkCategory === 'custom' ? editCustomLinkCategory.trim() : editLinkCategory.trim();

    try {
      await updateDoc(doc(db, 'process_links', editingLink.id), {
        title: editLinkTitle.trim(),
        url: formattedUrl,
        code: editLinkCode.trim() || '',
        description: editLinkDescription.trim() || '',
        category: finalCategory || 'General'
      });
      setIsEditLinkModalOpen(false);
      setEditingLink(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'process_links');
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este enlace?')) return;
    try {
      await deleteDoc(doc(db, 'process_links', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'process_links');
    }
  };

  // --- Category Renaming (for Process Leaders and System Admins) ---
  const handleRenameLinkCategory = async (oldCategoryName: string, newCategoryName: string) => {
    const trimmedNew = newCategoryName.trim();
    if (!trimmedNew || oldCategoryName === trimmedNew) {
      setEditingLinkCategory(null);
      setNewCategoryNameInput('');
      return;
    }

    const canRename = isSystemAdmin || processAccessLevel === 'administrador' || processAccessLevel === 'lider';
    if (!canRename) {
      alert('Solo el Líder de Proceso o los Administradores pueden cambiar el nombre de las categorías.');
      setEditingLinkCategory(null);
      return;
    }

    const linksToUpdate = processLinks.filter(
      l => l.processId === selectedProcessId && ((l.category && l.category.trim()) || 'General') === oldCategoryName
    );

    try {
      for (const link of linksToUpdate) {
        await updateDoc(doc(db, 'process_links', link.id), {
          category: trimmedNew
        });
      }
      setEditingLinkCategory(null);
      setNewCategoryNameInput('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'process_links');
    }
  };

  // --- Individual Link Share Handlers ---
  const handleAddShareLinkMember = async () => {
    if (!linkToShare || !selectedLinkShareMemberId) return;

    const currentShared = linkToShare.sharedWith || [];
    if (currentShared.some(s => s.memberId === selectedLinkShareMemberId)) return;

    const updatedShared: NoteShareAccess[] = [
      ...currentShared,
      { memberId: selectedLinkShareMemberId, access: selectedLinkShareAccess }
    ];

    try {
      await updateDoc(doc(db, 'process_links', linkToShare.id), {
        sharedWith: updatedShared
      });
      setSelectedLinkShareMemberId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'process_links');
    }
  };

  const handleRemoveShareLinkMember = async (memberId: string) => {
    if (!linkToShare) return;

    const currentShared = linkToShare.sharedWith || [];
    const updatedShared = currentShared.filter(s => s.memberId !== memberId);

    try {
      await updateDoc(doc(db, 'process_links', linkToShare.id), {
        sharedWith: updatedShared
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'process_links');
    }
  };

  const handleUpdateShareLinkAccess = async (memberId: string, newAccess: 'ver' | 'editar') => {
    if (!linkToShare) return;

    const currentShared = linkToShare.sharedWith || [];
    const updatedShared = currentShared.map(s => s.memberId === memberId ? { ...s, access: newAccess } : s);

    try {
      await updateDoc(doc(db, 'process_links', linkToShare.id), {
        sharedWith: updatedShared
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'process_links');
    }
  };

  // --- Category Share Handler (Share ALL links in category) ---
  const handleAddShareCategoryMember = async () => {
    if (!categoryToShare || !selectedCategoryShareMemberId) return;

    try {
      for (const link of categoryToShare.links) {
        const currentShared = link.sharedWith || [];
        const existingIdx = currentShared.findIndex(s => s.memberId === selectedCategoryShareMemberId);
        let updatedShared: NoteShareAccess[];
        if (existingIdx !== -1) {
          updatedShared = currentShared.map((s, idx) => 
            idx === existingIdx ? { ...s, access: selectedCategoryShareAccess } : s
          );
        } else {
          updatedShared = [...currentShared, { memberId: selectedCategoryShareMemberId, access: selectedCategoryShareAccess }];
        }
        await updateDoc(doc(db, 'process_links', link.id), {
          sharedWith: updatedShared
        });
      }
      setSelectedCategoryShareMemberId('');
      alert(`Se compartieron ${categoryToShare.links.length} enlace(s) de la categoría "${categoryToShare.name}" correctamente.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'process_links');
    }
  };

  // --- Notes Management ---
  const activeNote = useMemo(() => {
    return filteredNotes.find(n => n.id === selectedNoteId);
  }, [filteredNotes, selectedNoteId]);

  const activeNotePermissions = useMemo(() => {
    if (!activeNote || !currentMember) {
      return { 
        canEdit: canEditNotes, 
        canDelete: canEditNotes, 
        canShare: canEditNotes, 
        isSharedWithMe: false, 
        accessType: null 
      };
    }

    const isOwner = activeNote.createdByMemberId === currentMember.id;
    const isProcAdminOrLeader = isSystemAdmin || processAccessLevel === 'administrador' || processAccessLevel === 'lider';
    const sharedEntry = activeNote.sharedWith?.find(s => s.memberId === currentMember.id);

    if (isOwner || isProcAdminOrLeader) {
      return {
        canEdit: true,
        canDelete: true,
        canShare: true,
        isSharedWithMe: false,
        accessType: 'editar' as const
      };
    }

    if (sharedEntry) {
      return {
        canEdit: sharedEntry.access === 'editar',
        canDelete: false,
        canShare: sharedEntry.access === 'editar',
        isSharedWithMe: true,
        accessType: sharedEntry.access
      };
    }

    const isNoteFromThisProcess = activeNote.processId === selectedProcessId;
    const canEdit = canEditNotes && isNoteFromThisProcess;

    return {
      canEdit: canEdit,
      canDelete: canEditNotes && isNoteFromThisProcess,
      canShare: canEditNotes && isNoteFromThisProcess,
      isSharedWithMe: false,
      accessType: canEdit ? ('editar' as const) : ('ver' as const)
    };
  }, [activeNote, currentMember, isSystemAdmin, processAccessLevel, canEditNotes, selectedProcessId]);

  const noteCategories = useMemo(() => {
    const cats = new Set<string>();
    filteredNotes.forEach(n => {
      if (n.category && n.category.trim()) {
        cats.add(n.category.trim());
      }
    });
    return Array.from(cats).sort();
  }, [filteredNotes]);

  const groupedNotes = useMemo<Record<string, ProcessNote[]>>(() => {
    const groups: Record<string, ProcessNote[]> = {};
    filteredNotes.forEach(note => {
      const isSharedFromOtherProcess = note.processId !== selectedProcessId && note.sharedWith?.some(s => s.memberId === currentMember?.id);
      const cat = isSharedFromOtherProcess 
        ? 'Compartidas Conmigo' 
        : (note.category && note.category.trim() ? note.category.trim() : 'General');

      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(note);
    });
    // Sort keys so General is first, Compartidas Conmigo is second, then alphabetical
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'General') return -1;
      if (b === 'General') return 1;
      if (a === 'Compartidas Conmigo') return -1;
      if (b === 'Compartidas Conmigo') return 1;
      return a.localeCompare(b);
    });
    const sortedGroups: Record<string, ProcessNote[]> = {};
    sortedKeys.forEach(k => {
      sortedGroups[k] = groups[k];
    });
    return sortedGroups;
  }, [filteredNotes, selectedProcessId, currentMember]);

  const handleCreateNewNote = () => {
    setSelectedNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('');
    setCustomNoteCategory('');
    setIsEditingNote(true);
  };

  const handleSelectNote = (note: ProcessNote) => {
    setSelectedNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category || '');
    setCustomNoteCategory('');
    setIsEditingNote(false);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) {
      alert('Por favor introduce un título para la nota.');
      return;
    }

    if (selectedNoteId && !activeNotePermissions.canEdit) {
      alert('No tienes permisos de edición para esta nota.');
      return;
    }

    const finalCategory = noteCategory === 'custom' ? customNoteCategory.trim() : noteCategory.trim();

    try {
      const id = selectedNoteId || `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      
      const savedNote: ProcessNote = {
        id,
        title: noteTitle.trim(),
        content: noteContent,
        processId: activeNote?.processId || selectedProcessId,
        createdByMemberId: activeNote?.createdByMemberId || currentMember?.id || 'unknown',
        createdAt: activeNote?.createdAt || now,
        updatedAt: now,
        category: finalCategory || 'General',
        sharedWith: activeNote?.sharedWith || []
      };

      await setDoc(doc(db, 'process_notes', id), savedNote);
      setSelectedNoteId(id);
      setIsEditingNote(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'process_notes');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta nota de reunión?')) return;
    try {
      await deleteDoc(doc(db, 'process_notes', id));
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
        setIsEditingNote(false);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'process_notes');
    }
  };

  // Handlers for note sharing
  const handleAddShareMember = async () => {
    if (!noteToShare || !selectedShareMemberId) return;
    const currentShares = noteToShare.sharedWith || [];
    const existingIndex = currentShares.findIndex(s => s.memberId === selectedShareMemberId);
    
    let updatedShares: NoteShareAccess[];
    if (existingIndex >= 0) {
      updatedShares = currentShares.map((s, idx) => 
        idx === existingIndex ? { ...s, access: selectedShareAccess } : s
      );
    } else {
      updatedShares = [...currentShares, { memberId: selectedShareMemberId, access: selectedShareAccess }];
    }

    try {
      const docRef = doc(db, 'process_notes', noteToShare.id);
      await setDoc(docRef, { sharedWith: updatedShares }, { merge: true });
      setSelectedShareMemberId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'process_notes');
    }
  };

  const handleRemoveShareMember = async (memberIdToRemove: string) => {
    if (!noteToShare) return;
    const updatedShares = (noteToShare.sharedWith || []).filter(s => s.memberId !== memberIdToRemove);
    try {
      const docRef = doc(db, 'process_notes', noteToShare.id);
      await setDoc(docRef, { sharedWith: updatedShares }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'process_notes');
    }
  };

  const handleUpdateShareAccess = async (memberIdToUpdate: string, newAccess: 'ver' | 'editar') => {
    if (!noteToShare) return;
    const updatedShares = (noteToShare.sharedWith || []).map(s => 
      s.memberId === memberIdToUpdate ? { ...s, access: newAccess } : s
    );
    try {
      const docRef = doc(db, 'process_notes', noteToShare.id);
      await setDoc(docRef, { sharedWith: updatedShares }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'process_notes');
    }
  };

  // Custom regex-based Markdown Renderer for 100% stability with Obsidian Styling
  const renderMarkdown = (markdown: string) => {
    if (!markdown) return <p className="text-gray-400 italic font-medium">Documento en blanco. Haz clic en Editar para añadir contenido.</p>;

    const lines = markdown.split('\n');
    let inList = false;
    const renderedElements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Numbered List check: e.g. "1. Item"
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);

      // Headers
      if (trimmed.startsWith('# ')) {
        renderedElements.push(
          <h1 key={index} className="text-2xl font-extrabold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2.5 tracking-tight flex items-center gap-2">
            <span className="text-slate-300 font-normal">#</span> {trimmed.slice(2)}
          </h1>
        );
        inList = false;
      } else if (trimmed.startsWith('## ')) {
        renderedElements.push(
          <h2 key={index} className="text-xl font-bold text-slate-800 mt-6 mb-3 tracking-tight pb-1 border-b border-slate-50/80 flex items-center gap-1.5">
            <span className="text-slate-300/80 font-normal">##</span> {trimmed.slice(3)}
          </h2>
        );
        inList = false;
      } else if (trimmed.startsWith('### ')) {
        renderedElements.push(
          <h3 key={index} className="text-base font-bold text-slate-700 mt-5 mb-2 tracking-tight flex items-center gap-1">
            <span className="text-slate-300/60 font-normal">###</span> {trimmed.slice(4)}
          </h3>
        );
        inList = false;
      } 
      // Blockquote
      else if (trimmed.startsWith('> ')) {
        renderedElements.push(
          <blockquote key={index} className="border-l-4 border-slate-300 bg-slate-50 pl-4 py-2.5 my-3 italic text-slate-600 rounded-r-xl">
            {trimmed.slice(2)}
          </blockquote>
        );
        inList = false;
      }
      // Bullet Lists
      else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        if (!inList) {
          inList = true;
        }
        renderedElements.push(
          <li key={index} className="ml-6 list-disc text-slate-700 my-1.5 text-sm font-medium leading-relaxed marker:text-slate-400 pl-1">
            {parseInlineMarkdown(trimmed.slice(2))}
          </li>
        );
      }
      // Numbered Lists
      else if (numberedMatch) {
        if (!inList) {
          inList = true;
        }
        renderedElements.push(
          <li key={index} className="ml-6 list-decimal text-slate-700 my-1.5 text-sm font-medium leading-relaxed marker:text-slate-500 pl-1">
            {parseInlineMarkdown(numberedMatch[2])}
          </li>
        );
      }
      // Empty line
      else if (trimmed === '') {
        renderedElements.push(<div key={index} className="h-3" />);
        inList = false;
      }
      // Paragraph
      else {
        inList = false;
        renderedElements.push(
          <p key={index} className="text-slate-700 leading-relaxed my-2.5 text-sm font-medium">
            {parseInlineMarkdown(trimmed)}
          </p>
        );
      }
    });

    return <div className="space-y-1">{renderedElements}</div>;
  };

  // Parse **bold**, [text](url), and `code` inline
  const parseInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentText = text;
    let key = 0;

    while (currentText.length > 0) {
      // Bold search: **text**
      const boldIndex = currentText.indexOf('**');
      // Link search: [text](url)
      const linkMatch = currentText.match(/\[([^\]]+)\]\(([^)]+)\)/);
      // Code search: `code`
      const codeIndex = currentText.indexOf('`');

      // Find the closest formatting element
      const indices = [
        { type: 'bold', index: boldIndex },
        { type: 'link', index: linkMatch ? linkMatch.index! : -1 },
        { type: 'code', index: codeIndex }
      ].filter(x => x.index !== -1).sort((a, b) => a.index - b.index);

      if (indices.length === 0) {
        parts.push(<span key={key++}>{currentText}</span>);
        break;
      }

      const next = indices[0];
      
      // Push plain text before formatting
      if (next.index > 0) {
        parts.push(<span key={key++}>{currentText.slice(0, next.index)}</span>);
      }

      if (next.type === 'bold') {
        const remaining = currentText.slice(next.index + 2);
        const closeIndex = remaining.indexOf('**');
        if (closeIndex !== -1) {
          parts.push(<strong key={key++} className="font-extrabold text-slate-900">{remaining.slice(0, closeIndex)}</strong>);
          currentText = remaining.slice(closeIndex + 2);
        } else {
          parts.push(<span key={key++}>**</span>);
          currentText = remaining;
        }
      } else if (next.type === 'link' && linkMatch) {
        const [fullMatch, linkText, linkUrl] = linkMatch;
        parts.push(
          <a 
            key={key++} 
            href={linkUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-emerald-600 hover:text-emerald-800 underline font-extrabold inline-flex items-center gap-0.5"
          >
            {linkText}
            <ExternalLink size={10} className="inline" />
          </a>
        );
        currentText = currentText.slice(next.index + fullMatch.length);
      } else if (next.type === 'code') {
        const remaining = currentText.slice(next.index + 1);
        const closeIndex = remaining.indexOf('`');
        if (closeIndex !== -1) {
          parts.push(<code key={key++} className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs font-bold">{remaining.slice(0, closeIndex)}</code>);
          currentText = remaining.slice(closeIndex + 1);
        } else {
          parts.push(<span key={key++}>`</span>);
          currentText = remaining;
        }
      }
    }

    return parts;
  };

  return (
    <div className="space-y-6 text-slate-800 pb-12" id="process-dashboard-root">
      {/* Tarjeta de Información General del Proceso */}
      <AnimatePresence>
        {selectedProcess && showFicha && (
          <motion.div 
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: 'auto', opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-lg relative"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-ng-lime/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="relative z-10 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] bg-ng-lime/20 text-ng-lime border border-ng-lime/30 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                    Ficha Técnica
                  </span>
                  <h3 className="text-2xl font-black tracking-tight mt-1.5">{selectedProcess.name}</h3>
                  <p className="text-sm font-medium text-slate-300 leading-relaxed max-w-3xl">
                    {selectedProcess.description || 'Sin descripción disponible para este proceso.'}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tu Permiso</span>
                  <span className="text-xs font-black uppercase tracking-wider text-ng-lime mt-1 flex items-center gap-1">
                    {processAccessLevel === 'administrador' && <Shield size={12} />}
                    {processAccessLevel}
                  </span>
                </div>
              </div>
              
              {/* Objetivos */}
              {selectedProcess.goals && selectedProcess.goals.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Objetivos Clave del Proceso:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedProcess.goals.map((g, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-ng-lime mt-1.5 shrink-0" />
                        <span>{g}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Contenido Dinámico de Sub-Módulos */}
      <div className="space-y-6">
        {/* SUBTAB 1: HORAS Y TAREAS */}
        {activeSubTab === 'summary' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Resumen por Integrante</h3>
                <p className="text-xs font-bold text-slate-400">
                  Haz clic en cualquier integrante para desplegar sus horas y tareas en pantalla completa
                </p>
              </div>
              <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                {processMembers.length} integrantes
              </div>
            </div>

            {processMembers.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-400">No hay integrantes asignados directamente a este proceso.</p>
                <p className="text-xs text-slate-400 mt-1">Los integrantes que realicen tareas en este proceso aparecerán con su resumen de horas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {memberMetrics.map(({ member, totalTasks, completedTasks, plannedHours, actualHours }) => {
                  const ratio = plannedHours > 0 ? (actualHours / plannedHours) * 100 : 0;
                  const isOver = actualHours > plannedHours && plannedHours > 0;
                  const isSelected = viewingMemberId === member.id;
                  
                  return (
                    <div key={member.id} className="space-y-3">
                      <div 
                        onClick={() => setViewingMemberId(isSelected ? null : member.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isSelected 
                            ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/10' 
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0">
                              {member.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <span>{member.name}</span>
                              {isSelected && (
                                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                                  Desplegado
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-slate-400 font-semibold">{member.role}</p>
                          </div>
                        </div>

                        {/* Tareas y Horas */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-left md:text-right">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tareas</span>
                            <span className="text-xs font-black text-slate-700">
                              {completedTasks}/{totalTasks} completadas
                            </span>
                          </div>

                          {/* Horas */}
                          <div className="w-28 text-left md:text-right">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Plan. vs Real</span>
                            <span className="text-xs font-black text-slate-800">
                              {plannedHours}h <span className="text-slate-400">/</span> <span className={isOver ? 'text-amber-600' : 'text-emerald-600'}>{actualHours}h</span>
                            </span>
                          </div>

                          {/* Progreso */}
                          <div className="w-24 hidden md:block">
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isOver ? 'bg-amber-500' : 'bg-ng-black'
                                }`}
                                style={{ width: `${Math.min(ratio, 100)}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 block mt-1 text-right">
                              {ratio.toFixed(0)}% de plan.
                            </span>
                          </div>

                          <div className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors">
                            {isSelected ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>
                      </div>

                      {/* DESPLEGABLE HACIA ABAJO (FULL WIDTH) */}
                      <AnimatePresence>
                        {isSelected && viewingMemberDetail && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-6 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-6">
                              {/* Header del detalle */}
                              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                                <div className="flex items-center gap-3">
                                  {member.avatar ? (
                                    <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                                      {member.name.substring(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="text-sm font-black text-slate-900">
                                      Detalle Completo de Horas y Tareas: {member.name}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium">{member.role}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingMemberId(null);
                                  }}
                                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                                >
                                  <span>Ocultar Detalle</span>
                                  <ChevronUp size={16} />
                                </button>
                              </div>

                              {/* Resumen en 3 tarjetas superiores */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Completado</span>
                                  <span className="text-xl font-black text-slate-900 mt-1 block">
                                    {completedTasks} <span className="text-xs text-slate-400 font-bold">/ {totalTasks} ({totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(0) : 0}%)</span>
                                  </span>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Horas Planificadas</span>
                                  <span className="text-xl font-black text-blue-600 mt-1 block">
                                    {plannedHours}h
                                  </span>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Horas Reales Trabajadas</span>
                                  <span className={`text-xl font-black mt-1 block ${actualHours > plannedHours && plannedHours > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {actualHours}h
                                  </span>
                                </div>
                              </div>

                              {/* Sección en 2 Columnas para Desglose Semanal y Lista de Tareas */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Desglose de Horas por Semana (Recientes primero) */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                                  <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={15} className="text-blue-500" /> Desglose de Horas por Semana (Recientes primero):
                                  </h5>
                                  {weeklyHours.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No hay registros de horas asignados a semanas.</p>
                                  ) : (
                                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                      {weeklyHours.map(week => {
                                        const weekOver = week.actual > week.planned && week.planned > 0;
                                        const weekRatio = week.planned > 0 ? (week.actual / week.planned) * 100 : 0;
                                        return (
                                          <div key={week.key} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-2">
                                            <div className="flex items-center justify-between font-bold text-slate-800">
                                              <span>{week.label}</span>
                                              <span className="font-black">
                                                {week.planned}h <span className="text-slate-300">/</span> <span className={weekOver ? 'text-amber-600' : 'text-emerald-600'}>{week.actual}h</span>
                                              </span>
                                            </div>
                                            
                                            <div className="h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                                              <div 
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                  weekOver ? 'bg-amber-500' : 'bg-emerald-500'
                                                }`}
                                                style={{ width: `${Math.min(weekRatio, 100)}%` }}
                                              />
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                                              <span>{week.tasksCount} {week.tasksCount === 1 ? 'tarea' : 'tareas'}</span>
                                              <span>{weekRatio.toFixed(0)}% de plan.</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Listado de Tareas en el Proceso (Click para ver ficha) */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                                  <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                      <CheckCircle2 size={15} className="text-emerald-500" /> Tareas en el Proceso:
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 lowercase">clic para abrir ficha</span>
                                  </h5>
                                  
                                  {viewingMemberDetail.tasks.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No tiene tareas asignadas a este proceso.</p>
                                  ) : (
                                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                      {viewingMemberDetail.tasks.map(t => (
                                        <div 
                                          key={t.id} 
                                          onClick={() => onOpenTask && onOpenTask(t)}
                                          className="p-3.5 bg-slate-50 hover:bg-blue-50/70 hover:border-blue-200 rounded-xl border border-slate-100 text-xs space-y-2 transition-all cursor-pointer group"
                                          title="Haga clic para ver los detalles completos de la tarea"
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                                              {t.title}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                t.status === 'done' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                t.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                t.status === 'blocked' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                'bg-slate-100 text-slate-600'
                                              }`}>
                                                {t.status}
                                              </span>
                                              <Eye size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                                            <span>Pl: {t.plannedHours || 0}h | Rl: {t.actualHours || 0}h</span>
                                            {t.dueDate && <span>Vence: {t.dueDate}</span>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: AVANCE DE PROYECTOS */}
        {activeSubTab === 'projects' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Proyectos Vinculados</h3>
                <p className="text-xs font-bold text-slate-400">Progreso y estado de las campañas de este proceso</p>
              </div>
              <span className="text-xs font-black text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                {processProjects.length} proyectos
              </span>
            </div>

            {processProjects.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 max-w-lg mx-auto">
                <FolderKanban size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-500">Sin proyectos registrados</p>
                <p className="text-xs text-slate-400 mt-1">No hay proyectos asociados a este proceso. Puedes registrar proyectos en el módulo general de Proyectos asignándolos a este proceso.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {processProjects.map(project => {
                  const projectTasks = tasks.filter(t => t.projectId === project.id);
                  const completedCount = projectTasks.filter(t => t.status === 'done').length;
                  const progressPct = projectTasks.length > 0 ? (completedCount / projectTasks.length) * 100 : 0;
                  
                  // Status distribution
                  const inProgressCount = projectTasks.filter(t => t.status === 'in_progress').length;
                  const blockedCount = projectTasks.filter(t => t.status === 'blocked').length;
                  const todoCount = projectTasks.filter(t => t.status === 'todo' || t.status === 'backlog').length;

                  return (
                    <div key={project.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-900 line-clamp-1">{project.name}</h4>
                          {project.city && (
                            <span className="text-[10px] text-slate-400 font-bold block">{project.city}</span>
                          )}
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${
                          project.status === 'activo' ? 'bg-ng-lime/20 text-slate-800 border border-ng-lime/40' :
                          project.status === 'completado' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {project.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 font-medium line-clamp-2 min-h-[32px]">
                        {project.description || 'Sin descripción.'}
                      </p>

                      {/* Progreso */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <span>Progreso del Proyecto</span>
                          <span>{progressPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-slate-200/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-900 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-1">
                          <span>{projectTasks.length} Tareas Totales</span>
                          <span>{completedCount} Completadas</span>
                        </div>
                      </div>

                      {/* Status counters */}
                      <div className="grid grid-cols-3 gap-1 pt-1 text-center">
                        <div className="bg-white p-2 rounded-xl border border-slate-100/60">
                          <span className="text-[9px] text-slate-400 font-bold block">Por Hacer</span>
                          <span className="text-xs font-black text-slate-700">{todoCount}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-100/60">
                          <span className="text-[9px] text-slate-400 font-bold block">Haciendo</span>
                          <span className="text-xs font-black text-blue-600">{inProgressCount}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-100/60">
                          <span className="text-[9px] text-slate-400 font-bold block">Bloqueadas</span>
                          <span className="text-xs font-black text-red-600">{blockedCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 3: ENLACES DE INTERÉS */}
        {activeSubTab === 'links' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Listado de Enlaces */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Marcadores y Accesos Rápidos</h3>
                  <p className="text-xs font-bold text-slate-400">Enlaces de interés y repositorios del proceso</p>
                </div>
                {canEditLinks && (
                  <button
                    onClick={() => setShowAddLink(!showAddLink)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    <Plus size={14} />
                    Agregar Link
                  </button>
                )}
              </div>

              {/* Formulario de Adición */}
              <AnimatePresence>
                {showAddLink && (
                  <motion.form 
                    onSubmit={handleAddLink}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4 overflow-hidden text-left"
                  >
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Nuevo Enlace de Interés</h4>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-3 space-y-1">
                        <label htmlFor="link-code-input" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Código (Opcional)</label>
                        <input 
                          id="link-code-input"
                          type="text" 
                          placeholder="Ej: COD-001"
                          value={newLinkCode}
                          onChange={(e) => setNewLinkCode(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime/30 focus:border-ng-lime"
                        />
                      </div>
                      <div className="md:col-span-9 space-y-1">
                        <label htmlFor="link-title-input" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Nombre del Enlace</label>
                        <input 
                          id="link-title-input"
                          type="text" 
                          required
                          placeholder="Ej: Carpeta de Diseños en Drive"
                          value={newLinkTitle}
                          onChange={(e) => setNewLinkTitle(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime/30 focus:border-ng-lime"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="link-url-input" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">URL / Enlace</label>
                        <input 
                          id="link-url-input"
                          type="text" 
                          required
                          placeholder="Ej: drive.google.com/..."
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime/30 focus:border-ng-lime"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="link-category-select" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Categoría</label>
                        <select
                          id="link-category-select"
                          value={newLinkCategory}
                          onChange={(e) => setNewLinkCategory(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime/30 focus:border-ng-lime cursor-pointer"
                        >
                          <option value="">General</option>
                          {linkCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="custom">+ Crear nueva...</option>
                        </select>
                      </div>
                    </div>

                    {newLinkCategory === 'custom' && (
                      <div className="space-y-1">
                        <label htmlFor="link-custom-category-input" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Nombre de la Nueva Categoría</label>
                        <input 
                          id="link-custom-category-input"
                          type="text" 
                          required
                          placeholder="Ej: Manuales, Diseños, Repositorios..."
                          value={customLinkCategory}
                          onChange={(e) => setCustomLinkCategory(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime/30 focus:border-ng-lime"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label htmlFor="link-description-input" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Descripción (Opcional)</label>
                      <input 
                        id="link-description-input"
                        type="text" 
                        placeholder="Ej: Instrucciones o contenido de esta carpeta..."
                        value={newLinkDescription}
                        onChange={(e) => setNewLinkDescription(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime/30 focus:border-ng-lime"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddLink(false)}
                        className="px-3.5 py-1.5 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-100 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-ng-black text-white hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Guardar
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Links List grouped by Category */}
              {filteredLinks.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 max-w-md mx-auto">
                  <Bookmark size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-400">Sin enlaces registrados</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">No se han registrado marcadores para este proceso todavía. {canEditLinks ? '¡Haz clic en Agregar Link para registrar el primero!' : ''}</p>
                </div>
              ) : (
                <div className="space-y-6 text-left">
                  {Object.entries(groupedLinks).map(([categoryName, links]) => {
                    const isExpanded = expandedLinkCategories[categoryName] !== false;
                    const linksArray = links as ProcessLink[];
                    const isEditingThisCategory = editingLinkCategory === categoryName;
                    const isLeaderOrAdmin = isSystemAdmin || processAccessLevel === 'administrador' || processAccessLevel === 'lider';
                    const canRenameThisCategory = isLeaderOrAdmin && categoryName !== 'Compartidos Conmigo';

                    return (
                      <div key={categoryName} className="space-y-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
                        {/* Category Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedLinkCategories(prev => ({
                                  ...prev,
                                  [categoryName]: !isExpanded
                                }));
                              }}
                              className="flex items-center gap-1.5 hover:text-slate-900 transition-all font-bold text-slate-700 text-left cursor-pointer select-none"
                            >
                              {isExpanded ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                              {isExpanded ? <FolderOpen size={15} className="text-amber-500 fill-amber-100/50 shrink-0" /> : <Folder size={15} className="text-amber-500 fill-amber-100/50 shrink-0" />}
                            </button>

                            {isEditingThisCategory ? (
                              <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                                <input
                                  type="text"
                                  value={newCategoryNameInput}
                                  onChange={(e) => setNewCategoryNameInput(e.target.value)}
                                  className="bg-white border border-slate-300 px-2 py-1 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-ng-lime/30 w-full"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRenameLinkCategory(categoryName, newCategoryNameInput)}
                                  className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"
                                  title="Guardar nombre"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingLinkCategory(null);
                                    setNewCategoryNameInput('');
                                  }}
                                  className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-all"
                                  title="Cancelar"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 min-w-0">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider truncate">{categoryName}</h4>
                                <span className="text-[9px] bg-slate-200/80 text-slate-600 font-bold px-2 py-0.5 rounded-full shrink-0">
                                  {linksArray.length}
                                </span>

                                {canRenameThisCategory && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingLinkCategory(categoryName);
                                      setNewCategoryNameInput(categoryName);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-all text-[10px] flex items-center gap-1 font-bold"
                                    title="Editar nombre de categoría (Líder/Admin)"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action on Category Header: Compartir Categoría */}
                          {categoryName !== 'Compartidos Conmigo' && (
                            <button
                              type="button"
                              onClick={() => {
                                setCategoryToShare({ name: categoryName, links: linksArray });
                                setIsCategoryShareModalOpen(true);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-2xs shrink-0 cursor-pointer"
                              title="Compartir todos los enlaces de esta categoría"
                            >
                              <Share2 size={11} />
                              Compartir Categoría
                            </button>
                          )}
                        </div>

                        {/* Indented Link Cards */}
                        {isExpanded && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {linksArray.map(link => {
                              const author = members.find(m => m.id === link.createdByMemberId);
                              const sharedCount = link.sharedWith?.length || 0;
                              const myShare = link.sharedWith?.find(s => s.memberId === currentMember?.id);
                              const isSharedWithMe = link.createdByMemberId !== currentMember?.id && !!myShare;
                              const isFromOtherProc = link.processId !== selectedProcessId;
                              const linkProc = processes.find(p => p.id === link.processId);

                              const canEditThisLink = isLeaderOrAdmin || link.createdByMemberId === currentMember?.id || myShare?.access === 'editar';
                              const canDeleteThisLink = isLeaderOrAdmin || link.createdByMemberId === currentMember?.id || myShare?.access === 'editar';
                              const canShareThisLink = isLeaderOrAdmin || link.createdByMemberId === currentMember?.id || myShare?.access === 'editar';

                              return (
                                <div 
                                  key={link.id} 
                                  className="p-3.5 bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl flex flex-col justify-between gap-3 transition-all shadow-2xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2.5 min-w-0">
                                      <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0 mt-0.5">
                                        <LinkIcon size={14} />
                                      </div>
                                      <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {link.code && (
                                            <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[9px] font-black rounded shrink-0">
                                              {link.code}
                                            </span>
                                          )}
                                          <h4 className="text-xs font-bold text-slate-900 truncate">{link.title}</h4>
                                        </div>

                                        {link.description && (
                                          <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-snug">
                                            {link.description}
                                          </p>
                                        )}

                                        <a 
                                          href={link.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="text-[10px] text-emerald-600 hover:text-emerald-800 hover:underline font-bold truncate inline-flex items-center gap-1 pt-0.5"
                                        >
                                          Visitar enlace
                                          <ExternalLink size={10} className="shrink-0" />
                                        </a>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Metadata and Actions footer */}
                                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[9px] text-slate-400 font-bold uppercase tracking-wider flex-wrap gap-1">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <span className="truncate">Por: {author?.name || 'Sistema'}</span>
                                      {isFromOtherProc && linkProc && (
                                        <span className="text-[7px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-black truncate">
                                          {linkProc.name}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {isSharedWithMe && (
                                        <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${
                                          myShare?.access === 'editar' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                        }`}>
                                          {myShare?.access === 'editar' ? 'Compartido (Editar)' : 'Compartido (Ver)'}
                                        </span>
                                      )}

                                      {canShareThisLink && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setLinkToShare(link);
                                            setIsLinkShareModalOpen(true);
                                          }}
                                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-0.5 text-[8px] font-black cursor-pointer"
                                          title="Compartir enlace individual"
                                        >
                                          <Share2 size={11} />
                                          {sharedCount > 0 && <span>{sharedCount}</span>}
                                        </button>
                                      )}

                                      {canEditThisLink && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditLink(link)}
                                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                          title="Editar enlace (Código, Nombre, URL, Descripción)"
                                        >
                                          <Pencil size={11} />
                                        </button>
                                      )}

                                      {canDeleteThisLink && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteLink(link.id)}
                                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                          title="Eliminar enlace"
                                        >
                                          <Trash size={11} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ayuda / FAQ */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle size={14} className="text-slate-400" />
                Guía de Enlaces
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Los enlaces de interés facilitan el acceso rápido a recursos compartidos por los líderes de proceso. Puedes vincular:
              </p>
              <ul className="space-y-2 text-xs font-medium text-slate-600">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ng-black" />
                  <span>Carpetas en Google Drive o Dropbox</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ng-black" />
                  <span>Repositorios de GitHub o Bitbucket</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ng-black" />
                  <span>Tableros externos, Figma o Miro</span>
                </li>
              </ul>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-400 font-semibold flex items-start gap-1.5">
                <Lock size={12} className="shrink-0 mt-0.5 text-slate-400" />
                <span>Solo los Líderes del Proceso o Administradores pueden añadir y eliminar enlaces.</span>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: NOTAS DE REUNIÓN (MARKDOWN) */}
        {activeSubTab === 'notes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Lista de Documentos */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 h-[600px] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Hojas de Reuniones</h3>
                  <p className="text-[10px] font-bold text-slate-400">Documentación del proceso</p>
                </div>
                {canEditNotes && (
                  <button
                    onClick={handleCreateNewNote}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    <Plus size={12} />
                    Nueva Nota
                  </button>
                )}
              </div>

              {/* Items List grouped by collapsible folders (Obsidian style) */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-left">
                {filteredNotes.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 mt-6">
                    <FileText size={28} className="mx-auto text-slate-300 mb-1.5" />
                    <p className="text-xs font-bold text-slate-400">Sin notas creadas</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">No se han registrado notas. ¡Crea una nueva hoja para iniciar la bitácora!</p>
                  </div>
                ) : (
                  Object.entries(groupedNotes).map(([categoryName, notes]) => {
                    const isExpanded = expandedCategories[categoryName] !== false; // default to true
                    const notesArray = notes as ProcessNote[];

                    return (
                      <div key={categoryName} className="space-y-1">
                        {/* Folder Header */}
                        <div 
                          onClick={() => {
                            setExpandedCategories(prev => ({
                              ...prev,
                              [categoryName]: !isExpanded
                            }));
                          }}
                          className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-all text-slate-700 hover:text-slate-900 font-bold select-none"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isExpanded ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                            {isExpanded ? <FolderOpen size={13} className="text-amber-500 fill-amber-100/50 shrink-0" /> : <Folder size={13} className="text-amber-500 fill-amber-100/50 shrink-0" />}
                            <span className="text-[10px] uppercase tracking-wider font-extrabold truncate">{categoryName}</span>
                          </div>
                          <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">{notesArray.length}</span>
                        </div>

                        {/* Indented Folder Contents */}
                        {isExpanded && (
                          <div className="pl-3 ml-2 border-l border-slate-100 space-y-1.5 pt-0.5">
                            {notesArray.map(note => {
                              const author = members.find(m => m.id === note.createdByMemberId);
                              const isSelected = selectedNoteId === note.id;
                              const sharedCount = note.sharedWith?.length || 0;
                              const myShare = note.sharedWith?.find(s => s.memberId === currentMember?.id);
                              const isSharedWithMe = note.createdByMemberId !== currentMember?.id && !!myShare;
                              const isFromOtherProc = note.processId !== selectedProcessId;
                              const noteProc = processes.find(p => p.id === note.processId);

                              const canDeleteThisNote = isSystemAdmin || processAccessLevel === 'administrador' || processAccessLevel === 'lider' || note.createdByMemberId === currentMember?.id;

                              return (
                                <div
                                  key={note.id}
                                  onClick={() => handleSelectNote(note)}
                                  className={`p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5 relative ${
                                    isSelected 
                                      ? 'bg-slate-50 border-slate-200 shadow-sm' 
                                      : 'bg-white border-slate-100 hover:border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <FileText size={11} className="text-slate-400 shrink-0" />
                                      <h4 className="text-xs font-bold text-slate-800 truncate">{note.title}</h4>
                                    </div>
                                    {canDeleteThisNote && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteNote(note.id);
                                        }}
                                        className="p-1 hover:text-red-500 text-slate-400 hover:bg-slate-100 rounded-lg transition-all shrink-0"
                                        title="Eliminar nota"
                                      >
                                        <Trash size={11} />
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wider pl-4 flex-wrap gap-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="truncate">By: {author?.name || 'Sistema'}</span>
                                      {isFromOtherProc && noteProc && (
                                        <span className="text-[7px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-black truncate">
                                          {noteProc.name}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {isSharedWithMe && (
                                        <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${
                                          myShare?.access === 'editar' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                        }`}>
                                          {myShare?.access === 'editar' ? 'Compartido (Editar)' : 'Compartido (Ver)'}
                                        </span>
                                      )}
                                      {sharedCount > 0 && (
                                        <span className="flex items-center gap-0.5 text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-100 font-black text-[7px]" title={`Compartida con ${sharedCount} persona(s)`}>
                                          <Share2 size={8} /> {sharedCount}
                                        </span>
                                      )}
                                      <span>{note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : ''}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Visor / Editor del Documento */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-[600px] flex flex-col overflow-hidden">
              {isEditingNote ? (
                // EDITOR MODE
                <div className="h-full flex flex-col space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      {selectedNoteId ? 'Editando Nota de Reunión' : 'Creando Nueva Nota'}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditingNote(false)}
                        className="px-3 py-1.5 hover:bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveNote}
                        className="flex items-center gap-1 px-4 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        <Save size={12} />
                        Guardar Nota
                      </button>
                    </div>
                  </div>

                  {/* Input Título y Categoría */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 text-left">
                    <div className="md:col-span-2">
                      <label htmlFor="note-title-input" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Título del Documento</label>
                      <input 
                        id="note-title-input"
                        type="text"
                        placeholder="Ej: Reunión Semanal de Planificación de Contenido"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime/30 focus:border-ng-lime"
                      />
                    </div>
                    <div>
                      <label htmlFor="note-category-select" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Categoría</label>
                      <select
                        id="note-category-select"
                        value={noteCategory}
                        onChange={(e) => setNoteCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime/30 focus:border-ng-lime cursor-pointer"
                      >
                        <option value="">General</option>
                        {noteCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="custom">+ Crear nueva...</option>
                      </select>
                    </div>
                  </div>

                  {noteCategory === 'custom' && (
                    <div className="shrink-0 text-left">
                      <label htmlFor="note-custom-category-input" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Nombre de la Nueva Categoría</label>
                      <input 
                        id="note-custom-category-input"
                        type="text" 
                        required
                        placeholder="Ej: Actas, Minutas, Diseños..."
                        value={customNoteCategory}
                        onChange={(e) => setCustomNoteCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime/30 focus:border-ng-lime"
                      />
                    </div>
                  )}

                  {/* Monospace Textarea and Markdown Cheat sheet */}
                  <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
                    <div className="flex-1 flex flex-col h-full">
                      <label htmlFor="note-content-input" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Contenido (Soporta Markdown)</label>
                      <textarea
                        id="note-content-input"
                        placeholder="# Mi título&#10;> Un quote especial&#10;- Un elemento de lista&#10;**Texto en negrita**"
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        className="w-full flex-1 bg-slate-50 border border-slate-200 p-4 rounded-xl font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ng-lime/30 focus:border-ng-lime resize-none h-full overflow-y-auto"
                      />
                    </div>

                    {/* Markdown Cheat sheet */}
                    <div className="w-full md:w-48 bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3 shrink-0 overflow-y-auto text-left">
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider border-b pb-1">Atajos Markdown</h4>
                      <div className="space-y-2 text-[10px] font-bold text-slate-500 leading-relaxed">
                        <div>
                          <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800"># Título 1</code>
                          <span className="block text-[8px] text-slate-400 mt-0.5">Título principal</span>
                        </div>
                        <div>
                          <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">## Título 2</code>
                          <span className="block text-[8px] text-slate-400 mt-0.5">Subtítulo secundario</span>
                        </div>
                        <div>
                          <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">**texto**</code>
                          <span className="block text-[8px] text-slate-400 mt-0.5">Resaltado en negrita</span>
                        </div>
                        <div>
                          <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">- item</code>
                          <span className="block text-[8px] text-slate-400 mt-0.5">Viñetas / Listas</span>
                        </div>
                        <div>
                          <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">&gt; frase</code>
                          <span className="block text-[8px] text-slate-400 mt-0.5">Cita o quote destacado</span>
                        </div>
                        <div>
                          <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">[txt](url)</code>
                          <span className="block text-[8px] text-slate-400 mt-0.5">Vincular enlaces</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeNote ? (
                // READ MODE
                <div className="h-full flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0 flex-wrap gap-2">
                    <div className="text-left min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-slate-950 truncate">{activeNote.title}</h3>
                        {activeNotePermissions.isSharedWithMe && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                            activeNotePermissions.accessType === 'editar' 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {activeNotePermissions.accessType === 'editar' ? <Pencil size={10} /> : <Eye size={10} />}
                            {activeNotePermissions.accessType === 'editar' ? 'Compartido (Puede Editar)' : 'Compartido (Solo Lectura)'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        Creado por {members.find(m => m.id === activeNote.createdByMemberId)?.name || 'Sistema'} · {new Date(activeNote.updatedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {activeNotePermissions.canShare && (
                        <button
                          onClick={() => {
                            setNoteToShare(activeNote);
                            setIsShareModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-blue-200/60 shadow-sm"
                        >
                          <Share2 size={12} />
                          Compartir ({activeNote.sharedWith?.length || 0})
                        </button>
                      )}

                      {activeNotePermissions.canEdit ? (
                        <button
                          onClick={() => setIsEditingNote(true)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-slate-100"
                        >
                          <Edit size={12} />
                          Editar Nota
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-50/60 text-amber-700 border border-amber-200/60 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Lock size={11} /> Solo Lectura
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Markdown content container */}
                  <div className="flex-1 overflow-y-auto py-4 pr-1 text-left custom-markdown-body">
                    {renderMarkdown(activeNote.content)}
                  </div>
                </div>
              ) : (
                // EMPTY STATE
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50 border border-slate-100 rounded-3xl">
                  <FileText size={44} className="text-slate-300 mb-2.5" />
                  <p className="text-sm font-black text-slate-500">Notion de Reuniones</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                    Selecciona una nota de reunión en la lista de la izquierda o crea una nueva hoja en formato Markdown para documentar acuerdos, minutas o actividades.
                  </p>
                  {canEditNotes && (
                    <button
                      onClick={handleCreateNewNote}
                      className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-slate-900/10"
                    >
                      <Plus size={14} />
                      Crear Primera Nota
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SHARE NOTE MODAL */}
      <AnimatePresence>
        {isShareModalOpen && noteToShare && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 text-left relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5 min-w-0 pr-4">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                    <Share2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-900 truncate">Compartir Nota</h3>
                    <p className="text-xs text-slate-400 font-bold truncate mt-0.5">{noteToShare.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsShareModalOpen(false);
                    setNoteToShare(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Section 1: Add member */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Añadir Integrante del Equipo
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-7">
                    <select
                      value={selectedShareMemberId}
                      onChange={(e) => setSelectedShareMemberId(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">-- Selecciona un integrante --</option>
                      {members
                        .filter(m => m.id !== noteToShare.createdByMemberId && !(noteToShare.sharedWith || []).some(s => s.memberId === m.id))
                        .map(m => {
                          const memberProc = processes.find(p => p.id === m.processId);
                          const isSameProc = m.processId === noteToShare.processId;
                          return (
                            <option key={m.id} value={m.id}>
                              {m.name} ({isSameProc ? 'Mismo Proceso' : memberProc ? `Proceso: ${memberProc.name}` : 'Sin proceso'})
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <select
                      value={selectedShareAccess}
                      onChange={(e) => setSelectedShareAccess(e.target.value as 'ver' | 'editar')}
                      className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="ver">Solo Ver</option>
                      <option value="editar">Puede Editar</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddShareMember}
                      disabled={!selectedShareMemberId}
                      className="w-full h-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
                    >
                      <UserPlus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: Shared Members List */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Acceso Configurado</h4>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {/* Owner Row */}
                  {(() => {
                    const owner = members.find(m => m.id === noteToShare.createdByMemberId);
                    const ownerProc = processes.find(p => p.id === noteToShare.processId);
                    return (
                      <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black">
                            {owner?.name ? owner.name.substring(0, 2).toUpperCase() : 'OW'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{owner?.name || 'Creador de la Nota'}</p>
                            <p className="text-[9px] text-slate-400 font-semibold truncate">{ownerProc?.name || 'Proceso Origen'}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-slate-200/60 text-slate-600 text-[9px] font-black uppercase rounded-lg">Propietario</span>
                      </div>
                    );
                  })()}

                  {/* Shared Members Rows */}
                  {(!noteToShare.sharedWith || noteToShare.sharedWith.length === 0) ? (
                    <p className="text-center text-xs text-slate-400 font-medium py-3 italic">
                      Esta nota no ha sido compartida con ningún integrante individual aún.
                    </p>
                  ) : (
                    noteToShare.sharedWith.map(s => {
                      const member = members.find(m => m.id === s.memberId);
                      const memberProc = processes.find(p => p.id === member?.processId);
                      const isSameProc = member?.processId === noteToShare.processId;

                      return (
                        <div key={s.memberId} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all shadow-sm">
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black shrink-0">
                              {member?.name ? member.name.substring(0, 2).toUpperCase() : 'MB'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{member?.name || 'Integrante'}</p>
                              <p className="text-[9px] text-slate-400 font-semibold truncate">
                                {isSameProc ? 'Mismo proceso' : memberProc ? `Proceso: ${memberProc.name}` : 'Otro proceso'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={s.access}
                              onChange={(e) => handleUpdateShareAccess(s.memberId, e.target.value as 'ver' | 'editar')}
                              className={`text-[10px] font-black uppercase tracking-wider py-1 px-2 rounded-xl border cursor-pointer focus:outline-none ${
                                s.access === 'editar'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <option value="ver">Solo Ver</option>
                              <option value="editar">Puede Editar</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemoveShareMember(s.memberId)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Quitar acceso"
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Footer info */}
              <div className="text-[10px] text-slate-400 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2">
                <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <span>
                  Los integrantes asignados podrán acceder a esta nota desde su panel de Gestión XD, ya sea de su propio proceso o mediante la carpeta de <strong>Notas Compartidas</strong>.
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHARE INDIVIDUAL LINK MODAL */}
      <AnimatePresence>
        {isLinkShareModalOpen && linkToShare && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 text-left relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5 min-w-0 pr-4">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                    <Share2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-900 truncate">Compartir Enlace</h3>
                    <p className="text-xs text-slate-400 font-bold truncate mt-0.5">{linkToShare.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsLinkShareModalOpen(false);
                    setLinkToShare(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Section 1: Add member */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Añadir Integrante del Equipo
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-7">
                    <select
                      value={selectedLinkShareMemberId}
                      onChange={(e) => setSelectedLinkShareMemberId(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">-- Selecciona un integrante --</option>
                      {members
                        .filter(m => m.id !== linkToShare.createdByMemberId && !(linkToShare.sharedWith || []).some(s => s.memberId === m.id))
                        .map(m => {
                          const memberProc = processes.find(p => p.id === m.processId);
                          const isSameProc = m.processId === linkToShare.processId;
                          return (
                            <option key={m.id} value={m.id}>
                              {m.name} ({isSameProc ? 'Mismo Proceso' : memberProc ? `Proceso: ${memberProc.name}` : 'Sin proceso'})
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <select
                      value={selectedLinkShareAccess}
                      onChange={(e) => setSelectedLinkShareAccess(e.target.value as 'ver' | 'editar')}
                      className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="ver">Solo Ver</option>
                      <option value="editar">Puede Editar</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddShareLinkMember}
                      disabled={!selectedLinkShareMemberId}
                      className="w-full h-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
                    >
                      <UserPlus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: Shared Members List */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Acceso Configurado</h4>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {/* Owner Row */}
                  {(() => {
                    const owner = members.find(m => m.id === linkToShare.createdByMemberId);
                    const ownerProc = processes.find(p => p.id === linkToShare.processId);
                    return (
                      <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black">
                            {owner?.name ? owner.name.substring(0, 2).toUpperCase() : 'OW'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{owner?.name || 'Creador del Enlace'}</p>
                            <p className="text-[9px] text-slate-400 font-semibold truncate">{ownerProc?.name || 'Proceso Origen'}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-slate-200/60 text-slate-600 text-[9px] font-black uppercase rounded-lg">Propietario</span>
                      </div>
                    );
                  })()}

                  {/* Shared Members Rows */}
                  {(!linkToShare.sharedWith || linkToShare.sharedWith.length === 0) ? (
                    <p className="text-center text-xs text-slate-400 font-medium py-3 italic">
                      Este enlace no ha sido compartido con ningún integrante individual aún.
                    </p>
                  ) : (
                    linkToShare.sharedWith.map(s => {
                      const member = members.find(m => m.id === s.memberId);
                      const memberProc = processes.find(p => p.id === member?.processId);
                      const isSameProc = member?.processId === linkToShare.processId;

                      return (
                        <div key={s.memberId} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all shadow-sm">
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black shrink-0">
                              {member?.name ? member.name.substring(0, 2).toUpperCase() : 'MB'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{member?.name || 'Integrante'}</p>
                              <p className="text-[9px] text-slate-400 font-semibold truncate">
                                {isSameProc ? 'Mismo proceso' : memberProc ? `Proceso: ${memberProc.name}` : 'Otro proceso'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={s.access}
                              onChange={(e) => handleUpdateShareLinkAccess(s.memberId, e.target.value as 'ver' | 'editar')}
                              className={`text-[10px] font-black uppercase tracking-wider py-1 px-2 rounded-xl border cursor-pointer focus:outline-none ${
                                s.access === 'editar'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <option value="ver">Solo Ver</option>
                              <option value="editar">Puede Editar</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemoveShareLinkMember(s.memberId)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Quitar acceso"
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Footer info */}
              <div className="text-[10px] text-slate-400 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2">
                <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <span>
                  Los integrantes seleccionados podrán acceder a este enlace directamente desde la categoría <strong>Compartidos Conmigo</strong> en sus propios paneles de proceso.
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHARE WHOLE CATEGORY MODAL */}
      <AnimatePresence>
        {isCategoryShareModalOpen && categoryToShare && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 text-left relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5 min-w-0 pr-4">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
                    <Folder size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-900 truncate">Compartir Categoría Completa</h3>
                    <p className="text-xs text-slate-400 font-bold truncate mt-0.5">
                      Categoría: <span className="text-slate-800">{categoryToShare.name}</span> ({categoryToShare.links.length} enlaces)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsCategoryShareModalOpen(false);
                    setCategoryToShare(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form to Share Category */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Seleccionar Integrante a Quien Compartir Toda la Categoría
                </label>
                
                <div className="space-y-3">
                  <select
                    value={selectedCategoryShareMemberId}
                    onChange={(e) => setSelectedCategoryShareMemberId(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Selecciona un integrante --</option>
                    {members
                      .filter(m => m.id !== currentMember?.id)
                      .map(m => {
                        const memberProc = processes.find(p => p.id === m.processId);
                        const isSameProc = m.processId === selectedProcessId;
                        return (
                          <option key={m.id} value={m.id}>
                            {m.name} ({isSameProc ? 'Mismo Proceso' : memberProc ? `Proceso: ${memberProc.name}` : 'Sin proceso'})
                          </option>
                        );
                      })}
                  </select>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <select
                        value={selectedCategoryShareAccess}
                        onChange={(e) => setSelectedCategoryShareAccess(e.target.value as 'ver' | 'editar')}
                        className="w-full bg-white border border-slate-200 text-xs font-bold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                      >
                        <option value="ver">Permiso: Solo Ver</option>
                        <option value="editar">Permiso: Puede Editar</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddShareCategoryMember}
                      disabled={!selectedCategoryShareMemberId}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                    >
                      <Share2 size={14} />
                      Compartir Todo
                    </button>
                  </div>
                </div>
              </div>

              {/* List of links included in category */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Enlaces que se compartirán ({categoryToShare.links.length})
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {categoryToShare.links.map(link => (
                    <div key={link.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                      <span className="truncate">{link.title}</span>
                      <span className="text-[9px] text-emerald-600 font-mono truncate">{link.url}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info footer */}
              <div className="text-[10px] text-slate-400 font-medium bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 flex items-start gap-2">
                <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <span>
                  Al compartir la categoría completa, los <strong>{categoryToShare.links.length} enlaces</strong> contenidos se agregarán al acceso del integrante seleccionado.
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT LINK MODAL */}
      <AnimatePresence>
        {isEditLinkModalOpen && editingLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 text-left relative overflow-hidden"
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5 min-w-0 pr-4">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                    <Pencil size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-900 truncate">Editar Enlace de Interés</h3>
                    <p className="text-xs text-slate-400 font-bold truncate mt-0.5">Modifica los detalles, código y descripción</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsEditLinkModalOpen(false);
                    setEditingLink(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditLink} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Código (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej: COD-001"
                      value={editLinkCode}
                      onChange={(e) => setEditLinkCode(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-8 space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Nombre del Enlace</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carpeta de Diseños"
                      value={editLinkTitle}
                      onChange={(e) => setEditLinkTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">URL / Enlace</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: drive.google.com/..."
                      value={editLinkUrl}
                      onChange={(e) => setEditLinkUrl(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Categoría</label>
                    <select
                      value={editLinkCategory}
                      onChange={(e) => setEditLinkCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">General</option>
                      {linkCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="custom">+ Crear nueva...</option>
                    </select>
                  </div>
                </div>

                {editLinkCategory === 'custom' && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Nombre de la Nueva Categoría</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Manuales, Diseños..."
                      value={editCustomLinkCategory}
                      onChange={(e) => setEditCustomLinkCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Descripción (Opcional)</label>
                  <textarea
                    rows={3}
                    placeholder="Ej: Detalles de acceso, contenido de la carpeta o propósito..."
                    value={editLinkDescription}
                    onChange={(e) => setEditLinkDescription(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditLinkModalOpen(false);
                      setEditingLink(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
