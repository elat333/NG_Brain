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
  Zap 
} from 'lucide-react';
import { TeamMember, Role } from '../../types';

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
  setTasksSubTab: (tab: 'board' | 'permissions') => void;
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
  
  directorySubTab: string;
  setDirectorySubTab: (tab: 'people' | 'companies' | 'industries') => void;
  
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
                      key="sidebar_subnav_tasks"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-1 space-y-1 overflow-hidden"
                    >
                      {hasTasksAccess && (
                        <>
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
                    key="sidebar_subnav_process_dashboard"
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
                    key="sidebar_subnav_gerencia"
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
                    key="sidebar_subnav_acreditacion"
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
                    key="sidebar_subnav_capacitacion"
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
                    key="sidebar_subnav_qhse"
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
                    key="sidebar_subnav_marketing"
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
                    key="sidebar_subnav_ventas"
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
                    key="sidebar_subnav_productos"
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
                    key="sidebar_subnav_directory"
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
                    key="sidebar_subnav_importaciones"
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
                    key="sidebar_subnav_settings"
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
  );
};
