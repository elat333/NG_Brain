import React, { useState, useRef } from 'react';
import { Task, TeamMember, Role, Project, Process, Deliverable, SuggestedActivity } from '../types';
import { db, doc, setDoc, updateDoc, deleteDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { getModuleAccess as defaultGetModuleAccess, isTaskBlocked as defaultIsTaskBlocked } from '../lib/permissions';

interface UseTaskManagerProps {
  tasks: Task[];
  projects: Project[];
  processes: Process[];
  members: TeamMember[];
  roles: Role[];
  currentMember: TeamMember | null | undefined;
  getModuleAccess?: (
    member: TeamMember | null | undefined,
    roles: Role[] | undefined,
    moduleId: string,
    isDatabaseEmpty?: boolean
  ) => 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  isTaskBlocked?: (id: string, allTasks: Task[]) => { isBlocked: boolean; blockers: Task[] };
  activeTab: string;
  setActiveTab: (tab: any) => void;
  lastTab: string | null;
  setLastTab: (tab: string | null) => void;
}

export function useTaskManager({
  tasks,
  projects,
  processes,
  members,
  roles,
  currentMember,
  getModuleAccess = defaultGetModuleAccess,
  isTaskBlocked = defaultIsTaskBlocked,
  activeTab,
  setActiveTab,
  lastTab,
  setLastTab
}: UseTaskManagerProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showTaskHistory, setShowTaskHistory] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [showUnsavedTaskChangesModal, setShowUnsavedTaskChangesModal] = useState(false);

  const initialTaskSnapshotRef = useRef<any>(null);

  const [newTaskData, setNewTaskData] = useState({
    id: '',
    title: '',
    description: '',
    storyDescription: '',
    acceptanceCriteria: '',
    priority: 'media' as Task['priority'],
    plannedDate: '',
    plannedEndDate: '',
    plannedStartTime: '',
    plannedEndTime: '',
    actualEndDate: '',
    memberId: '',
    auxiliaryId: '',
    auxiliaryIds: [] as string[],
    revisorId: '',
    processId: '',
    projectId: '',
    taskTemplate: 'standard' as Task['taskTemplate'],
    designData: {
      campaign: '',
      formats: '',
      elements: []
    } as Task['designData'],
    status: 'backlog' as Task['status'],
    deliverables: [] as Deliverable[],
    plannedHours: 0,
    actualHours: 0,
    dueDate: '',
    blockedByTaskIds: [] as string[]
  });

  const hasUnsavedTaskChanges = () => {
    if (!initialTaskSnapshotRef.current) return false;
    try {
      const current = {
        title: (newTaskData.title || '').trim(),
        description: (newTaskData.description || '').trim(),
        storyDescription: (newTaskData.storyDescription || '').trim(),
        acceptanceCriteria: (newTaskData.acceptanceCriteria || '').trim(),
        priority: newTaskData.priority || 'media',
        plannedDate: newTaskData.plannedDate || '',
        plannedEndDate: newTaskData.plannedEndDate || '',
        plannedStartTime: newTaskData.plannedStartTime || '',
        plannedEndTime: newTaskData.plannedEndTime || '',
        actualEndDate: newTaskData.actualEndDate || '',
        memberId: newTaskData.memberId || '',
        auxiliaryId: newTaskData.auxiliaryId || '',
        auxiliaryIds: newTaskData.auxiliaryIds || [],
        revisorId: newTaskData.revisorId || '',
        processId: newTaskData.processId || '',
        projectId: newTaskData.projectId || '',
        taskTemplate: newTaskData.taskTemplate || 'standard',
        status: newTaskData.status || 'backlog',
        plannedHours: Number(newTaskData.plannedHours) || 0,
        actualHours: Number(newTaskData.actualHours) || 0,
        dueDate: newTaskData.dueDate || '',
        blockedByTaskIds: newTaskData.blockedByTaskIds || [],
        designData: newTaskData.designData || {},
        deliverables: newTaskData.deliverables || []
      };
      const initial = {
        title: (initialTaskSnapshotRef.current.title || '').trim(),
        description: (initialTaskSnapshotRef.current.description || '').trim(),
        storyDescription: (initialTaskSnapshotRef.current.storyDescription || '').trim(),
        acceptanceCriteria: (initialTaskSnapshotRef.current.acceptanceCriteria || '').trim(),
        priority: initialTaskSnapshotRef.current.priority || 'media',
        plannedDate: initialTaskSnapshotRef.current.plannedDate || '',
        plannedEndDate: initialTaskSnapshotRef.current.plannedEndDate || '',
        plannedStartTime: initialTaskSnapshotRef.current.plannedStartTime || '',
        plannedEndTime: initialTaskSnapshotRef.current.plannedEndTime || '',
        actualEndDate: initialTaskSnapshotRef.current.actualEndDate || '',
        memberId: initialTaskSnapshotRef.current.memberId || '',
        auxiliaryId: initialTaskSnapshotRef.current.auxiliaryId || '',
        auxiliaryIds: initialTaskSnapshotRef.current.auxiliaryIds || [],
        revisorId: initialTaskSnapshotRef.current.revisorId || '',
        processId: initialTaskSnapshotRef.current.processId || '',
        projectId: initialTaskSnapshotRef.current.projectId || '',
        taskTemplate: initialTaskSnapshotRef.current.taskTemplate || 'standard',
        status: initialTaskSnapshotRef.current.status || 'backlog',
        plannedHours: Number(initialTaskSnapshotRef.current.plannedHours) || 0,
        actualHours: Number(initialTaskSnapshotRef.current.actualHours) || 0,
        dueDate: initialTaskSnapshotRef.current.dueDate || '',
        blockedByTaskIds: initialTaskSnapshotRef.current.blockedByTaskIds || [],
        designData: initialTaskSnapshotRef.current.designData || {},
        deliverables: initialTaskSnapshotRef.current.deliverables || []
      };
      return JSON.stringify(current) !== JSON.stringify(initial);
    } catch {
      return false;
    }
  };

  const handleForceCloseTaskModal = () => {
    setIsAddingTask(false);
    setEditingTask(null);
    setShowUnsavedTaskChangesModal(false);
    initialTaskSnapshotRef.current = null;
    if (lastTab) {
      setActiveTab(lastTab as any);
      setLastTab(null);
    }
  };

  const handleRequestCloseTaskModal = () => {
    if (hasUnsavedTaskChanges()) {
      setShowUnsavedTaskChangesModal(true);
    } else {
      handleForceCloseTaskModal();
    }
  };

  const openAddTaskModal = (status: Task['status'] = 'backlog', initialOverridesOrDate?: Partial<Task> | string) => {
    setEditingTask(null);
    setShowTaskHistory(false);
    const overrides: Partial<Task> = typeof initialOverridesOrDate === 'string' 
      ? { dueDate: initialOverridesOrDate, plannedDate: initialOverridesOrDate } 
      : (initialOverridesOrDate || {});

    const data = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      description: '',
      storyDescription: '',
      acceptanceCriteria: '',
      priority: 'media' as Task['priority'],
      plannedDate: '',
      plannedStartTime: '',
      plannedEndTime: '',
      actualEndDate: '',
      plannedEndDate: '',
      memberId: '',
      auxiliaryId: '',
      auxiliaryIds: [] as string[],
      revisorId: '',
      processId: '',
      projectId: '',
      taskTemplate: 'standard' as Task['taskTemplate'],
      designData: {
        campaign: '',
        formats: '',
        elements: []
      },
      status,
      deliverables: [] as Deliverable[],
      plannedHours: 0,
      actualHours: 0,
      dueDate: '',
      blockedByTaskIds: [] as string[],
      ...overrides
    };
    setNewTaskData(data);
    initialTaskSnapshotRef.current = JSON.parse(JSON.stringify(data));
    setIsAddingTask(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskHistory(false);
    const data = {
      title: task.title,
      description: task.description || '',
      storyDescription: task.storyDescription || '',
      acceptanceCriteria: task.acceptanceCriteria || '',
      priority: task.priority || 'media',
      plannedDate: task.plannedDate || '',
      plannedStartTime: task.plannedStartTime || '',
      plannedEndTime: task.plannedEndTime || '',
      actualEndDate: task.actualEndDate || '',
      plannedEndDate: task.plannedEndDate || '',
      processId: task.processId,
      memberId: task.memberId || '',
      auxiliaryId: task.auxiliaryId || '',
      auxiliaryIds: task.auxiliaryIds || (task.auxiliaryId ? [task.auxiliaryId] : []),
      revisorId: task.revisorId || '',
      projectId: task.projectId || '',
      taskTemplate: task.taskTemplate || 'standard',
      designData: task.designData || { campaign: '', formats: '', elements: [] },
      status: task.status,
      deliverables: task.deliverables || [],
      plannedHours: task.plannedHours || 0,
      actualHours: task.actualHours || 0,
      dueDate: task.dueDate || '',
      blockedByTaskIds: task.blockedByTaskIds || [],
      id: task.id
    };
    setNewTaskData(data);
    initialTaskSnapshotRef.current = JSON.parse(JSON.stringify(data));
  };

  const createActivityAsTask = (activity: SuggestedActivity) => {
    setEditingTask(null);
    setNewTaskData({
      id: `task-${Date.now()}`,
      title: activity.title,
      description: activity.description,
      storyDescription: '',
      acceptanceCriteria: '',
      priority: 'media',
      plannedDate: '',
      plannedStartTime: '',
      plannedEndTime: '',
      actualEndDate: '',
      plannedEndDate: '',
      revisorId: '',
      status: 'backlog',
      processId: activity.processId || processes[0]?.id || '',
      memberId: activity.memberId || '',
      auxiliaryId: '',
      auxiliaryIds: [],
      projectId: '',
      taskTemplate: 'standard',
      designData: {
        campaign: '',
        formats: '',
        elements: []
      },
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
        taskTemplate: newTaskData.taskTemplate || 'standard',
        designData: newTaskData.designData || { campaign: '', formats: '', elements: [] },
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
      plannedStartTime: '',
      plannedEndTime: '',
      actualEndDate: '',
      plannedEndDate: '',
      memberId: '',
      auxiliaryId: '',
      auxiliaryIds: [],
      revisorId: '',
      processId: '',
      projectId: '',
      taskTemplate: 'standard',
      designData: {
        campaign: '',
        formats: '',
        elements: []
      },
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
    
    let taskProcessId = newTaskData.processId;
    if (!taskProcessId && newTaskData.projectId) {
      const proj = projects.find(p => p.id === newTaskData.projectId);
      if (proj) {
        taskProcessId = proj.processId;
      }
    }

    let taskAccess = getModuleAccess(currentMember, roles, `tasks_${taskProcessId}`);
    if (taskProcessId === 'proc-mkt') {
      taskAccess = getModuleAccess(currentMember, roles, 'marketing');
    }

    const isDirectAssignee = currentMember && (
      editingTask.memberId === currentMember.id || 
      editingTask.auxiliaryId === currentMember.id ||
      (editingTask.auxiliaryIds && editingTask.auxiliaryIds.includes(currentMember.id))
    );
    if (taskAccess !== 'colaborador' && taskAccess !== 'lider' && taskAccess !== 'administrador' && !isDirectAssignee) {
      alert('Error: No dispones de privilegios para actualizar tareas en este proceso.');
      return;
    }

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

      const isUserAdmin = currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin';
      const isProcessLeader = !!(isUserAdmin || taskAccess === 'lider' || taskAccess === 'administrador');

      if (!isProcessLeader) {
        await updateDoc(doc(db, 'tasks', editingTask.id), {
          status: newTaskData.status as any,
          deliverables: newTaskData.deliverables,
          actualHours: newTaskData.actualHours || 0,
          dueDate: newTaskData.dueDate || '',
          history: updatedHistory
        });
      } else {
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
          taskTemplate: newTaskData.taskTemplate || 'standard',
          designData: newTaskData.designData || { campaign: '', formats: '', elements: [] },
          status: newTaskData.status as any,
          deliverables: newTaskData.deliverables,
          plannedHours: newTaskData.plannedHours || 0,
          actualHours: newTaskData.actualHours || 0,
          dueDate: newTaskData.dueDate || '',
          blockedByTaskIds: newTaskData.blockedByTaskIds,
          history: updatedHistory
        });
      }
    } catch (error: any) {
      console.error("Error updating task: ", error);
      alert(`Error al guardar la tarea en Firestore: ${error?.message || "Verifique que tiene permisos correspondientes en el proceso."}`);
      handleFirestoreError(error, OperationType.UPDATE, 'tasks');
    }

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
      storyDescription: '',
      acceptanceCriteria: '',
      priority: 'media',
      plannedDate: '',
      plannedStartTime: '',
      plannedEndTime: '',
      actualEndDate: '',
      plannedEndDate: '',
      memberId: '',
      auxiliaryId: '',
      auxiliaryIds: [],
      revisorId: '',
      processId: '',
      projectId: '',
      taskTemplate: 'standard',
      designData: {
        campaign: '',
        formats: '',
        elements: []
      },
      status: 'backlog',
      deliverables: [],
      plannedHours: 0,
      actualHours: 0,
      dueDate: '',
      blockedByTaskIds: []
    });
  };

  const updateTaskStatus = async (id: string, newStatus: Task['status']) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    let taskProcessId = task.processId;
    if (!taskProcessId && task.projectId) {
      const proj = projects.find(p => p.id === task.projectId);
      if (proj) {
        taskProcessId = proj.processId;
      }
    }
    
    let taskAccess = getModuleAccess(currentMember, roles, taskProcessId ? `tasks_${taskProcessId}` : 'tasks');
    if (taskProcessId === 'proc-mkt') {
      taskAccess = getModuleAccess(currentMember, roles, 'marketing');
    }

    const isDirectAssignee = currentMember && (
      task.memberId === currentMember.id || 
      task.auxiliaryId === currentMember.id ||
      (task.auxiliaryIds && task.auxiliaryIds.includes(currentMember.id))
    );
    if (taskAccess !== 'colaborador' && taskAccess !== 'lider' && taskAccess !== 'administrador' && !isDirectAssignee) {
      alert('Error: No dispones de privilegios para cambiar el estado de las tareas.');
      return;
    }

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
        alert(`ESTA TAREA ESTÁ BLOQUEADA\nPara poder iniciar esta tarea se debe terminar primero:\n• ${blockers.map(t => t.title).join('\n• ')}`);
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

  const handleDeleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    let taskProcessId = task.processId;
    if (!taskProcessId && task.projectId) {
      const proj = projects.find(p => p.id === task.projectId);
      if (proj) {
        taskProcessId = proj.processId;
      }
    }

    let taskAccess = getModuleAccess(currentMember, roles, taskProcessId ? `tasks_${taskProcessId}` : 'tasks');
    if (taskProcessId === 'proc-mkt') {
      taskAccess = getModuleAccess(currentMember, roles, 'marketing');
    }

    if (taskAccess !== 'lider' && taskAccess !== 'administrador') {
      alert('Error: Solo los Líderes de este Proceso o Administradores pueden eliminar tareas.');
      return;
    }

    setTaskToDelete(task);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    let taskProcessId = taskToDelete.processId;
    if (!taskProcessId && taskToDelete.projectId) {
      const proj = projects.find(p => p.id === taskToDelete.projectId);
      if (proj) {
        taskProcessId = proj.processId;
      }
    }
    
    let taskAccess = getModuleAccess(currentMember, roles, taskProcessId ? `tasks_${taskProcessId}` : 'tasks');
    if (taskProcessId === 'proc-mkt') {
      taskAccess = getModuleAccess(currentMember, roles, 'marketing');
    }

    if (taskAccess !== 'lider' && taskAccess !== 'administrador') {
      alert('Error: Solo los Líderes de este Proceso o Administradores pueden eliminar tareas.');
      setTaskToDelete(null);
      return;
    }

    setIsDeletingTask(true);
    try {
      await deleteDoc(doc(db, 'tasks', taskToDelete.id));
      if (editingTask?.id === taskToDelete.id) {
        setEditingTask(null);
        setIsAddingTask(false);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tasks');
    } finally {
      setIsDeletingTask(false);
      setTaskToDelete(null);
    }
  };

  const isUserAdmin = currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin';
  const isNewTask = !editingTask;
  const isPrimaryAssignee = currentMember && editingTask && editingTask.memberId === currentMember.id;
  const taskAccess = getModuleAccess(currentMember, roles, newTaskData.processId ? `tasks_${newTaskData.processId}` : 'tasks');
  const isProcessLeader = !!(isUserAdmin || taskAccess === 'lider' || taskAccess === 'administrador');
  const canEditMetadataField = isNewTask || isProcessLeader;
  const canEditStatusField = isNewTask || isProcessLeader || taskAccess === 'colaborador';
  const canEditPlanning = isNewTask || isProcessLeader;
  const canEditExecution = isNewTask || isProcessLeader || isPrimaryAssignee;

  return {
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
  };
}
