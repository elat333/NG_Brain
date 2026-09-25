import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, Search, X, ArrowUp, ArrowDown, ArrowUpDown, 
  Trash2 as Trash, Calendar, Clock, GripVertical 
} from 'lucide-react';
import { Task, TeamMember, Process, Project, Role } from '../../types';
import { parseLocalDate as defaultParseLocalDate } from '../../lib/dateUtils';
import { TaskCard } from './TaskCard';
import { TasksPermissionsView } from './TasksPermissionsView';
import TaskCalendarView from '../TaskCalendarView';
import { TaskCommentsDashboard } from './dashboard/TaskCommentsDashboard';

export interface TasksViewProps {
  tasks: Task[];
  filteredTasks: Task[];
  sortedTasks: Task[];
  members: TeamMember[];
  sortedMembers: TeamMember[];
  processes: Process[];
  projects: Project[];
  roles?: Role[];
  currentMember?: TeamMember | null;
  tasksSubTab: 'board' | 'permissions' | 'comments';
  taskViewMode: 'board' | 'list' | 'calendar';
  tableFilters: {
    title: string;
    status: string;
    processId: string;
    projectId: string;
    memberId: string;
    auxiliaryId: string;
    revisorId?: string;
  };
  setTableFilters: React.Dispatch<React.SetStateAction<{
    title: string;
    status: string;
    processId: string;
    projectId: string;
    memberId: string;
    auxiliaryId: string;
    revisorId?: string;
  }>>;
  tableSort: {
    column: string | null;
    direction: 'asc' | 'desc' | null;
  };
  setTableSort: React.Dispatch<React.SetStateAction<{
    column: string | null;
    direction: 'asc' | 'desc' | null;
  }>>;
  handleTableSort: (column: string) => void;
  collapsedColumns: Record<string, boolean>;
  setCollapsedColumns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showAllDoneTasks: boolean;
  setShowAllDoneTasks: (show: boolean) => void;
  openAddTaskModal: (status: any) => void;
  openEditTask: (task: Task) => void;
  updateTaskStatus: (id: string, status: any) => void;
  handleDeleteTask: (id: string) => void;
  parseLocalDate?: (dateStr: string) => Date | null;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  filteredTasks,
  sortedTasks,
  members,
  sortedMembers,
  processes,
  projects,
  roles = [],
  currentMember,
  tasksSubTab,
  taskViewMode,
  tableFilters,
  setTableFilters,
  tableSort,
  setTableSort,
  handleTableSort,
  collapsedColumns,
  setCollapsedColumns,
  showAllDoneTasks,
  setShowAllDoneTasks,
  openAddTaskModal,
  openEditTask,
  updateTaskStatus,
  handleDeleteTask,
  parseLocalDate = defaultParseLocalDate
}) => {
  const [isBoardDragging, setIsBoardDragging] = useState(false);
  const [isListDragging, setIsListDragging] = useState(false);

  // Clave de almacenamiento por usuario para que cada colaborador tenga su propio orden independiente
  const memberStorageKey = useMemo(() => {
    return currentMember?.id ? `ng_story_order_${currentMember.id}` : 'ng_story_order_guest';
  }, [currentMember?.id]);

  const listMemberStorageKey = useMemo(() => {
    return currentMember?.id ? `ng_story_list_order_${currentMember.id}` : 'ng_story_list_order_guest';
  }, [currentMember?.id]);

  // Estado del orden de historias por columna (Tablero)
  const [userStoryOrder, setUserStoryOrder] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(memberStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Estado del orden de historias en lista (Vista Lista)
  const [listStoryOrder, setListStoryOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(listMemberStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sincronizar al cambiar de usuario
  useEffect(() => {
    try {
      const savedBoard = localStorage.getItem(memberStorageKey);
      setUserStoryOrder(savedBoard ? JSON.parse(savedBoard) : {});
      const savedList = localStorage.getItem(listMemberStorageKey);
      setListStoryOrder(savedList ? JSON.parse(savedList) : []);
    } catch {}
  }, [memberStorageKey, listMemberStorageKey]);

  // Estados de Drag & Drop para Tablero Kanban (Intra-columna exclusivamente)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedTaskStatus, setDraggedTaskStatus] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // Estados de Drag & Drop para Vista Lista
  const [draggedListTaskId, setDraggedListTaskId] = useState<string | null>(null);
  const [dragOverListTargetId, setDragOverListTargetId] = useState<string | null>(null);
  const [dropListPosition, setDropListPosition] = useState<'before' | 'after' | null>(null);

  // Handlers Drag & Drop Tablero (Movimiento exclusivamente vertical dentro de la misma columna)
  const handleDragStartCard = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(task.id);
    setDraggedTaskStatus(task.status);
  };

  const handleDragOverCard = (e: React.DragEvent, task: Task) => {
    // Solo permitir dentro del mismo estado/columna y evitar auto-colisión
    if (!draggedTaskId || task.status !== draggedTaskStatus || task.id === draggedTaskId) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';

    setDragOverTargetId(task.id);
    setDropPosition(pos);
  };

  const handleDragLeaveCard = (e: React.DragEvent, task: Task) => {
    if (dragOverTargetId === task.id) {
      setDragOverTargetId(null);
      setDropPosition(null);
    }
  };

  const handleDropCard = (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    if (
      !draggedTaskId ||
      !draggedTaskStatus ||
      targetTask.status !== draggedTaskStatus ||
      draggedTaskId === targetTask.id
    ) {
      setDragOverTargetId(null);
      setDropPosition(null);
      setDraggedTaskId(null);
      setDraggedTaskStatus(null);
      return;
    }

    const colStatus = targetTask.status;
    const currentTasksOfCol = filteredTasks.filter(t => t.status === colStatus);
    const existingOrder = userStoryOrder[colStatus] || [];
    
    // Lista completa de IDs preservando orden actual
    const currentIds = currentTasksOfCol
      .map(t => t.id)
      .sort((a, b) => {
        const idxA = existingOrder.indexOf(a);
        const idxB = existingOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });

    // Remover el elemento arrastrado
    const filtered = currentIds.filter(id => id !== draggedTaskId);
    const targetIdx = filtered.indexOf(targetTask.id);
    const insertIdx = dropPosition === 'before' ? Math.max(0, targetIdx) : targetIdx + 1;
    filtered.splice(insertIdx, 0, draggedTaskId);

    const updatedOrder = { ...userStoryOrder, [colStatus]: filtered };
    setUserStoryOrder(updatedOrder);

    try {
      localStorage.setItem(memberStorageKey, JSON.stringify(updatedOrder));
    } catch {}

    setDragOverTargetId(null);
    setDropPosition(null);
    setDraggedTaskId(null);
    setDraggedTaskStatus(null);
  };

  const handleDragEndCard = () => {
    setDragOverTargetId(null);
    setDropPosition(null);
    setDraggedTaskId(null);
    setDraggedTaskStatus(null);
  };

  // Handlers Drag & Drop Vista Lista
  const handleDragStartListRow = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedListTaskId(taskId);
  };

  const handleDragOverListRow = (e: React.DragEvent, taskId: string) => {
    if (!draggedListTaskId || taskId === draggedListTaskId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';

    setDragOverListTargetId(taskId);
    setDropListPosition(pos);
  };

  const handleDragLeaveListRow = (e: React.DragEvent, taskId: string) => {
    if (dragOverListTargetId === taskId) {
      setDragOverListTargetId(null);
      setDropListPosition(null);
    }
  };

  const handleDropListRow = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedListTaskId || draggedListTaskId === targetTaskId) {
      setDragOverListTargetId(null);
      setDropListPosition(null);
      setDraggedListTaskId(null);
      return;
    }

    const currentIds = finalSortedListTasks.map(t => t.id);
    const filtered = currentIds.filter(id => id !== draggedListTaskId);
    const targetIdx = filtered.indexOf(targetTaskId);
    const insertIdx = dropListPosition === 'before' ? Math.max(0, targetIdx) : targetIdx + 1;
    filtered.splice(insertIdx, 0, draggedListTaskId);

    setListStoryOrder(filtered);
    try {
      localStorage.setItem(listMemberStorageKey, JSON.stringify(filtered));
    } catch {}

    setDragOverListTargetId(null);
    setDropListPosition(null);
    setDraggedListTaskId(null);
  };

  // Lista final para vista de tabla, aplicando el orden personalizado de lista si no hay sort de columna activo
  const finalSortedListTasks = useMemo(() => {
    if (tableSort.column) {
      return sortedTasks;
    }
    if (listStoryOrder.length === 0) {
      return sortedTasks;
    }
    return [...sortedTasks].sort((a, b) => {
      const idxA = listStoryOrder.indexOf(a.id);
      const idxB = listStoryOrder.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  }, [sortedTasks, listStoryOrder, tableSort.column]);

  return (
    <motion.div 
      key="tasks"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="flex flex-col h-[calc(100vh-80px)] relative"
    >
      {tasksSubTab === 'permissions' ? (
        <TasksPermissionsView 
          currentMember={currentMember}
          members={members}
          processes={processes}
          roles={roles}
        />
      ) : tasksSubTab === 'comments' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1 pb-6">
          <TaskCommentsDashboard
            tasks={tasks}
            members={members}
            processes={processes}
            projects={projects}
            currentMember={currentMember || null}
            onOpenTask={(task) => openEditTask(task)}
          />
        </div>
      ) : taskViewMode === 'board' ? (
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
            { id: 'review', label: 'Para Revisión', color: 'text-purple-500', bg: 'bg-purple-50' },
            { id: 'correction', label: 'Para Corrección', color: 'text-amber-500', bg: 'bg-amber-50' },
            { id: 'done', label: 'Completada', color: 'text-green-500', bg: 'bg-green-50', collapsible: true },
            { id: 'blocked', label: 'Bloqueada', color: 'text-red-500', bg: 'bg-red-50', collapsible: true }
          ].map((column, colIdx) => {
            const allColTasks = filteredTasks.filter(t => t.status === column.id);
            const isCollapsed = !!collapsedColumns[column.id];

            // For 'done' column: by default show recent (last 15 days), unless showAllDoneTasks is active
            let visibleColTasks = allColTasks;
            let hiddenDoneCount = 0;

            if (column.id === 'done' && !showAllDoneTasks) {
              const fifteenDaysAgo = new Date();
              fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
              const cutoffStr = fifteenDaysAgo.toISOString().split('T')[0];

              visibleColTasks = allColTasks.filter(t => {
                const taskDate = t.actualEndDate || t.dueDate || t.plannedDate || '';
                return !taskDate || taskDate >= cutoffStr;
              });
              hiddenDoneCount = allColTasks.length - visibleColTasks.length;
            }

            // Ordenamiento personalizado por usuario en cada columna
            const colOrder = userStoryOrder[column.id] || [];
            const sortedColTasks = [...visibleColTasks].sort((a, b) => {
              const idxA = colOrder.indexOf(a.id);
              const idxB = colOrder.indexOf(b.id);
              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              if (idxA !== -1) return -1;
              if (idxB !== -1) return 1;
              return 0;
            });

            if (isCollapsed) {
              return (
                <div
                  key={`kanban_collapsed_col_${column.id || colIdx}_${colIdx}`}
                  onClick={() => setCollapsedColumns({ ...collapsedColumns, [column.id]: false })}
                  className="min-w-[48px] max-w-[48px] h-full bg-white/70 hover:bg-white rounded-2xl border border-gray-200/80 shadow-xs flex flex-col items-center py-4 cursor-pointer transition-all hover:shadow-md group select-none"
                  title={`Desplegar columna ${column.label}`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${column.color.replace('text-', 'bg-')} mb-3`} />
                  <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-1.5 py-0.5 rounded-full mb-6">
                    {allColTasks.length}
                  </span>
                  <div className="flex-1 flex items-center justify-center">
                    <span className={`rotate-90 whitespace-nowrap text-[11px] font-extrabold uppercase tracking-widest ${column.color}`}>
                      {column.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 group-hover:text-blue-600 mt-auto font-bold">
                    +
                  </span>
                </div>
              );
            }

            return (
              <div key={`kanban_col_wrapper_${column.id || colIdx}_${colIdx}`} className="min-w-[320px] max-w-[320px] flex flex-col gap-4 h-full">
                <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm sticky top-0 z-10 transition-all group">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${column.color.replace('text-', 'bg-')}`} />
                    <h3 className={`font-bold uppercase tracking-wider text-[10px] ${column.color}`}>{column.label}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full group-hover:bg-gray-200 transition-colors">
                      {allColTasks.length}
                    </span>
                    {column.collapsible && (
                      <button
                        type="button"
                        onClick={() => setCollapsedColumns({ ...collapsedColumns, [column.id]: true })}
                        className="text-gray-400 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-md transition-colors text-[10px] font-bold"
                        title="Minimizar columna"
                      >
                        ◀
                      </button>
                    )}
                  </div>
                </div>

                <div className={`flex-1 overflow-y-auto space-y-4 p-2 rounded-[2rem] ${column.bg}/30 border-2 border-dashed border-gray-100/50 hover:bg-white/40 transition-colors custom-scrollbar`}>
                  {column.id === 'done' && hiddenDoneCount > 0 && (
                    <div className="bg-white/90 border border-green-200/80 rounded-xl p-2.5 text-center shadow-xs">
                      <p className="text-[10px] text-gray-500 font-semibold mb-1">
                        Mostrando tareas recientes (últimos 15 días)
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAllDoneTasks(true)}
                        className="text-[10px] font-bold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        Ver archivo completo (+{hiddenDoneCount} tareas)
                      </button>
                    </div>
                  )}

                  {column.id === 'done' && showAllDoneTasks && allColTasks.length > visibleColTasks.length && (
                    <div className="text-center pb-1">
                      <button
                        type="button"
                        onClick={() => setShowAllDoneTasks(false)}
                        className="text-[9px] font-bold text-gray-500 hover:text-gray-800 underline"
                      >
                        Ocultar tareas antiguas
                      </button>
                    </div>
                  )}

                  {sortedColTasks.map((task, taskIdx) => (
                    <TaskCard 
                      key={`col_${column.id}_task_${task.id || taskIdx}_${taskIdx}`} 
                      task={task} 
                      allTasks={tasks}
                      member={members.find(m => m.id === task.memberId)} 
                      auxiliary={members.find(m => m.id === task.auxiliaryId)}
                      auxiliaries={Array.isArray(task.auxiliaryIds) ? members.filter(m => task.auxiliaryIds!.includes(m.id)) : (task.auxiliaryId ? members.filter(m => m.id === task.auxiliaryId) : [])}
                      revisor={members.find(m => m.id === task.revisorId)}
                      process={processes.find(p => p.id === task.processId)} 
                      project={projects.find(p => p.id === task.projectId)}
                      onUpdateStatus={updateTaskStatus} 
                      onEdit={openEditTask} 
                      onDelete={handleDeleteTask}
                      onDragStartCard={handleDragStartCard}
                      onDragOverCard={handleDragOverCard}
                      onDragLeaveCard={handleDragLeaveCard}
                      onDropCard={handleDropCard}
                      onDragEndCard={handleDragEndCard}
                      isBeingDragged={draggedTaskId === task.id}
                      dropPosition={dragOverTargetId === task.id ? dropPosition : null}
                    />
                  ))}

                  {visibleColTasks.length === 0 && (
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
            );
          })}
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
              <tr className="border-b border-gray-100 bg-gray-50/90 sticky top-0 z-20 backdrop-blur-md">
                {/* Columna 0: Agarre / Orden Fijo */}
                <th className="px-2 py-4 text-[10px] bg-gray-50 sticky left-0 z-30 w-10 text-center align-middle border-r border-gray-100">
                  <span className="text-gray-400" title="Arrastrar para ordenar">
                    <GripVertical size={14} className="mx-auto" />
                  </span>
                </th>

                {/* Columna 1: HISTORIA (Fija en horizontal - sticky left-10) */}
                <th className="px-6 py-4 text-[10px] bg-gray-50 sticky left-10 z-30 w-[24%] align-top border-r border-gray-100 shadow-xs">
                  <div 
                    onClick={() => handleTableSort('title')}
                    className="flex items-center gap-1.5 font-black text-gray-700 uppercase tracking-[0.15em] cursor-pointer hover:text-gray-900 transition-colors mb-2.5 group"
                  >
                    Historia
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
                      placeholder="Buscar por historia..."
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
                      <option value="review" className="font-sans text-purple-700 font-bold">Para Revisión</option>
                      <option value="correction" className="font-sans text-amber-700 font-bold">Para Corrección</option>
                      <option value="done" className="font-sans text-green-700 font-bold">Completada</option>
                      <option value="blocked" className="font-sans text-red-700 font-bold">Bloqueada</option>
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
                      {processes.map((p, pIdx) => (
                        <option key={`th_filter_proc_${p.id || pIdx}_${pIdx}`} value={p.id} className="font-medium">{p.name}</option>
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
                      {projects.map((pj, pjIdx) => (
                        <option key={`th_filter_pj_${pj.id || pjIdx}_${pjIdx}`} value={pj.id} className="font-medium">{pj.name}</option>
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
                      {sortedMembers.map((m, mIdx) => (
                        <option key={`th_filter_member_${m.id || mIdx}_${mIdx}`} value={m.id} className="font-medium">{m.name}</option>
                      ))}
                    </select>
                  </div>
                </th>

                {/* Auxiliar Column Header */}
                <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[10%] align-top border-r border-gray-100/50">
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
                      {sortedMembers.map((m, mIdx) => (
                        <option key={`th_filter_aux_${m.id || mIdx}_${mIdx}`} value={m.id} className="font-medium">{m.name}</option>
                      ))}
                    </select>
                  </div>
                </th>

                {/* Revisor Column Header */}
                <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[11%] align-top border-r border-gray-100/50">
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
                      {sortedMembers.map((m, mIdx) => (
                        <option key={`th_filter_rev_${m.id || mIdx}_${mIdx}`} value={m.id} className="font-medium">{m.name}</option>
                      ))}
                    </select>
                  </div>
                </th>

                {/* Horas Column Header */}
                <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[6%] align-top border-r border-gray-100/50">
                  <div 
                    onClick={() => handleTableSort('plannedHours')}
                    className="flex items-center gap-1.5 font-black text-gray-500 uppercase tracking-[0.15em] cursor-pointer hover:text-gray-900 transition-colors mb-2.5 group"
                  >
                    Horas
                    {tableSort.column === 'plannedHours' ? (
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
              {finalSortedListTasks.map((task, taskIdx) => {
                const member = members.find(m => m.id === task.memberId);
                const auxiliary = members.find(m => m.id === task.auxiliaryId);
                const taskAuxiliaries = Array.isArray(task.auxiliaryIds) ? members.filter(m => task.auxiliaryIds!.includes(m.id)) : (auxiliary ? [auxiliary] : []);
                const process = processes.find(p => p.id === task.processId);
                const project = projects.find(p => p.id === task.projectId);
                const isOverThisRow = dragOverListTargetId === task.id;
                
                return (
                  <tr 
                    key={`list_task_${task.id || taskIdx}_${taskIdx}`} 
                    onDragOver={(e) => handleDragOverListRow(e, task.id)}
                    onDragLeave={(e) => handleDragLeaveListRow(e, task.id)}
                    onDrop={(e) => handleDropListRow(e, task.id)}
                    className={`hover:bg-gray-50/50 transition-colors group relative ${
                      draggedListTaskId === task.id ? 'opacity-30 bg-blue-50/30' : ''
                    } ${
                      isOverThisRow && dropListPosition === 'before' ? 'border-t-2 border-blue-500' : ''
                    } ${
                      isOverThisRow && dropListPosition === 'after' ? 'border-b-2 border-blue-500' : ''
                    }`}
                  >
                    {/* Columna 0: Botón de Agarre (Tres Puntos / Grip) */}
                    <td className="px-2 py-4.5 align-middle text-center sticky left-0 bg-white z-10 border-r border-gray-100">
                      <div
                        draggable={true}
                        onDragStart={(e) => handleDragStartListRow(e, task.id)}
                        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 inline-flex items-center justify-center transition-colors"
                        title="Arrastrar fila hacia arriba o abajo para ordenar"
                      >
                        <GripVertical size={16} />
                      </div>
                    </td>

                    {/* Columna 1: HISTORIA (Fija en horizontal - sticky left-10) */}
                    <td className="px-6 py-4.5 align-middle sticky left-10 bg-white z-10 border-r border-gray-100 shadow-xs">
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
                        <option value="review">Para Revisión</option>
                        <option value="correction">Para Corrección</option>
                        <option value="done">Completada</option>
                        <option value="blocked">Bloqueada</option>
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
                                key={`table_aux_${aux.id || aIdx}_${aIdx}`}
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
                    <td className="px-6 py-4.5 align-middle">
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <span className="font-black text-gray-900">{task.actualHours || 0}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-gray-500 font-semibold">{task.plannedHours || 0}h</span>
                      </div>
                    </td>

                    {/* Fecha Límite Cell */}
                    <td className="px-6 py-4.5 align-middle">
                      {task.dueDate ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-400 shrink-0" />
                          <span className="text-xs font-bold text-gray-700 whitespace-nowrap">
                            {task.dueDate}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 italic">Sin fecha</span>
                      )}
                    </td>

                    {/* Acciones Cell */}
                    <td className="px-6 py-4.5 align-middle text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar tarea"
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {finalSortedListTasks.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400 text-xs">
                    No se encontraron historias con los filtros seleccionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};
