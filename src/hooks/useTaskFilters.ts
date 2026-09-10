import { useState, useMemo } from 'react';
import { Task, TeamMember, Process, Project, Role } from '../types';
import { normalizeText } from '../lib/textUtils';
import { isTaskVisibleForMember } from '../lib/permissions';

export interface TableFiltersState {
  title: string;
  status: string;
  processId: string;
  projectId: string;
  memberId: string;
  auxiliaryId: string;
  revisorId: string;
}

export interface TableSortState {
  column: 'title' | 'status' | 'process' | 'project' | 'member' | 'auxiliary' | 'revisor' | 'hours' | 'dueDate' | null;
  direction: 'asc' | 'desc' | null;
}

export interface SmartFiltersState {
  projectId: string | null;
  memberId: string | null;
  processId: string | null;
  auxiliaryId: string | null;
  status: string | null;
}

interface UseTaskFiltersProps {
  tasks: Task[];
  members: TeamMember[];
  processes: Process[];
  projects: Project[];
  roles: Role[];
  currentMember: TeamMember | null | undefined;
  taskViewMode: 'board' | 'list' | 'calendar';
  searchQuery: string;
}

export function useTaskFilters({
  tasks,
  members,
  processes,
  projects,
  roles,
  currentMember,
  taskViewMode,
  searchQuery
}: UseTaskFiltersProps) {
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [showAllDoneTasks, setShowAllDoneTasks] = useState<boolean>(false);
  const [showTaskMenu, setShowTaskMenu] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showTimeInputs, setShowTimeInputs] = useState(false);
  const [isListDragging, setIsListDragging] = useState(false);
  const [isBoardDragging, setIsBoardDragging] = useState(false);

  const [activeProjectFilter, setActiveProjectFilter] = useState<string | null>(null);
  const [activeMemberFilter, setActiveMemberFilter] = useState<string | null>(null);
  const [smartFilters, setSmartFilters] = useState<SmartFiltersState>({
    projectId: null,
    memberId: null,
    processId: null,
    auxiliaryId: null,
    status: null,
  });
  const [showSmartDropdown, setShowSmartDropdown] = useState(false);
  const [activeSuggestionCategory, setActiveSuggestionCategory] = useState<'all' | 'project' | 'member' | 'process' | 'auxiliary' | 'status'>('all');
  const [myActivitiesOnly, setMyActivitiesOnly] = useState(false);

  const [tableFilters, setTableFilters] = useState<TableFiltersState>({
    title: '',
    status: '',
    processId: '',
    projectId: '',
    memberId: '',
    auxiliaryId: '',
    revisorId: '',
  });

  const [tableSort, setTableSort] = useState<TableSortState>({
    column: null,
    direction: null,
  });

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

  const myActivitiesCount = useMemo(() => {
    if (!currentMember) return 0;
    return tasks.filter(t => {
      // Excluir actividades completadas o bloqueadas
      if (t.status === 'done' || t.status === 'blocked') {
        return false;
      }
      return (
        t.memberId === currentMember.id || 
        t.auxiliaryId === currentMember.id || 
        (t.auxiliaryIds && t.auxiliaryIds.includes(currentMember.id)) ||
        t.revisorId === currentMember.id
      );
    }).length;
  }, [tasks, currentMember]);

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

      // Apply "Mis Actividades" filter if active
      if (myActivitiesOnly && currentMember) {
        const isResp = t.memberId === currentMember.id;
        const isAux = t.auxiliaryId === currentMember.id || (t.auxiliaryIds && t.auxiliaryIds.includes(currentMember.id));
        const isRev = t.revisorId === currentMember.id;
        if (!isResp && !isAux && !isRev) {
          return false;
        }
      }

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
  }, [tasks, searchQuery, activeProjectFilter, activeMemberFilter, smartFilters, taskViewMode, tableFilters, currentMember, roles, myActivitiesOnly]);

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

  return {
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
  };
}
