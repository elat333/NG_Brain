import TaskModal from './components/TaskModal';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { EyeOff, Video, AlignLeft, 
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
  History,
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
  Trash2,
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
  ExternalLink,
  Table,
  Trello,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  Filter,
  Eye,
  ShieldAlert,
  Save,
  Bookmark,
  Briefcase,
  Bot,
  BookOpen,
  Target,
  Sliders,
  Package,
  Globe,
  UploadCloud,
  Megaphone,
  GraduationCap,
  BarChart2,
  LogOut,
  LayoutTemplate,
  PlusCircle,
  TableProperties,
  Maximize2,
  Monitor,
  Award,
  Link2,
  Boxes,
  HardHat,
  Wrench,
  ShieldCheck
, MoreVertical, Download, CheckSquare} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DollarSign } from 'lucide-react';
import { TeamMember, Process, ExtractedUpdates, Task, Project, SuggestedActivity, MemberDraft, Deliverable, Company, PersonCategory, Industry, Role, ProcessLink, ProcessNote, ManagementNote, ManagementStrategyData, ManagementAIGovernanceData, ProductItem } from './types';
import { initialMembers, initialProcesses, initialTasks, initialCompanies, initialIndustries, initialRoles, initialManagementNotes, initialManagementStrategy, initialManagementGovernance, initialProducts } from './lib/initialData';
import { analyzeTranscript, getPlanningSuggestions, processMemberInput } from './services/aiService';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  onSnapshot, 
  query, 
  where,
  getDocs,
  OperationType,
  handleFirestoreError,
  User as FirebaseUser
} from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
// @ts-ignore
import companyLogo from './assets/images/ng brain ai.jpg';
import ProcessDashboard from './components/ProcessDashboard';
import TaskCalendarView from './components/TaskCalendarView';
import ManagementModule from './components/ManagementModule';
import { ImportacionesModule } from './components/ImportacionesModule';

import { MarketingModule, MarketingSubTab } from './components/MarketingModule';
import { CapacitacionModule, CapacitacionSubTab } from './components/CapacitacionModule';

import VentasModule from './components/VentasModule';
import { AcreditacionModule } from './components/AcreditacionModule';
import { CompanyEditorView } from './components/common/CompanyEditorView';
import { ProductosModule, ProductSubTab } from './components/ProductosModule';
import { QHSEModule, QHSESubTab } from './components/QHSEModule';
import { processAndCompressImage } from './lib/imageUtils';

// Helper functions
const parseLocalDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed in JS
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
};

const isTaskBlocked = (id: string, allTasks: Task[]): { isBlocked: boolean; blockers: Task[] } => {
  const task = allTasks.find(t => t.id === id);
  if (!task || !task.blockedByTaskIds || task.blockedByTaskIds.length === 0) return { isBlocked: false, blockers: [] };
  
  const activeBlockers = allTasks.filter(t => task.blockedByTaskIds?.includes(t.id) && t.status !== 'done');
  return {
    isBlocked: activeBlockers.length > 0,
    blockers: activeBlockers
  };
};

const isTaskVisibleForMember = (
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

const getModuleAccess = (
  member: TeamMember | null | undefined,
  roles: Role[] | undefined,
  moduleId: string,
  isDatabaseEmpty: boolean = false
): 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador' => {
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
    return 'ninguno';
  }

  // Handle projects_ process-specific module ID
  if (moduleId.startsWith('projects_')) {
    if (member.moduleAccess && member.moduleAccess[moduleId] !== undefined) {
      return member.moduleAccess[moduleId];
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

const normalizeText = (text: string): string => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};


interface NavButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const NavButton: React.FC<NavButtonProps> = ({ active, icon, label, onClick, badge, trailingIcon }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
      active
        ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/25 font-black'
        : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`}
  >
    <div className="flex items-center gap-3 min-w-0">
      <span className={active ? 'text-ng-black' : 'text-white/60'}>{icon}</span>
      <span className="truncate">{label}</span>
      {badge}
    </div>
    {trailingIcon && <div>{trailingIcon}</div>}
  </button>
);

interface SubNavButtonProps {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const SubNavButton: React.FC<SubNavButtonProps> = ({ active, label, icon, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
      active
        ? 'bg-ng-lime/20 text-ng-lime font-bold shadow-xs'
        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
    }`}
  >
    <span className={active ? 'text-ng-lime' : 'text-gray-500'}>{icon}</span>
    <span className="truncate">{label}</span>
  </button>
);

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend }) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</span>
      <div className="p-2 bg-gray-50 rounded-xl">{icon}</div>
    </div>
    <div className="mt-4">
      <span className="text-2xl font-black text-gray-900">{value}</span>
      <p className="text-xs text-gray-400 mt-1">{trend}</p>
    </div>
  </div>
);

interface AIInsightItemProps {
  title: string;
  desc: string;
  time: string;
}

const AIInsightItem: React.FC<AIInsightItemProps> = ({ title, desc, time }) => (
  <div className="flex gap-4 items-start p-3 hover:bg-gray-50 rounded-2xl transition-all">
    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl shrink-0 mt-0.5">
      <Sparkles size={16} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold text-gray-900 truncate">{title}</h4>
        <span className="text-[10px] text-gray-400 shrink-0">{time}</span>
      </div>
      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
    </div>
  </div>
);

interface ProjectCardProps {
  project: any;
  tasks: any[];
  onEdit: (p: any) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, tasks, onEdit, onDelete, canEdit = true, canDelete = true }) => {
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-ng-green/10 text-ng-green rounded-2xl">
              <FolderKanban size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{project.name}</h3>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {project.status || 'Activo'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <button onClick={() => onEdit(project)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
                <Edit size={14} />
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(project.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        {project.description && (
          <p className="text-xs text-gray-500 mt-3 line-clamp-2">{project.description}</p>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-50">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-400 font-medium">Progreso ({completedTasks}/{tasks.length})</span>
          <span className="font-bold text-gray-700">{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div className="bg-ng-green h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};

interface TaskCardProps {
  task: any;
  allTasks?: any[];
  member?: any;
  auxiliary?: any;
  auxiliaries?: any[];
  revisor?: any;
  process?: any;
  project?: any;
  onUpdateStatus: (id: string, status: any) => void;
  onEdit: (t: any) => void;
  onDelete: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  member,
  auxiliaries = [],
  revisor,
  process,
  project,
  onUpdateStatus,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      onClick={() => onEdit(task)}
      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {task.priority && (
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                task.priority === 'urgente'
                  ? 'bg-red-50 text-red-600'
                  : task.priority === 'alta'
                  ? 'bg-amber-50 text-amber-600'
                  : task.priority === 'media'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {task.priority}
            </span>
          )}
          {project && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 truncate max-w-[120px]">
              {project.name}
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-opacity"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
        {task.title}
      </h4>

      {task.description && (
        <p className="text-[11px] text-gray-400 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100/80 mt-auto gap-2">
        {/* Cluster de Participantes: Responsable │ Revisor │ Auxiliares */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* 1. Responsable Principal */}
          {member ? (
            <div
              className="relative group/resp shrink-0"
              title={`Responsable principal: ${member.name || 'Sin nombre'}`}
            >
              <div className="w-6 h-6 rounded-full ring-2 ring-[#97d700] overflow-hidden bg-emerald-50 text-emerald-800 flex items-center justify-center text-[9px] font-black shadow-xs">
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{(member.name || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded-full border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-[9px] text-gray-400 font-bold shrink-0"
              title="Sin responsable asignado"
            >
              ?
            </div>
          )}

          {/* 2. Divisor 1 y Revisor */}
          {revisor && (
            <>
              <div className="h-3.5 w-[1.5px] bg-gray-200/90 rounded-full shrink-0 mx-0.5" />
              <div
                className="relative group/rev shrink-0"
                title={`Revisor / Aprobador: ${revisor.name || 'Sin nombre'}`}
              >
                <div className="w-5 h-5 rounded-full ring-1.5 ring-indigo-400 overflow-hidden bg-indigo-50 text-indigo-700 flex items-center justify-center text-[8px] font-bold shadow-xs">
                  {revisor.avatar ? (
                    <img
                      src={revisor.avatar}
                      alt={revisor.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{(revisor.name || 'R').charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 3. Divisor 2 y Auxiliares */}
          {auxiliaries && auxiliaries.length > 0 && (
            <>
              <div className="h-3.5 w-[1.5px] bg-gray-200/90 rounded-full shrink-0 mx-0.5" />
              <div
                className="flex items-center -space-x-1.5 shrink-0"
                title={`Auxiliares: ${auxiliaries.map(a => a.name).join(', ')}`}
              >
                {auxiliaries.slice(0, 2).map((a: any) => (
                  <div
                    key={a.id}
                    className="w-[18px] h-[18px] rounded-full ring-1 ring-purple-300 border border-white overflow-hidden bg-purple-50 text-purple-700 flex items-center justify-center text-[7.5px] font-bold shadow-xs shrink-0"
                    title={`Auxiliar: ${a.name}`}
                  >
                    {a.avatar ? (
                      <img
                        src={a.avatar}
                        alt={a.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{(a.name || 'A').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                ))}
                {auxiliaries.length > 2 && (
                  <div
                    className="w-[18px] h-[18px] rounded-full bg-gray-100 ring-1 ring-gray-300 border border-white text-gray-600 flex items-center justify-center text-[7px] font-black shrink-0"
                    title={`+${auxiliaries.length - 2} auxiliares más`}
                  >
                    +{auxiliaries.length - 2}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {task.dueDate && (
            <span className="text-[9px] font-bold text-red-500/90 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1" title="Fecha Límite">
              <Calendar size={10} /> {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }).replace('.', '')}
            </span>
          )}
          {task.plannedHours ? (
            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1" title="Horas planificadas">
              <Clock size={10} /> {task.plannedHours}h
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

interface ProcessDetailCardProps {
  proc: any;
  members: any[];
  onEdit: (p: any) => void;
  onDelete: (id: string) => void;
}

const ProcessDetailCard: React.FC<ProcessDetailCardProps> = ({ proc, members, onEdit, onDelete }) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between group">
    <div>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">{proc.name}</h3>
            <span className="text-xs text-gray-400">{proc.code || 'PRO-00'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(proc)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
            <Edit size={14} />
          </button>
          <button onClick={() => onDelete(proc.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {proc.description && (
        <p className="text-xs text-gray-500 mt-3">{proc.description}</p>
      )}
    </div>
    <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
      <span>{members.length} miembros</span>
      <span className="font-bold text-purple-600">Activo</span>
    </div>
  </div>
);

interface MemberEditorViewProps {
  editingMember: any;
  newMemberData: any;
  setNewMemberData: (data: any) => void;
  processes: any[];
  companies: any[];
  roles: any[];
  onCancel: () => void;
  onSave?: (e?: any) => void;
}

const MemberEditorView: React.FC<MemberEditorViewProps> = ({
  editingMember,
  newMemberData,
  setNewMemberData,
  processes,
  companies,
  roles,
  onCancel,
}) => {
  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h3 className="font-black text-gray-900 text-lg">
          {editingMember ? 'Editar Miembro' : 'Nuevo Miembro'}
        </h3>
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-600">Nombre Completo</label>
          <input
            type="text"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={newMemberData.name || ''}
            onChange={e => setNewMemberData({ ...newMemberData, name: e.target.value })}
            placeholder="Nombre del miembro..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-600">Email</label>
          <input
            type="email"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={newMemberData.email || ''}
            onChange={e => setNewMemberData({ ...newMemberData, email: e.target.value })}
            placeholder="correo@empresa.com"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-600">Cargo / Rol</label>
          <input
            type="text"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={newMemberData.role || ''}
            onChange={e => setNewMemberData({ ...newMemberData, role: e.target.value })}
            placeholder="Ej: Líder de Operaciones"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-600">Proceso</label>
          <select
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={newMemberData.processId || ''}
            onChange={e => setNewMemberData({ ...newMemberData, processId: e.target.value })}
          >
            <option value="">Selecciona un proceso</option>
            {processes.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

interface MemberProfileCardProps {
  member: any;
  processName?: string;
  companies?: any[];
  roles?: any[];
}

const MemberProfileCard: React.FC<MemberProfileCardProps> = ({ member, processName }) => (
  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 font-black text-lg flex items-center justify-center shrink-0">
      {member.name.charAt(0)}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-gray-900 text-sm truncate">{member.name}</h4>
      <p className="text-xs text-gray-400 truncate">{member.role || 'Sin cargo'}</p>
      {processName && (
        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-gray-50 text-gray-500 rounded-md truncate max-w-full">
          {processName}
        </span>
      )}
    </div>
  </div>
);


export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>({ email: 'e.siavichay@novagreen.ec', uid: '123', displayName: 'Test User' } as any);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isInitializingData, setIsInitializingData] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transcript' | 'tasks' | 'planner' | 'projects' | 'settings' | 'directory' | 'process_dashboard' | 'gerencia' | 'importaciones' | 'marketing' | 'ventas' | 'capacitacion' | 'acreditacion' | 'productos' | 'qhse'>('dashboard');
  const [expandedNavModule, setExpandedNavModule] = useState<string | null>(null);

  const toggleNavModule = (moduleKey: string, onNavigate?: () => void) => {
    if (expandedNavModule === moduleKey) {
      setExpandedNavModule(null);
    } else {
      setExpandedNavModule(moduleKey);
      if (onNavigate) {
        onNavigate();
      }
    }
  };
  const [ventasSubTab, setVentasSubTab] = useState<'links' | 'notes' | 'crm' | 'pipeline' | 'quotes' | 'goals'>('links');
  const [lastTab, setLastTab] = useState<string | null>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<'roles' | 'processes' | 'members' | 'general'>('general');
  const [showProcessPermissions, setShowProcessPermissions] = useState<boolean>(false);
  const [directorySubTab, setDirectorySubTab] = useState<'people' | 'companies' | 'industries'>('people');
  const [processSubTab, setProcessSubTab] = useState<'summary' | 'projects' | 'links' | 'notes'>('summary');
  const [managementSubTab, setManagementSubTab] = useState<'consultant' | 'notes' | 'strategy' | 'governance' | 'links'>('consultant');
  const [importacionesSubTab, setImportacionesSubTab] = useState<'products' | 'suppliers' | 'proformas' | 'upload_proforma'>('products');
  
  const [marketingSubTab, setMarketingSubTab] = useState<MarketingSubTab>('campaigns');
  const [capacitacionSubTab, setCapacitacionSubTab] = useState<CapacitacionSubTab>('calendar');
  const [acreditacionSubTab, setAcreditacionSubTab] = useState<'links' | 'notes' | 'allies' | 'certifications'>('links');
  const [productosSubTab, setProductosSubTab] = useState<ProductSubTab>('todos');
  const [qhseSubTab, setQhseSubTab] = useState<QHSESubTab>('links');

  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [showFicha, setShowFicha] = useState<boolean>(false);
  
  const [draftIsSystemAdmin, setDraftIsSystemAdmin] = useState<boolean>(false);
  const [draftModuleAccess, setDraftModuleAccess] = useState<Record<string, 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador'>>({});
  const [draftSupervisedMembersForLinks, setDraftSupervisedMembersForLinks] = useState<string[]>([]);
  const [draftCanViewAllCompanyLinks, setDraftCanViewAllCompanyLinks] = useState<boolean>(false);
  const [linksSupervisorSearch, setLinksSupervisorSearch] = useState<string>('');
  const [lastInitializedMemberId, setLastInitializedMemberId] = useState<string>('');
  const [pendingExitAction, setPendingExitAction] = useState<{
    type: 'tab' | 'subtab' | 'member';
    targetTab?: 'dashboard' | 'transcript' | 'tasks' | 'planner' | 'projects' | 'settings' | 'directory' | 'process_dashboard' | 'gerencia' | 'importaciones' | 'marketing' | 'ventas' | 'capacitacion' | 'acreditacion' | 'productos' | 'qhse';
    targetSettingsSubTab?: 'roles' | 'processes' | 'members' | 'general';
    targetMemberId?: string;
  } | null>(null);


  const [industries, setIndustries] = useState<Industry[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('role-admin');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [permSearch, setPermSearch] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [processLinks, setProcessLinks] = useState<ProcessLink[]>([]);
  const [processNotes, setProcessNotes] = useState<ProcessNote[]>([]);
  const [managementNotes, setManagementNotes] = useState<ManagementNote[]>(initialManagementNotes);
  const [managementStrategy, setManagementStrategy] = useState<ManagementStrategyData>(initialManagementStrategy);
  const [managementGovernance, setManagementGovernance] = useState<ManagementAIGovernanceData>(initialManagementGovernance);
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  
  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));
  }, [members]);

  const currentMember = React.useMemo(() => {
    if (!user || !user.email) return null;
    const found = members.find(m => m.email?.toLowerCase() === user.email?.toLowerCase());
    if (found) {
      if (user.email.toLowerCase() === 'e.siavichay@novagreen.ec') {
        return { ...found, isSystemAdmin: true, systemRoleId: 'role-admin' };
      }
      return found;
    }

    // Fallback/bootstrap for super admin so they can access and manage the platform fully
    if (user.email.toLowerCase() === 'e.siavichay@novagreen.ec') {
      return {
        id: 'super-admin-bootstrap',
        name: user.displayName || 'Super Admin',
        email: user.email,
        role: 'Administrador Global',
        categories: ['miembro'],
        systemRoleId: 'role-admin',
        isSystemAdmin: true,
        companyAssociations: [],
        skills: [],
        responsibilities: []
      } as any;
    }
    return null;
  }, [user, members]);

  const activeTabAccess = React.useMemo(() => {
    return getModuleAccess(currentMember, roles, activeTab, members.length === 0);
  }, [currentMember, roles, activeTab, members]);

  const isReadOnly = React.useMemo(() => {
    return activeTabAccess === 'lector';
  }, [activeTabAccess]);

  const canCreateProjects = React.useMemo(() => {
    const generalAccess = getModuleAccess(currentMember, roles, 'projects');
    if (generalAccess === 'lider' || generalAccess === 'administrador') return true;
    
    if (currentMember?.moduleAccess) {
      return Object.keys(currentMember.moduleAccess).some(k => 
        k.startsWith('projects_') && 
        (currentMember.moduleAccess![k] === 'lider' || currentMember.moduleAccess![k] === 'administrador')
      );
    }
    return false;
  }, [currentMember, roles]);

  const accessibleProcesses = React.useMemo(() => {
    if (!currentMember) return processes;
    const isSysAdmin = currentMember.isSystemAdmin || currentMember.systemRoleId === 'role-admin';
    const generalProcessDashboardAccess = getModuleAccess(currentMember, roles, 'process_dashboard', members.length === 0);

    if (isSysAdmin || generalProcessDashboardAccess === 'administrador') {
      return processes;
    }

    const filtered = processes.filter(p => {
      if (currentMember.processId === p.id) return true;

      const tasksAccess = getModuleAccess(currentMember, roles, `tasks_${p.id}`);
      const projectsAccess = getModuleAccess(currentMember, roles, `projects_${p.id}`);
      const processAccess = getModuleAccess(currentMember, roles, `process_${p.id}`);

      return tasksAccess !== 'ninguno' || projectsAccess !== 'ninguno' || processAccess !== 'ninguno';
    });

    if (filtered.length === 0 && processes.length > 0) {
      return processes;
    }

    return filtered;
  }, [processes, currentMember, roles, members.length]);

  const resolvedPermissionsMember = React.useMemo(() => {
    const filtered = sortedMembers.filter(m => (m.categories || []).includes('miembro'));
    return sortedMembers.find(m => m.id === selectedMemberId) || filtered[0];
  }, [selectedMemberId, sortedMembers]);

  useEffect(() => {
    if (resolvedPermissionsMember) {
      if (resolvedPermissionsMember.id !== lastInitializedMemberId) {
        setDraftIsSystemAdmin(resolvedPermissionsMember.isSystemAdmin || resolvedPermissionsMember.systemRoleId === 'role-admin');
        setDraftModuleAccess(resolvedPermissionsMember.moduleAccess || {});
        setDraftSupervisedMembersForLinks(resolvedPermissionsMember.supervisedMembersForLinks || []);
        setDraftCanViewAllCompanyLinks(resolvedPermissionsMember.canViewAllCompanyLinks || false);
        setLastInitializedMemberId(resolvedPermissionsMember.id);
      }
    } else {
      setDraftIsSystemAdmin(false);
      setDraftModuleAccess({});
      setDraftSupervisedMembersForLinks([]);
      setDraftCanViewAllCompanyLinks(false);
      setLastInitializedMemberId('');
    }
  }, [resolvedPermissionsMember, lastInitializedMemberId]);

  useEffect(() => {
    if (accessibleProcesses.length > 0) {
      const isCurrentlyAccessible = accessibleProcesses.some(p => p.id === selectedProcessId);
      if (!isCurrentlyAccessible || !selectedProcessId) {
        const memberProcess = accessibleProcesses.find(p => p.id === currentMember?.processId);
        if (memberProcess) {
          setSelectedProcessId(memberProcess.id);
        } else {
          setSelectedProcessId(accessibleProcesses[0].id);
        }
      }
    }
  }, [accessibleProcesses, selectedProcessId, currentMember]);

  const hasUnsavedPermissionsChanges = React.useMemo(() => {
    if (!resolvedPermissionsMember) return false;
    const originalIsAdmin = resolvedPermissionsMember.isSystemAdmin || resolvedPermissionsMember.systemRoleId === 'role-admin';
    if (draftIsSystemAdmin !== originalIsAdmin) return true;

    const originalCanViewAll = resolvedPermissionsMember.canViewAllCompanyLinks || false;
    if (draftCanViewAllCompanyLinks !== originalCanViewAll) return true;

    const originalSupervised = resolvedPermissionsMember.supervisedMembersForLinks || [];
    if (originalSupervised.length !== draftSupervisedMembersForLinks.length) return true;
    if (draftSupervisedMembersForLinks.some(id => !originalSupervised.includes(id))) return true;
    
    const originalAccess = resolvedPermissionsMember.moduleAccess || {};
    const allKeys = Array.from(new Set([...Object.keys(originalAccess), ...Object.keys(draftModuleAccess)]));
    for (const key of allKeys) {
      const origVal = originalAccess[key] || 'ninguno';
      const draftVal = draftModuleAccess[key] || 'ninguno';
      if (origVal !== draftVal) return true;
    }
    return false;
  }, [resolvedPermissionsMember, draftIsSystemAdmin, draftModuleAccess, draftSupervisedMembersForLinks, draftCanViewAllCompanyLinks]);

  const savePermissions = async (memberId: string) => {
    try {
      const finalRoleId = draftIsSystemAdmin ? 'role-admin' : 'role-colaborador';
      
      // Clean up general projects permission to enforce process-specific rules
      const cleanedModuleAccess = { ...draftModuleAccess };
      cleanedModuleAccess['projects'] = 'ninguno';

      await updateDoc(doc(db, 'members', memberId), {
        isSystemAdmin: draftIsSystemAdmin,
        systemRoleId: finalRoleId,
        moduleAccess: cleanedModuleAccess,
        supervisedMembersForLinks: draftSupervisedMembersForLinks,
        canViewAllCompanyLinks: draftCanViewAllCompanyLinks
      });
      // Force refresh on draft
      setLastInitializedMemberId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `members/${memberId}`);
    }
  };

  const handleTabClick = (tab: 'dashboard' | 'transcript' | 'tasks' | 'planner' | 'projects' | 'settings' | 'directory' | 'process_dashboard' | 'gerencia' | 'importaciones' | 'marketing' | 'ventas' | 'capacitacion' | 'acreditacion' | 'productos' | 'qhse', directorySub?: 'people' | 'companies' | 'industries' | 'calendar' | 'trainers' | 'physical_spaces' | 'virtual_spaces' | 'management' | 'crm' | 'pipeline' | 'quotes' | 'goals') => {
    if (activeTab === 'settings' && settingsSubTab === 'roles' && hasUnsavedPermissionsChanges) {
      setPendingExitAction({
        type: 'tab',
        targetTab: tab
      });
    } else {
      setActiveTab(tab);
      if (tab === 'directory' && directorySub) {
        setDirectorySubTab(directorySub as 'people' | 'companies' | 'industries');
      } else if (tab === 'settings') {
        const hasSettingsSettingsAccess = getModuleAccess(currentMember, roles, 'settings', members.length === 0) !== 'ninguno';
        if (hasSettingsSettingsAccess) {
          setSettingsSubTab('general');
        }
      }
    }
  };

  const handleSettingsSubTabClick = (subTab: 'roles' | 'processes' | 'members' | 'general') => {
    if (activeTab === 'settings' && settingsSubTab === 'roles' && hasUnsavedPermissionsChanges) {
      setPendingExitAction({
        type: 'subtab',
        targetSettingsSubTab: subTab
      });
    } else {
      setSettingsSubTab(subTab);
    }
  };

  const handleMemberClick = (memberId: string) => {
    if (activeTab === 'settings' && settingsSubTab === 'roles' && hasUnsavedPermissionsChanges) {
      setPendingExitAction({
        type: 'member',
        targetMemberId: memberId
      });
    } else {
      setSelectedMemberId(memberId);
    }
  };

  const handleCopyImage = async (imageUrl: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('Blob creation failed');
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          alert('Imagen copiada al portapapeles');
        } catch (err) {
          console.error('Error al escribir al portapapeles:', err);
          alert('No se pudo copiar la imagen. El navegador puede no soportarlo.');
        }
      }, 'image/png');
    } catch (err) {
      console.error('Error al procesar imagen para copiar:', err);
      alert('Hubo un error al preparar la imagen para copiar.');
    }
  };

  // Auto-redirect to first accessible tab if current Tab is restricted
  useEffect(() => {
    if (!currentMember) return;
    const access = getModuleAccess(currentMember, roles, activeTab, members.length === 0);
    if (access === 'ninguno') {
      const tabs: ('dashboard' | 'transcript' | 'tasks' | 'planner' | 'projects' | 'settings' | 'directory' | 'process_dashboard' | 'gerencia' | 'importaciones' | 'marketing')[] = [
        'dashboard', 'gerencia', 'process_dashboard', 'marketing', 'importaciones', 'tasks', 'planner', 'projects', 'directory', 'transcript', 'settings'
      ];
      const fallbackTab = tabs.find(t => getModuleAccess(currentMember, roles, t, members.length === 0) !== 'ninguno');
      if (fallbackTab) {
        setActiveTab(fallbackTab);
      }
    }
  }, [currentMember, roles, activeTab, members]);
  
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // TEMPORARY SCRIPT TO FORCE DELETE ORPHANED TASKS
    const deleteOrphans = async () => {
      try {
        const q = query(collection(db, 'tasks'));
        const snap = await getDocs(q);
        snap.docs.forEach(async (d) => {
          const data = d.data();
          if (data.title?.includes('Diseño de artes para anuncios - ASÍ virtual') || data.id !== d.id) {
            await deleteDoc(doc(db, 'tasks', d.id));
            console.log('Force deleted orphaned/corrupted task:', d.id);
          }
        });
      } catch (err) {}
    };
    deleteOrphans();

    const collections = [
      { name: 'members', setState: setMembers, initial: initialMembers },
      { name: 'processes', setState: setProcesses, initial: initialProcesses },
      { name: 'tasks', setState: setTasks, initial: initialTasks },
      { name: 'projects', setState: setProjects, initial: [] },
      { name: 'companies', setState: setCompanies, initial: initialCompanies },
      { name: 'industries', setState: setIndustries, initial: initialIndustries },
      { name: 'roles', setState: setRoles, initial: initialRoles },
      { name: 'process_links', setState: setProcessLinks, initial: [] },
      { name: 'process_notes', setState: setProcessNotes, initial: [] },
      { name: 'management_notes', setState: (data: any[]) => setManagementNotes(data.length > 0 ? data : initialManagementNotes), initial: initialManagementNotes },
      { name: 'management_strategy', setState: (data: any[]) => { if (data.length > 0) setManagementStrategy(data[0]); }, initial: initialManagementStrategy },
      { name: 'management_governance', setState: (data: any[]) => { if (data.length > 0) setManagementGovernance(data[0]); }, initial: initialManagementGovernance },
      { name: 'products', setState: setProducts, initial: initialProducts },
    ];

    const unsubscribes = collections.map(col => {
      return onSnapshot(collection(db, col.name), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data() } as any));
        col.setState(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, col.name);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  // Synchronize Google user email mapping to the Member document ID in Firestore for Security Rules
  useEffect(() => {
    if (!user || !user.email || members.length === 0) return;
    const found = members.find(m => m.email?.toLowerCase() === user.email?.toLowerCase());
    if (found) {
      const emailDocId = user.email.toLowerCase();
      const writeMapping = async () => {
        try {
          await setDoc(doc(db, 'user_mappings', emailDocId), { memberId: found.id });
        } catch (e) {
          console.warn("Silent mapping sync:", e);
        }
      };
      writeMapping();
    }
  }, [user, members]);

  const [isMigrating, setIsMigrating] = useState(false);
  const [localDataFound, setLocalDataFound] = useState(false);
  const logoUrl = companyLogo;

  useEffect(() => {
    // Check if there's any data in localStorage that could be migrated
    const keysToCheck = [
      'teampulse_members', 'tp_members', 'ng_members', 'members',
      'teampulse_tasks', 'tp_tasks', 'ng_tasks', 'tasks',
      'teampulse_projects', 'tp_projects', 'ng_projects', 'projects',
      'teampulse_processes', 'tp_processes', 'ng_processes', 'processes',
      'teampulse_companies', 'tp_companies', 'ng_companies', 'companies'
    ];
    const found = keysToCheck.some(key => {
      const data = localStorage.getItem(key);
      try {
        return data && JSON.parse(data).length > 0;
      } catch {
        return false;
      }
    });
    setLocalDataFound(found);
  }, []);

  const migrateFromLocalStorage = async () => {
    if (!user) return;
    if (!window.confirm('Se han detectado datos guardados en este navegador. ¿Deseas migrarlos a tu cuenta de Novagreen IA? Esto no borrará los datos técnicos, pero subirá tu información a la nube.')) return;
    
    setIsMigrating(true);
    try {
      const collections = [
        { local: 'teampulse_members', cloud: 'members' },
        { local: 'tp_members', cloud: 'members' },
        { local: 'ng_members', cloud: 'members' },
        { local: 'members', cloud: 'members' },
        
        { local: 'teampulse_tasks', cloud: 'tasks' },
        { local: 'tp_tasks', cloud: 'tasks' },
        { local: 'ng_tasks', cloud: 'tasks' },
        { local: 'tasks', cloud: 'tasks' },
        
        { local: 'teampulse_projects', cloud: 'projects' },
        { local: 'tp_projects', cloud: 'projects' },
        { local: 'ng_projects', cloud: 'projects' },
        { local: 'projects', cloud: 'projects' },

        { local: 'teampulse_processes', cloud: 'processes' },
        { local: 'tp_processes', cloud: 'processes' },
        { local: 'ng_processes', cloud: 'processes' },
        { local: 'processes', cloud: 'processes' },

        { local: 'teampulse_companies', cloud: 'companies' },
        { local: 'tp_companies', cloud: 'companies' },
        { local: 'ng_companies', cloud: 'companies' },
        { local: 'companies', cloud: 'companies' },

        { local: 'teampulse_industries', cloud: 'industries' },
        { local: 'industries', cloud: 'industries' },

        { local: 'teampulse_roles', cloud: 'roles' },
        { local: 'roles', cloud: 'roles' },
      ];

      let migratedCount = 0;
      for (const col of collections) {
        const localData = localStorage.getItem(col.local);
        if (localData) {
          try {
            const data = JSON.parse(localData);
            if (Array.isArray(data)) {
              for (const item of data) {
                if (item.id) {
                  await setDoc(doc(db, col.cloud, item.id), item);
                  migratedCount++;
                }
              }
            }
          } catch (e) {
            console.error(`Error migrating ${col.local}`, e);
          }
        }
      }

      if (migratedCount > 0) {
        alert(`${migratedCount} elementos migrados correctamente a la nube. El sistema se actualizará ahora.`);
        setLocalDataFound(false);
      } else {
        alert('No se encontraron datos estructurados compatibles para migrar. Intenta cargar los datos iniciales si la cuenta está vacía.');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'migration');
    } finally {
      setIsMigrating(false);
    }
  };

  const bootstrapData = async () => {
    if (!user) return;
    setIsInitializingData(true);
    try {
      const collectionsToBootstrap = [
        { name: 'members', data: initialMembers },
        { name: 'processes', data: initialProcesses },
        { name: 'tasks', data: initialTasks },
        { name: 'companies', data: initialCompanies },
        { name: 'industries', data: initialIndustries },
        { name: 'roles', data: initialRoles },
        { name: 'management_notes', data: initialManagementNotes },
        { name: 'management_strategy', data: [initialManagementStrategy] },
        { name: 'management_governance', data: [initialManagementGovernance] },
      ];

      for (const col of collectionsToBootstrap) {
        for (const item of col.data) {
          await setDoc(doc(db, col.name, item.id), item);
        }
      }
      alert('Datos inicializados correctamente en Firebase.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bootstrap');
    } finally {
      setIsInitializingData(false);
    }
  };

  const handleUpdateManagementNotes = async (newNotes: ManagementNote[]) => {
    setManagementNotes(newNotes);
    if (!user) return;
    try {
      const existingIds = new Set(newNotes.map(n => n.id));
      for (const oldNote of managementNotes) {
        if (!existingIds.has(oldNote.id)) {
          await deleteDoc(doc(db, 'management_notes', oldNote.id));
        }
      }
      for (const note of newNotes) {
        await setDoc(doc(db, 'management_notes', note.id), note);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'management_notes');
    }
  };

  const handleUpdateManagementStrategy = async (newStrategy: ManagementStrategyData) => {
    setManagementStrategy(newStrategy);
    if (!user) return;
    try {
      await setDoc(doc(db, 'management_strategy', newStrategy.id || 'strat-main'), newStrategy);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'management_strategy');
    }
  };

  const handleUpdateManagementGovernance = async (newGovernance: ManagementAIGovernanceData) => {
    setManagementGovernance(newGovernance);
    if (!user) return;
    try {
      await setDoc(doc(db, 'management_governance', newGovernance.id || 'gov-main'), newGovernance);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'management_governance');
    }
  };

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

  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedUpdates, setExtractedUpdates] = useState<ExtractedUpdates | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskViewMode, setTaskViewMode] = useState<'board' | 'list' | 'calendar'>('board');
  const [tasksSubTab, setTasksSubTab] = useState<'board' | 'permissions'>('board');
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [showAllDoneTasks, setShowAllDoneTasks] = useState<boolean>(false);
  const [showTaskMenu, setShowTaskMenu] = useState(false);
  const [showTimeInputs, setShowTimeInputs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListDragging, setIsListDragging] = useState(false);
  const [isBoardDragging, setIsBoardDragging] = useState(false);
  const [tableFilters, setTableFilters] = useState({
    title: '',
    status: '',
    processId: '',
    projectId: '',
    memberId: '',
    auxiliaryId: '',
    revisorId: '',
  });

  const [tableSort, setTableSort] = useState<{
    column: 'title' | 'status' | 'process' | 'project' | 'member' | 'auxiliary' | 'revisor' | 'hours' | 'dueDate' | null;
    direction: 'asc' | 'desc' | null;
  }>({
    column: null,
    direction: null,
  });
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
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
  const [showTaskHistory, setShowTaskHistory] = useState(false);
  const [showAddAuxDropdown, setShowAddAuxDropdown] = useState(false);
  const [auxSearchQuery, setAuxSearchQuery] = useState('');
  const [showAddBlockerDropdown, setShowAddBlockerDropdown] = useState(false);
  const [blockerSearchQuery, setBlockerSearchQuery] = useState('');
  const [blockerSelectedProjectId, setBlockerSelectedProjectId] = useState('all');
  const [blockerSelectedProcessId, setBlockerSelectedProcessId] = useState('all');
  const [showAddBlocksDropdown, setShowAddBlocksDropdown] = useState(false);
  const [blocksSearchQuery, setBlocksSearchQuery] = useState('');
  const [blocksSelectedProjectId, setBlocksSelectedProjectId] = useState('all');
  const [blocksSelectedProcessId, setBlocksSelectedProcessId] = useState('all');
  const [expandedReference, setExpandedReference] = useState<{url: string, comment: string} | null>(null);
  const [designColWidths, setDesignColWidths] = useState({ element: 150, content: 250, visual: 200, observations: 200 });
  const [videoColWidths, setVideoColWidths] = useState<Record<string, number>>({ time: 100, stage: 150, visual: 250, onScreenText: 200, voiceOver: 250, observations: 200 });
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

  const initialTaskSnapshotRef = useRef<any>(null);
  const [showUnsavedTaskChangesModal, setShowUnsavedTaskChangesModal] = useState(false);

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
    setShowAddAuxDropdown(false);
    setAuxSearchQuery('');
    setShowAddBlockerDropdown(false);
    setBlockerSearchQuery('');
    setShowAddBlocksDropdown(false);
    setBlocksSearchQuery('');
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

  const exportTasksBackup = (taskList: Task[]) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(taskList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `respaldo-tareas-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };


  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
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

  const deleteSuggestedActivity = (id: string) => {
    if (window.confirm('¿Realmente deseas borrar esta actividad sugerida?')) {
      setSuggestedActivities(prev => prev.filter(a => a.id !== id));
    }
  };

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

  const applyUpdates = async () => {
    if (!extractedUpdates) return;

    try {
      // Apply member updates
      for (const update of extractedUpdates.memberUpdates) {
        const member = members.find(m => m.id === update.memberId);
        if (member) {
          await updateDoc(doc(db, 'members', member.id), {
            role: update.roleUpdate || member.role,
            skills: Array.from(new Set([...member.skills, ...(update.newSkills || [])])),
            responsibilities: Array.from(new Set([...member.responsibilities, ...(update.newResponsibilities || [])])),
            epp: Array.from(new Set([...(member.epp || []), ...(update.epp || [])])),
            recentAchievements: [...(update.achievements || []), ...member.recentAchievements].slice(0, 5)
          });
        }
      }

      // Apply process updates
      for (const update of extractedUpdates.processUpdates) {
        const proc = processes.find(p => p.id === update.processId);
        if (proc) {
          await updateDoc(doc(db, 'processes', proc.id), {
            description: update.descriptionUpdate || proc.description,
            goals: Array.from(new Set([...proc.goals, ...(update.newGoals || [])]))
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'extracted_updates');
    }

    setExtractedUpdates(null);
    setTranscript('');
    setActiveTab('dashboard');
  };

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
      // Manage industries list
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
          address: newCompanyData.mainAddress // for compatibility
        });
      } else {
        const id = `comp-${Date.now()}`;
        const newCompany: Company = {
          id,
          ...newCompanyData,
          address: newCompanyData.mainAddress, // for compatibility
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

  
  const handleExportTasks = () => {
    const exportData = filteredTasks.map(t => ({
      id: t.id, title: t.title, description: t.description, status: t.status,
      priority: t.priority, plannedDate: t.plannedDate, dueDate: t.dueDate,
      plannedStartTime: t.plannedStartTime, plannedEndTime: t.plannedEndTime,
      actualEndDate: t.actualEndDate, plannedHours: t.plannedHours, actualHours: t.actualHours,
      processId: t.processId, memberId: t.memberId
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "tareas.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setShowTaskMenu(false);
  };

  const handleImportTasks = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          for (const task of data) {
            if (task.title && task.status) {
              await addDoc(collection(db, 'tasks'), {
                ...task,
                id: undefined, 
                createdAt: new Date().toISOString(),
              });
            }
          }
          alert('Tareas importadas exitosamente');
        }
      } catch (err) {
        alert('Error al importar tareas. Asegúrese de que sea un archivo JSON válido.');
      }
    };
    reader.readAsText(file);
    setShowTaskMenu(false);
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

  const handleDesignTablePaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>, startRowIdx: number, startColName: 'element' | 'content' | 'visual' | 'observations') => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData || (!pasteData.includes('\t') && !pasteData.includes('\n'))) return;
    
    e.preventDefault();
    
    const rows = pasteData.split(/\r?\n/).filter(r => r.length > 0 || r.includes('\t'));
    if (rows.length === 0) return;

    const currentElements = [...(newTaskData.designData?.elements || [])];
    const props: ('element' | 'content' | 'visual' | 'observations')[] = ['element', 'content', 'visual', 'observations'];
    const startPropIdx = props.indexOf(startColName);
    const isCarousel = newTaskData.taskTemplate === 'design_carousel';
    const targetSlide = isCarousel ? (currentElements[startRowIdx]?.slideIndex || 1) : 1;

    const slideItemIndices = isCarousel
      ? currentElements.map((el, idx) => ((el.slideIndex || 1) === targetSlide ? idx : -1)).filter(idx => idx !== -1)
      : currentElements.map((_, idx) => idx);

    const relativeStartPos = slideItemIndices.indexOf(startRowIdx);
    const startPos = relativeStartPos >= 0 ? relativeStartPos : 0;
    let lastModifiedIdx = startRowIdx;

    rows.forEach((rowStr, rOffset) => {
      const cols = rowStr.split('\t');
      const targetPos = startPos + rOffset;

      let elementToUpdate: any;

      if (targetPos < slideItemIndices.length) {
        const actualIdx = slideItemIndices[targetPos];
        elementToUpdate = currentElements[actualIdx];
        lastModifiedIdx = actualIdx;
      } else {
        const newItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          element: '',
          content: '',
          visual: '',
          observations: '',
          ...(isCarousel ? { slideIndex: targetSlide } : {})
        };
        const insertAfterIdx = lastModifiedIdx;
        if (insertAfterIdx >= 0 && insertAfterIdx < currentElements.length) {
          currentElements.splice(insertAfterIdx + 1, 0, newItem);
          lastModifiedIdx = insertAfterIdx + 1;
        } else {
          currentElements.push(newItem);
          lastModifiedIdx = currentElements.length - 1;
        }
        elementToUpdate = newItem;
      }

      cols.forEach((colData, colIdx) => {
        const propToUpdate = props[startPropIdx + colIdx];
        if (propToUpdate && elementToUpdate) {
          elementToUpdate[propToUpdate] = colData;
        }
      });
    });
    
    setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, elements: currentElements } });
  };
  const handleVideoTablePaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>, startRowIdx: number, startColName: string) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData || (!pasteData.includes('\t') && !pasteData.includes('\n'))) return;
    
    e.preventDefault();
    
    const rows = pasteData.split(/\r?\n/).filter(r => r.length > 0 || r.includes('\t'));
    if (rows.length === 0) return;

    const currentScenes = [...(newTaskData.designData?.videoScenes || [])];
    const customCols = newTaskData.designData?.customVideoColumns || [];
    const props = ['time', 'stage', 'visual', 'onScreenText', 'voiceOver', 'observations', ...customCols.map(c => c.id)];
    const startPropIdx = props.indexOf(startColName);
    
    let currentRowIdx = startRowIdx;
    
    rows.forEach(rowStr => {
      const cols = rowStr.split('\t');
      if (!currentScenes[currentRowIdx]) {
        currentScenes.push({ id: Date.now().toString() + currentRowIdx + Math.random().toString(36).substr(2, 4), time: '', stage: '', visual: '', onScreenText: '', voiceOver: '', observations: '', customFields: {} });
      }
      cols.forEach((colData, colIdx) => {
        const propName = props[startPropIdx + colIdx];
        if (propName) {
            if (['time', 'stage', 'visual', 'onScreenText', 'voiceOver', 'observations'].includes(propName)) {
                (currentScenes[currentRowIdx] as any)[propName] = colData;
            } else {
                if (!currentScenes[currentRowIdx].customFields) currentScenes[currentRowIdx].customFields = {};
                currentScenes[currentRowIdx].customFields![propName] = colData;
            }
        }
      });
      currentRowIdx++;
    });
    
    setNewTaskData({ ...newTaskData, designData: { ...newTaskData.designData!, videoScenes: currentScenes } });
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
    setShowAddAuxDropdown(false);
    setAuxSearchQuery('');
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

    // Validate reviewer permissions for status transition
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
    setShowAddAuxDropdown(false);
    setAuxSearchQuery('');
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

    // Validate reviewer permissions for status transition
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
        alert(`ESTA TAREA ESTÁ BLOQUEADAPara poder iniciar esta tarea se debe terminar primero:• ${blockers.map(t => t.title).join('• ')}`);
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

  const deleteProject = async (id: string) => {
    const proj = projects.find(p => p.id === id);
    const access = getModuleAccess(currentMember, roles, proj?.processId ? `projects_${proj.processId}` : 'projects');
    if (access !== 'administrador') {
      alert('Error: Solo los Administradores pueden eliminar proyectos.');
      return;
    }
    if (window.confirm('¿Estás seguro de que deseas eliminar este proyecto? Las tareas asociadas perderán su vinculación con el proyecto.')) {
      try {
        await deleteDoc(doc(db, 'projects', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'projects');
      }
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
  const [slideToDelete, setSlideToDelete] = useState<number | null>(null);
  const [elementToDelete, setElementToDelete] = useState<string | null>(null);
  const [sceneToDelete, setSceneToDelete] = useState<string | null>(null);

  const handleDeleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      setTaskToDelete(task);
    }
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
    try {
      await deleteDoc(doc(db, 'tasks', taskToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tasks');
    }
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

  const filteredMembers = members.filter(m => 
    normalizeText(m.name).includes(normalizeText(searchQuery)) || 
    normalizeText(m.role).includes(normalizeText(searchQuery))
  );

  const [activeProjectFilter, setActiveProjectFilter] = useState<string | null>(null);
  const [activeMemberFilter, setActiveMemberFilter] = useState<string | null>(null);
  const [smartFilters, setSmartFilters] = useState<{
    projectId: string | null;
    memberId: string | null;
    processId: string | null;
    auxiliaryId: string | null;
    status: string | null;
  }>({
    projectId: null,
    memberId: null,
    processId: null,
    auxiliaryId: null,
    status: null,
  });
  const [showSmartDropdown, setShowSmartDropdown] = useState(false);
  const [activeSuggestionCategory, setActiveSuggestionCategory] = useState<'all' | 'project' | 'member' | 'process' | 'auxiliary' | 'status'>('all');

  const filteredTasks = tasks.filter(t => {
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

  const sortedTasks = [...filteredTasks];
  if (taskViewMode === 'list' && tableSort.column && tableSort.direction) {
    const { column, direction } = tableSort;
    const isAsc = direction === 'asc';
    
    sortedTasks.sort((a, b) => {
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

  const isUserAdmin = currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin';
  const isNewTask = !editingTask;
  const isPrimaryAssignee = currentMember && editingTask && editingTask.memberId === currentMember.id;
  const taskAccess = getModuleAccess(currentMember, roles, newTaskData.processId ? `tasks_${newTaskData.processId}` : 'tasks');
  const isProcessLeader = !!(isUserAdmin || taskAccess === 'lider' || taskAccess === 'administrador');
  const canEditMetadataField = isNewTask || isProcessLeader;
  const canEditStatusField = isNewTask || isProcessLeader || taskAccess === 'colaborador';
  const canEditPlanning = isNewTask || isProcessLeader;
  const canEditExecution = isNewTask || isProcessLeader || isPrimaryAssignee;

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-8">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
        />
        <p className="text-sm font-bold text-gray-500 animate-pulse uppercase tracking-widest">Cargando Teampulse AI...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-lg w-full text-center"
        >
          <div 
            className="w-24 h-24 rounded-[2rem] flex items-center justify-center overflow-hidden mx-auto mb-8 shadow-2xl shadow-ng-lime/20 border-4 border-white"
          >
            <img src={logoUrl} alt="Novagreen Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-4xl font-black text-ng-black mb-4 tracking-tight">Novagreen IA</h1>
          <p className="text-ng-black/40 font-bold mb-10 leading-relaxed uppercase text-xs tracking-widest">
            La plataforma inteligente para la gestión de equipos y optimización de procesos. 
            Inicia sesión con tu cuenta corporativa para continuar.
          </p>
          <button 
            type="button"
            onClick={() => loginWithGoogle()}
            className="flex items-center justify-center gap-4 w-full py-5 bg-white border-2 border-gray-100 rounded-3xl text-ng-black font-black hover:bg-gray-50 hover:border-ng-lime transition-all shadow-sm group"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all" />
            Ingresar con Google
          </button>
          
          <div className="mt-12 pt-8 border-t border-gray-50 space-y-4">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-loose">
              Al ingresar aceptas nuestros <a href="#" className="text-ng-green hover:underline">términos de servicio</a> y <a href="#" className="text-ng-green hover:underline">política de privacidad</a>.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-ng-black border-r border-ng-gray/10 z-10 hidden md:flex flex-col">
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div 
            className="flex items-center gap-3 text-ng-lime mb-10"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-ng-lime/10 transition-all duration-300">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <span className="font-black text-xl tracking-tighter text-white">Novagreen IA</span>
          </div>

          <nav className="space-y-1">
            {/* 1. Resumen */}
            {getModuleAccess(currentMember, roles, 'dashboard') !== 'ninguno' && (
              <NavButton 
                active={activeTab === 'dashboard'} 
                icon={<TrendingUp size={20} />} 
                label="Resumen" 
                onClick={() => {
                  setExpandedNavModule(null);
                  handleTabClick('dashboard');
                }} 
              />
            )}

            {/* 2. Tareas (Agrupa: Seguimiento de Tareas, Proyectos, Planificador IA) */}
            {(() => {
              const hasTasksAccess = getModuleAccess(currentMember, roles, 'tasks') !== 'ninguno';
              const hasPlannerAccess = getModuleAccess(currentMember, roles, 'planner') !== 'ninguno';
              const hasProjectsAccess = getModuleAccess(currentMember, roles, 'projects') !== 'ninguno';
              const isTasksGroupActive = activeTab === 'tasks' || activeTab === 'planner' || activeTab === 'projects';
              const isTasksExpanded = expandedNavModule === 'tasks';

              if (!hasTasksAccess && !hasPlannerAccess && !hasProjectsAccess) return null;

              return (
                <>
                  <NavButton 
                    active={isTasksGroupActive} 
                    icon={<CheckCircle2 size={20} />} 
                    label="Tareas" 
                    onClick={() => {
                      toggleNavModule('tasks', () => {
                        if (hasTasksAccess) {
                          handleTabClick('tasks');
                        } else if (hasProjectsAccess) {
                          handleTabClick('projects');
                        } else {
                          handleTabClick('planner');
                        }
                      });
                    }} 
                  />
                  <AnimatePresence>
                    {isTasksExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="ml-8 mt-1 space-y-1 overflow-hidden"
                      >
                        {hasTasksAccess && ( <>
                          <SubNavButton 
                            active={activeTab === 'tasks' && tasksSubTab === 'board'} 
                            label="Tablero de Tareas" 
                            icon={<CheckCircle2 size={14} />} 
                            onClick={() => {
                              setExpandedNavModule('tasks');
                              handleTabClick('tasks');
                              setTasksSubTab('board');
                            }} 
                          />
                          <SubNavButton 
                            active={activeTab === 'tasks' && tasksSubTab === 'permissions'} 
                            label="Reglas y Permisos" 
                            icon={<Shield size={14} />} 
                            onClick={() => {
                              setExpandedNavModule('tasks');
                              handleTabClick('tasks');
                              setTasksSubTab('permissions');
                            }} 
                          />
</>
                        )}
                        {hasProjectsAccess && (
                          <SubNavButton 
                            active={activeTab === 'projects'} 
                            label="Proyectos" 
                            icon={<FolderKanban size={14} />} 
                            onClick={() => {
                              setExpandedNavModule('tasks');
                              handleTabClick('projects');
                            }} 
                          />
                        )}
                        {hasPlannerAccess && (
                          <SubNavButton 
                            active={activeTab === 'planner'} 
                            label="Planificador IA" 
                            icon={<Calendar size={14} />} 
                            onClick={() => {
                              setExpandedNavModule('tasks');
                              handleTabClick('planner');
                            }} 
                          />
                        )}
                        {hasTasksAccess && (
                          <>
                            <SubNavButton 
                              active={false} 
                              label="Exportar tareas" 
                              icon={<Download size={14} />} 
                              onClick={handleExportTasks} 
                            />
                            <SubNavButton 
                              active={false} 
                              label="Importar tareas" 
                              icon={<UploadCloud size={14} />} 
                              onClick={() => fileInputRef.current?.click()} 
                            />
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              );
            })()}

            {/* 3. Gestión (Procesos / XD) */}
            {getModuleAccess(currentMember, roles, 'process_dashboard') !== 'ninguno' && (
              <>
                <NavButton 
                  active={activeTab === 'process_dashboard'} 
                  icon={<Activity size={20} />} 
                  label="Gestión" 
                  onClick={() => toggleNavModule('process_dashboard', () => handleTabClick('process_dashboard'))} 
                />
                <AnimatePresence>
                  {expandedNavModule === 'process_dashboard' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-1 space-y-1 overflow-hidden"
                    >
                      <SubNavButton 
                        active={processSubTab === 'summary'} 
                        label="Horas y Tareas" 
                        icon={<Clock size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('process_dashboard');
                          handleTabClick('process_dashboard');
                          setProcessSubTab('summary');
                        }} 
                      />
                      <SubNavButton 
                        active={processSubTab === 'projects'} 
                        label="Bases de Proyectos" 
                        icon={<FolderKanban size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('process_dashboard');
                          handleTabClick('process_dashboard');
                          setProcessSubTab('projects');
                        }} 
                      />
                      <SubNavButton 
                        active={processSubTab === 'notes'} 
                        label="Notas" 
                        icon={<FileText size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('process_dashboard');
                          handleTabClick('process_dashboard');
                          setProcessSubTab('notes');
                        }} 
                      />
                      <SubNavButton 
                        active={processSubTab === 'links'} 
                        label="Enlaces de Interés" 
                        icon={<Bookmark size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('process_dashboard');
                          handleTabClick('process_dashboard');
                          setProcessSubTab('links');
                        }} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* 4. Gerencia */}
            {getModuleAccess(currentMember, roles, 'gerencia') !== 'ninguno' && (
              <>
                <NavButton 
                  active={activeTab === 'gerencia'} 
                  icon={<Briefcase size={20} />} 
                  label="Gerencia" 
                  onClick={() => toggleNavModule('gerencia', () => handleTabClick('gerencia'))} 
                />
                <AnimatePresence>
                  {expandedNavModule === 'gerencia' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-1 space-y-1 overflow-hidden"
                    >
                      <SubNavButton 
                        active={managementSubTab === 'links'} 
                        label="Enlaces de Interés" 
                        icon={<LinkIcon size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('gerencia');
                          handleTabClick('gerencia');
                          setManagementSubTab('links');
                        }} 
                      />
                      <SubNavButton 
                        active={managementSubTab === 'notes'} 
                        label="Notas" 
                        icon={<BookOpen size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('gerencia');
                          handleTabClick('gerencia');
                          setManagementSubTab('notes');
                        }} 
                      />
                      <SubNavButton 
                        active={managementSubTab === 'consultant'} 
                        label="Asistente IA" 
                        icon={<Bot size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('gerencia');
                          handleTabClick('gerencia');
                          setManagementSubTab('consultant');
                        }} 
                      />
                      <SubNavButton 
                        active={managementSubTab === 'strategy'} 
                        label="Estrategia & OKRs" 
                        icon={<Target size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('gerencia');
                          handleTabClick('gerencia');
                          setManagementSubTab('strategy');
                        }} 
                      />
                      <SubNavButton 
                        active={managementSubTab === 'governance'} 
                        label="Gobernanza IA" 
                        icon={<Sliders size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('gerencia');
                          handleTabClick('gerencia');
                          setManagementSubTab('governance');
                        }} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* 5. Acreditación */}
            {getModuleAccess(currentMember, roles, 'acreditacion') !== 'ninguno' && (
              <>
                <NavButton 
                  active={activeTab === 'acreditacion'} 
                  icon={<Award size={20} />} 
                  label="Acreditación" 
                  onClick={() => toggleNavModule('acreditacion', () => handleTabClick('acreditacion'))} 
                />
                <AnimatePresence>
                  {expandedNavModule === 'acreditacion' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-1 space-y-1 overflow-hidden"
                    >
                      <SubNavButton 
                        active={acreditacionSubTab === 'links'} 
                        label="Enlaces de Interés" 
                        icon={<Link2 size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('acreditacion');
                          handleTabClick('acreditacion');
                          setAcreditacionSubTab('links');
                        }} 
                      />
                      <SubNavButton 
                        active={acreditacionSubTab === 'notes'} 
                        label="Notas" 
                        icon={<FileText size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('acreditacion');
                          handleTabClick('acreditacion');
                          setAcreditacionSubTab('notes');
                        }} 
                      />
                      <SubNavButton 
                        active={acreditacionSubTab === 'allies'} 
                        label="Aliados Estratégicos" 
                        icon={<Users size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('acreditacion');
                          handleTabClick('acreditacion');
                          setAcreditacionSubTab('allies');
                        }} 
                      />
                      <SubNavButton 
                        active={acreditacionSubTab === 'certifications'} 
                        label="Catálogo de Ofertas" 
                        icon={<Award size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('acreditacion');
                          handleTabClick('acreditacion');
                          setAcreditacionSubTab('certifications');
                        }} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* 6. Capacitación */}
            {getModuleAccess(currentMember, roles, 'capacitacion') !== 'ninguno' && (
              <>
                <NavButton 
                  active={activeTab === 'capacitacion'} 
                  icon={<GraduationCap size={20} />} 
                  label="Capacitación" 
                  onClick={() => toggleNavModule('capacitacion', () => handleTabClick('capacitacion', 'calendar'))} 
                />
                <AnimatePresence>
                  {expandedNavModule === 'capacitacion' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-1 space-y-1 overflow-hidden"
                    >
                      <SubNavButton 
                        active={capacitacionSubTab === 'links'} 
                        label="Enlaces de Interés" 
                        icon={<LinkIcon size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('capacitacion');
                          handleTabClick('capacitacion');
                          setCapacitacionSubTab('links');
                        }} 
                      />
                      <SubNavButton 
                        active={capacitacionSubTab === 'notes'} 
                        label="Notas" 
                        icon={<FileText size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('capacitacion');
                          handleTabClick('capacitacion');
                          setCapacitacionSubTab('notes');
                        }} 
                      />
                      <SubNavButton 
                        active={capacitacionSubTab === 'calendar'} 
                        label="Calendario" 
                        icon={<Calendar size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('capacitacion');
                          handleTabClick('capacitacion');
                          setCapacitacionSubTab('calendar');
                        }} 
                      />
                      <SubNavButton 
                        active={capacitacionSubTab === 'management'} 
                        label="Gestión de Capacitaciones" 
                        icon={<BarChart2 size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('capacitacion');
                          handleTabClick('capacitacion');
                          setCapacitacionSubTab('management');
                        }} 
                      />
                      <SubNavButton 
                        active={capacitacionSubTab === 'trainers'} 
                        label="Capacitadores" 
                        icon={<Users size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('capacitacion');
                          handleTabClick('capacitacion');
                          setCapacitacionSubTab('trainers');
                        }} 
                      />
                      <SubNavButton 
                        active={capacitacionSubTab === 'physical_spaces'} 
                        label="Lugares" 
                        icon={<Building2 size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('capacitacion');
                          handleTabClick('capacitacion');
                          setCapacitacionSubTab('physical_spaces');
                        }} 
                      />
                      <SubNavButton 
                        active={capacitacionSubTab === 'virtual_spaces'} 
                        label="Aulas Virtuales" 
                        icon={<Monitor size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('capacitacion');
                          handleTabClick('capacitacion');
                          setCapacitacionSubTab('virtual_spaces');
                        }} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* 7. QHSE */}
            {getModuleAccess(currentMember, roles, 'qhse') !== 'ninguno' && (
              <>
                <NavButton 
                  active={activeTab === 'qhse'} 
                  icon={<ShieldCheck size={20} />} 
                  label="QHSE" 
                  onClick={() => toggleNavModule('qhse', () => handleTabClick('qhse'))} 
                />
                <AnimatePresence>
                  {expandedNavModule === 'qhse' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-1 space-y-1 overflow-hidden"
                    >
                      <SubNavButton 
                        active={qhseSubTab === 'links'} 
                        label="Enlaces de Interés" 
                        icon={<LinkIcon size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('qhse');
                          handleTabClick('qhse');
                          setQhseSubTab('links');
                        }} 
                      />
                      <SubNavButton 
                        active={qhseSubTab === 'notes'} 
                        label="Notas" 
                        icon={<FileText size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('qhse');
                          handleTabClick('qhse');
                          setQhseSubTab('notes');
                        }} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* 8. Marketing */}
            {getModuleAccess(currentMember, roles, 'marketing') !== 'ninguno' && (
              <>
                <NavButton 
                  active={activeTab === 'marketing'} 
                  icon={<Megaphone size={20} />} 
                  label="Marketing" 
                  onClick={() => toggleNavModule('marketing', () => handleTabClick('marketing'))} 
                />
                <AnimatePresence>
                  {expandedNavModule === 'marketing' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-1 space-y-1 overflow-hidden"
                    >
                      <SubNavButton 
                        active={marketingSubTab === 'links'} 
                        label="Enlaces de Interés" 
                        icon={<LinkIcon size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('marketing');
                          handleTabClick('marketing');
                          setMarketingSubTab('links');
                        }} 
                      />
                      <SubNavButton 
                        active={marketingSubTab === 'notes'} 
                        label="Notas" 
                        icon={<FileText size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('marketing');
                          handleTabClick('marketing');
                          setMarketingSubTab('notes');
                        }} 
                      />
                      <SubNavButton 
                        active={marketingSubTab === 'campaigns'} 
                        label="Campañas" 
                        icon={<Target size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('marketing');
                          handleTabClick('marketing');
                          setMarketingSubTab('campaigns');
                        }} 
                      />
                      <SubNavButton 
                        active={marketingSubTab === 'content_calendar'} 
                        label="Contenido & Calendario" 
                        icon={<Calendar size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('marketing');
                          handleTabClick('marketing');
                          setMarketingSubTab('content_calendar');
                        }} 
                      />
                      <SubNavButton 
                        active={marketingSubTab === 'metrics_analytics'} 
                        label="Métricas & KPIs" 
                        icon={<BarChart2 size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('marketing');
                          handleTabClick('marketing');
                          setMarketingSubTab('metrics_analytics');
                        }} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* 9. Ventas */}
            {getModuleAccess(currentMember, roles, 'ventas') !== 'ninguno' && (
              <>
                <NavButton 
                  active={activeTab === 'ventas'} 
                  icon={<DollarSign size={20} />} 
                  label="Ventas" 
                  onClick={() => toggleNavModule('ventas', () => handleTabClick('ventas'))} 
                />
                <AnimatePresence>
                  {expandedNavModule === 'ventas' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-1 space-y-1 overflow-hidden"
                    >
                      <SubNavButton 
                        active={ventasSubTab === 'links'} 
                        label="Enlaces de Interés" 
                        icon={<LinkIcon size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('ventas');
                          handleTabClick('ventas');
                          setVentasSubTab('links');
                        }} 
                      />
                      <SubNavButton 
                        active={ventasSubTab === 'notes'} 
                        label="Notas" 
                        icon={<FileText size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('ventas');
                          handleTabClick('ventas');
                          setVentasSubTab('notes');
                        }} 
                      />
                      <SubNavButton 
                        active={ventasSubTab === 'crm'} 
                        label="Clientes" 
                        icon={<Users size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('ventas');
                          handleTabClick('ventas');
                          setVentasSubTab('crm');
                        }} 
                      />
                      <SubNavButton 
                        active={ventasSubTab === 'pipeline'} 
                        label="B2C (Personas)" 
                        icon={<Target size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('ventas');
                          handleTabClick('ventas');
                          setVentasSubTab('pipeline');
                        }} 
                      />
                      <SubNavButton 
                        active={ventasSubTab === 'quotes'} 
                        label="B2B (Empresas)" 
                        icon={<FileText size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('ventas');
                          handleTabClick('ventas');
                          setVentasSubTab('quotes');
                        }} 
                      />
                      <SubNavButton 
                        active={ventasSubTab === 'goals'} 
                        label="Metas & KPIs" 
                        icon={<BarChart2 size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('ventas');
                          handleTabClick('ventas');
                          setVentasSubTab('goals');
                        }} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* 10. Productos */}
            {getModuleAccess(currentMember, roles, 'productos') !== 'ninguno' && (
              <>
                <NavButton 
                  active={activeTab === 'productos'} 
                  icon={<Boxes size={20} />} 
                  label="Productos" 
                  onClick={() => toggleNavModule('productos', () => handleTabClick('productos'))} 
                />
                <AnimatePresence>
                  {expandedNavModule === 'productos' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-1 space-y-1 overflow-hidden"
                    >
                      <SubNavButton 
                        active={productosSubTab === 'todos'} 
                        label="Todos los Productos" 
                        icon={<Boxes size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('productos');
                          handleTabClick('productos');
                          setProductosSubTab('todos');
                        }} 
                      />
                      <SubNavButton 
                        active={productosSubTab === 'certificacion'} 
                        label="Certificación" 
                        icon={<Award size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('productos');
                          handleTabClick('productos');
                          setProductosSubTab('certificacion');
                        }} 
                      />
                      <SubNavButton 
                        active={productosSubTab === 'capacitacion'} 
                        label="Capacitación" 
                        icon={<GraduationCap size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('productos');
                          handleTabClick('productos');
                          setProductosSubTab('capacitacion');
                        }} 
                      />
                      <SubNavButton 
                        active={productosSubTab === 'qhse'} 
                        label="QHSE" 
                        icon={<ShieldAlert size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('productos');
                          handleTabClick('productos');
                          setProductosSubTab('qhse');
                        }} 
                      />
                      <SubNavButton 
                        active={productosSubTab === 'epp'} 
                        label="EPP" 
                        icon={<HardHat size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('productos');
                          handleTabClick('productos');
                          setProductosSubTab('epp');
                        }} 
                      />
                      <SubNavButton 
                        active={productosSubTab === 'equipos'} 
                        label="Equipos" 
                        icon={<Wrench size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('productos');
                          handleTabClick('productos');
                          setProductosSubTab('equipos');
                        }} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* 11. Directorio */}
            {getModuleAccess(currentMember, roles, 'directory') !== 'ninguno' && (
              <>
                <NavButton 
                  active={activeTab === 'directory'} 
                  icon={<Contact size={20} />} 
                  label="Directorio" 
                  onClick={() => toggleNavModule('directory', () => handleTabClick('directory', 'people'))} 
                />
                <AnimatePresence>
                  {expandedNavModule === 'directory' && (
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
                        onClick={() => {
                          setExpandedNavModule('directory');
                          setDirectorySubTab('people');
                        }} 
                      />
                      <SubNavButton 
                        active={directorySubTab === 'companies'} 
                        label="Compañías" 
                        icon={<Building2 size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('directory');
                          setDirectorySubTab('companies');
                        }} 
                      />
                      <SubNavButton 
                        active={directorySubTab === 'industries'} 
                        label="Industrias" 
                        icon={<Layers size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('directory');
                          setDirectorySubTab('industries');
                        }} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* 12. Importaciones */}
            {getModuleAccess(currentMember, roles, 'importaciones') !== 'ninguno' && (
              <>
                <NavButton 
                  active={activeTab === 'importaciones'} 
                  icon={<Package size={20} />} 
                  label="Importaciones" 
                  onClick={() => toggleNavModule('importaciones', () => handleTabClick('importaciones'))} 
                />
                <AnimatePresence>
                  {expandedNavModule === 'importaciones' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-1 space-y-1 overflow-hidden"
                    >
                      <SubNavButton 
                        active={importacionesSubTab === 'products'} 
                        label="Base de Productos" 
                        icon={<Package size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('importaciones');
                          handleTabClick('importaciones');
                          setImportacionesSubTab('products');
                        }} 
                      />
                      <SubNavButton 
                        active={importacionesSubTab === 'suppliers'} 
                        label="Proveedores Internacionales" 
                        icon={<Globe size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('importaciones');
                          handleTabClick('importaciones');
                          setImportacionesSubTab('suppliers');
                        }} 
                      />
                      <SubNavButton 
                        active={importacionesSubTab === 'proformas'} 
                        label="Proformas / Órdenes" 
                        icon={<FileText size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('importaciones');
                          handleTabClick('importaciones');
                          setImportacionesSubTab('proformas');
                        }} 
                      />
                      <SubNavButton 
                        active={importacionesSubTab === 'upload_proforma'} 
                        label="Cargar y Validar" 
                        icon={<UploadCloud size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('importaciones');
                          handleTabClick('importaciones');
                          setImportacionesSubTab('upload_proforma');
                        }} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* 13. Analizar Reunión */}
            {getModuleAccess(currentMember, roles, 'transcript') !== 'ninguno' && (
              <NavButton 
                active={activeTab === 'transcript'} 
                icon={<Sparkles size={20} />} 
                label="Analizar Reunión" 
                onClick={() => {
                  setExpandedNavModule(null);
                  handleTabClick('transcript');
                }} 
              />
            )}

            {/* 14. Configuración */}
            {getModuleAccess(currentMember, roles, 'settings') !== 'ninguno' && (
              <>
                <NavButton 
                  active={activeTab === 'settings'} 
                  icon={<Settings size={20} />} 
                  label="Configuración" 
                  onClick={() => toggleNavModule('settings', () => handleTabClick('settings'))} 
                />
                <AnimatePresence>
                  {expandedNavModule === 'settings' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-1 space-y-1 overflow-hidden"
                    >
                      <SubNavButton 
                        active={settingsSubTab === 'roles'} 
                        label="Permisos" 
                        icon={<Shield size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('settings');
                          handleSettingsSubTabClick('roles');
                        }} 
                      />
                      <SubNavButton 
                        active={settingsSubTab === 'processes'} 
                        label="Procesos" 
                        icon={<Building2 size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('settings');
                          handleSettingsSubTabClick('processes');
                        }} 
                      />
                      <SubNavButton 
                        active={settingsSubTab === 'members'} 
                        label="Equipo" 
                        icon={<Users size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('settings');
                          handleSettingsSubTabClick('members');
                        }} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </nav>
        </div>

        <div className="mt-auto p-3 border-t border-ng-gray/10 shrink-0">
          <div className="bg-ng-gray/5 p-2.5 rounded-xl border border-ng-gray/10 flex items-center justify-between gap-2.5">
            {/* Avatar with Status Indicator */}
            <div className="relative shrink-0" title="Agente Conectado y Escuchando">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                className="w-8 h-8 rounded-lg border border-ng-gray/20 object-cover" 
                alt={user.displayName || 'User'} 
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-ng-lime border-2 border-ng-black animate-pulse" />
            </div>

            {/* Compact User Info */}
            <div className="overflow-hidden flex-1 text-left min-w-0" title={`${user.displayName || ''} (${user.email || ''})${currentMember ? ` - Mapeado: ${currentMember.name}` : ''}`}>
              <p className="text-xs font-black text-white truncate leading-tight">
                {user.displayName || 'Usuario'}
              </p>
              <p className="text-[10px] font-bold text-ng-lime/80 truncate leading-tight">
                {currentMember ? currentMember.name : user.email}
              </p>
            </div>

            {/* Compact LogOut Button */}
            <button 
              onClick={() => logout()}
              className="p-1.5 text-ng-gray hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
            </button>
          </div>

          {members.length === 0 && (
            <div className="flex flex-col gap-1 mt-1.5 px-1">
              <button 
                onClick={() => bootstrapData()}
                disabled={isInitializingData}
                className="text-[8px] font-bold text-ng-gray/50 hover:text-ng-lime transition-all uppercase tracking-tighter text-left"
              >
                {isInitializingData ? 'Inicializando...' : '¿Sin datos? Cargar iniciales'}
              </button>
              {localDataFound && (
                <button 
                  onClick={() => migrateFromLocalStorage()}
                  disabled={isMigrating}
                  className="text-[8px] font-bold text-ng-lime/60 hover:text-ng-lime transition-all uppercase tracking-tighter text-left flex items-center gap-1"
                >
                  <Zap size={8} />
                  {isMigrating ? 'Migrando...' : 'Recuperar datos locales'}
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 h-screen flex flex-col overflow-hidden">
        <header className={`flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white text-ng-black border-b border-gray-100 shadow-2xs relative z-30 transition-all ${
          ['tasks', 'gerencia', 'marketing', 'ventas', 'capacitacion', 'acreditacion', 'qhse', 'importaciones', 'process_dashboard', 'productos'].includes(activeTab) ? 'px-6 py-2.5' : 'p-6'
        }`}>
          <div>
            <h1 className={`font-black tracking-tight ${['tasks', 'gerencia', 'marketing', 'ventas', 'capacitacion', 'acreditacion', 'qhse', 'importaciones', 'process_dashboard', 'productos'].includes(activeTab) ? 'text-lg md:text-xl' : 'text-2xl'}`}>
              {activeTab === 'dashboard' && 'Panel de Control'}
              {activeTab === 'gerencia' && 'Módulo de Gerencia & Dirección'}
              {activeTab === 'process_dashboard' && 'Gestión de Procesos'}
              {activeTab === 'importaciones' && 'Módulo de Importaciones'}
              {activeTab === 'marketing' && 'Módulo de Marketing'}
              {activeTab === 'ventas' && 'Módulo de Ventas'}
              {activeTab === 'capacitacion' && 'Módulo de Capacitación'}
              {activeTab === 'acreditacion' && 'Módulo de Acreditación'}
              {activeTab === 'productos' && 'Módulo de Productos'}
              {activeTab === 'qhse' && 'Módulo de QHSE'}
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
                settingsSubTab === 'roles' ? 'Permisos por Integrante' :
                settingsSubTab === 'processes' ? 'Gestión de Procesos' :
                settingsSubTab === 'members' ? 'Gestión de Equipo' :
                'Configuración del Sistema'
              )}
            </h1>
            {activeTab !== 'tasks' && (
              <p className="text-ng-black/40 text-[10px] font-bold uppercase tracking-widest mt-1">
                Inteligencia colectiva para un futuro sostenible
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {activeTab === 'process_dashboard' && (
              <div className="flex items-center gap-2 bg-slate-50/50 p-1 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-2 whitespace-nowrap">Proceso:</span>
                <div className="relative">
                  <select
                    id="header-process-selector"
                    value={selectedProcessId}
                    onChange={(e) => {
                      setSelectedProcessId(e.target.value);
                    }}
                    className="appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-black py-2 px-3.5 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-ng-lime/30 transition-all cursor-pointer min-w-[140px]"
                  >
                    {accessibleProcesses.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                    <ChevronRight size={14} className="rotate-90" />
                  </div>
                </div>

                <button
                  onClick={() => setShowFicha(!showFicha)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shrink-0 ${
                    showFicha
                      ? 'bg-slate-950 text-white border-slate-950 shadow-md shadow-slate-950/10'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Info size={14} />
                  <span>{showFicha ? 'Ocultar Ficha' : 'Ver Ficha'}</span>
                </button>
              </div>
            )}
            {activeTab === 'tasks' ? (
              <div className="relative z-50 min-w-[320px] max-w-[480px] md:min-w-[400px]">
                {/* Backdrop handle */}
                {showSmartDropdown && (
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => {
                      setShowSmartDropdown(false);
                      setActiveSuggestionCategory('all');
                    }} 
                  />
                )}

                {/* Smart Search Bar (Omnibox - Option 3) */}
                <div className="relative z-50 bg-white rounded-xl border border-gray-100 shadow-2xs p-1 px-2.5 flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-ng-lime/30 focus-within:border-ng-lime transition-all">
                  <div className="flex items-center gap-1 text-gray-400 pl-0.5">
                    <Filter size={12} className="text-gray-400" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 hidden sm:inline mr-0.5">Filtros:</span>
                  </div>

                  {/* Active smart filter pills */}
                  <div className="flex flex-wrap gap-1 items-center">
                    {smartFilters.projectId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-100/60 shadow-xs">
                        <FolderKanban size={10} />
                        <span>Prog: {projects.find(p => p.id === smartFilters.projectId)?.name || 'Desconocido'}</span>
                        <button 
                          onClick={() => setSmartFilters(prev => ({ ...prev, projectId: null }))}
                          className="hover:bg-blue-200 p-0.5 rounded-full text-blue-500 hover:text-blue-800 transition-colors cursor-pointer"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    )}
                    {smartFilters.memberId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-lg text-[11px] font-bold border border-purple-100/60 shadow-xs">
                        <User size={10} />
                        <span>Resp: {members.find(m => m.id === smartFilters.memberId)?.name || 'Desconocido'}</span>
                        <button 
                          onClick={() => setSmartFilters(prev => ({ ...prev, memberId: null }))}
                          className="hover:bg-purple-200 p-0.5 rounded-full text-purple-500 hover:text-purple-800 transition-colors cursor-pointer"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    )}
                    {smartFilters.processId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-[11px] font-bold border border-amber-100/60 shadow-xs">
                        <Building2 size={10} />
                        <span>Proc: {processes.find(p => p.id === smartFilters.processId)?.name || 'Desconocido'}</span>
                        <button 
                          onClick={() => setSmartFilters(prev => ({ ...prev, processId: null }))}
                          className="hover:bg-amber-200 p-0.5 rounded-full text-amber-500 hover:text-amber-800 transition-colors cursor-pointer"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    )}
                    {smartFilters.auxiliaryId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[11px] font-bold border border-indigo-100/60 shadow-xs">
                        <Users size={10} />
                        <span>Aux: {members.find(m => m.id === smartFilters.auxiliaryId)?.name || 'Desconocido'}</span>
                        <button 
                          onClick={() => setSmartFilters(prev => ({ ...prev, auxiliaryId: null }))}
                          className="hover:bg-indigo-200 p-0.5 rounded-full text-indigo-500 hover:text-indigo-800 transition-colors cursor-pointer"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    )}
                    {smartFilters.status && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded-lg text-[11px] font-bold border border-teal-100/60 shadow-xs">
                        <CheckCircle2 size={10} />
                        <span className="capitalize text-[11px]">
                          Est: {
                            smartFilters.status === 'backlog' ? 'Product Backlog' :
                            smartFilters.status === 'todo' ? 'Por Hacer' :
                            smartFilters.status === 'in_progress' ? 'En Progreso' :
                            smartFilters.status === 'blocked' ? 'Bloqueada' :
                            smartFilters.status === 'review' ? 'En Revisión' :
                            smartFilters.status === 'done' ? 'Completada' : 'Rechazada'
                          }
                        </span>
                        <button 
                          onClick={() => setSmartFilters(prev => ({ ...prev, status: null }))}
                          className="hover:bg-teal-200 p-0.5 rounded-full text-teal-500 hover:text-teal-800 transition-colors cursor-pointer"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    )}
                  </div>

                  {/* Flex input wrapper */}
                  <div className="flex-1 min-w-[120px] relative font-sans">
                    <input 
                      type="text"
                      onFocus={() => {
                        setShowSmartDropdown(true);
                        setActiveSuggestionCategory('all');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setShowSmartDropdown(false);
                        }
                      }}
                      className="w-full bg-transparent focus:outline-none text-xs text-gray-800 placeholder:text-gray-400 font-medium py-1"
                      placeholder={
                        Object.values(smartFilters).some(v => v !== null)
                          ? "Filtros activos. Buscar más o filtrar..."
                          : "Buscar o hacer clic para filtrar por Proyecto, Responsable..."
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Reset controls */}
                  {(searchQuery || Object.values(smartFilters).some(v => v !== null)) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSmartFilters({
                          projectId: null,
                          memberId: null,
                          processId: null,
                          auxiliaryId: null,
                          status: null,
                        });
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100/80 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-xs border border-red-100/30"
                    >
                      <X size={10} />
                      Limpiar
                    </button>
                  )}
                </div>

                {/* SMART DROPDOWN POPOVER */}
                {showSmartDropdown && (
                  <div className="absolute top-full right-0 mt-1.5 w-full bg-white rounded-2xl border border-gray-100 shadow-2xl z-50 overflow-hidden animate-fade-in text-left">
                    {activeSuggestionCategory === 'all' && (
                      <div className="p-2.5">
                        <div className="px-3 py-1.5 border-b border-gray-50 flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Buscar o filtrar por categoría</span>
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Omnibox</span>
                        </div>

                        {/* Search keyword action */}
                        {searchQuery && (
                          <div className="mb-2 bg-blue-50/40 p-1.5 rounded-xl border border-blue-100/30">
                            <button
                              onClick={() => {
                                setShowSmartDropdown(false);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-lg text-left hover:bg-gray-50 text-xs text-slate-800 font-bold border border-blue-100 shadow-xs transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <Search size={13} className="text-blue-600 animate-pulse" />
                                <span>Buscar por texto: <span className="text-blue-700 font-black">"{searchQuery}"</span></span>
                              </span>
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md uppercase tracking-wider">Buscar (Enter)</span>
                            </button>
                          </div>
                        )}

                        {/* Search matches suggestion category lists */}
                        {searchQuery && (
                          <div className="mb-2 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100/50">
                            <span className="block px-2.5 py-1 text-[9px] font-black text-blue-600 tracking-wider uppercase">Filtros encontrados: "{searchQuery}"</span>
                            <div className="space-y-0.5 mt-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                              {projects.filter(p => normalizeText(p.name).includes(normalizeText(searchQuery))).map(p => (
                                <button 
                                  key={p.id}
                                  onClick={() => {
                                    setSmartFilters(prev => ({ ...prev, projectId: p.id }));
                                    setSearchQuery('');
                                    setShowSmartDropdown(false);
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-blue-50/50 text-xs text-gray-700 font-semibold transition-colors cursor-pointer"
                                >
                                  <span className="flex items-center gap-2"><FolderKanban size={13} className="text-blue-500" /> Proyecto: <span className="text-slate-900 font-black">{p.name}</span></span>
                                  <Plus size={12} className="text-gray-400" />
                                </button>
                              ))}
                              {sortedMembers.filter(m => normalizeText(m.name).includes(normalizeText(searchQuery))).map(m => (
                                <React.Fragment key={m.id}>
                                  <button 
                                    onClick={() => {
                                      setSmartFilters(prev => ({ ...prev, memberId: m.id }));
                                      setSearchQuery('');
                                      setShowSmartDropdown(false);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-purple-50/50 text-xs text-gray-700 font-semibold transition-colors cursor-pointer"
                                  >
                                    <span className="flex items-center gap-2"><User size={13} className="text-purple-500" /> Responsable: <span className="text-slate-900 font-black">{m.name}</span></span>
                                    <Plus size={12} className="text-gray-400" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setSmartFilters(prev => ({ ...prev, auxiliaryId: m.id }));
                                      setSearchQuery('');
                                      setShowSmartDropdown(false);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-indigo-50/50 text-xs text-gray-700 font-semibold transition-colors cursor-pointer"
                                  >
                                    <span className="flex items-center gap-2"><Users size={13} className="text-indigo-500" /> Auxiliar: <span className="text-slate-900 font-black">{m.name}</span></span>
                                    <Plus size={12} className="text-gray-400" />
                                  </button>
                                </React.Fragment>
                              ))}
                              {processes.filter(p => normalizeText(p.name).includes(normalizeText(searchQuery))).map(p => (
                                <button 
                                  key={p.id}
                                  onClick={() => {
                                    setSmartFilters(prev => ({ ...prev, processId: p.id }));
                                    setSearchQuery('');
                                    setShowSmartDropdown(false);
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-amber-50/50 text-xs text-gray-700 font-semibold transition-colors cursor-pointer"
                                >
                                  <span className="flex items-center gap-2"><Building2 size={13} className="text-amber-500" /> Proceso: <span className="text-slate-900 font-black">{p.name}</span></span>
                                  <Plus size={12} className="text-gray-400" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Main Suggestion Categories */}
                        <div className="space-y-0.5">
                          <button
                            onClick={() => setActiveSuggestionCategory('project')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-gray-50 text-xs text-gray-700 font-semibold transition-all group cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors"><FolderKanban size={13} /></span>
                              <span>Filtrar por Proyecto...</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {smartFilters.projectId && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                              <ChevronRight size={13} className="text-gray-400" />
                            </div>
                          </button>

                          <button
                            onClick={() => setActiveSuggestionCategory('member')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-gray-50 text-xs text-gray-700 font-semibold transition-all group cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors"><User size={13} /></span>
                              <span>Filtrar por Responsable...</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {smartFilters.memberId && <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />}
                              <ChevronRight size={13} className="text-gray-400" />
                            </div>
                          </button>

                          <button
                            onClick={() => setActiveSuggestionCategory('process')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-gray-50 text-xs text-gray-700 font-semibold transition-all group cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition-colors"><Building2 size={13} /></span>
                              <span>Filtrar por Proceso...</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {smartFilters.processId && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />}
                              <ChevronRight size={13} className="text-gray-400" />
                            </div>
                          </button>

                          <button
                            onClick={() => setActiveSuggestionCategory('auxiliary')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-gray-50 text-xs text-gray-700 font-semibold transition-all group cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors"><Users size={13} /></span>
                              <span>Filtrar por Auxiliar...</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {smartFilters.auxiliaryId && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                              <ChevronRight size={13} className="text-gray-400" />
                            </div>
                          </button>

                          <button
                            onClick={() => setActiveSuggestionCategory('status')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-gray-50 text-xs text-gray-700 font-semibold transition-all group cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="p-1.5 bg-teal-50 text-teal-600 rounded-lg group-hover:bg-teal-100 transition-colors"><CheckCircle2 size={13} /></span>
                              <span>Filtrar por Estado de Tarea...</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {smartFilters.status && <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />}
                              <ChevronRight size={13} className="text-gray-400" />
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {activeSuggestionCategory === 'project' && (
                      <div className="p-2.5 max-h-[300px] overflow-y-auto custom-scrollbar font-sans">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-50 mb-1.5 px-1 font-sans">
                          <button 
                            onClick={() => setActiveSuggestionCategory('all')}
                            className="text-[9px] font-black uppercase text-gray-500 hover:text-black py-1 px-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                          >
                            ← Volver
                          </button>
                          <span className="text-[9px] font-black uppercase tracking-wider text-blue-500">Filtrar por proyecto</span>
                        </div>
                        <div className="space-y-0.5 font-sans">
                          {projects.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSmartFilters(prev => ({ ...prev, projectId: p.id }));
                                setShowSmartDropdown(false);
                                setActiveSuggestionCategory('all');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                smartFilters.projectId === p.id 
                                  ? 'bg-blue-50 text-blue-700 font-bold' 
                                  : 'text-gray-700 hover:bg-gray-50 font-semibold'
                              }`}
                            >
                              <span className="flex items-center gap-2"><FolderKanban size={13} className="opacity-70" /> {p.name}</span>
                              {smartFilters.projectId === p.id && <Check size={12} className="text-blue-600" />}
                            </button>
                          ))}
                          {projects.length === 0 && (
                            <p className="p-4 text-center text-xs text-gray-400 font-semibold">No hay proyectos para filtrar</p>
                          )}
                        </div>
                      </div>
                    )}

                    {activeSuggestionCategory === 'member' && (
                      <div className="p-2.5 max-h-[300px] overflow-y-auto custom-scrollbar font-sans">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-50 mb-1.5 px-1 font-sans">
                          <button 
                            onClick={() => setActiveSuggestionCategory('all')}
                            className="text-[9px] font-black uppercase text-gray-500 hover:text-black py-1 px-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                          >
                            ← Volver
                          </button>
                          <span className="text-[9px] font-black uppercase tracking-wider text-purple-500">Filtrar por responsable</span>
                        </div>
                        <div className="space-y-0.5 font-sans">
                          {sortedMembers.map(m => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setSmartFilters(prev => ({ ...prev, memberId: m.id }));
                                setShowSmartDropdown(false);
                                setActiveSuggestionCategory('all');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                smartFilters.memberId === m.id 
                                  ? 'bg-purple-50 text-purple-700 font-bold' 
                                  : 'text-gray-700 hover:bg-gray-50 font-semibold'
                              }`}
                            >
                              <span className="flex items-center gap-2"><User size={13} className="opacity-70" /> {m.name}</span>
                              {smartFilters.memberId === m.id && <Check size={12} className="text-purple-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeSuggestionCategory === 'process' && (
                      <div className="p-2.5 max-h-[300px] overflow-y-auto custom-scrollbar font-sans font-sans">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-50 mb-1.5 px-1 font-sans">
                          <button 
                            onClick={() => setActiveSuggestionCategory('all')}
                            className="text-[9px] font-black uppercase text-gray-500 hover:text-black py-1 px-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                          >
                            ← Volver
                          </button>
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">Filtrar por proceso</span>
                        </div>
                        <div className="space-y-0.5 font-sans">
                          {processes.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSmartFilters(prev => ({ ...prev, processId: p.id }));
                                setShowSmartDropdown(false);
                                setActiveSuggestionCategory('all');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                smartFilters.processId === p.id 
                                  ? 'bg-amber-50 text-amber-700 font-bold' 
                                  : 'text-gray-700 hover:bg-gray-50 font-semibold'
                              }`}
                            >
                              <span className="flex items-center gap-2"><Building2 size={13} className="opacity-70" /> {p.name}</span>
                              {smartFilters.processId === p.id && <Check size={12} className="text-amber-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeSuggestionCategory === 'auxiliary' && (
                      <div className="p-2.5 max-h-[300px] overflow-y-auto custom-scrollbar font-sans">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-50 mb-1.5 px-1 font-sans">
                          <button 
                            onClick={() => setActiveSuggestionCategory('all')}
                            className="text-[9px] font-black uppercase text-gray-500 hover:text-black py-1 px-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                          >
                            ← Volver
                          </button>
                          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500">Filtrar por auxiliar</span>
                        </div>
                        <div className="space-y-0.5 font-sans">
                          {sortedMembers.map(m => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setSmartFilters(prev => ({ ...prev, auxiliaryId: m.id }));
                                setShowSmartDropdown(false);
                                setActiveSuggestionCategory('all');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                smartFilters.auxiliaryId === m.id 
                                  ? 'bg-indigo-50 text-indigo-700 font-bold' 
                                  : 'text-gray-700 hover:bg-gray-50 font-semibold'
                              }`}
                            >
                              <span className="flex items-center gap-2"><Users size={13} className="opacity-70" /> {m.name}</span>
                              {smartFilters.auxiliaryId === m.id && <Check size={12} className="text-indigo-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeSuggestionCategory === 'status' && (
                      <div className="p-2.5 max-h-[300px] overflow-y-auto custom-scrollbar font-sans">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-50 mb-1.5 px-1 font-sans">
                          <button 
                            onClick={() => setActiveSuggestionCategory('all')}
                            className="text-[9px] font-black uppercase text-gray-500 hover:text-black py-1 px-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                          >
                            ← Volver
                          </button>
                          <span className="text-[9px] font-black uppercase tracking-wider text-teal-500">Filtrar por estado</span>
                        </div>
                        <div className="space-y-0.5 font-sans">
                          {[
                            { id: 'backlog', label: 'Product Backlog' },
                            { id: 'todo', label: 'Por Hacer' },
                            { id: 'in_progress', label: 'En Progreso' },
                            { id: 'review', label: 'En Revisión' },
                            { id: 'correction', label: 'Para Corrección' },
                            { id: 'done', label: 'Completada' },
                            { id: 'blocked', label: 'Bloqueada' },
                          ].map(st => (
                            <button
                              key={st.id}
                              onClick={() => {
                                setSmartFilters(prev => ({ ...prev, status: st.id }));
                                setShowSmartDropdown(false);
                                setActiveSuggestionCategory('all');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                smartFilters.status === st.id 
                                  ? 'bg-teal-50 text-teal-700 font-bold' 
                                  : 'text-gray-700 hover:bg-gray-50 font-semibold'
                              }`}
                            >
                              <span className="flex items-center gap-2"><CheckCircle2 size={13} className="opacity-70" /> {st.label}</span>
                              {smartFilters.status === st.id && <Check size={12} className="text-teal-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar..."
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-ng-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ng-lime focus:border-transparent transition-all w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
            {activeTab === 'settings' && settingsSubTab === 'members' && !isAddingMember && !editingMember && (
              <>
                <button 
                  onClick={() => setIsMemberAssistantOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-ng-black text-ng-lime text-sm font-bold rounded-lg hover:bg-ng-black/90 transition-all shadow-xl group"
                >
                  <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                  Asistente Maestro
                </button>
                <button 
                  onClick={() => {
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
                    setIsAddingMember(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-ng-lime text-ng-black text-sm font-bold rounded-lg hover:opacity-90 transition-all shadow-xl"
                >
                  <UserPlus size={18} />
                  Nuevo Miembro
                </button>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {activeTab === 'settings' && settingsSubTab === 'processes' && !isReadOnly && (
              <button 
                onClick={() => {
                  setEditingProcess(null);
                  setNewProcessData({ name: '', description: '', goals: '' });
                  setIsAddingProcess(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-ng-lime text-ng-black text-sm font-bold rounded-lg hover:opacity-90 transition-all shadow-sm"
              >
                <Building2 size={18} />
                Nuevo Proceso
              </button>
            )}
            {activeTab === 'projects' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCompletedProjects(!showCompletedProjects)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border ${
                    showCompletedProjects 
                      ? 'bg-purple-50 text-purple-600 border-purple-200 shadow-sm' 
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {showCompletedProjects ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showCompletedProjects ? 'Ocultar Completados' : 'Mostrar Completados'}
                </button>
                {canCreateProjects && (
                  <button 
                    onClick={() => {
                      setEditingProject(null);
                      const allowedProcs = processes.filter(p => {
                        const access = getModuleAccess(currentMember, roles, `projects_${p.id}`);
                        return access === 'lider' || access === 'administrador';
                      });
                      const defaultProcessId = allowedProcs.length === 1 ? allowedProcs[0].id : '';
                      setNewProjectData({ name: '', description: '', processId: defaultProcessId, status: 'activo', city: '' });
                      setIsAddingProject(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-ng-lime text-ng-black text-sm font-bold rounded-lg hover:opacity-90 transition-all shadow-sm"
                  >
                    <FolderKanban size={18} />
                    Nuevo Proyecto
                  </button>
                )}
              </div>
            )}
            {activeTab === 'tasks' && (
              <div className="flex items-center gap-2">
                {!isAddingTask && !editingTask && (
                  <>
                    <div className="flex bg-gray-100 border border-gray-200/50 rounded-xl p-0.5 gap-0.5 shadow-2xs">
                      <button
                        onClick={() => setTaskViewMode('board')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                          taskViewMode === 'board'
                            ? 'bg-ng-lime text-ng-black shadow-2xs font-black'
                            : 'text-gray-500 hover:text-gray-950 hover:bg-white/60 font-bold'
                        }`}
                        title="Ver como Tablero Kanban"
                      >
                        <Trello size={13} />
                        Tablero
                      </button>
                      <button
                        onClick={() => setTaskViewMode('list')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                          taskViewMode === 'list'
                            ? 'bg-ng-lime text-ng-black shadow-2xs font-black'
                            : 'text-gray-500 hover:text-gray-950 hover:bg-white/60 font-bold'
                        }`}
                        title="Ver como Lista"
                      >
                        <Table size={13} />
                        Lista
                      </button>
                      <button
                        onClick={() => setTaskViewMode('calendar')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                          taskViewMode === 'calendar'
                            ? 'bg-ng-lime text-ng-black shadow-2xs font-black'
                            : 'text-gray-500 hover:text-gray-950 hover:bg-white/60 font-bold'
                        }`}
                        title="Ver como Calendario"
                      >
                        <Calendar size={13} />
                        Calendario
                      </button>
                    </div>
                    
                    <input type="file" accept=".json,.csv" className="hidden" ref={fileInputRef} onChange={handleImportTasks} />
                    <button
                      type="button"
                      onClick={() => exportTasksBackup(tasks)}
                      title="Descargar respaldo de seguridad JSON de todas las tareas"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 text-[11px] font-bold rounded-xl transition-all border border-gray-200/60"
                    >
                      <Save size={14} className="text-gray-500" />
                      <span className="hidden sm:inline">Respaldo JSON</span>
                    </button>
                    
                    {!isReadOnly && (
                      <button 
                        onClick={() => openAddTaskModal()}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-ng-lime text-ng-black text-[11px] font-black rounded-xl hover:opacity-90 transition-all shadow-md shadow-ng-lime/10 uppercase tracking-wider whitespace-nowrap"
                      >
                        <Plus size={16} />
                        Nueva Tarea
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'directory' && !isReadOnly && (
              <div className="flex items-center gap-4">
                {directorySubTab !== 'industries' && (
                  <button 
                    onClick={() => {
                      if (directorySubTab === 'people') {
                        setEditingMember(null);
                        setNewMemberData({
                          name: '',
                          role: '',
                          systemRoleId: '',
                          isSystemAdmin: false,
                          moduleAccess: undefined,
                          categories: ['contacto'],
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
                        setIsAddingMember(true);
                      } else {
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
                        setIsAddingCompany(true);
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-ng-lime text-ng-black text-xs font-black rounded-xl hover:opacity-90 transition-all shadow-lg shadow-ng-lime/10 uppercase tracking-widest"
                  >
                    <Plus size={18} />
                    {directorySubTab === 'people' ? 'Nueva Persona' : 'Nueva Compañía'}
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        <div className={`flex-1 ${activeTab === 'gerencia' && managementSubTab === 'consultant' ? 'overflow-hidden flex flex-col p-4 md:p-6' : 'overflow-y-auto custom-scrollbar ' + (activeTab === 'tasks' || (activeTab === 'gerencia' && (managementSubTab === 'notes' || managementSubTab === 'links')) || (activeTab === 'marketing' && (marketingSubTab === 'notes' || marketingSubTab === 'links')) || (activeTab === 'ventas' && (ventasSubTab === 'notes' || ventasSubTab === 'links')) || (activeTab === 'capacitacion' && (capacitacionSubTab === 'notes' || capacitacionSubTab === 'links')) || (activeTab === 'acreditacion' && (acreditacionSubTab === 'notes' || acreditacionSubTab === 'links')) || (activeTab === 'qhse' && (qhseSubTab === 'notes' || qhseSubTab === 'links')) || (activeTab === 'importaciones' && ((importacionesSubTab as any) === 'notes' || (importacionesSubTab as any) === 'links')) || (activeTab === 'productos' && ((productosSubTab as any) === 'notes' || (productosSubTab as any) === 'links')) ? 'pt-2.5 px-6 pb-6' : 'p-6')}`}>
          <AnimatePresence mode="wait">
            {activeTabAccess === 'ninguno' ? (
              <motion.div
                key="restricted-access"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-center min-h-[60vh] p-4"
              >
                <div id="restricted-card" className="max-w-md w-full bg-white p-8 rounded-[2rem] border border-gray-100 shadow-2xl shadow-gray-100 text-center space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-amber-500" />
                  
                  <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 shadow-inner">
                    <ShieldAlert size={32} />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Acceso Restringido</h2>
                    <p className="text-sm font-medium text-slate-400">
                      No tienes los permisos requeridos para ingresar a este módulo.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left space-y-3">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
                      <Lock size={12} className="text-red-400" /> Información de Tu Acceso
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-slate-400">Rol Actual:</div>
                      <div className="font-extrabold text-slate-700 capitalize text-left">
                        {currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin' ? 'Administrador del Sistema' : 'Acceso Personalizado'}
                      </div>
                      <div className="text-slate-400 text-left">Módulo:</div>
                      <div className="font-extrabold text-slate-700 capitalize text-left">
                        {activeTab === 'dashboard' ? 'Resumen' :
                         activeTab === 'gerencia' ? 'Gerencia' :
                         activeTab === 'tasks' ? 'Tareas' :
                         activeTab === 'planner' ? 'Planificador IA' :
                         activeTab === 'projects' ? 'Proyectos' :
                         activeTab === 'directory' ? 'Directorio' :
                         activeTab === 'transcript' ? 'Analizar Reunión' :
                         'Configuración'}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    Por favor, solicita a un Administrador o Líder de Proceso que te asigne acceso en la <strong className="text-slate-600">Matriz de Permisos</strong> dentro de Configuración.
                  </p>
                </div>
              </motion.div>
            ) : (
              <>
                {activeTab === 'gerencia' && (
                  <motion.div
                    key="gerencia"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`max-w-7xl mx-auto w-full ${managementSubTab === 'consultant' ? 'h-full flex flex-col' : ''}`}
                  >
                    <ManagementModule
                      currentMember={currentMember}
                      members={members}
                      processes={processes}
                      notes={managementNotes}
                      strategy={managementStrategy}
                      governance={managementGovernance}
                      onUpdateNotes={handleUpdateManagementNotes}
                      onUpdateStrategy={handleUpdateManagementStrategy}
                      onUpdateGovernance={handleUpdateManagementGovernance}
                      accessLevel={getModuleAccess(currentMember, roles, 'gerencia')}
                      activeSubTab={managementSubTab}
                      setActiveSubTab={setManagementSubTab}
                    />
                  </motion.div>
                )}
                {activeTab === 'process_dashboard' && (
                  <motion.div
                    key="process_dashboard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-7xl mx-auto w-full"
                  >
                    <ProcessDashboard
                      currentMember={currentMember}
                      processes={processes}
                      members={members}
                      tasks={tasks}
                      projects={projects}
                      roles={roles}
                      processLinks={processLinks}
                      processNotes={processNotes}
                      activeSubTab={processSubTab}
                      setActiveSubTab={setProcessSubTab}
                      selectedProcessId={selectedProcessId}
                      setSelectedProcessId={setSelectedProcessId}
                      showFicha={showFicha}
                      setShowFicha={setShowFicha}
                      onOpenTask={openEditTask}
                    />
                  </motion.div>
                )}                {activeTab === 'ventas' && (
                  <motion.div
                    key="ventas"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-7xl mx-auto w-full"
                  >
                    <VentasModule
                      currentMember={currentMember}
                      members={members}
                      companies={companies}
                      processes={processes}
                      activeSubTab={ventasSubTab}
                      onSubTabChange={(tab) => setVentasSubTab(tab)}
                      onCreateCompany={handleCreateCompanyForCRM}
                      onCreateMember={handleCreateMemberForCRM}
                    />
                  </motion.div>
                )}
                {activeTab === 'capacitacion' && (
                  <motion.div
                    key="capacitacion"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-7xl mx-auto w-full"
                  >
                    <CapacitacionModule
                      currentMember={currentMember}
                      activeSubTab={capacitacionSubTab}
                      onSubTabChange={(tab) => setCapacitacionSubTab(tab)}
                      members={members}
                      onCreateMember={handleCreateMemberForCRM}
                    />
                  </motion.div>
                )}
                {activeTab === 'acreditacion' && (
                  <motion.div
                    key="acreditacion"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-7xl mx-auto w-full"
                  >
                    <AcreditacionModule
                      currentMember={currentMember}
                      members={members}
                      companies={companies}
                      industries={industries}
                      activeSubTab={acreditacionSubTab}
                      onSubTabChange={(tab) => setAcreditacionSubTab(tab)}
                    />
                  </motion.div>
                )}
                {activeTab === 'productos' && (
                  <motion.div
                    key="productos"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-7xl mx-auto w-full"
                  >
                    <ProductosModule
                      currentMember={currentMember}
                      products={products}
                      companies={companies}
                      members={members}
                      activeSubTab={productosSubTab}
                      onSubTabChange={(tab) => setProductosSubTab(tab)}
                      accessLevel={getModuleAccess(currentMember, roles, 'productos')}
                    />
                  </motion.div>
                )}
                {activeTab === 'qhse' && (
                  <motion.div
                    key="qhse"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-7xl mx-auto w-full"
                  >
                    <QHSEModule
                      currentMember={currentMember}
                      members={members}
                      companies={companies}
                      activeSubTab={qhseSubTab}
                      onSubTabChange={(tab) => setQhseSubTab(tab)}
                      accessLevel={getModuleAccess(currentMember, roles, 'qhse')}
                    />
                  </motion.div>
                )}
                {activeTab === 'importaciones' && (
                  <motion.div
                    key="importaciones"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-7xl mx-auto w-full"
                  >
                    <ImportacionesModule
                      companies={companies}
                      currentMember={currentMember}
                      accessLevel={getModuleAccess(currentMember, roles, 'importaciones')}
                      activeSubTab={importacionesSubTab}
                      onSubTabChange={(tab) => setImportacionesSubTab(tab)}
                    />
                  </motion.div>
                )}
                {activeTab === 'marketing' && (
                  <motion.div
                    key="marketing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-7xl mx-auto w-full"
                  >
                    <MarketingModule
                      currentMember={currentMember}
                      members={members}
                      processes={processes}
                      tasks={tasks}
                      projects={projects}
                      companies={companies}
                      accessLevel={getModuleAccess(currentMember, roles, 'marketing')}
                      activeSubTab={marketingSubTab}
                      onSubTabChange={(tab) => setMarketingSubTab(tab)}
                      onAddTask={async (taskData) => {
                        const taskId = taskData.id || `task-${Date.now()}`;
                        await setDoc(doc(db, 'tasks', taskId), { ...taskData, id: taskId });
                        return taskId;
                      }}
                      onAddProject={async (projData) => {
                        const pId = projData.id || `proj-${Date.now()}`;
                        await setDoc(doc(db, 'projects', pId), { ...projData, id: pId });
                        return pId;
                      }}
                      onOpenTask={openEditTask}
                      onOpenCreateTaskModal={(initialOverrides) => openAddTaskModal('backlog', initialOverrides)}
                    />
                  </motion.div>
                )}
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
                <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-ng-gray shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-ng-green opacity-0 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-ng-black">
                    <Clock size={20} className="text-ng-green" />
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
                <div className="bg-ng-black text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                  <Sparkles className="absolute right-[-10px] top-[-10px] w-32 h-32 text-ng-lime opacity-5 group-hover:opacity-10 transition-opacity duration-500" />
                  <h3 className="text-lg font-black mb-2 tracking-tight">¿Nueva Reunión?</h3>
                  <p className="text-ng-gray/60 text-sm mb-6 font-medium">Pega la transcripción y deja que la IA actualice los perfiles automáticamente.</p>
                  <button 
                    onClick={() => handleTabClick('transcript')}
                    className="w-full py-3 bg-ng-lime text-ng-black font-black rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest shadow-lg shadow-ng-lime/10"
                  >
                    Empezar Análisis
                    <ArrowRight size={18} />
                  </button>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-ng-gray shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-ng-green opacity-0 group-hover:opacity-100 transition-opacity" />
                  <h3 className="font-black mb-4 text-ng-black uppercase text-xs tracking-widest">Procesos Vigentes</h3>
                  <div className="space-y-3">
                    {processes.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-ng-lime/10 transition-colors cursor-pointer group/item">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-ng-green" />
                          <span className="text-sm font-bold text-ng-black/70 group-hover/item:text-ng-black">{p.name}</span>
                        </div>
                        <ChevronRight size={16} className="text-ng-gray group-hover/item:text-ng-green" />
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
                      name: '',
                      role: '',
                      systemRoleId: '',
                      isSystemAdmin: false,
                      moduleAccess: undefined,
                      categories: ['contacto'],
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
                      name: '', ruc: '', description: '', email: '', phone: '', website: '', mainAddress: '', branchAddresses: [], industries: [], notes: ''
                    });
                  }}
                  onSave={handleAddCompany}
                />
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-8">
                    <button 
                      onClick={() => setDirectorySubTab('people')}
                      className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${directorySubTab === 'people' ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/20' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
                    >
                      Personas
                    </button>
                    <button 
                      onClick={() => setDirectorySubTab('companies')}
                      className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${directorySubTab === 'companies' ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/20' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
                    >
                      Compañías
                    </button>
                    <button 
                      onClick={() => setDirectorySubTab('industries')}
                      className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${directorySubTab === 'industries' ? 'bg-ng-lime text-ng-black shadow-lg shadow-ng-lime/20' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
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
                          {sortedMembers.filter(m => 
                            normalizeText(m.name).includes(normalizeText(searchQuery)) || 
                            normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                            (m.categories || []).some(cat => normalizeText(cat).includes(normalizeText(searchQuery))) ||
                            normalizeText(m.notes || '').includes(normalizeText(searchQuery))
                          ).map(member => {
                            const company = companies.find(c => member.companyAssociations && member.companyAssociations.some(ca => ca.companyId === c.id));
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
                                      onClick={() => handleDeleteMember(member)}
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
                        <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
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
                                    {u.newSkills.map((s, idx) => <span key={`${s}-${idx}`} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">{s}</span>)}
                                  </div>
                                </div>
                              )}
                              {u.achievements && u.achievements.length > 0 && (
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-green-500 block mb-1">Logros</span>
                                  <ul className="text-xs text-gray-600 space-y-1">
                                    {u.achievements.map((a, idx) => <li key={`${a}-${idx}`} className="flex gap-2"><span>•</span> {a}</li>)}
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
                        <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
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
                                  <p className="text-xs text-gray-600">"{u.descriptionUpdate}"</p>
                                </div>
                              )}
                              {u.newGoals && u.newGoals.length > 0 && (
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-orange-500 block mb-1">Nuevos Objetivos</span>
                                  <ul className="text-xs text-gray-600 space-y-1">
                                    {u.newGoals.map((g, idx) => <li key={`${g}-${idx}`} className="flex gap-2"><span>•</span> {g}</li>)}
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
                const processProjects = projects.filter(p => p.processId === proc.id && (showCompletedProjects || p.status !== 'completado'));
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
                      {processProjects.map(project => {
                        const projectAccess = getModuleAccess(currentMember, roles, `projects_${project.processId}`);
                        const canEdit = projectAccess === 'lider' || projectAccess === 'administrador';
                        const canDelete = projectAccess === 'administrador';
                        return (
                          <ProjectCard 
                            key={project.id} 
                            project={project}
                            tasks={tasks.filter(t => t.projectId === project.id && isTaskVisibleForMember(t, currentMember, roles))}
                            onEdit={openEditProject}
                            onDelete={deleteProject}
                            canEdit={canEdit}
                            canDelete={canDelete}
                          />
                        );
                      })}
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
              className="flex flex-col h-[calc(100vh-80px)] relative"
            >
              
              {tasksSubTab === 'permissions' ? (
                <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full pb-20">
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mt-6">
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
                      <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
                        <Shield size={32} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Reglas y Permisos</h2>
                        <p className="text-gray-500 mt-1">Niveles de acceso y responsabilidades en el Módulo de Tareas.</p>
                      </div>
                    </div>
                    
                    <div className="prose prose-sm md:prose-base prose-slate max-w-none space-y-8">
                      <section>
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-4">
                          <Lock className="text-gray-400" size={18} /> Resumen del Sistema
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          El módulo de seguimiento de tareas opera bajo un esquema de <strong>"Permisos Cruzados"</strong> que separa claramente la <em>Planificación</em> de la <em>Ejecución</em>, protegiendo así el cronograma y presupuesto de los proyectos.
                        </p>
                      </section>

                      <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-green-500" /> Líderes y Administradores
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Tienen control total sobre el <strong>Bloque de Planificación y Límites</strong>.
                        </p>
                        <ul className="space-y-2 text-sm text-gray-600">
                          <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Establecer o modificar la <strong>Fecha Límite (Deadline)</strong>.</li>
                          <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Asignar las <strong>Horas Planificadas</strong> (Presupuesto de tiempo).</li>
                          <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Editar cualquier campo de la tarea y reasignar responsables.</li>
                        </ul>
                      </section>

                      <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Activity size={16} className="text-blue-500" /> Colaborador Asignado (Responsable)
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Es el dueño absoluto del <strong>Bloque de Ejecución Real</strong>. 
                        </p>
                        <ul className="space-y-2 text-sm text-gray-600">
                          <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Reportar las <strong>Horas Reales</strong> utilizadas en la tarea.</li>
                          <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Actualizar la <strong>Fecha de entrega real</strong>. (El sistema la auto-llena al pasar a Completada).</li>
                          <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> Agregar horarios específicos (Hora Inicio / Hora Fin) al día planificado para colaborar.</li>
                          <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">•</span> <em>Nota: Visualiza el bloque de planificación en modo "Solo lectura".</em></li>
                        </ul>
                      </section>
                      
                      <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <CheckSquare size={16} className="text-purple-500" /> Miembros del Equipo
                        </h3>
                        <p className="text-sm text-gray-600">
                          Cualquier miembro del equipo que abra una tarea que <strong>NO</strong> tiene asignada, visualizará todos los campos en modo "Solo lectura". Podrán ver los detalles, pero no podrán modificar fechas ni horas.
                        </p>
                      </section>
                    </div>
                  </div>
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
                    { id: 'review', label: 'En Revisión', color: 'text-purple-500', bg: 'bg-purple-50' },
                    { id: 'correction', label: 'Para Corrección', color: 'text-amber-500', bg: 'bg-amber-50' },
                    { id: 'done', label: 'Completada', color: 'text-green-500', bg: 'bg-green-50', collapsible: true },
                    { id: 'blocked', label: 'Bloqueada', color: 'text-red-500', bg: 'bg-red-50', collapsible: true }
                  ].map(column => {
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

                    if (isCollapsed) {
                      return (
                        <div
                          key={column.id}
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
                      <div key={column.id} className="min-w-[320px] max-w-[320px] flex flex-col gap-4 h-full">
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

                          {visibleColTasks.map(task => (
                            <TaskCard 
                              key={task.id} 
                              task={task} 
                              allTasks={tasks}
                              member={members.find(m => m.id === task.memberId)} 
                              auxiliary={members.find(m => m.id === task.auxiliaryId)}
                              auxiliaries={task.auxiliaryIds ? members.filter(m => task.auxiliaryIds?.includes(m.id)) : (task.auxiliaryId ? members.filter(m => m.id === task.auxiliaryId) : [])}
                              revisor={members.find(m => m.id === task.revisorId)}
                              process={processes.find(p => p.id === task.processId)} 
                              project={projects.find(p => p.id === task.projectId)}
                              onUpdateStatus={updateTaskStatus} 
                              onEdit={openEditTask} 
                              onDelete={handleDeleteTask} 
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
                      <tr className="border-b border-gray-100 bg-gray-50/50 sticky top-0 z-20 backdrop-blur-md">
                        {/* Tarea / Descripción Column Header */}
                        <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[24%] align-top border-r border-gray-100/50">
                          <div 
                            onClick={() => handleTableSort('title')}
                            className="flex items-center gap-1.5 font-black text-gray-500 uppercase tracking-[0.15em] cursor-pointer hover:text-gray-900 transition-colors mb-2.5 group"
                          >
                            Tarea / Descripción
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
                              placeholder="Buscar por nombre/desc..."
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
                              <option value="review" className="font-sans text-purple-700 font-bold">En Revisión</option>
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
                              {processes.map(p => (
                                <option key={p.id} value={p.id} className="font-medium">{p.name}</option>
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
                              {projects.map(pj => (
                                <option key={pj.id} value={pj.id} className="font-medium">{pj.name}</option>
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
                              {sortedMembers.map(m => (
                                <option key={m.id} value={m.id} className="font-medium">{m.name}</option>
                              ))}
                            </select>
                          </div>
                        </th>

                        {/* Auxiliar Column Header */}
                        <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[13%] align-top border-r border-gray-100/50">
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
                              {sortedMembers.map(m => (
                                <option key={m.id} value={m.id} className="font-medium">{m.name}</option>
                              ))}
                            </select>
                          </div>
                        </th>

                        {/* Revisor Column Header */}
                        <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[13%] align-top border-r border-gray-100/50">
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
                              {sortedMembers.map(m => (
                                <option key={m.id} value={m.id} className="font-medium">{m.name}</option>
                              ))}
                            </select>
                          </div>
                        </th>

                        {/* Plan/Real Column Header */}
                        <th className="px-6 py-4 text-[10px] bg-gray-50/50 w-[8%] align-top border-r border-gray-100/50">
                          <div 
                            onClick={() => handleTableSort('hours')}
                            className="flex items-center gap-1.5 font-black text-gray-500 uppercase tracking-[0.15em] cursor-pointer hover:text-gray-900 transition-colors mb-2.5 group"
                          >
                            Horas
                            {tableSort.column === 'hours' ? (
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
                      {sortedTasks.map(task => {
                        const member = members.find(m => m.id === task.memberId);
                        const auxiliary = members.find(m => m.id === task.auxiliaryId);
                        const taskAuxiliaries = task.auxiliaryIds ? members.filter(m => task.auxiliaryIds?.includes(m.id)) : (auxiliary ? [auxiliary] : []);
                        const process = processes.find(p => p.id === task.processId);
                        const project = projects.find(p => p.id === task.projectId);
                        
                        return (
                          <tr key={task.id} className="hover:bg-gray-50/50 transition-colors group">
                            {/* Tarea Cell */}
                            <td className="px-6 py-4.5 align-middle">
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
                                <option value="review">En Revisión</option>
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
                                        key={aux.id}
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
                            <td className="px-6 py-4.5 align-middle font-mono text-xs text-gray-700">
                              <div className="flex flex-col">
                                <div className="flex items-baseline gap-0.5">
                                  <span className="font-black text-gray-900">{task.actualHours || 0}h</span>
                                  <span className="text-gray-400 text-[10px]">/{task.plannedHours || 0}h</span>
                                </div>
                                <span className="text-[8px] text-gray-400 font-black uppercase tracking-wider">Real / Plan</span>
                              </div>
                            </td>
                            
                            {/* Fecha Límite Cell */}
                            <td className="px-6 py-4.5 align-middle text-xs font-black text-gray-900">
                              {task.dueDate ? (
                                <span className="uppercase text-xs font-black">
                                  {parseLocalDate(task.dueDate)?.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                </span>
                              ) : (
                                <span className="text-gray-300 font-medium">Sin fecha</span>
                              )}
                            </td>
                            
                            {/* Acciones Cell */}
                            <td className="px-6 py-4.5 align-middle text-right">
                              <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openEditTask(task)}
                                  className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
                                  title="Editar"
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                                  title="Eliminar"
                                >
                                  <Trash size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {sortedTasks.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                            No hay tareas asociadas que coincidan con los filtros
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
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
                    <h2 className="text-3xl font-black text-gray-900 mb-2">Configuración del Sistema</h2>
                    <p className="text-gray-500 max-w-sm mx-auto font-medium">Personaliza los parámetros globales de Novagreen IA y gestiona las integraciones de Gemini.</p>
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
                  <div className="bg-white p-6 rounded-[2.5rem] border border-[#E5E7EB] shadow-xl space-y-5 flex flex-col h-[75vh]">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <Users size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-gray-900 leading-tight">Integrantes del Equipo</h2>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Ajuste de permisos</p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                        <Search size={16} className="text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Buscar integrante..."
                          value={permSearch}
                          onChange={(e) => setPermSearch(e.target.value)}
                          className="bg-transparent border-none outline-none text-xs font-bold text-gray-700 w-full placeholder:text-gray-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                      {(() => {
                        const filtered = sortedMembers.filter(m => {
                          if (!m.name) return false;
                          const isMember = (m.categories || []).includes('miembro');
                          return isMember && normalizeText(m.name).includes(normalizeText(permSearch));
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-8 text-gray-400 font-medium text-xs">
                              No se encontraron integrantes
                            </div>
                          );
                        }

                        return filtered.map((member) => {
                          const isAdmin = member.isSystemAdmin || member.systemRoleId === 'role-admin';
                          const isSelected = selectedMemberId ? selectedMemberId === member.id : member.id === filtered[0]?.id;
                          const processName = processes.find(p => p.id === member.processId)?.name || 'Sin Proceso';

                          return (
                            <button
                              key={member.id}
                              onClick={() => handleMemberClick(member.id)}
                              className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between group ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                                  : 'bg-gray-50 border-transparent text-gray-800 hover:bg-white hover:border-gray-100 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img 
                                  src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`} 
                                  className="w-9 h-9 rounded-xl object-cover flex-shrink-0" 
                                  alt={member.name}
                                />
                                <div className="min-w-0">
                                  <p className={`text-xs font-black truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                    {member.name}
                                  </p>
                                  <p className={`text-[9px] uppercase font-bold tracking-wider truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {member.role || 'Sin Cargo'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isAdmin ? (
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600'
                                  }`}>
                                    Admin
                                  </span>
                                ) : (
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                    isSelected ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-600'
                                  }`}>
                                    Custom
                                  </span>
                                )}
                                <ChevronRight size={12} className={isSelected ? 'text-white' : 'text-gray-300'} />
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div className="lg:col-span-2 bg-white p-8 md:p-10 rounded-[2.5rem] border border-[#E5E7EB] shadow-2xl relative overflow-hidden h-[75vh] overflow-y-auto custom-scrollbar">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
                    
                    {(() => {
                      const filteredMembers = sortedMembers.filter(m => (m.categories || []).includes('miembro'));
                      const member = sortedMembers.find(m => m.id === selectedMemberId) || filteredMembers[0];
                      
                      if (!member) {
                        return (
                          <div className="text-center py-20 text-gray-400 font-medium text-sm">
                            Por favor, agrega un miembro al equipo en la pestaña "Equipo" para poder configurar sus permisos.
                          </div>
                        );
                      }
                      
                      const processName = processes.find(p => p.id === member.processId)?.name || 'Sin Proceso Asignado';

                      return (
                        <div className="space-y-8 relative z-10">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                            <div className="flex items-center gap-4">
                              <img 
                                src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`} 
                                alt={member.name} 
                                className="w-16 h-16 rounded-2xl object-cover shadow-sm border-2 border-slate-50 flex-shrink-0" 
                              />
                              <div className="min-w-0">
                                <h3 className="text-xl font-black text-gray-900 leading-tight truncate">{member.name}</h3>
                                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                  <User size={12} className="text-blue-500" /> {member.role || 'Sin Cargo'}
                                </p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                  Proceso: <span className="text-slate-700">{processName}</span>
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-50 border border-blue-100 px-4 py-2.5 rounded-2xl text-center flex flex-col justify-center hidden sm:flex">
                                <span className="text-[8px] font-black uppercase text-blue-500 tracking-widest mb-0.5">Tipo de Cuenta</span>
                                <span className={`text-xs font-black uppercase ${draftIsSystemAdmin ? 'text-red-600' : 'text-blue-600'}`}>
                                  {draftIsSystemAdmin ? 'Administrador' : 'Acceso Personalizado'}
                                </span>
                              </div>
                              
                              <div>
                                {hasUnsavedPermissionsChanges ? (
                                  <button
                                    type="button"
                                    onClick={() => savePermissions(member.id)}
                                    className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-green-100 hover:shadow-green-200 transition-all flex items-center gap-2"
                                  >
                                    <Save size={14} className="animate-pulse" /> Guardar permisos
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    className="px-5 py-3 bg-slate-100 text-slate-400 text-[10px] font-semibold uppercase tracking-wider rounded-2xl flex items-center gap-2 cursor-not-allowed"
                                  >
                                    <Check size={14} /> Guardar permisos
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Global Role Select Card */}
                          <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                            <div>
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Shield size={14} className={draftIsSystemAdmin ? 'text-red-500' : 'text-blue-500'} /> Configuración de Rol Global
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-1 font-semibold leading-relaxed">
                                Determina si este integrante tiene privilegios ilimitados de administración en todo el sistema.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setDraftIsSystemAdmin(true);
                                }}
                                className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                                  draftIsSystemAdmin 
                                    ? 'bg-white border-red-500 ring-2 ring-red-50 text-slate-800 shadow-sm'
                                    : 'bg-white/40 border-slate-200 text-slate-400 hover:bg-white hover:border-slate-300 hover:text-slate-600'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <div className={`p-1 rounded ${draftIsSystemAdmin ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <Shield size={12} />
                                  </div>
                                  <span className="font-extrabold text-[10px] uppercase tracking-wider">Administrador Global</span>
                                </div>
                                <p className="text-[9px] font-bold leading-relaxed text-slate-400">
                                  Acceso total para hacer y deshacer. Control operativo en todos los módulos sin restricciones.
                                </p>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setDraftIsSystemAdmin(false);
                                  if (Object.keys(draftModuleAccess || {}).length === 0) {
                                    setDraftModuleAccess(member.moduleAccess || {
                                      dashboard: 'lector',
                                      tasks: 'colaborador',
                                      planner: 'lector',
                                      projects: 'ninguno',
                                      directory: 'lector',
                                      transcript: 'lector',
                                      settings: 'ninguno'
                                    });
                                  }
                                }}
                                className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                                  !draftIsSystemAdmin 
                                    ? 'bg-white border-blue-500 ring-2 ring-blue-50 text-slate-800 shadow-sm'
                                    : 'bg-white/40 border-slate-200 text-slate-400 hover:bg-white hover:border-slate-300 hover:text-slate-600'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <div className={`p-1 rounded ${!draftIsSystemAdmin ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <Settings size={12} />
                                  </div>
                                  <span className="font-extrabold text-[10px] uppercase tracking-wider">Acceso por Módulos</span>
                                </div>
                                <p className="text-[9px] font-bold leading-relaxed text-slate-400">
                                  Matriz de permisos granulados. El usuario puede tener privilegios únicos por módulo del sistema.
                                </p>
                              </button>
                            </div>
                          </div>

                          {/* Module access matrix */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Lock size={12} className="text-blue-500" /> Matriz de Niveles de Acceso por Módulo
                              </h4>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                Define el perfil de permisos operativos (Ninguno, Lector, Colaborador, Líder o Administrador) para cada área.
                              </p>
                            </div>

                            {draftIsSystemAdmin ? (
                              <div className="p-6 bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl text-center space-y-2">
                                <Shield size={32} className="mx-auto text-amber-500" />
                                <div>
                                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Modo Administrador Global Activo</h5>
                                  <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed font-semibold">
                                    Este integrante posee acceso sin límites para "hacer y deshacer". Todos los módulos se encuentran asignados a nivel total.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-slate-100">
                                {/* Desktop Table Headers */}
                                <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50/75 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  <div className="col-span-5 flex items-center">Módulo o Área del Sistema</div>
                                  <div className="col-span-7 flex justify-end pr-8">Nivel de Acceso Asignado</div>
                                </div>

                                {[
                                  { id: 'dashboard', name: 'Resumen o Dashboard', desc: 'Panel de control con métricas generales del equipo.', icon: <TrendingUp size={16} /> },
                                  { id: 'gerencia', name: 'Módulo de Gerencia', desc: 'Asistente IA consultor, bitácora directiva, planificación estratégica (FODA/OKRs) y gobernanza de IA.', icon: <Briefcase size={16} /> },
                                  { id: 'marketing', name: 'Módulo de Marketing', desc: 'Campañas estandarizadas [AAMMDD], proyectos vinculados, calendario de contenidos, CRM y métricas.', icon: <Megaphone size={16} /> },
                                  { id: 'ventas', name: 'Módulo de Ventas', desc: 'CRM de Clientes, Embudo de Ventas (Pipeline), Cotizaciones y Metas.', icon: <DollarSign size={16} /> },
                                  { id: 'productos', name: 'Módulo de Productos', desc: 'Catálogo de soluciones comerciales, fichas técnicas y precios de Certificación, Capacitación, QHSE, EPP y Equipos.', icon: <Boxes size={16} />, isProductosParent: true },
                                  { id: 'acreditacion', name: 'Módulo de Acreditación', desc: 'Enlaces, aliados y programas de acreditación internacional.', icon: <Award size={16} /> },
                                  { id: 'qhse', name: 'Módulo de QHSE', desc: 'Gestión de Calidad, Salud, Seguridad Ocupacional y Medio Ambiente.', icon: <ShieldCheck size={16} /> },
                                  { id: 'importaciones', name: 'Módulo de Importaciones', desc: 'Base de productos, catálogo de proveedores internacionales y órdenes de importación.', icon: <Package size={16} /> },
                                  { id: 'capacitacion', name: 'Módulo de Capacitación', desc: 'Gestión de capacitadores, aulas, lugares, calendario y liquidación de costos.', icon: <GraduationCap size={16} /> },
                                  { id: 'tasks', name: 'Seguimiento de Tareas', desc: 'Permisos de tareas gestionados individualmente para cada proceso específico.', icon: <CheckCircle2 size={16} />, isTasksParent: true },
                                  { id: 'planner', name: 'Planificador Inteligente IA', desc: 'Planificación inteligente asistida por modelos Gemini.', icon: <Calendar size={16} /> },
                                  { id: 'projects', name: 'Gestión de Proyectos', desc: 'Administración de campañas y portafolio de proyectos.', icon: <FolderKanban size={16} />, isProjectsParent: true },
                                  { id: 'process_dashboard', name: 'Gestión XD (Procesos)', desc: 'Administración y seguimiento de horas, enlaces, bases y minutas por proceso.', icon: <Activity size={16} />, isProcessDashboardParent: true },
                                  { id: 'directory', name: 'Directorio de Contactos', desc: 'Información técnica de contactos y ficha de integrante.', icon: <Contact size={16} /> },
                                  { id: 'transcript', name: 'Analizador de Minutas IA', desc: 'Procesamiento de audios de reuniones and minutas.', icon: <Sparkles size={16} /> },
                                  { id: 'settings', name: 'Configuración y Procesos', desc: 'Permisos de equipo y control administrativo general.', icon: <Settings size={16} /> },
                                ].map(mod => {
                                  const currentAccessVal = draftModuleAccess[mod.id] || 'ninguno';

                                  return (
                                    <div key={mod.id} className="p-5 md:px-6 md:py-4 bg-white hover:bg-slate-50/20 transition-all">
                                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                        {/* Left side info */}
                                        <div className="md:col-span-5 flex items-start gap-3">
                                          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
                                            {mod.icon}
                                          </div>
                                          <div className="min-w-0 pr-2">
                                            <h5 className="text-[11px] font-black text-slate-800 leading-tight uppercase tracking-wider">{mod.name}</h5>
                                            <p className="text-[9px] text-slate-400 mt-0.5 leading-snug font-semibold">{mod.desc}</p>
                                          </div>
                                        </div>

                                        {/* Right side selector */}
                                        <div className="md:col-span-7 flex justify-end w-full">
                                          {mod.id === 'tasks' || mod.id === 'projects' || mod.id === 'process_dashboard' ? (
                                             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm select-none">
                                               <Sparkles size={11} className="text-blue-500 animate-pulse" /> Resuelto por Proceso
                                             </div>
                                           ) : (
                                             <div className="flex bg-slate-100 p-0.5 rounded-xl w-full max-w-md gap-0.5 border border-slate-200/40">
                                            {[
                                              { val: 'ninguno', label: 'Ninguno' },
                                              { val: 'lector', label: 'Lector' },
                                              { val: 'colaborador', label: 'Colab.' },
                                              { val: 'lider', label: 'Líder' },
                                              { val: 'administrador', label: 'Admin.' }
                                            ].map(opt => {
                                              const isSelected = currentAccessVal === opt.val;
                                              return (
                                                <button
                                                  key={opt.val}
                                                  type="button"
                                                  onClick={() => {
                                                    setDraftModuleAccess(prev => ({
                                                      ...prev,
                                                      [mod.id]: opt.val as any
                                                    }));
                                                  }}
                                                  className={`flex-1 text-center py-2 px-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                    isSelected
                                                      ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                        opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                        opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                        opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                        'bg-green-600 text-white shadow-sm'
                                                      : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                  }`}
                                                >
                                                  {opt.label}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        )}</div>
                                      </div>

                                      {/* If it's the tasks parent module, render process permissions underneath */}
                                      {mod.isTasksParent && (
                                        <div className="mt-3.5 border-t border-dashed border-slate-100 pt-3">
                                          <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                              <Sparkles size={11} className="text-blue-500" /> Permisos por Proceso Activo
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-400 italic">
                                              * Los integrantes heredarán acceso a la sección de Tareas de acuerdo al rol configurado en cada proceso.
                                            </span>
                                          </div>

                                          {true && (
                                            <div className="mt-3.5 pl-4 pr-1.5 py-3.5 bg-slate-50/50 border border-slate-200/50 border-dashed rounded-xl space-y-3">
                                              {/* Tareas Sin Proceso Asignado */}
                                              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border-b border-dashed border-slate-200/60 pb-3">
                                                <div className="md:col-span-5 flex items-center gap-2">
                                                  <span className="text-slate-400 font-bold text-xs">↳</span>
                                                  <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">Tareas Sin Proceso o sin Asignar</span>
                                                      <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-200/50 py-0.5 px-1.5 rounded font-black uppercase tracking-wider flex-shrink-0">Global / General</span>
                                                    </div>
                                                    <span className="text-[8px] text-slate-400 font-bold leading-normal mt-0.5">Controla el acceso de las personas a tareas que no tienen un proceso o asignado específico</span>
                                                  </div>
                                                </div>
                                                <div className="md:col-span-7 flex justify-end w-full">
                                                  <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full max-w-sm gap-0.5">
                                                    {[
                                                      { val: 'ninguno', label: 'Ninguno' },
                                                      { val: 'lector', label: 'Lector' },
                                                      { val: 'colaborador', label: 'Colab.' },
                                                      { val: 'lider', label: 'Líder' },
                                                      { val: 'administrador', label: 'Admin.' }
                                                    ].map(opt => {
                                                      const isSelected = (draftModuleAccess['tasks'] || 'ninguno') === opt.val;
                                                      return (
                                                        <button
                                                          key={opt.val}
                                                          type="button"
                                                          onClick={() => {
                                                            setDraftModuleAccess(prev => ({
                                                              ...prev,
                                                              tasks: opt.val as any
                                                            }));
                                                          }}
                                                          className={`flex-1 text-center py-1.5 px-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                            isSelected
                                                              ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                                opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                                opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                                opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                                'bg-green-600 text-white shadow-sm'
                                                              : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                          }`}
                                                        >
                                                          {opt.label}
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              </div>

                                              {processes.length === 0 ? (
                                                <p className="text-[10px] text-slate-400 font-semibold italic pl-2">No hay procesos registrados para configurar.</p>
                                              ) : (
                                                processes.map(proc => {
                                                  const procModId = `tasks_${proc.id}`;
                                                  const currentProcAccessVal = draftModuleAccess[procModId] || 'ninguno';

                                                  return (
                                                    <div key={proc.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                                      <div className="md:col-span-5 flex items-center gap-2">
                                                        <span className="text-slate-400 font-bold text-xs">↳</span>
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">{proc.name}</span>
                                                          <span className="text-[8px] bg-slate-200/50 text-slate-500 py-0.5 px-1.5 rounded font-black uppercase tracking-wider flex-shrink-0">Proceso</span>
                                                        </div>
                                                      </div>
                                                      <div className="md:col-span-7 flex justify-end w-full">
                                                        <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full max-w-sm gap-0.5">
                                                          {[
                                                            { val: 'ninguno', label: 'Ninguno' },
                                                            { val: 'lector', label: 'Lector' },
                                                            { val: 'colaborador', label: 'Colab.' },
                                                            { val: 'lider', label: 'Líder' },
                                                            { val: 'administrador', label: 'Admin.' }
                                                          ].map(opt => {
                                                            const isSelected = currentProcAccessVal === opt.val;
                                                            return (
                                                              <button
                                                                key={opt.val}
                                                                type="button"
                                                                onClick={() => {
                                                                  setDraftModuleAccess(prev => ({
                                                                    ...prev,
                                                                    [procModId]: opt.val as any
                                                                  }));
                                                                }}
                                                                className={`flex-1 text-center py-1.5 px-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                                  isSelected
                                                                    ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                                      opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                                      opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                                      opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                                      'bg-green-600 text-white shadow-sm'
                                                                    : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                                }`}
                                                              >
                                                                {opt.label}
                                                              </button>
                                                            );
                                                          })}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  );
                                                })
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* If it's the process_dashboard parent module, render process permissions underneath */}
                                      {mod.isProcessDashboardParent && (
                                        <div className="mt-3.5 border-t border-dashed border-slate-100 pt-3">
                                          <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                              <Sparkles size={11} className="text-blue-500" /> Permisos de Gestión XD por Proceso Activo
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-400 italic">
                                              * Los integrantes heredarán acceso a la sección de Gestión XD de acuerdo al rol configurado en cada proceso.
                                            </span>
                                          </div>

                                          <div className="mt-3.5 pl-4 pr-1.5 py-3.5 bg-slate-50/50 border border-slate-200/50 border-dashed rounded-xl space-y-3">
                                            {processes.length === 0 ? (
                                              <p className="text-[10px] text-slate-400 font-semibold italic pl-2">No hay procesos registrados para configurar.</p>
                                            ) : (
                                              processes.map(proc => {
                                                const procModId = `process_dashboard_${proc.id}`;
                                                const currentProcAccessVal = draftModuleAccess[procModId] || 'ninguno';

                                                return (
                                                  <div key={proc.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                                    <div className="md:col-span-5 flex items-center gap-2">
                                                      <span className="text-slate-400 font-bold text-xs">↳</span>
                                                      <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">{proc.name}</span>
                                                        <span className="text-[8px] bg-slate-200/50 text-slate-500 py-0.5 px-1.5 rounded font-black uppercase tracking-wider flex-shrink-0">Proceso</span>
                                                      </div>
                                                    </div>
                                                    <div className="md:col-span-7 flex justify-end w-full">
                                                      <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full max-w-sm gap-0.5">
                                                        {[
                                                          { val: 'ninguno', label: 'Ninguno' },
                                                          { val: 'lector', label: 'Lector' },
                                                          { val: 'colaborador', label: 'Colab.' },
                                                          { val: 'lider', label: 'Líder' },
                                                          { val: 'administrador', label: 'Admin.' }
                                                        ].map(opt => {
                                                          const isSelected = currentProcAccessVal === opt.val;
                                                          return (
                                                            <button
                                                              key={opt.val}
                                                              type="button"
                                                              onClick={() => {
                                                                setDraftModuleAccess(prev => ({
                                                                  ...prev,
                                                                  [procModId]: opt.val as any
                                                                }));
                                                              }}
                                                              className={`flex-1 text-center py-1.5 px-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                                isSelected
                                                                  ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                                    opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                                    opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                                    opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                                    'bg-green-600 text-white shadow-sm'
                                                                  : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                              }`}
                                                            >
                                                              {opt.label}
                                                            </button>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* If it's the projects parent module, render process permissions underneath */}
                                      {mod.isProjectsParent && (
                                        <div className="mt-3.5 border-t border-dashed border-slate-100 pt-3">
                                          <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                              <Sparkles size={11} className="text-blue-500" /> Permisos de Proyectos por Proceso Activo
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-400 italic">
                                              * Los integrantes heredarán acceso a la sección de Proyectos de acuerdo al rol configurado en cada proceso.
                                            </span>
                                          </div>

                                          {true && (
                                            <div className="mt-3.5 pl-4 pr-1.5 py-3.5 bg-slate-50/50 border border-slate-200/50 border-dashed rounded-xl space-y-3">

                                              {processes.length === 0 ? (
                                                <p className="text-[10px] text-slate-400 font-semibold italic pl-2">No hay procesos registrados para configurar.</p>
                                              ) : (
                                                processes.map(proc => {
                                                  const procModId = `projects_${proc.id}`;
                                                  const currentProcAccessVal = draftModuleAccess[procModId] || 'ninguno';

                                                  return (
                                                    <div key={proc.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                                      <div className="md:col-span-5 flex items-center gap-2">
                                                        <span className="text-slate-400 font-bold text-xs">↳</span>
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">{proc.name}</span>
                                                          <span className="text-[8px] bg-slate-200/50 text-slate-500 py-0.5 px-1.5 rounded font-black uppercase tracking-wider flex-shrink-0">Proceso</span>
                                                        </div>
                                                      </div>
                                                      <div className="md:col-span-7 flex justify-end w-full">
                                                        <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full max-w-sm gap-0.5">
                                                          {[
                                                            { val: 'ninguno', label: 'Ninguno' },
                                                            { val: 'lector', label: 'Lector' },
                                                            { val: 'colaborador', label: 'Colab.' },
                                                            { val: 'lider', label: 'Líder' },
                                                            { val: 'administrador', label: 'Admin.' }
                                                          ].map(opt => {
                                                            const isSelected = currentProcAccessVal === opt.val;
                                                            return (
                                                              <button
                                                                key={opt.val}
                                                                type="button"
                                                                onClick={() => {
                                                                  setDraftModuleAccess(prev => ({
                                                                    ...prev,
                                                                    [procModId]: opt.val as any
                                                                  }));
                                                                }}
                                                                className={`flex-1 text-center py-1.5 px-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                                  isSelected
                                                                    ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                                      opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                                      opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                                      opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                                      'bg-green-600 text-white shadow-sm'
                                                                    : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                                }`}
                                                              >
                                                                {opt.label}
                                                              </button>
                                                            );
                                                          })}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  );
                                                })
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* If it's the productos parent module, render submodule permissions underneath */}
                                      {(mod as any).isProductosParent && (
                                        <div className="mt-3.5 border-t border-dashed border-slate-100 pt-3">
                                          <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                              <Boxes size={11} className="text-blue-500" /> Permisos por Submódulo de Productos
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-400 italic">
                                              * Permite asignar permisos específicos a cada categoría o heredar del permiso general de Productos.
                                            </span>
                                          </div>

                                          <div className="mt-3.5 pl-4 pr-1.5 py-3.5 bg-slate-50/50 border border-slate-200/50 border-dashed rounded-xl space-y-3">
                                            {[
                                              { id: 'certificacion', name: 'Certificación', icon: '🏅' },
                                              { id: 'capacitacion', name: 'Capacitación', icon: '📚' },
                                              { id: 'qhse', name: 'QHSE', icon: '🛡️' },
                                              { id: 'epp', name: 'EPP', icon: '🦺' },
                                              { id: 'equipos', name: 'Equipos', icon: '⚙️' }
                                            ].map(sub => {
                                              const subModId = `productos_${sub.id}`;
                                              const currentSubAccessVal = draftModuleAccess[subModId] || 'ninguno';

                                              return (
                                                <div key={sub.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                                  <div className="md:col-span-5 flex items-center gap-2">
                                                    <span className="text-slate-400 font-bold text-xs">↳</span>
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                      <span className="text-xs">{sub.icon}</span>
                                                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">{sub.name}</span>
                                                      <span className="text-[8px] bg-slate-200/50 text-slate-500 py-0.5 px-1.5 rounded font-black uppercase tracking-wider flex-shrink-0">Submódulo</span>
                                                    </div>
                                                  </div>
                                                  <div className="md:col-span-7 flex justify-end w-full">
                                                    <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full max-w-sm gap-0.5">
                                                      {[
                                                        { val: 'ninguno', label: 'Ninguno' },
                                                        { val: 'lector', label: 'Lector' },
                                                        { val: 'colaborador', label: 'Colab.' },
                                                        { val: 'lider', label: 'Líder' },
                                                        { val: 'administrador', label: 'Admin.' }
                                                      ].map(opt => {
                                                        const isSelected = currentSubAccessVal === opt.val;
                                                        return (
                                                          <button
                                                            key={opt.val}
                                                            type="button"
                                                            onClick={() => {
                                                              setDraftModuleAccess(prev => ({
                                                                ...prev,
                                                                [subModId]: opt.val as any
                                                             }));
                                                            }}
                                                            className={`flex-1 text-center py-1.5 px-0.5 rounded text-[8px] font-black uppercase tracking-wide transition-all border border-transparent ${
                                                              isSelected
                                                                ? opt.val === 'ninguno' ? 'bg-red-500 text-white shadow-sm' :
                                                                  opt.val === 'lector' ? 'bg-amber-500 text-white shadow-sm' :
                                                                  opt.val === 'colaborador' ? 'bg-blue-600 text-white shadow-sm' :
                                                                  opt.val === 'lider' ? 'bg-purple-600 text-white shadow-sm' :
                                                                  'bg-green-600 text-white shadow-sm'
                                                                : 'text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50'
                                                            }`}
                                                          >
                                                            {opt.label}
                                                          </button>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* SECCION: SUPERVISION Y VISIBILIDAD DE ENLACES DE INTERES */}
                          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0 mt-0.5">
                                  <Bookmark size={18} />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <span>Enlaces de Interés: Supervisión y Visibilidad</span>
                                    <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Gestión Centralizada</span>
                                  </h4>
                                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                    Define de qué otras personas puede ver y supervisar los enlaces de interés en todos los módulos (ej: Líderes de Gestión).
                                  </p>
                                </div>
                              </div>
                            </div>

                            {draftIsSystemAdmin ? (
                              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center gap-3">
                                <Shield size={18} className="text-emerald-600 shrink-0" />
                                <p className="text-xs font-bold text-emerald-800">
                                  Como Administrador Global, este usuario tiene visibilidad y control total sobre todos los enlaces de todas las personas de la empresa.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {/* Toggle Global Links Access */}
                                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                                  <div>
                                    <h5 className="text-xs font-bold text-slate-800">Ver todos los enlaces de la organización</h5>
                                    <p className="text-[10px] text-slate-400 font-medium">Permite ver los enlaces de interés de todas las personas sin restricción.</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setDraftCanViewAllCompanyLinks(prev => !prev)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                      draftCanViewAllCompanyLinks ? "bg-indigo-600" : "bg-slate-300"
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        draftCanViewAllCompanyLinks ? "translate-x-6" : "translate-x-1"
                                      }`}
                                    />
                                  </button>
                                </div>

                                {!draftCanViewAllCompanyLinks && (
                                  <div className="space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <span className="text-xs font-bold text-slate-700">
                                        Personas supervisadas asignadas ({draftSupervisedMembersForLinks.length}):
                                      </span>
                                      <div className="relative w-full sm:w-64">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                          type="text"
                                          placeholder="Buscar integrante para supervisar..."
                                          value={linksSupervisorSearch}
                                          onChange={(e) => setLinksSupervisorSearch(e.target.value)}
                                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                      </div>
                                    </div>

                                    {/* Selected pills */}
                                    {draftSupervisedMembersForLinks.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 p-2 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                                        {draftSupervisedMembersForLinks.map(supId => {
                                          const supMember = members.find(m => m.id === supId);
                                          return (
                                            <span
                                              key={supId}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold shadow-2xs"
                                            >
                                              <span>{supMember?.name || supId}</span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setDraftSupervisedMembersForLinks(prev => prev.filter(id => id !== supId));
                                                }}
                                                className="text-indigo-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                                              >
                                                <X size={12} />
                                              </button>
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Member selection checklist */}
                                    <div className="max-h-56 overflow-y-auto border border-slate-200/80 rounded-xl divide-y divide-slate-100 bg-slate-50/30">
                                      {members
                                        .filter(m => m.id !== member.id)
                                        .filter(m => {
                                          if (!linksSupervisorSearch.trim()) return true;
                                          return m.name.toLowerCase().includes(linksSupervisorSearch.toLowerCase().trim()) ||
                                            (m.email && m.email.toLowerCase().includes(linksSupervisorSearch.toLowerCase().trim()));
                                        })
                                        .map(targetM => {
                                          const isSupervised = draftSupervisedMembersForLinks.includes(targetM.id);
                                          return (
                                            <div
                                              key={targetM.id}
                                              onClick={() => {
                                                if (isSupervised) {
                                                  setDraftSupervisedMembersForLinks(prev => prev.filter(id => id !== targetM.id));
                                                } else {
                                                  setDraftSupervisedMembersForLinks(prev => [...prev, targetM.id]);
                                                }
                                              }}
                                              className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors ${
                                                isSupervised ? "bg-indigo-50/70 hover:bg-indigo-100/70" : "hover:bg-slate-100/70"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                  isSupervised ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                                                }`}>
                                                  {targetM.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="text-xs font-bold text-slate-800 truncate">{targetM.name}</p>
                                                  <p className="text-[10px] text-slate-400 truncate">{targetM.email || "Sin email"}</p>
                                                </div>
                                              </div>
                                              <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                                isSupervised
                                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                                  : "bg-white text-slate-500 border-slate-200"
                                              }`}>
                                                {isSupervised ? "Supervisando" : "+ Agregar"}
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {hasUnsavedPermissionsChanges && (
                            <div className="sticky bottom-0 left-0 right-0 py-3.5 px-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-4 shadow-2xl z-20 animate-fade-in-up mt-6">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-slate-800 text-amber-500 rounded-lg animate-pulse">
                                  <Sparkles size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-wide">Cambios sin guardar</p>
                                  <p className="text-[9px] font-bold text-slate-400 truncate">Tienes modificaciones de permisos pendientes en {member.name}.</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLastInitializedMemberId('');
                                  }}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                                >
                                  Descartar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => savePermissions(member.id)}
                                  className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-1.5"
                                >
                                  <Save size={12} /> Guardar permisos
                                </button>
                              </div>
                            </div>
                          )}
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
                      <div className="p-3 bg-ng-lime/10 text-ng-green rounded-2xl">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-ng-black">Gestión de Procesos</h2>
                        <p className="text-ng-black/40 text-sm font-medium">Estructura operativa y departamentos de la organización.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingProcess(null);
                        setNewProcessData({ name: '', description: '', goals: '' });
                        setIsAddingProcess(true);
                      }}
                      className="px-6 py-3 bg-ng-lime text-ng-black font-black rounded-2xl shadow-lg shadow-ng-lime/20 hover:opacity-90 transition-all flex items-center gap-2 uppercase text-xs tracking-widest"
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
                          members={sortedMembers.filter(m => m.processId === proc.id)}
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
                      <div className="p-3 bg-ng-lime/10 text-ng-green rounded-2xl">
                        <Users size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-ng-black">Gestión de Equipo</h2>
                        <p className="text-ng-black/40 text-sm font-medium">Control operativo y perfiles de los integrantes del equipo.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsAddingMember(true)}
                      className="px-6 py-3 bg-ng-lime text-ng-black font-black rounded-2xl shadow-lg shadow-ng-lime/20 hover:opacity-90 transition-all flex items-center gap-2 uppercase text-xs tracking-widest"
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
                          name: '', 
                          role: '', 
                          systemRoleId: '', 
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
                          epp: '',
                          isSystemAdmin: false as boolean,
                          moduleAccess: {} as Record<string, "ninguno" | "lector" | "colaborador" | "lider" | "administrador">
                        });
                      }}
                      onSave={handleAddMember}
                    />
                  ) : (
                    <div className="space-y-12">
                      {processes.map(process => {
                        const processMembers = members.filter(m => {
                          const matchesProcess = m.processId === process.id && (m.categories || []).includes('miembro');
                          const matchesSearch = 
                            normalizeText(m.name).includes(normalizeText(searchQuery)) || 
                            normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                            (m.companyAssociations || []).some(assoc => {
                              const comp = companies.find(c => c.id === assoc.companyId);
                              return normalizeText(comp?.name || '').includes(normalizeText(searchQuery)) ||
                                     normalizeText(assoc.role).includes(normalizeText(searchQuery));
                            }) ||
                            m.identificationId?.includes(searchQuery);
                          return matchesProcess && matchesSearch;
                        });
                        if (processMembers.length === 0) return null;
                        
                        return (
                          <div key={process.id} className="space-y-6">
                            <div className="flex items-center gap-3 px-4">
                              <div className="w-2 h-8 bg-ng-green rounded-full" />
                              <h3 className="text-xl font-black text-ng-black uppercase tracking-wider">{process.name}</h3>
                              <span className="text-sm font-bold text-ng-black/40 bg-gray-100 px-3 py-1 rounded-full">
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
                                      companies={companies}
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
                                        handleDeleteMember(member);
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
                      {members.filter(m => {
                        const matchesProcess = (!m.processId || m.processId === 'unassigned') && (m.categories || []).includes('miembro');
                        const matchesSearch = 
                          normalizeText(m.name).includes(normalizeText(searchQuery)) || 
                          normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                          m.companyAssociations?.some(assoc => {
                            const comp = companies.find(c => c.id === assoc.companyId);
                            return normalizeText(comp?.name || '').includes(normalizeText(searchQuery)) ||
                                   normalizeText(assoc.role).includes(normalizeText(searchQuery));
                          }) ||
                          m.identificationId?.includes(searchQuery);
                        return matchesProcess && matchesSearch;
                      }).length > 0 && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-3 px-4">
                            <div className="w-2 h-8 bg-gray-400 rounded-full" />
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-wider">Sin Proceso Asignado</h3>
                            <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                              {members.filter(m => {
                                const matchesProcess = (!m.processId || m.processId === 'unassigned') && (m.categories || []).includes('miembro');
                                const matchesSearch = 
                                  normalizeText(m.name).includes(normalizeText(searchQuery)) || 
                                  normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                                  m.companyAssociations?.some(assoc => {
                                    const comp = companies.find(c => c.id === assoc.companyId);
                                    return normalizeText(comp?.name || '').includes(normalizeText(searchQuery)) ||
                                           normalizeText(assoc.role).includes(normalizeText(searchQuery));
                                  }) ||
                                  m.identificationId?.includes(searchQuery);
                                return matchesProcess && matchesSearch;
                              }).length} integrante(s)
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {members.filter(m => {
                              const matchesProcess = (!m.processId || m.processId === 'unassigned') && (m.categories || []).includes('miembro');
                              const matchesSearch = 
                                normalizeText(m.name).includes(normalizeText(searchQuery)) || 
                                normalizeText(m.role).includes(normalizeText(searchQuery)) ||
                                m.companyAssociations?.some(assoc => {
                                  const comp = companies.find(c => c.id === assoc.companyId);
                                  return normalizeText(comp?.name || '').includes(normalizeText(searchQuery)) ||
                                         normalizeText(assoc.role).includes(normalizeText(searchQuery));
                                }) ||
                                m.identificationId?.includes(searchQuery);
                              return matchesProcess && matchesSearch;
                            }).map(member => (
                              <div key={member.id} className="relative group">
                                <div onClick={() => openEditMember(member)} className="cursor-pointer h-full">
                                  <MemberProfileCard 
                                    member={member} 
                                    processName="Sin Proceso"
                                    companies={companies}
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
                                      handleDeleteMember(member);
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
              </>
            )}
        </AnimatePresence>

        <AnimatePresence>
          {pendingExitAction && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-50 p-7 space-y-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl flex-shrink-0 shadow-inner">
                    <ShieldAlert size={26} className="animate-wiggle" />
                  </div>
                  <div className="space-y-1 bg-white">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">¿Salir sin guardar permisos?</h3>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed">
                      Has modificado los niveles de acceso para <span className="text-slate-800 font-black">{resolvedPermissionsMember?.name}</span> pero no has guardado los cambios. Si sales ahora, se perderán de manera irreversible.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-2 border border-slate-100 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                  Selecciona una opción para continuar con la navegación.
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setPendingExitAction(null)}
                    className="w-full sm:w-auto px-5 py-3 hover:bg-slate-50 text-slate-500 hover:text-gray-700 text-xs font-black uppercase tracking-wider rounded-2xl transition-all text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLastInitializedMemberId('');
                      const action = pendingExitAction;
                      setPendingExitAction(null);
                      
                      if (action.type === 'tab' && action.targetTab) {
                        setActiveTab(action.targetTab);
                        if (action.targetTab === 'settings') {
                          setSettingsSubTab('general');
                        }
                      } else if (action.type === 'subtab' && action.targetSettingsSubTab) {
                        setSettingsSubTab(action.targetSettingsSubTab);
                      } else if (action.type === 'member' && action.targetMemberId) {
                        setSelectedMemberId(action.targetMemberId);
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-3 bg-red-50 hover:bg-red-100/80 text-red-600 text-xs font-black uppercase tracking-wider rounded-2xl transition-all border border-red-200/40 text-center"
                  >
                    Salir sin guardar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (resolvedPermissionsMember) {
                        await savePermissions(resolvedPermissionsMember.id);
                      }
                      const action = pendingExitAction;
                      setPendingExitAction(null);
                      
                      if (action.type === 'tab' && action.targetTab) {
                        setActiveTab(action.targetTab);
                        if (action.targetTab === 'settings') {
                          setSettingsSubTab('general');
                        }
                      } else if (action.type === 'subtab' && action.targetSettingsSubTab) {
                        setSettingsSubTab(action.targetSettingsSubTab);
                      } else if (action.type === 'member' && action.targetMemberId) {
                        setSelectedMemberId(action.targetMemberId);
                      }
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-green-100 hover:shadow-green-200 transition-all text-center flex items-center justify-center gap-2"
                  >
                    <Save size={14} /> Guardar y salir
                  </button>
                </div>
              </motion.div>
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

          
          {(isAddingProject || editingProject) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <form onSubmit={editingProject ? handleUpdateProject : handleAddProject} className="flex flex-col flex-1 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 z-10">
                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                      <div className={`p-2.5 rounded-xl shrink-0 ${editingProject ? 'bg-blue-50 text-blue-600' : 'bg-ng-green/10 text-ng-green'}`}>
                        {editingProject ? <Edit size={20} /> : <FolderKanban size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          required
                          placeholder="Nombre del proyecto..."
                          className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-xl font-black tracking-tight text-gray-900 placeholder:text-gray-300 px-0 py-0"
                          value={newProjectData.name}
                          onChange={e => setNewProjectData({...newProjectData, name: e.target.value})}
                        />
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsAddingProject(false);
                        setEditingProject(null);
                      }}
                      className="p-3 shrink-0 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Proceso Asignado</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
                        value={newProjectData.processId}
                        onChange={e => setNewProjectData({...newProjectData, processId: e.target.value})}
                      >
                        <option value="">Selecciona un proceso...</option>
                        {processes.filter(p => {
                          const access = getModuleAccess(currentMember, roles, `projects_${p.id}`);
                          return access === 'lider' || access === 'administrador';
                        }).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
                        value={newProjectData.status}
                        onChange={e => setNewProjectData({...newProjectData, status: e.target.value as any})}
                      >
                        <option value="activo">Activo</option>
                        <option value="pausado">Pausado</option>
                        <option value="completado">Completado</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ciudad / Ubicación (Opcional)</label>
                      <input 
                        type="text"
                        placeholder="Ej. Guayaquil, Quito..."
                        className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                        value={newProjectData.city || ''}
                        onChange={e => setNewProjectData({...newProjectData, city: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción</label>
                      <textarea 
                        placeholder="Descripción breve del proyecto..."
                        className="w-full h-32 px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none text-sm font-medium"
                        value={newProjectData.description}
                        onChange={e => setNewProjectData({...newProjectData, description: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingProject(false);
                        setEditingProject(null);
                      }}
                      className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-ng-green text-white text-sm font-bold rounded-xl hover:bg-ng-green/90 transition-colors shadow-sm"
                    >
                      {editingProject ? 'Guardar Cambios' : 'Crear Proyecto'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {/* Task Modal (Standard & Design Templates) */}
          <TaskModal
            isOpen={isAddingTask || !!editingTask}
            editingTask={editingTask}
            newTaskData={newTaskData}
            setNewTaskData={setNewTaskData}
            onSave={editingTask ? handleUpdateTask : handleAddTask}
            onClose={handleRequestCloseTaskModal}
            currentMember={currentMember}
            roles={roles}
            processes={processes}
            projects={projects}
            members={members}
            tasks={tasks}
            isNewTask={isNewTask}
            isProcessLeader={isProcessLeader}
            canEditMetadataField={canEditMetadataField}
            canEditStatusField={canEditStatusField}
            canEditPlanning={canEditPlanning}
            canEditExecution={canEditExecution}
            showTaskHistory={showTaskHistory}
            setShowTaskHistory={setShowTaskHistory}
            setTasks={setTasks}
            setEditingTask={setEditingTask}
            handleDeleteTask={handleDeleteTask}
          />

          {/* Modal de Advertencia de Cambios No Guardados */}
          {showUnsavedTaskChangesModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[70] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 text-center"
              >
                <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">
                  ¿Tienes cambios sin guardar?
                </h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed font-medium">
                  Has realizado modificaciones en la historia o tarea. Si decides salir ahora sin guardar, se perderán todos los cambios efectuados.
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      if (editingTask) {
                        handleUpdateTask(e as any);
                      } else {
                        handleAddTask(e as any);
                      }
                    }}
                    className="w-full py-3 bg-ng-lime text-ng-black rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-md shadow-ng-lime/10 flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    <span>Guardar cambios y cerrar</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleForceCloseTaskModal}
                    className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    <span>Descartar cambios</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUnsavedTaskChangesModal(false)}
                    className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-all"
                  >
                    Continuar editando
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  </div>
  );
}
