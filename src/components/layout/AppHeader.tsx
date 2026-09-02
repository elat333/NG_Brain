import React from 'react';
import { 
  Building2, 
  FolderKanban, 
  Plus, 
  UserPlus, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  Users, 
  Table, 
  Trello, 
  Save, 
  Info, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Check, 
  ChevronRight, 
  User,
  X
} from 'lucide-react';
import { Process, TeamMember, Task } from '../../types';
import { normalizeText } from '../../lib/textUtils';

export interface AppHeaderProps {
  activeTab: string;
  settingsSubTab?: string;
  setSettingsSubTab?: (tab: any) => void;
  isReadOnly?: boolean;
  selectedProcessId?: string;
  setSelectedProcessId?: (id: string) => void;
  processes?: Process[];
  selectedProcess?: Process;
  processSubTab?: string;
  setProcessSubTab?: (tab: any) => void;
  tasksSubTab?: string;
  setTasksSubTab?: (tab: any) => void;
  taskViewMode?: 'list' | 'kanban' | 'board' | 'calendar' | string;
  setTaskViewMode?: (mode: any) => void;
  openTaskModal?: (task?: Task) => void;
  setIsBulkModalOpen?: (open: boolean) => void;
  setIsExportModalOpen?: (open: boolean) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  selectedMemberFilter?: string;
  setSelectedMemberFilter?: (id: string) => void;
  selectedStatusFilter?: string;
  setSelectedStatusFilter?: (status: string) => void;
  selectedPriorityFilter?: string;
  setSelectedPriorityFilter?: (priority: string) => void;
  members?: TeamMember[];
  currentMember?: TeamMember | null | undefined;
  tasks?: Task[];
  filteredTasks?: Task[];
  openAddProject?: () => void;
  openAddProcess?: () => void;
  openAddMember?: () => void;
  openAddCompany?: () => void;
  openAddPerson?: () => void;
  openAddIndustry?: () => void;
  directorySubTab?: string;
  setDirectorySubTab?: (tab: any) => void;
  managementSubTab?: string;
  setManagementSubTab?: (tab: any) => void;
  acreditacionSubTab?: string;
  setAcreditacionSubTab?: (tab: any) => void;
  capacitacionSubTab?: string;
  setCapacitacionSubTab?: (tab: any) => void;
  qhseSubTab?: string;
  setQhseSubTab?: (tab: any) => void;
  importacionesSubTab?: string;
  setImportacionesSubTab?: (tab: any) => void;
  marketingSubTab?: string;
  setMarketingSubTab?: (tab: any) => void;
  ventasSubTab?: string;
  setVentasSubTab?: (tab: any) => void;
  productosSubTab?: string;
  setProductosSubTab?: (tab: any) => void;
  accessibleProcesses?: Process[];
  showFicha?: boolean;
  setShowFicha?: (show: boolean) => void;
  projects?: any[];
  roles?: any[];
  getModuleAccess?: (member: any, roles: any, moduleId: string) => string;
  smartFilters?: any;
  setSmartFilters?: (filters: any) => void;
  showSmartDropdown?: boolean;
  setShowSmartDropdown?: (show: boolean) => void;
  activeSuggestionCategory?: string;
  setActiveSuggestionCategory?: (cat: any) => void;
  sortedMembers?: any[];
  isAddingMember?: boolean;
  editingMember?: any;
  setEditingMember?: (member: any) => void;
  setNewMemberData?: (data: any) => void;
  setIsAddingMember?: (adding: boolean) => void;
  setIsMemberAssistantOpen?: (open: boolean) => void;
  setEditingProcess?: (process: any) => void;
  setNewProcessData?: (data: any) => void;
  setIsAddingProcess?: (adding: boolean) => void;
  showCompletedProjects?: boolean;
  setShowCompletedProjects?: (show: boolean) => void;
  canCreateProjects?: boolean;
  setEditingProject?: (project: any) => void;
  setNewProjectData?: (data: any) => void;
  setIsAddingProject?: (adding: boolean) => void;
  isAddingTask?: boolean;
  editingTask?: any;
  handleImportTasks?: (e: any) => void;
  exportTasksBackup?: (tasks: any) => void;
  openAddTaskModal?: (status?: any) => void;
  setEditingCompany?: (company: any) => void;
  setNewCompanyData?: (data: any) => void;
  setIsAddingCompany?: (adding: boolean) => void;
  isInitializingData?: boolean;
  localDataFound?: boolean;
  isMigrating?: boolean;
  bootstrapData?: () => void;
  migrateFromLocalStorage?: () => void;
  handleExportTasks?: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  [key: string]: any;
}

export const AppHeader: React.FC<AppHeaderProps> = (props) => {
  const {
    activeTab,
    settingsSubTab,
    setSettingsSubTab,
    isReadOnly,
    selectedProcessId,
    setSelectedProcessId,
    processes,
    selectedProcess,
    processSubTab,
    setProcessSubTab,
    tasksSubTab,
    setTasksSubTab,
    taskViewMode,
    setTaskViewMode,
    openTaskModal,
    setIsBulkModalOpen,
    setIsExportModalOpen,
    searchQuery,
    setSearchQuery,
    selectedMemberFilter,
    setSelectedMemberFilter,
    selectedStatusFilter,
    setSelectedStatusFilter,
    selectedPriorityFilter,
    setSelectedPriorityFilter,
    members,
    currentMember,
    tasks,
    filteredTasks,
    openAddProject,
    openAddProcess,
    openAddMember,
    openAddCompany,
    openAddPerson,
    openAddIndustry,
    directorySubTab,
    setDirectorySubTab,
    managementSubTab,
    setManagementSubTab,
    acreditacionSubTab,
    setAcreditacionSubTab,
    capacitacionSubTab,
    setCapacitacionSubTab,
    qhseSubTab,
    setQhseSubTab,
    importacionesSubTab,
    setImportacionesSubTab,
    marketingSubTab,
    setMarketingSubTab,
    ventasSubTab,
    setVentasSubTab,
    productosSubTab,
    setProductosSubTab,
    getAccessLevel,
    isInitializingData,
    localDataFound,
    isMigrating,
    bootstrapData,
    migrateFromLocalStorage,
    handleExportTasks,
    fileInputRef,
    projects = [],
    roles = [],
    getModuleAccess = () => 'lector',
    smartFilters = { projectId: null, memberId: null, processId: null, auxiliaryId: null, status: null },
    setSmartFilters = () => {},
    showSmartDropdown = false,
    setShowSmartDropdown = () => {},
    activeSuggestionCategory = 'all',
    setActiveSuggestionCategory = () => {},
    sortedMembers = [],
    isAddingMember = false,
    editingMember = null,
    setEditingMember = () => {},
    setNewMemberData = () => {},
    setIsAddingMember = () => {},
    setIsMemberAssistantOpen = () => {},
    setEditingProcess = () => {},
    setNewProcessData = () => {},
    setIsAddingProcess = () => {},
    showCompletedProjects = false,
    setShowCompletedProjects = () => {},
    canCreateProjects = false,
    setEditingProject = () => {},
    setNewProjectData = () => {},
    setIsAddingProject = () => {},
    isAddingTask = false,
    editingTask = null,
    handleImportTasks = () => {},
    exportTasksBackup = () => {},
    openAddTaskModal = () => openTaskModal?.(),
    setEditingCompany = () => {},
    setNewCompanyData = () => {},
    setIsAddingCompany = () => {},
    accessibleProcesses = processes,
    showFicha = false,
    setShowFicha = () => {}
  } = props;

  return (
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
                    {accessibleProcesses.map((p, pIdx) => (
                      <option key={`header_proc_${p.id || pIdx}_${pIdx}`} value={p.id}>{p.name}</option>
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
                              {projects.filter(p => normalizeText(p.name).includes(normalizeText(searchQuery))).map((p, pIdx) => (
                                <button 
                                  key={`smart_search_p_${p.id || pIdx}_${pIdx}`}
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
                              {sortedMembers.filter(m => normalizeText(m.name).includes(normalizeText(searchQuery))).map((m, mIdx) => (
                                <React.Fragment key={`smart_search_m_${m.id || mIdx}_${mIdx}`}>
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
                              {processes.filter(p => normalizeText(p.name).includes(normalizeText(searchQuery))).map((p, procIdx) => (
                                <button 
                                  key={`smart_search_proc_${p.id || procIdx}_${procIdx}`}
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
                          {projects.map((p, pIdx) => (
                            <button
                              key={`smart_filter_proj_${p.id || pIdx}_${pIdx}`}
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
                          {sortedMembers.map((m, mIdx) => (
                            <button
                              key={`smart_filter_member_${m.id || mIdx}_${mIdx}`}
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
                          {processes.map((p, procIdx) => (
                            <button
                              key={`smart_filter_proc_${p.id || procIdx}_${procIdx}`}
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
                          {sortedMembers.map((m, auxIdx) => (
                            <button
                              key={`smart_filter_aux_${m.id || auxIdx}_${auxIdx}`}
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
                          ].map((st, stIdx) => (
                            <button
                              key={`smart_filter_status_${st.id || stIdx}_${stIdx}`}
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

  );
};
