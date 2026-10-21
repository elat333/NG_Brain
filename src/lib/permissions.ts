import { TeamMember, Role, Task } from '../types';

export type ModuleAccessLevel = 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';

const ACCESS_HIERARCHY: ModuleAccessLevel[] = [
  'administrador',
  'lider',
  'colaborador',
  'lector',
];

const resolveHighestChildAccess = (
  moduleAccess: Record<string, ModuleAccessLevel>,
  prefix: string
): ModuleAccessLevel | null => {
  const specificLevels = Object.keys(moduleAccess)
    .filter((k) => k.startsWith(prefix))
    .map((k) => moduleAccess[k]);

  for (const level of ACCESS_HIERARCHY) {
    if (specificLevels.includes(level)) return level;
  }
  return null;
};

/**
 * Standard ERP modules whose submodules follow the `<moduleId>_<subKey>` convention
 * and default to `'colaborador'` when not explicitly restricted.
 */
const STANDARD_ERP_MODULES = [
  'capacitacion',
  'productos',
  'finanzas',
  'marketing',
  'ventas',
  'inventario',
  'importaciones',
  'acreditacion',
  'qhse',
  'gerencia',
  'directory',
] as const;

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
    return isDatabaseEmpty ? 'administrador' : 'ninguno';
  }

  if (member.isSystemAdmin || member.systemRoleId === 'role-admin') {
    return 'administrador';
  }

  const accessMap = member.moduleAccess;

  // 1. Dashboard module (Accessible by default for all team members)
  if (moduleId === 'dashboard') {
    if (accessMap?.dashboard && accessMap.dashboard !== 'ninguno') {
      return accessMap.dashboard;
    }
    return 'colaborador';
  }

  // 2. Process Dashboard (Gestión por Procesos) module & process-specific keys
  if (moduleId === 'process_dashboard') {
    const generalAccess = accessMap?.process_dashboard;
    if (generalAccess !== undefined && generalAccess !== 'ninguno') {
      return generalAccess;
    }
    if (accessMap) {
      const highest = resolveHighestChildAccess(accessMap, 'process_dashboard_');
      if (highest) return highest;
    }
    if (generalAccess !== undefined) return generalAccess;
    return 'lector';
  }

  if (moduleId.startsWith('process_dashboard_')) {
    if (accessMap && accessMap[moduleId] !== undefined) {
      return accessMap[moduleId];
    }
    if (accessMap?.process_dashboard !== undefined) {
      return accessMap.process_dashboard;
    }
    return 'lector';
  }

  // 3. Tasks (Scrum) module & process-specific keys
  if (moduleId === 'tasks') {
    const generalAccess = accessMap?.tasks;
    if (generalAccess !== undefined && generalAccess !== 'ninguno') {
      return generalAccess;
    }
    if (accessMap) {
      const specificLevels = Object.keys(accessMap)
        .filter((k) => k.startsWith('tasks_') || k === 'marketing' || k === 'acreditacion')
        .map((k) => accessMap[k]);

      for (const level of ACCESS_HIERARCHY) {
        if (specificLevels.includes(level)) return level;
      }
    }
    if (generalAccess !== undefined) return generalAccess;
  }

  if (moduleId === 'tasks_import' || moduleId === 'tasks_export') {
    if (accessMap && accessMap[moduleId] !== undefined) {
      return accessMap[moduleId];
    }
    if (accessMap?.tasks !== undefined) {
      return accessMap.tasks;
    }
    return 'colaborador';
  }

  if (moduleId.startsWith('tasks_')) {
    const procId = moduleId.replace('tasks_', '');

    if (accessMap && accessMap[moduleId] !== undefined) {
      return accessMap[moduleId];
    }

    if (
      (procId === 'proc-mkt' || procId.includes('mkt') || procId.includes('marketing')) &&
      accessMap?.marketing !== undefined
    ) {
      return accessMap.marketing;
    }

    const isAcredProcess =
      procId === 'proc-acred' || procId === 'acreditacion' || procId.includes('acred');
    if (isAcredProcess && accessMap) {
      if (accessMap.acreditacion !== undefined) return accessMap.acreditacion;
      if (accessMap['tasks_proc-acred'] !== undefined) return accessMap['tasks_proc-acred'];
    }

    const isMemberInProcess =
      member.processId === procId ||
      (isAcredProcess &&
        (member.processId === 'proc-acred' ||
          member.processId === 'acreditacion' ||
          (typeof member.processId === 'string' && member.processId.includes('acred'))));

    if (isMemberInProcess) {
      if (
        member.systemRoleId === 'role-lider' ||
        (typeof member.role === 'string' && member.role.toLowerCase().includes('lider'))
      ) {
        return 'lider';
      }
      return 'colaborador';
    }

    return 'ninguno';
  }

  // 4. Projects module & process-specific keys
  if (moduleId === 'projects') {
    if (accessMap?.projects !== undefined) {
      return accessMap.projects;
    }
    if (accessMap) {
      const highest = resolveHighestChildAccess(accessMap, 'projects_');
      if (highest) return highest;
    }
    return 'colaborador';
  }

  if (moduleId.startsWith('projects_')) {
    if (accessMap && accessMap[moduleId] !== undefined) {
      return accessMap[moduleId];
    }
    const procId = moduleId.replace('projects_', '');
    if (member.processId === procId) {
      if (
        member.systemRoleId === 'role-lider' ||
        (typeof member.role === 'string' && member.role.toLowerCase().includes('lider'))
      ) {
        return 'lider';
      }
      return 'colaborador';
    }
    return 'ninguno';
  }

  // 5. Unified handler for Standard ERP Modules and their `<module>_<submodule>` keys
  for (const erpMod of STANDARD_ERP_MODULES) {
    if (moduleId === erpMod) {
      const generalAccess = accessMap?.[erpMod];
      if (generalAccess !== undefined && generalAccess !== 'ninguno') {
        return generalAccess;
      }
      if (accessMap) {
        const highest = resolveHighestChildAccess(accessMap, `${erpMod}_`);
        if (highest) return highest;
      }
      if (generalAccess !== undefined) return generalAccess;
      return 'colaborador';
    }

    if (moduleId.startsWith(`${erpMod}_`)) {
      if (accessMap && accessMap[moduleId] !== undefined) {
        return accessMap[moduleId];
      }
      if (accessMap?.[erpMod] !== undefined) {
        return accessMap[erpMod];
      }
      return 'colaborador';
    }
  }

  // 6. Universal collaboration modules (comments, notes, links)
  for (const collabKey of ['comments', 'notes', 'links'] as const) {
    if (moduleId === collabKey || moduleId.startsWith(`${collabKey}_`)) {
      if (accessMap && accessMap[moduleId] !== undefined) {
        return accessMap[moduleId];
      }
      if (accessMap?.[collabKey] !== undefined) {
        return accessMap[collabKey];
      }
      return 'colaborador';
    }
  }

  // 7. Explicit custom key fallback
  if (accessMap) {
    if (accessMap[moduleId] !== undefined) {
      return accessMap[moduleId];
    }
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
  if (!task) return false;
  if (!currentMember) return true;

  if (currentMember.isSystemAdmin || currentMember.systemRoleId === 'role-admin') {
    return true;
  }

  const moduleIdForTask = task.processId ? `tasks_${task.processId}` : 'tasks';
  const access = getModuleAccess(currentMember, roles, moduleIdForTask);

  const isPrimaryAssignee = Boolean(currentMember.id && task.memberId === currentMember.id);
  const isAuxiliaryAssignee = Boolean(
    (currentMember.id && task.auxiliaryId === currentMember.id) ||
      (Array.isArray(task.auxiliaryIds) &&
        currentMember.id &&
        task.auxiliaryIds.includes(currentMember.id))
  );

  if (access === 'ninguno') {
    return isPrimaryAssignee || isAuxiliaryAssignee;
  }

  if (access === 'colaborador') {
    const isBacklogUnassignedOfMyProcess =
      task.status === 'backlog' &&
      task.processId === currentMember.processId &&
      (!task.memberId || task.memberId === '');
    return isPrimaryAssignee || isAuxiliaryAssignee || isBacklogUnassignedOfMyProcess;
  }

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

  if (
    val === 'ninguno' ||
    (val as any) === 'hidden' ||
    (val as any) === false ||
    (val as any) === 'false'
  ) {
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
  const task = allTasks.find((t) => t.id === taskId);
  const blockerIds = task?.blockedByTaskIds || (task as any)?.blockedBy || [];
  if (!task || blockerIds.length === 0) {
    return { isBlocked: false, blockers: [] };
  }

  const blockers = allTasks.filter((t) => blockerIds.includes(t.id) && t.status !== 'done');

  return {
    isBlocked: blockers.length > 0,
    blockers,
  };
};
