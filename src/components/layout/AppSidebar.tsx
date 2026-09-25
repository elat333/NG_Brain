import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  CheckCircle2, 
  Activity, 
  Briefcase, 
  Award, 
  GraduationCap, 
  ShieldCheck, 
  ShieldAlert, 
  Megaphone, 
  DollarSign, 
  Boxes, 
  Contact, 
  Package, 
  Sparkles, 
  Settings, 
  Shield, 
  FolderKanban, 
  Calendar, 
  Download, 
  UploadCloud, 
  Clock, 
  FileText, 
  Bookmark, 
  Link as LinkIcon, 
  Link2, 
  BookOpen, 
  Bot, 
  Target, 
  Sliders, 
  Users, 
  BarChart2, 
  Building2, 
  Monitor, 
  Globe, 
  HardHat, 
  Wrench, 
  Layers, 
  User, 
  LogOut, 
  Zap,
  MessageSquare,
  FileCheck,
  Receipt,
  Kanban
} from 'lucide-react';
import { TeamMember, Role } from '../../types';
import { isSubnavVisible } from '../../lib/permissions';

interface NavButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const NavButton: React.FC<NavButtonProps> = ({ active, icon, label, onClick, badge, trailingIcon }) => (
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

export const SubNavButton: React.FC<SubNavButtonProps> = ({ active, label, icon, onClick }) => (
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

interface AppSidebarProps {
  logoUrl: string;
  activeTab: string;
  expandedNavModule: string | null;
  setExpandedNavModule: (mod: string | null) => void;
  toggleNavModule: (moduleName: string, onOpen?: () => void) => void;
  handleTabClick: (tab: string, subTab?: string) => void;
  getModuleAccess: (member: TeamMember | null | undefined, roles: Role[] | undefined, moduleId: string) => string;
  currentMember: TeamMember | null | undefined;
  roles: Role[];
  user: {
    photoURL?: string | null;
    displayName?: string | null;
    email?: string | null;
  };
  members: TeamMember[];
  logout: () => void;
  bootstrapData: () => void;
  isInitializingData: boolean;
  localDataFound: boolean;
  migrateFromLocalStorage: () => void;
  isMigrating: boolean;
  
  // Sub-tabs
  tasksSubTab: string;
  setTasksSubTab: (tab: any) => void;
  handleExportTasks: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  
  processSubTab: string;
  setProcessSubTab: (tab: any) => void;
  
  managementSubTab: string;
  setManagementSubTab: (tab: any) => void;
  
  acreditacionSubTab: string;
  setAcreditacionSubTab: (tab: any) => void;
  
  capacitacionSubTab: string;
  setCapacitacionSubTab: (tab: any) => void;
  
  qhseSubTab: string;
  setQhseSubTab: (tab: any) => void;
  
  marketingSubTab: string;
  setMarketingSubTab: (tab: any) => void;
  
  ventasSubTab: string;
  setVentasSubTab: (tab: any) => void;
  
  productosSubTab: string;
  setProductosSubTab: (tab: any) => void;
  
  inventarioSubTab?: string;
  setInventarioSubTab?: (tab: any) => void;

  commentsSubTab?: string;
  setCommentsSubTab?: (tab: any) => void;
  
  directorySubTab: string;
  setDirectorySubTab: (tab: any) => void;
  
  importacionesSubTab: string;
  setImportacionesSubTab: (tab: any) => void;
  
  settingsSubTab: string;
  handleSettingsSubTabClick: (subTab: string) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  logoUrl,
  activeTab,
  expandedNavModule,
  setExpandedNavModule,
  toggleNavModule,
  handleTabClick,
  getModuleAccess,
  currentMember,
  roles,
  user,
  members,
  logout,
  bootstrapData,
  isInitializingData,
  localDataFound,
  migrateFromLocalStorage,
  isMigrating,
  tasksSubTab,
  setTasksSubTab,
  commentsSubTab,
  setCommentsSubTab,
  handleExportTasks,
  fileInputRef,
  processSubTab,
  setProcessSubTab,
  managementSubTab,
  setManagementSubTab,
  acreditacionSubTab,
  setAcreditacionSubTab,
  capacitacionSubTab,
  setCapacitacionSubTab,
  qhseSubTab,
  setQhseSubTab,
  marketingSubTab,
  setMarketingSubTab,
  ventasSubTab,
  setVentasSubTab,
  productosSubTab,
  setProductosSubTab,
  inventarioSubTab = 'existencias',
  setInventarioSubTab,
  directorySubTab,
  setDirectorySubTab,
  importacionesSubTab,
  setImportacionesSubTab,
  settingsSubTab,
  handleSettingsSubTabClick
}) => {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-ng-black border-r border-ng-gray/10 z-10 hidden md:flex flex-col">
      <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
        <div className="flex items-center gap-3 text-ng-lime mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-ng-lime/10 transition-all duration-300">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <span className="font-black text-xl tracking-tighter text-white">Novagreen IA</span>
        </div>

        <nav className="space-y-1">
          {/* 1. Dashboard */}
          {getModuleAccess(currentMember, roles, 'dashboard') !== 'ninguno' && (
            <NavButton 
              active={activeTab === 'dashboard'} 
              icon={<TrendingUp size={20} />} 
              label="Dashboard" 
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
            const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
            const canSeeScrumPerms = isUserAdmin || getModuleAccess(currentMember, roles, 'tasks') === 'lider';
            const isTasksGroupActive = activeTab === 'tasks' || activeTab === 'planner' || activeTab === 'projects';
            const isTasksExpanded = expandedNavModule === 'tasks';

            if (!hasTasksAccess && !hasPlannerAccess && !hasProjectsAccess) return null;

            return (
              <React.Fragment key="sidebar_nav_group_tasks">
                <NavButton 
                  key="sidebar_nav_btn_tasks"
                  active={isTasksGroupActive} 
                  icon={<Kanban size={20} />} 
                  label="Scrum" 
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
                      key="sidebar_subnav_tasks"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-1 space-y-1 overflow-hidden"
                    >
                      {hasTasksAccess && (
                        <SubNavButton 
                          key="subnav_tasks_btn_board"
                          active={activeTab === 'tasks' && tasksSubTab === 'board'} 
                          label="Historias" 
                          icon={<CheckCircle2 size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('tasks');
                            handleTabClick('tasks');
                            setTasksSubTab('board');
                          }} 
                        />
                      )}
                      {hasProjectsAccess && (
                        <SubNavButton 
                          key="subnav_tasks_btn_projects"
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
                          key="subnav_tasks_btn_planner"
                          active={activeTab === 'planner'} 
                          label="Planificador IA" 
                          icon={<Calendar size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('tasks');
                            handleTabClick('planner');
                          }} 
                        />
                      )}
                      {hasTasksAccess && getModuleAccess(currentMember, roles, 'tasks_export') !== 'ninguno' && (
                        <SubNavButton 
                          key="subnav_tasks_btn_export"
                          active={false} 
                          label="Exportar tareas" 
                          icon={<Download size={14} />} 
                          onClick={handleExportTasks} 
                        />
                      )}
                      {hasTasksAccess && getModuleAccess(currentMember, roles, 'tasks_import') !== 'ninguno' && (
                        <SubNavButton 
                          key="subnav_tasks_btn_import"
                          active={false} 
                          label="Importar tareas" 
                          icon={<UploadCloud size={14} />} 
                          onClick={() => fileInputRef.current?.click()} 
                        />
                      )}
                      {canSeeScrumPerms && (
                        <SubNavButton 
                          key="subnav_tasks_btn_permissions"
                          active={activeTab === 'tasks' && tasksSubTab === 'permissions'} 
                          label="Permisos Scrum" 
                          icon={<Shield size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('tasks');
                            handleTabClick('tasks');
                            setTasksSubTab('permissions');
                          }} 
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })()}

          {/* Módulo Transversal: Colaboración */}
          {getModuleAccess(currentMember, roles, 'comments') !== 'ninguno' && (
            <React.Fragment key="sidebar_nav_group_comments">
              <NavButton 
                key="sidebar_nav_btn_comments"
                active={activeTab === 'comments'} 
                icon={<Users size={20} />} 
                label="Colaboración" 
                onClick={() => {
                  toggleNavModule('comments', () => {
                    handleTabClick('comments');
                    if (setCommentsSubTab) setCommentsSubTab('inbox');
                  });
                }} 
              />
              <AnimatePresence>
                {expandedNavModule === 'comments' && (
                  <motion.div 
                    key="sidebar_subnav_comments"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-8 mt-1 space-y-1 overflow-hidden"
                  >
                    <SubNavButton 
                      key="subnav_comments_inbox"
                      active={activeTab === 'comments' && (!commentsSubTab || commentsSubTab === 'inbox')} 
                      label="Comentarios" 
                      icon={<MessageSquare size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('comments');
                        handleTabClick('comments');
                        if (setCommentsSubTab) setCommentsSubTab('inbox');
                      }} 
                    />
                    <SubNavButton 
                      key="subnav_comments_notes"
                      active={activeTab === 'comments' && commentsSubTab === 'notes'} 
                      label="Notas" 
                      icon={<FileText size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('comments');
                        handleTabClick('comments');
                        if (setCommentsSubTab) setCommentsSubTab('notes');
                      }} 
                    />
                    <SubNavButton 
                      key="subnav_comments_links"
                      active={activeTab === 'comments' && commentsSubTab === 'links'} 
                      label="Enlaces de Interés" 
                      icon={<Bookmark size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('comments');
                        handleTabClick('comments');
                        if (setCommentsSubTab) setCommentsSubTab('links');
                      }} 
                    />
                    {(() => {
                      const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
                      const canSeeCommentsPerms = isUserAdmin || getModuleAccess(currentMember, roles, 'comments') === 'lider';
                      if (!canSeeCommentsPerms) return null;
                      return (
                        <SubNavButton 
                          key="subnav_comments_permissions"
                          active={activeTab === 'comments' && commentsSubTab === 'permissions'} 
                          label="Permisos" 
                          icon={<Shield size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('comments');
                            handleTabClick('comments');
                            if (setCommentsSubTab) setCommentsSubTab('permissions');
                          }} 
                        />
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          )}

          {/* 3. Gestión (Procesos / XD) */}
          {getModuleAccess(currentMember, roles, 'process_dashboard') !== 'ninguno' && (
            <React.Fragment key="sidebar_nav_group_process_dashboard">
              <NavButton 
                key="sidebar_nav_btn_process_dashboard"
                active={activeTab === 'process_dashboard'} 
                icon={<Activity size={20} />} 
                label="Gestión" 
                onClick={() => toggleNavModule('process_dashboard', () => handleTabClick('process_dashboard'))} 
              />
              <AnimatePresence>
                {expandedNavModule === 'process_dashboard' && (
                  <motion.div 
                    key="sidebar_subnav_process_dashboard"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-8 mt-1 space-y-1 overflow-hidden"
                  >
                    <SubNavButton 
                      key="subnav_proc_summary"
                      active={processSubTab === 'summary'} 
                      label="Horas e Historias" 
                      icon={<Clock size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('process_dashboard');
                        handleTabClick('process_dashboard');
                        setProcessSubTab('summary');
                      }} 
                    />
                    <SubNavButton 
                      key="subnav_proc_projects"
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
                      key="subnav_proc_notes"
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
                      key="subnav_proc_links"
                      active={processSubTab === 'links'} 
                      label="Enlaces de Interés" 
                      icon={<Bookmark size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('process_dashboard');
                        handleTabClick('process_dashboard');
                        setProcessSubTab('links');
                      }} 
                    />
                    {(() => {
                      const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
                      const canSeeProcPerms = isUserAdmin || getModuleAccess(currentMember, roles, 'process_dashboard') === 'lider';
                      if (!canSeeProcPerms) return null;
                      return (
                        <SubNavButton 
                          key="subnav_proc_permissions"
                          active={processSubTab === 'permissions'} 
                          label="Permisos" 
                          icon={<Shield size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('process_dashboard');
                            handleTabClick('process_dashboard');
                            setProcessSubTab('permissions');
                          }} 
                        />
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          )}

          {/* 4. Gerencia */}
          {getModuleAccess(currentMember, roles, 'gerencia') !== 'ninguno' && (
            <React.Fragment key="sidebar_nav_group_gerencia">
              <NavButton 
                key="sidebar_nav_btn_gerencia"
                active={activeTab === 'gerencia'} 
                icon={<Briefcase size={20} />} 
                label="Gerencia" 
                onClick={() => toggleNavModule('gerencia', () => handleTabClick('gerencia'))} 
              />
              <AnimatePresence>
                {expandedNavModule === 'gerencia' && (
                  <motion.div 
                    key="sidebar_subnav_gerencia"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-8 mt-1 space-y-1 overflow-hidden"
                  >
                    {isSubnavVisible(currentMember, 'links', 'gerencia') && (
                      <SubNavButton 
                        key="subnav_gerencia_links"
                        active={managementSubTab === 'links'} 
                        label="Enlaces de Interés" 
                        icon={<LinkIcon size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('gerencia');
                          handleTabClick('gerencia');
                          setManagementSubTab('links');
                        }} 
                      />
                    )}
                    {isSubnavVisible(currentMember, 'notes', 'gerencia') && (
                      <SubNavButton 
                        key="subnav_gerencia_notes"
                        active={managementSubTab === 'notes'} 
                        label="Notas" 
                        icon={<BookOpen size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('gerencia');
                          handleTabClick('gerencia');
                          setManagementSubTab('notes');
                        }} 
                      />
                    )}
                    <SubNavButton 
                      key="subnav_gerencia_consultant"
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
                      key="subnav_gerencia_strategy"
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
                      key="subnav_gerencia_governance"
                      active={managementSubTab === 'governance'} 
                      label="Gobernanza IA" 
                      icon={<Sliders size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('gerencia');
                        handleTabClick('gerencia');
                        setManagementSubTab('governance');
                      }} 
                    />
                    {(() => {
                      const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
                      const canSeeGerenciaPerms = isUserAdmin || getModuleAccess(currentMember, roles, 'gerencia') === 'lider';
                      if (!canSeeGerenciaPerms) return null;
                      return (
                        <SubNavButton 
                          key="subnav_gerencia_permissions"
                          active={managementSubTab === 'permissions'} 
                          label="Permisos" 
                          icon={<Shield size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('gerencia');
                            handleTabClick('gerencia');
                            setManagementSubTab('permissions');
                          }} 
                        />
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          )}

          {/* 5. Acreditación */}
          {getModuleAccess(currentMember, roles, 'acreditacion') !== 'ninguno' && (
            <React.Fragment key="sidebar_nav_group_acreditacion">
              <NavButton 
                key="sidebar_nav_btn_acreditacion"
                active={activeTab === 'acreditacion'} 
                icon={<Award size={20} />} 
                label="Acreditación" 
                onClick={() => toggleNavModule('acreditacion', () => handleTabClick('acreditacion'))} 
              />
              <AnimatePresence>
                {expandedNavModule === 'acreditacion' && (
                  <motion.div 
                    key="sidebar_subnav_acreditacion"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-8 mt-1 space-y-1 overflow-hidden"
                  >
                    {isSubnavVisible(currentMember, 'links', 'acreditacion') && (
                      <SubNavButton 
                        key="subnav_acred_links"
                        active={acreditacionSubTab === 'links'} 
                        label="Enlaces de Interés" 
                        icon={<Link2 size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('acreditacion');
                          handleTabClick('acreditacion');
                          setAcreditacionSubTab('links');
                        }} 
                      />
                    )}
                    {isSubnavVisible(currentMember, 'notes', 'acreditacion') && (
                      <SubNavButton 
                        key="subnav_acred_notes"
                        active={acreditacionSubTab === 'notes'} 
                        label="Notas" 
                        icon={<FileText size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('acreditacion');
                          handleTabClick('acreditacion');
                          setAcreditacionSubTab('notes');
                        }} 
                      />
                    )}
                    <SubNavButton 
                      key="subnav_acred_allies"
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
                      key="subnav_acred_certifications"
                      active={acreditacionSubTab === 'certifications'} 
                      label="Catálogo de Ofertas" 
                      icon={<Award size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('acreditacion');
                        handleTabClick('acreditacion');
                        setAcreditacionSubTab('certifications');
                      }} 
                    />
                    {(() => {
                      const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
                      const canSeeAcredPerms = isUserAdmin || getModuleAccess(currentMember, roles, 'acreditacion') === 'lider';
                      if (!canSeeAcredPerms) return null;
                      return (
                        <SubNavButton 
                          key="subnav_acred_permissions"
                          active={acreditacionSubTab === 'permissions'} 
                          label="Permisos" 
                          icon={<Shield size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('acreditacion');
                            handleTabClick('acreditacion');
                            setAcreditacionSubTab('permissions');
                          }} 
                        />
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          )}

          {/* 6. Capacitación */}
          {getModuleAccess(currentMember, roles, 'capacitacion') !== 'ninguno' && (
            <React.Fragment key="sidebar_nav_group_capacitacion">
              <NavButton 
                key="sidebar_nav_btn_capacitacion"
                active={activeTab === 'capacitacion'} 
                icon={<GraduationCap size={20} />} 
                label="Capacitación" 
                onClick={() => toggleNavModule('capacitacion', () => handleTabClick('capacitacion', 'calendar'))} 
              />
              <AnimatePresence>
                {expandedNavModule === 'capacitacion' && (
                  <motion.div 
                    key="sidebar_subnav_capacitacion"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-8 mt-1 space-y-1 overflow-hidden"
                  >
                    {isSubnavVisible(currentMember, 'links', 'capacitacion') && (
                      <SubNavButton 
                        key="subnav_cap_links"
                        active={capacitacionSubTab === 'links'} 
                        label="Enlaces de Interés" 
                        icon={<LinkIcon size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('capacitacion');
                          handleTabClick('capacitacion');
                          setCapacitacionSubTab('links');
                        }} 
                      />
                    )}
                    {isSubnavVisible(currentMember, 'notes', 'capacitacion') && (
                      <SubNavButton 
                        key="subnav_cap_notes"
                        active={capacitacionSubTab === 'notes'} 
                        label="Notas" 
                        icon={<FileText size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('capacitacion');
                          handleTabClick('capacitacion');
                          setCapacitacionSubTab('notes');
                        }} 
                      />
                    )}
                    {getModuleAccess(currentMember, roles, 'capacitacion_calendar') !== 'ninguno' && (
                      <SubNavButton 
                        key="subnav_cap_calendar"
                        active={capacitacionSubTab === 'calendar'} 
                        label="Calendario" 
                        icon={<Calendar size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('capacitacion');
                          handleTabClick('capacitacion');
                          setCapacitacionSubTab('calendar');
                        }} 
                      />
                    )}
                    {getModuleAccess(currentMember, roles, 'capacitacion_management') !== 'ninguno' && (
                      <SubNavButton 
                        key="subnav_cap_management"
                        active={capacitacionSubTab === 'management'} 
                        label="Gestión de Capacitaciones" 
                        icon={<BarChart2 size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('capacitacion');
                          handleTabClick('capacitacion');
                          setCapacitacionSubTab('management');
                        }} 
                      />
                    )}
                    {getModuleAccess(currentMember, roles, 'capacitacion_trainers') !== 'ninguno' && (
                      <SubNavButton 
                        key="subnav_cap_trainers"
                        active={capacitacionSubTab === 'trainers'} 
                        label="Capacitadores" 
                        icon={<Users size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('capacitacion');
                          handleTabClick('capacitacion');
                          setCapacitacionSubTab('trainers');
                        }} 
                      />
                    )}
                    {getModuleAccess(currentMember, roles, 'capacitacion_physical_spaces') !== 'ninguno' && (
                      <SubNavButton 
                        key="subnav_cap_physical_spaces"
                        active={capacitacionSubTab === 'physical_spaces'} 
                        label="Lugares" 
                        icon={<Building2 size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('capacitacion');
                          handleTabClick('capacitacion');
                          setCapacitacionSubTab('physical_spaces');
                        }} 
                      />
                    )}
                    {getModuleAccess(currentMember, roles, 'capacitacion_virtual_spaces') !== 'ninguno' && (
                      <SubNavButton 
                        key="subnav_cap_virtual_spaces"
                        active={capacitacionSubTab === 'virtual_spaces'} 
                        label="Aulas Virtuales" 
                        icon={<Monitor size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('capacitacion');
                          handleTabClick('capacitacion');
                          setCapacitacionSubTab('virtual_spaces');
                        }} 
                      />
                    )}
                    {(() => {
                      const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
                      const canSeeCapPerms = isUserAdmin || getModuleAccess(currentMember, roles, 'capacitacion') === 'lider';
                      if (!canSeeCapPerms) return null;
                      return (
                        <SubNavButton 
                          key="subnav_cap_permissions"
                          active={capacitacionSubTab === 'permissions'} 
                          label="Permisos" 
                          icon={<Shield size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('capacitacion');
                            handleTabClick('capacitacion');
                            setCapacitacionSubTab('permissions');
                          }} 
                        />
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          )}

          {/* 7. QHSE */}
          {getModuleAccess(currentMember, roles, 'qhse') !== 'ninguno' && (
            <React.Fragment key="sidebar_nav_group_qhse">
              <NavButton 
                key="sidebar_nav_btn_qhse"
                active={activeTab === 'qhse'} 
                icon={<ShieldCheck size={20} />} 
                label="QHSE" 
                onClick={() => toggleNavModule('qhse', () => handleTabClick('qhse'))} 
              />
              <AnimatePresence>
                {expandedNavModule === 'qhse' && (
                  <motion.div 
                    key="sidebar_subnav_qhse"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-8 mt-1 space-y-1 overflow-hidden"
                  >
                    {isSubnavVisible(currentMember, 'links', 'qhse') && (
                      <SubNavButton 
                        key="subnav_qhse_links"
                        active={qhseSubTab === 'links'} 
                        label="Enlaces de Interés" 
                        icon={<LinkIcon size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('qhse');
                          handleTabClick('qhse');
                          setQhseSubTab('links');
                        }} 
                      />
                    )}
                    {isSubnavVisible(currentMember, 'notes', 'qhse') && (
                      <SubNavButton 
                        key="subnav_qhse_notes"
                        active={qhseSubTab === 'notes'} 
                        label="Notas" 
                        icon={<FileText size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('qhse');
                          handleTabClick('qhse');
                          setQhseSubTab('notes');
                        }} 
                      />
                    )}
                    {(() => {
                      const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
                      const canSeeQhsePerms = isUserAdmin || getModuleAccess(currentMember, roles, 'qhse') === 'lider';
                      if (!canSeeQhsePerms) return null;
                      return (
                        <SubNavButton 
                          key="subnav_qhse_permissions"
                          active={qhseSubTab === 'permissions'} 
                          label="Permisos" 
                          icon={<Shield size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('qhse');
                            handleTabClick('qhse');
                            setQhseSubTab('permissions');
                          }} 
                        />
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          )}

          {/* 8. Marketing */}
          {getModuleAccess(currentMember, roles, 'marketing') !== 'ninguno' && (
            <React.Fragment key="sidebar_nav_group_marketing">
              <NavButton 
                key="sidebar_nav_btn_marketing"
                active={activeTab === 'marketing'} 
                icon={<Megaphone size={20} />} 
                label="Marketing" 
                onClick={() => toggleNavModule('marketing', () => handleTabClick('marketing'))} 
              />
              <AnimatePresence>
                {expandedNavModule === 'marketing' && (
                  <motion.div 
                    key="sidebar_subnav_marketing"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-8 mt-1 space-y-1 overflow-hidden"
                  >
                    {isSubnavVisible(currentMember, 'links', 'marketing') && (
                      <SubNavButton 
                        key="subnav_mkt_links"
                        active={marketingSubTab === 'links'} 
                        label="Enlaces de Interés" 
                        icon={<LinkIcon size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('marketing');
                          handleTabClick('marketing');
                          setMarketingSubTab('links');
                        }} 
                      />
                    )}
                    {isSubnavVisible(currentMember, 'notes', 'marketing') && (
                      <SubNavButton 
                        key="subnav_mkt_notes"
                        active={marketingSubTab === 'notes'} 
                        label="Notas" 
                        icon={<FileText size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('marketing');
                          handleTabClick('marketing');
                          setMarketingSubTab('notes');
                        }} 
                      />
                    )}
                    <SubNavButton 
                      key="subnav_mkt_campaigns"
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
                      key="subnav_mkt_calendar"
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
                      key="subnav_mkt_metrics"
                      active={marketingSubTab === 'metrics_analytics'} 
                      label="Métricas & KPIs" 
                      icon={<BarChart2 size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('marketing');
                        handleTabClick('marketing');
                        setMarketingSubTab('metrics_analytics');
                      }} 
                    />
                    {(() => {
                      const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
                      const canSeeMarketingPerms = isUserAdmin || getModuleAccess(currentMember, roles, 'marketing') === 'lider';
                      if (!canSeeMarketingPerms) return null;
                      return (
                        <SubNavButton 
                          key="subnav_mkt_permissions"
                          active={marketingSubTab === 'permissions'} 
                          label="Permisos" 
                          icon={<Shield size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('marketing');
                            handleTabClick('marketing');
                            setMarketingSubTab('permissions');
                          }} 
                        />
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          )}

          {/* 9. Ventas */}
          {getModuleAccess(currentMember, roles, 'ventas') !== 'ninguno' && (
            <React.Fragment key="sidebar_nav_group_ventas">
              <NavButton 
                key="sidebar_nav_btn_ventas"
                active={activeTab === 'ventas'} 
                icon={<DollarSign size={20} />} 
                label="Ventas" 
                onClick={() => toggleNavModule('ventas', () => handleTabClick('ventas'))} 
              />
              <AnimatePresence>
                {expandedNavModule === 'ventas' && (
                  <motion.div 
                    key="sidebar_subnav_ventas"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-8 mt-1 space-y-1 overflow-hidden"
                  >
                    {isSubnavVisible(currentMember, 'links', 'ventas') && (
                      <SubNavButton 
                        key="subnav_ventas_links"
                        active={ventasSubTab === 'links'} 
                        label="Enlaces de Interés" 
                        icon={<LinkIcon size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('ventas');
                          handleTabClick('ventas');
                          setVentasSubTab('links');
                        }} 
                      />
                    )}
                    {isSubnavVisible(currentMember, 'notes', 'ventas') && (
                      <SubNavButton 
                        key="subnav_ventas_notes"
                        active={ventasSubTab === 'notes'} 
                        label="Notas" 
                        icon={<FileText size={14} />} 
                        onClick={() => {
                          setExpandedNavModule('ventas');
                          handleTabClick('ventas');
                          setVentasSubTab('notes');
                        }} 
                      />
                    )}
                    <SubNavButton 
                      key="subnav_ventas_crm"
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
                      key="subnav_ventas_pipeline"
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
                      key="subnav_ventas_quotes"
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
                      key="subnav_ventas_goals"
                      active={ventasSubTab === 'goals'} 
                      label="Metas & KPIs" 
                      icon={<BarChart2 size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('ventas');
                        handleTabClick('ventas');
                        setVentasSubTab('goals');
                      }} 
                    />
                    {(() => {
                      const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
                      const canSeeVentasPerms = isUserAdmin || getModuleAccess(currentMember, roles, 'ventas') === 'lider';
                      if (!canSeeVentasPerms) return null;
                      return (
                        <SubNavButton 
                          key="subnav_ventas_permissions"
                          active={ventasSubTab === 'permissions'} 
                          label="Permisos" 
                          icon={<Shield size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('ventas');
                            handleTabClick('ventas');
                            setVentasSubTab('permissions');
                          }} 
                        />
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          )}

          {/* 10. Productos */}
          {getModuleAccess(currentMember, roles, 'productos') !== 'ninguno' && (
            <React.Fragment key="sidebar_nav_group_productos">
              <NavButton 
                key="sidebar_nav_btn_productos"
                active={activeTab === 'productos'} 
                icon={<Boxes size={20} />} 
                label="Productos" 
                onClick={() => toggleNavModule('productos', () => handleTabClick('productos'))} 
              />
              <AnimatePresence>
                {expandedNavModule === 'productos' && (
                  <motion.div 
                    key="sidebar_subnav_productos"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-8 mt-1 space-y-1 overflow-hidden"
                  >
                    <SubNavButton 
                      key="subnav_prod_todos"
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
                      key="subnav_prod_cert"
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
                      key="subnav_prod_cap"
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
                      key="subnav_prod_qhse"
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
                      key="subnav_prod_epp"
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
                      key="subnav_prod_equipos"
                      active={productosSubTab === 'equipos'} 
                      label="Equipos" 
                      icon={<Wrench size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('productos');
                        handleTabClick('productos');
                        setProductosSubTab('equipos');
                      }} 
                    />
                    {(() => {
                      const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
                      const canSeeProdPerms = isUserAdmin || getModuleAccess(currentMember, roles, 'productos') === 'lider';
                      if (!canSeeProdPerms) return null;
                      return (
                        <SubNavButton 
                          key="subnav_prod_permissions"
                          active={productosSubTab === 'permissions'} 
                          label="Permisos" 
                          icon={<Shield size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('productos');
                            handleTabClick('productos');
                            setProductosSubTab('permissions');
                          }} 
                        />
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          )}

          {/* Inventario & Bodegas */}
          {getModuleAccess(currentMember, roles, 'inventario') !== 'ninguno' && (
            <React.Fragment key="sidebar_nav_group_inventario">
              <NavButton 
                key="sidebar_nav_btn_inventario"
                active={activeTab === 'inventario'} 
                icon={<Package size={20} />} 
                label="Inventario" 
                onClick={() => {
                  toggleNavModule('inventario', () => {
                    handleTabClick('inventario');
                    if (setInventarioSubTab) setInventarioSubTab('existencias');
                  });
                }} 
                trailingIcon={
                  <span className={`text-[10px] transition-transform duration-200 inline-block ${expandedNavModule === 'inventario' ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                }
              />
              <AnimatePresence>
                {expandedNavModule === 'inventario' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-6 space-y-1 overflow-hidden py-1 border-l border-white/5 ml-5 my-1"
                  >
                    <SubNavButton 
                      key="subnav_inv_existencias"
                      active={inventarioSubTab === 'existencias'} 
                      label="Existencias & Stock" 
                      icon={<Layers size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('inventario');
                        handleTabClick('inventario');
                        if (setInventarioSubTab) setInventarioSubTab('existencias');
                      }} 
                    />
                    <SubNavButton 
                      key="subnav_inv_bodegas"
                      active={inventarioSubTab === 'bodegas'} 
                      label="Gestión de Bodegas" 
                      icon={<Building2 size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('inventario');
                        handleTabClick('inventario');
                        if (setInventarioSubTab) setInventarioSubTab('bodegas');
                      }} 
                    />
                    <SubNavButton 
                      key="subnav_inv_solicitudes"
                      active={inventarioSubTab === 'solicitudes'} 
                      label="Entrega de EPP" 
                      icon={<FileCheck size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('inventario');
                        handleTabClick('inventario');
                        if (setInventarioSubTab) setInventarioSubTab('solicitudes');
                      }} 
                    />
                    <SubNavButton 
                      key="subnav_inv_facturas"
                      active={inventarioSubTab === 'facturas'} 
                      label="Carga por Factura" 
                      icon={<Receipt size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('inventario');
                        handleTabClick('inventario');
                        if (setInventarioSubTab) setInventarioSubTab('facturas');
                      }} 
                    />
                    {(() => {
                      const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
                      const canSeeInvPerms = isUserAdmin || getModuleAccess(currentMember, roles, 'inventario') === 'lider';
                      if (!canSeeInvPerms) return null;
                      return (
                        <SubNavButton 
                          key="subnav_inv_permissions"
                          active={inventarioSubTab === 'permissions'} 
                          label="Permisos" 
                          icon={<Shield size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('inventario');
                            handleTabClick('inventario');
                            if (setInventarioSubTab) setInventarioSubTab('permissions');
                          }} 
                        />
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          )}

          {/* 11. Directorio */}
          {getModuleAccess(currentMember, roles, 'directory') !== 'ninguno' && (
            <React.Fragment key="sidebar_nav_group_directory">
              <NavButton 
                key="sidebar_nav_btn_directory"
                active={activeTab === 'directory'} 
                icon={<Contact size={20} />} 
                label="Directorio" 
                onClick={() => toggleNavModule('directory', () => handleTabClick('directory', 'people'))} 
              />
              <AnimatePresence>
                {expandedNavModule === 'directory' && (
                  <motion.div 
                    key="sidebar_subnav_directory"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-8 mt-1 space-y-1 overflow-hidden"
                  >
                    <SubNavButton 
                      key="subnav_dir_people"
                      active={directorySubTab === 'people'} 
                      label="Personas" 
                      icon={<User size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('directory');
                        setDirectorySubTab('people');
                      }} 
                    />
                    <SubNavButton 
                      key="subnav_dir_companies"
                      active={directorySubTab === 'companies'} 
                      label="Compañías" 
                      icon={<Building2 size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('directory');
                        setDirectorySubTab('companies');
                      }} 
                    />
                    <SubNavButton 
                      key="subnav_dir_industries"
                      active={directorySubTab === 'industries'} 
                      label="Industrias" 
                      icon={<Layers size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('directory');
                        setDirectorySubTab('industries');
                      }} 
                    />
                    {(() => {
                      const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
                      const canSeeDirPerms = isUserAdmin || getModuleAccess(currentMember, roles, 'directory') === 'lider';
                      if (!canSeeDirPerms) return null;
                      return (
                        <SubNavButton 
                          key="subnav_dir_permissions"
                          active={directorySubTab === 'permissions'} 
                          label="Permisos" 
                          icon={<Shield size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('directory');
                            setDirectorySubTab('permissions');
                          }} 
                        />
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          )}

          {/* 12. Importaciones */}
          {getModuleAccess(currentMember, roles, 'importaciones') !== 'ninguno' && (
            <React.Fragment key="sidebar_nav_group_importaciones">
              <NavButton 
                key="sidebar_nav_btn_importaciones"
                active={activeTab === 'importaciones'} 
                icon={<Package size={20} />} 
                label="Importaciones" 
                onClick={() => toggleNavModule('importaciones', () => handleTabClick('importaciones'))} 
              />
              <AnimatePresence>
                {expandedNavModule === 'importaciones' && (
                  <motion.div 
                    key="sidebar_subnav_importaciones"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-8 mt-1 space-y-1 overflow-hidden"
                  >
                    <SubNavButton 
                      key="subnav_imp_products"
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
                      key="subnav_imp_suppliers"
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
                      key="subnav_imp_proformas"
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
                      key="subnav_imp_upload_proforma"
                      active={importacionesSubTab === 'upload_proforma'} 
                      label="Cargar y Validar" 
                      icon={<UploadCloud size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('importaciones');
                        handleTabClick('importaciones');
                        setImportacionesSubTab('upload_proforma');
                      }} 
                    />
                    {(() => {
                      const isUserAdmin = Boolean(currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin');
                      const canSeeImpPerms = isUserAdmin || getModuleAccess(currentMember, roles, 'importaciones') === 'lider';
                      if (!canSeeImpPerms) return null;
                      return (
                        <SubNavButton 
                          key="subnav_imp_permissions"
                          active={importacionesSubTab === 'permissions'} 
                          label="Permisos" 
                          icon={<Shield size={14} />} 
                          onClick={() => {
                            setExpandedNavModule('importaciones');
                            handleTabClick('importaciones');
                            setImportacionesSubTab('permissions');
                          }} 
                        />
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          )}

          {/* 13. Analizar Reunión */}
          {getModuleAccess(currentMember, roles, 'transcript') !== 'ninguno' && (
            <NavButton 
              key="sidebar_nav_btn_transcript"
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
            <React.Fragment key="sidebar_nav_group_settings">
              <NavButton 
                key="sidebar_nav_btn_settings"
                active={activeTab === 'settings'} 
                icon={<Settings size={20} />} 
                label="Configuración" 
                onClick={() => toggleNavModule('settings', () => handleTabClick('settings'))} 
              />
              <AnimatePresence>
                {expandedNavModule === 'settings' && (
                  <motion.div 
                    key="sidebar_subnav_settings"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-8 mt-1 space-y-1 overflow-hidden"
                  >
                    <SubNavButton 
                      key="subnav_settings_roles"
                      active={settingsSubTab === 'roles'} 
                      label="Permisos" 
                      icon={<Shield size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('settings');
                        handleSettingsSubTabClick('roles');
                      }} 
                    />
                    <SubNavButton 
                      key="subnav_settings_processes"
                      active={settingsSubTab === 'processes'} 
                      label="Procesos" 
                      icon={<Building2 size={14} />} 
                      onClick={() => {
                        setExpandedNavModule('settings');
                        handleSettingsSubTabClick('processes');
                      }} 
                    />
                    <SubNavButton 
                      key="subnav_settings_members"
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
            </React.Fragment>
          )}
        </nav>
      </div>

      <div className="mt-auto p-3 border-t border-ng-gray/10 shrink-0">
        <div className="bg-ng-gray/5 p-2.5 rounded-xl border border-ng-gray/10 flex items-center justify-between gap-2.5">
          {/* Avatar with Status Indicator */}
          <div className="relative shrink-0" title={`Usuario: ${currentMember?.name || user.displayName || 'Usuario'}`}>
            <img 
              src={currentMember?.avatar || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentMember?.name || user.displayName || 'Usuario')}&background=84cc16&color=000`} 
              className="w-8 h-8 rounded-lg border border-ng-gray/20 object-cover" 
              alt={currentMember?.name || user.displayName || 'User'} 
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-ng-lime border-2 border-ng-black animate-pulse" />
          </div>

          {/* Compact User Info */}
          <div className="overflow-hidden flex-1 text-left min-w-0" title={`${currentMember?.name || user.displayName || ''} (${user.email || ''})${currentMember?.role ? ` - ${currentMember.role}` : ''}`}>
            <p className="text-xs font-black text-white truncate leading-tight">
              {currentMember?.name || user.displayName || 'Usuario'}
            </p>
            <p className="text-[10px] font-bold text-ng-lime/80 truncate leading-tight">
              {currentMember?.role || user.email}
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
  );
};
