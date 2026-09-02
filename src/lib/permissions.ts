import { TeamMember, Role, Task } from '../types';

export type ModuleAccessLevel = 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';

/**
 * Evaluates the effective access level of a team member for a specific module or sub-process
 */
export const getModuleAccess = (
  member: TeamMember | null | undefined,
  roles: Role[] | undefined,
  moduleId: string,
  isDatabaseEmpty: boolean = false
): ModuleAccessLevel => {
  if (!member) {
    // If the database is completely empty, default to administrador to allow the first user to bootstrap.
    // Otherwise, default to ninguno to prevent unauthorized access and flashes.
    return isDatabaseEmpty ? 'administrador' : 'ninguno';
  }
  
  if (member.isSystemAdmin || member.systemRoleId === 'role-admin') {
    return 'administrador';
  }

  // Handle process_dashboard (Gestión XD) module special case
  if (moduleId === 'process_dashboard') {
    const generalAccess = member.moduleAccess ? member.moduleAccess['process_dashboard'] : undefined;
    if (generalAccess !== undefined && generalAccess !== 'ninguno') {
      return generalAccess;
    }
    if (member.moduleAccess) {
      const keys = Object.keys(member.moduleAccess);
      const specificLevels = keys
        .filter(k => k.startsWith('process_dashboard_'))
        .map(k => member.moduleAccess![k]);
      
      if (specificLevels.includes('administrador')) return 'administrador';
      if (specificLevels.includes('lider')) return 'lider';
      if (specificLevels.includes('colaborador')) return 'colaborador';
      if (specificLevels.includes('lector')) return 'lector';
    }
    if (generalAccess !== undefined) return generalAccess;
    return 'lector';
  }

  // Handle process_dashboard_ process-specific module ID
  if (moduleId.startsWith('process_dashboard_')) {
    if (member.moduleAccess && member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    const generalAccess = member.moduleAccess ? member.moduleAccess['process_dashboard'] : undefined;
    if (generalAccess !== undefined) {
      return generalAccess;
    }
    return 'lector';
  }

  // Handle tasks module special case
  if (moduleId === 'tasks') {
    const generalAccess = member.moduleAccess ? member.moduleAccess['tasks'] : undefined;
    if (generalAccess !== undefined && generalAccess !== 'ninguno') {
      return generalAccess;
    }
    if (member.moduleAccess) {
      const keys = Object.keys(member.moduleAccess);
      const specificLevels = keys
        .filter(k => k.startsWith('tasks_'))
        .map(k => member.moduleAccess![k]);
      
      if (specificLevels.includes('administrador')) return 'administrador';
      if (specificLevels.includes('lider')) return 'lider';
      if (specificLevels.includes('colaborador')) return 'colaborador';
      if (specificLevels.includes('lector')) return 'lector';
    }
    if (generalAccess !== undefined) return generalAccess;
  }

  // Handle tasks_ process-specific module ID
  if (moduleId.startsWith('tasks_')) {
    if (member.moduleAccess && member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    // Fallback to general tasks access
    const generalTasksAccess = member.moduleAccess ? member.moduleAccess['tasks'] : undefined;
    if (generalTasksAccess !== undefined) {
      return generalTasksAccess;
    }
    return 'ninguno';
  }

  // Handle projects module special case
  if (moduleId === 'projects') {
    const generalAccess = member.moduleAccess ? member.moduleAccess['projects'] : undefined;
    if (generalAccess !== undefined && generalAccess !== 'ninguno') {
      return generalAccess;
    }
    if (member.moduleAccess) {
      const keys = Object.keys(member.moduleAccess);
      const specificLevels = keys
        .filter(k => k.startsWith('projects_'))
        .map(k => member.moduleAccess![k]);
      
      if (specificLevels.includes('administrador')) return 'administrador';
      if (specificLevels.includes('lider')) return 'lider';
      if (specificLevels.includes('colaborador')) return 'colaborador';
      if (specificLevels.includes('lector')) return 'lector';
    }
    if (generalAccess !== undefined) return generalAccess;
    return 'colaborador';
  }

  // Handle projects_ process-specific module ID
  if (moduleId.startsWith('projects_')) {
    if (member.moduleAccess && member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    const generalProjectsAccess = member.moduleAccess ? member.moduleAccess['projects'] : undefined;
    if (generalProjectsAccess !== undefined) {
      return generalProjectsAccess;
    }
    const procId = moduleId.replace('projects_', '');
    if (member.processId === procId) {
      return 'lider';
    }
    return 'colaborador';
  }

  // Handle importaciones module
  if (moduleId === 'importaciones') {
    if (member.moduleAccess && member.moduleAccess['importaciones'] !== undefined) {
      return member.moduleAccess['importaciones'];
    }
    return 'colaborador';
  }

  // Handle marketing module
  if (moduleId === 'marketing') {
    if (member.moduleAccess && member.moduleAccess['marketing'] !== undefined) {
      return member.moduleAccess['marketing'];
    }
    return 'colaborador';
  }

  // Handle acreditacion module
  if (moduleId === 'acreditacion') {
    if (member.moduleAccess && member.moduleAccess['acreditacion'] !== undefined) {
      return member.moduleAccess['acreditacion'];
    }
    return 'colaborador';
  }

  // Handle qhse module
  if (moduleId === 'qhse') {
    if (member.moduleAccess && member.moduleAccess['qhse'] !== undefined) {
      return member.moduleAccess['qhse'];
    }
    return 'colaborador';
  }

  // Handle productos module
  if (moduleId === 'productos') {
    const generalAccess = member.moduleAccess ? member.moduleAccess['productos'] : undefined;
    if (generalAccess !== undefined && generalAccess !== 'ninguno') {
      return generalAccess;
    }
    if (member.moduleAccess) {
      const keys = Object.keys(member.moduleAccess);
      const specificLevels = keys
        .filter(k => k.startsWith('productos_'))
        .map(k => member.moduleAccess![k]);
      
      if (specificLevels.includes('administrador')) return 'administrador';
      if (specificLevels.includes('lider')) return 'lider';
      if (specificLevels.includes('colaborador')) return 'colaborador';
      if (specificLevels.includes('lector')) return 'lector';
    }
    if (generalAccess !== undefined) return generalAccess;
    return 'colaborador';
  }

  // Handle productos_ specific submodule
  if (moduleId.startsWith('productos_')) {
    const subAccess = member.moduleAccess ? member.moduleAccess[moduleId] : undefined;
    const generalAccess = member.moduleAccess ? member.moduleAccess['productos'] : undefined;

    const rankMap: Record<string, number> = { ninguno: 0, lector: 1, colaborador: 2, lider: 3, administrador: 4 };
    const subRank = subAccess ? (rankMap[subAccess] ?? 0) : 2;
    const generalRank = generalAccess ? (rankMap[generalAccess] ?? 0) : 2;

    const effectiveRank = Math.max(subRank, generalRank);
    const ranks = ['ninguno', 'lector', 'colaborador', 'lider', 'administrador'] as const;
    return ranks[effectiveRank] || 'colaborador';
  }
  
  // If the member has an explicit moduleAccess object, that object is the absolute source of truth
  if (member.moduleAccess) {
    if (member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    // Any module not explicitly permitted in a custom structure defaults to none
    return 'ninguno';
  }
  
  return 'ninguno';
};

/**
 * Determines if a specific task is visible to the given member based on role permissions
 */
export const isTaskVisibleForMember = (
  task: Task,
  currentMember: TeamMember | null | undefined,
  roles: Role[] | undefined
): boolean => {
  if (!currentMember) return true;

  if (currentMember.isSystemAdmin || currentMember.systemRoleId === 'role-admin') {
    return true;
  }

  // Get specific access for this task's process (using fallback to general 'tasks' if unassigned or not set)
  const moduleIdForTask = task.processId ? `tasks_${task.processId}` : 'tasks';
  const access = getModuleAccess(currentMember, roles, moduleIdForTask);

  // If they have no access ('ninguno'), they can only see the task if they are directly assigned or auxiliary
  if (access === 'ninguno') {
    const isPrimaryAssignee = task.memberId === currentMember.id;
    const isAuxiliaryAssignee = task.auxiliaryId === currentMember.id || (task.auxiliaryIds && task.auxiliaryIds.includes(currentMember.id));
    return isPrimaryAssignee || isAuxiliaryAssignee;
  }

  // If they are a collaborator
  if (access === 'colaborador') {
    const isPrimaryAssignee = task.memberId === currentMember.id;
    const isAuxiliaryAssignee = task.auxiliaryId === currentMember.id || (task.auxiliaryIds && task.auxiliaryIds.includes(currentMember.id));
    const isBacklogUnassignedOfMyProcess = 
      task.status === 'backlog' && 
      task.processId === currentMember.processId && 
      (!task.memberId || task.memberId === '');
    return isPrimaryAssignee || isAuxiliaryAssignee || isBacklogUnassignedOfMyProcess;
  }

  // Lector, Lider, Administrador can see all tasks of this process
  return true;
};

/**
 * Checks if a task is blocked by unfinished dependencies
 */
export const isTaskBlocked = (id: string, allTasks: Task[]): { isBlocked: boolean; blockers: Task[] } => {
  const task = allTasks.find(t => t.id === id);
  if (!task || !task.blockedByTaskIds || task.blockedByTaskIds.length === 0) return { isBlocked: false, blockers: [] };
  
  const activeBlockers = allTasks.filter(t => task.blockedByTaskIds?.includes(t.id) && t.status !== 'done');
  return {
    isBlocked: activeBlockers.length > 0,
    blockers: activeBlockers
  };
};
