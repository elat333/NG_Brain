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

  // Handle dashboard module (Accessible by default for all team members)
  if (moduleId === 'dashboard') {
    if (member.moduleAccess && member.moduleAccess['dashboard'] !== undefined) {
      return member.moduleAccess['dashboard'];
    }
    return 'colaborador';
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
        .filter(k => k.startsWith('tasks_') || k === 'marketing' || k === 'acreditacion')
        .map(k => member.moduleAccess![k]);
      
      if (specificLevels.includes('administrador')) return 'administrador';
      if (specificLevels.includes('lider')) return 'lider';
      if (specificLevels.includes('colaborador')) return 'colaborador';
      if (specificLevels.includes('lector')) return 'lector';
    }
    if (generalAccess !== undefined) return generalAccess;
  }

  // Handle tasks import / export submodules
  if (moduleId === 'tasks_import' || moduleId === 'tasks_export') {
    if (member.moduleAccess && member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    const generalTasksAccess = member.moduleAccess ? member.moduleAccess['tasks'] : undefined;
    if (generalTasksAccess !== undefined) {
      return generalTasksAccess;
    }
    return 'colaborador';
  }

  // Handle tasks_ process-specific module ID
  if (moduleId.startsWith('tasks_')) {
    const procId = moduleId.replace('tasks_', '');

    // 1. Direct specific permission key
    if (member.moduleAccess && member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }

    // 2. Specific module link for marketing
    if ((procId === 'proc-mkt' || procId.includes('mkt') || procId.includes('marketing')) && member.moduleAccess && member.moduleAccess['marketing'] !== undefined) {
      return member.moduleAccess['marketing'];
    }

    // 3. Specific module link for acreditacion (e.g. proc-acred or acreditacion process)
    const isAcredProcess = procId === 'proc-acred' || procId === 'acreditacion' || procId.includes('acred');
    if (isAcredProcess && member.moduleAccess) {
      if (member.moduleAccess['acreditacion'] !== undefined) {
        return member.moduleAccess['acreditacion'];
      }
      if (member.moduleAccess['tasks_proc-acred'] !== undefined) {
        return member.moduleAccess['tasks_proc-acred'];
      }
    }

    // 4. If the member is assigned to this process
    const isMemberInProcess = member.processId === procId || (isAcredProcess && (member.processId === 'proc-acred' || member.processId === 'acreditacion' || (typeof member.processId === 'string' && member.processId.includes('acred'))));
    if (isMemberInProcess) {
      if (member.systemRoleId === 'role-lider' || (typeof member.role === 'string' && member.role.toLowerCase().includes('lider'))) {
        return 'lider';
      }
      // If the member belongs to the process, default to colaborador
      return 'colaborador';
    }

    // 5. Default isolation: If the member does not belong to this process and has no explicit permission for it,
    // they do NOT inherit generalTasksAccess because that would leak stories of all other departments.
    // Instead, return 'ninguno'. This ensures they only see tasks in this process if they are assigned as primary or auxiliary.
    return 'ninguno';
  }

  // Handle projects module special case
  if (moduleId === 'projects') {
    const generalAccess = member.moduleAccess ? member.moduleAccess['projects'] : undefined;
    if (generalAccess !== undefined) {
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
    return 'colaborador';
  }

  // Handle projects_ process-specific module ID
  if (moduleId.startsWith('projects_')) {
    if (member.moduleAccess && member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    const procId = moduleId.replace('projects_', '');
    if (member.processId === procId) {
      if (member.systemRoleId === 'role-lider' || (typeof member.role === 'string' && member.role.toLowerCase().includes('lider'))) {
        return 'lider';
      }
      return 'colaborador';
    }
    return 'ninguno';
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

  // Handle capacitacion module
  if (moduleId === 'capacitacion') {
    const generalAccess = member.moduleAccess ? member.moduleAccess['capacitacion'] : undefined;
    if (generalAccess !== undefined && generalAccess !== 'ninguno') {
      return generalAccess;
    }
    if (member.moduleAccess) {
      const keys = Object.keys(member.moduleAccess);
      const specificLevels = keys
        .filter(k => k.startsWith('capacitacion_'))
        .map(k => member.moduleAccess![k]);
      
      if (specificLevels.includes('administrador')) return 'administrador';
      if (specificLevels.includes('lider')) return 'lider';
      if (specificLevels.includes('colaborador')) return 'colaborador';
      if (specificLevels.includes('lector')) return 'lector';
    }
    if (generalAccess !== undefined) return generalAccess;
    return 'colaborador';
  }

  // Handle capacitacion_ specific submodules
  if (moduleId.startsWith('capacitacion_')) {
    if (member.moduleAccess && member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    const generalAccess = member.moduleAccess ? member.moduleAccess['capacitacion'] : undefined;
    if (generalAccess !== undefined) {
      return generalAccess;
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
    if (generalAccess !== undefined) {
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
    return 'colaborador';
  }

  // Handle productos_ specific submodule
  if (moduleId.startsWith('productos_')) {
    const subAccess = member.moduleAccess ? member.moduleAccess[moduleId] : undefined;
    if (subAccess !== undefined) {
      return subAccess;
    }
    const generalAccess = member.moduleAccess ? member.moduleAccess['productos'] : undefined;
    if (generalAccess !== undefined) {
      return generalAccess;
    }
    return 'colaborador';
  }

  // Handle inventario module
  if (moduleId === 'inventario') {
    const generalAccess = member.moduleAccess ? member.moduleAccess['inventario'] : undefined;
    if (generalAccess !== undefined) {
      return generalAccess;
    }
    return 'colaborador';
  }

  // Handle comments module (Módulo Universal de Comentarios)
  if (moduleId === 'comments' || moduleId.startsWith('comments_')) {
    if (member.moduleAccess && member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    const generalCommentsAccess = member.moduleAccess ? member.moduleAccess['comments'] : undefined;
    if (generalCommentsAccess !== undefined) {
      return generalCommentsAccess;
    }
    // Por defecto todos los miembros activos pueden colaborar en comentarios
    return 'colaborador';
  }

  // Handle notes module / sub-keys (Notas de Colaboración)
  if (moduleId === 'notes' || moduleId.startsWith('notes_')) {
    if (member.moduleAccess && member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    const generalNotesAccess = member.moduleAccess ? member.moduleAccess['notes'] : undefined;
    if (generalNotesAccess !== undefined) {
      return generalNotesAccess;
    }
    return 'colaborador';
  }

  // Handle links module / sub-keys (Enlaces de Colaboración)
  if (moduleId === 'links' || moduleId.startsWith('links_')) {
    if (member.moduleAccess && member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
    }
    const generalLinksAccess = member.moduleAccess ? member.moduleAccess['links'] : undefined;
    if (generalLinksAccess !== undefined) {
      return generalLinksAccess;
    }
    return 'colaborador';
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
    const isPrimaryAssignee = Boolean(currentMember.id && task.memberId === currentMember.id);
    const isAuxiliaryAssignee = Boolean(
      (currentMember.id && task.auxiliaryId === currentMember.id) ||
      (Array.isArray(task.auxiliaryIds) && currentMember.id && task.auxiliaryIds.includes(currentMember.id))
    );
    return isPrimaryAssignee || isAuxiliaryAssignee;
  }

  // If they are a collaborator
  if (access === 'colaborador') {
    const isPrimaryAssignee = Boolean(currentMember.id && task.memberId === currentMember.id);
    const isAuxiliaryAssignee = Boolean(
      (currentMember.id && task.auxiliaryId === currentMember.id) ||
      (Array.isArray(task.auxiliaryIds) && currentMember.id && task.auxiliaryIds.includes(currentMember.id))
    );
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
 * Determines if a subnav item (like notes or links) is visible for a specific module
 */
export const isSubnavVisible = (
  member: TeamMember | null | undefined,
  type: 'notes' | 'links',
  moduleKey: string
): boolean => {
  if (!member) return true;
  if (member.isSystemAdmin || member.systemRoleId === 'role-admin') return true;
  
  const key = `vis_${type}_${moduleKey}`;
  const val = member.moduleAccess ? member.moduleAccess[key] : undefined;
  
  // If explicitly hidden or set to 'ninguno' / 'hidden'
  if (val === 'ninguno' || (val as any) === 'hidden' || (val as any) === false || (val as any) === 'false') {
    return false;
  }
  
  return true;
};

/**
 * Checks if a task is blocked by unfinished dependent tasks
 */
export const isTaskBlocked = (
  taskId: string,
  allTasks: Task[]
): { isBlocked: boolean; blockers: Task[] } => {
  const task = allTasks.find(t => t.id === taskId);
  const blockerIds = task?.blockedByTaskIds || (task as any)?.blockedBy || [];
  if (!task || blockerIds.length === 0) {
    return { isBlocked: false, blockers: [] };
  }

  const blockers = allTasks.filter(
    t => blockerIds.includes(t.id) && t.status !== 'done'
  );

  return {
    isBlocked: blockers.length > 0,
    blockers
  };
};


