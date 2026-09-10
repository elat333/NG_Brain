import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Lock } from 'lucide-react';
import { 
  TeamMember, Process, Task, Project, Company, 
  Industry, Role, ProcessLink, ProcessNote, ManagementNote, 
  ManagementStrategyData, ManagementAIGovernanceData, ProductItem 
} from '../../types';
import { ProcessDashboardView } from '../processes/ProcessDashboardView';
import { TasksView } from '../tasks/TasksView';
import { ManagementView } from '../management/ManagementView';
import { ImportacionesView } from '../importaciones/ImportacionesView';
import { MarketingView } from '../marketing/MarketingView';
import { TrainingView } from '../training/TrainingView';
import { SalesView } from '../sales/SalesView';
import { AcreditacionView } from '../acreditacion/AcreditacionView';
import { ProductsView } from '../products/ProductsView';
import { QHSEView } from '../qhse/QHSEView';
import { SettingsContainerView } from '../settings/SettingsContainerView';
import { DashboardView } from '../dashboard/DashboardView';
import { ProjectsView } from '../projects/ProjectsView';
import DirectoryView from '../directory/DirectoryView';
import { PlannerView } from '../planner/PlannerView';
import { TranscriptView } from '../transcript/TranscriptView';
import { MainTabType, SettingsSubTabType, DirectorySubTabType, ProcessSubTabType, ManagementSubTabType, ImportacionesSubTabType, AcreditacionSubTabType, VentasSubTabType } from '../../hooks/useAppNavigation';
import { MarketingSubTab } from '../MarketingModule';
import { CapacitacionSubTab } from '../CapacitacionModule';
import { ProductSubTab } from '../ProductosModule';
import { QHSESubTab } from '../QHSEModule';
import { TableFiltersState, TableSortState } from '../../hooks/useTaskFilters';

export interface AppMainContentProps {
  activeTab: MainTabType;
  activeTabAccess: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  currentMember: TeamMember | null | undefined;
  roles: Role[];
  members: TeamMember[];
  sortedMembers: TeamMember[];
  processes: Process[];
  projects: Project[];
  companies: Company[];
  industries: Industry[];
  setIndustries: React.Dispatch<React.SetStateAction<Industry[]>>;
  tasks: Task[];
  filteredTasks: Task[];
  sortedTasks: Task[];
  products: ProductItem[];
  processLinks: ProcessLink[];
  processNotes: ProcessNote[];
  managementNotes: ManagementNote[];
  managementStrategy: ManagementStrategyData | null;
  managementGovernance: ManagementAIGovernanceData | null;
  getModuleAccess: (member: TeamMember | null | undefined, roles: Role[], moduleKey: string) => any;
  isTaskVisibleForMember: (task: Task, member: TeamMember | null | undefined, roles: Role[]) => boolean;
  normalizeText: (text: string) => string;
  parseLocalDate: (dateStr: string | null | undefined) => Date | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  // Sub-tabs
  managementSubTab: ManagementSubTabType;
  setManagementSubTab: (tab: ManagementSubTabType) => void;
  processSubTab: ProcessSubTabType;
  setProcessSubTab: (tab: ProcessSubTabType) => void;
  ventasSubTab: VentasSubTabType;
  setVentasSubTab: (tab: VentasSubTabType) => void;
  capacitacionSubTab: CapacitacionSubTab;
  setCapacitacionSubTab: (tab: CapacitacionSubTab) => void;
  acreditacionSubTab: AcreditacionSubTabType;
  setAcreditacionSubTab: (tab: AcreditacionSubTabType) => void;
  productosSubTab: ProductSubTab;
  setProductosSubTab: (tab: ProductSubTab) => void;
  qhseSubTab: QHSESubTab;
  setQhseSubTab: (tab: QHSESubTab) => void;
  importacionesSubTab: ImportacionesSubTabType;
  setImportacionesSubTab: (tab: ImportacionesSubTabType) => void;
  marketingSubTab: MarketingSubTab;
  setMarketingSubTab: (tab: MarketingSubTab) => void;
  directorySubTab: DirectorySubTabType;
  handleDirectorySubTabClick: (tab: DirectorySubTabType) => void;
  settingsSubTab: SettingsSubTabType;
  tasksSubTab: 'board' | 'permissions';
  taskViewMode: 'board' | 'list' | 'calendar';
  // Selected Process & Ficha
  selectedProcessId: string;
  setSelectedProcessId: (id: string) => void;
  showFicha: boolean;
  setShowFicha: (show: boolean) => void;
  // Management Updates
  handleUpdateManagementNotes: (notes: ManagementNote[]) => Promise<void>;
  handleUpdateManagementStrategy: (strategy: ManagementStrategyData) => Promise<void>;
  handleUpdateManagementGovernance: (governance: ManagementAIGovernanceData) => Promise<void>;
  // Navigation
  handleTabClick: (tab: MainTabType) => void;
  setActiveTab: (tab: MainTabType) => void;
  // Task Handlers
  openAddTaskModal: (status?: any, initialOverrides?: Partial<Task>) => void;
  openEditTask: (task: Task) => void;
  updateTaskStatus: (taskId: string, newStatus: any) => Promise<void>;
  handleDeleteTask: (taskId: string, e?: React.MouseEvent) => void;
  createActivityAsTask: (activity: any) => void | Promise<void>;
  // Task Filters
  tableFilters: TableFiltersState;
  setTableFilters: React.Dispatch<React.SetStateAction<TableFiltersState>>;
  tableSort: TableSortState;
  setTableSort: React.Dispatch<React.SetStateAction<TableSortState>>;
  handleTableSort: (column: any) => void;
  collapsedColumns: Record<string, boolean>;
  setCollapsedColumns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showAllDoneTasks: boolean;
  setShowAllDoneTasks: (show: boolean) => void;
  // Entity Handlers
  isAddingMember: boolean;
  setIsAddingMember: (isAdding: boolean) => void;
  editingMember: TeamMember | null;
  setEditingMember: (member: TeamMember | null) => void;
  newMemberData: any;
  setNewMemberData: (data: any) => void;
  handleAddMember: (e?: React.FormEvent) => void | Promise<void>;
  openEditMember: (member: TeamMember) => void;
  handleDeleteMember: (member: TeamMember) => void;
  isAddingCompany: boolean;
  setIsAddingCompany: (isAdding: boolean) => void;
  editingCompany: Company | null;
  setEditingCompany: (company: Company | null) => void;
  newCompanyData: any;
  setNewCompanyData: (data: any) => void;
  handleAddCompany: (e?: React.FormEvent) => void | Promise<void>;
  openEditCompany: (company: Company) => void;
  handleDeleteCompany: (companyId: string) => void;
  setViewingCompany: (company: Company | null) => void;
  handleCreateCompanyForCRM: (companyData: Partial<Company>) => Promise<string>;
  handleCreateMemberForCRM: (memberData: Partial<TeamMember>) => Promise<string>;
  showCompletedProjects: boolean;
  openEditProject: (project: Project) => void;
  handleDeleteProject: (projectId: string) => void;
  // Settings Permissions
  permSearch: string;
  setPermSearch: (search: string) => void;
  selectedMemberId: string;
  handleMemberClick: (memberId: string) => void;
  draftIsSystemAdmin: boolean;
  setDraftIsSystemAdmin: (isAdmin: boolean) => void;
  draftModuleAccess: Record<string, 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador'>;
  setDraftModuleAccess: React.Dispatch<React.SetStateAction<Record<string, 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador'>>>;
  hasUnsavedPermissionsChanges: boolean;
  savePermissions: (memberId: string) => Promise<void>;
  setLastInitializedMemberId: (id: string) => void;
  draftCanViewAllCompanyLinks: boolean;
  setDraftCanViewAllCompanyLinks: (can: boolean) => void;
  draftSupervisedMembersForLinks: string[];
  setDraftSupervisedMembersForLinks: React.Dispatch<React.SetStateAction<string[]>>;
  linksSupervisorSearch: string;
  setLinksSupervisorSearch: (search: string) => void;
  setIsAddingProcess: (isAdding: boolean) => void;
  setEditingProcess: (process: Process | null) => void;
  setNewProcessData: (data: { name: string; description: string; goals: string }) => void;
  openEditProcess: (process: Process) => void;
  handleDeleteProcess: (processId: string) => void;
  onAddTaskMarketing: (taskData: Partial<Task>) => Promise<string>;
  onAddProjectMarketing: (projData: Partial<Project>) => Promise<string>;
}

export const AppMainContent: React.FC<AppMainContentProps> = ({
  activeTab,
  activeTabAccess,
  currentMember,
  roles,
  members,
  sortedMembers,
  processes,
  projects,
  companies,
  industries,
  setIndustries,
  tasks,
  filteredTasks,
  sortedTasks,
  products,
  processLinks,
  processNotes,
  managementNotes,
  managementStrategy,
  managementGovernance,
  getModuleAccess,
  isTaskVisibleForMember,
  normalizeText,
  parseLocalDate,
  searchQuery,
  setSearchQuery,
  managementSubTab,
  setManagementSubTab,
  processSubTab,
  setProcessSubTab,
  ventasSubTab,
  setVentasSubTab,
  capacitacionSubTab,
  setCapacitacionSubTab,
  acreditacionSubTab,
  setAcreditacionSubTab,
  productosSubTab,
  setProductosSubTab,
  qhseSubTab,
  setQhseSubTab,
  importacionesSubTab,
  setImportacionesSubTab,
  marketingSubTab,
  setMarketingSubTab,
  directorySubTab,
  handleDirectorySubTabClick,
  settingsSubTab,
  tasksSubTab,
  taskViewMode,
  selectedProcessId,
  setSelectedProcessId,
  showFicha,
  setShowFicha,
  handleUpdateManagementNotes,
  handleUpdateManagementStrategy,
  handleUpdateManagementGovernance,
  handleTabClick,
  setActiveTab,
  openAddTaskModal,
  openEditTask,
  updateTaskStatus,
  handleDeleteTask,
  createActivityAsTask,
  tableFilters,
  setTableFilters,
  tableSort,
  setTableSort,
  handleTableSort,
  collapsedColumns,
  setCollapsedColumns,
  showAllDoneTasks,
  setShowAllDoneTasks,
  isAddingMember,
  setIsAddingMember,
  editingMember,
  setEditingMember,
  newMemberData,
  setNewMemberData,
  handleAddMember,
  openEditMember,
  handleDeleteMember,
  isAddingCompany,
  setIsAddingCompany,
  editingCompany,
  setEditingCompany,
  newCompanyData,
  setNewCompanyData,
  handleAddCompany,
  openEditCompany,
  handleDeleteCompany,
  setViewingCompany,
  handleCreateCompanyForCRM,
  handleCreateMemberForCRM,
  showCompletedProjects,
  openEditProject,
  handleDeleteProject,
  permSearch,
  setPermSearch,
  selectedMemberId,
  handleMemberClick,
  draftIsSystemAdmin,
  setDraftIsSystemAdmin,
  draftModuleAccess,
  setDraftModuleAccess,
  hasUnsavedPermissionsChanges,
  savePermissions,
  setLastInitializedMemberId,
  draftCanViewAllCompanyLinks,
  setDraftCanViewAllCompanyLinks,
  draftSupervisedMembersForLinks,
  setDraftSupervisedMembersForLinks,
  linksSupervisorSearch,
  setLinksSupervisorSearch,
  setIsAddingProcess,
  setEditingProcess,
  setNewProcessData,
  openEditProcess,
  handleDeleteProcess,
  onAddTaskMarketing,
  onAddProjectMarketing
}) => {
  if (activeTabAccess === 'ninguno') {
    return (
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
                 activeTab === 'ventas' ? 'Ventas' :
                 activeTab === 'marketing' ? 'Marketing' :
                 activeTab === 'capacitacion' ? 'Capacitación' :
                 activeTab === 'acreditacion' ? 'Acreditación' :
                 activeTab === 'productos' ? 'Productos' :
                 activeTab === 'qhse' ? 'QHSE' :
                 activeTab === 'importaciones' ? 'Importaciones' :
                 'Configuración'}
              </div>
            </div>
          </div>
          
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Por favor, solicita a un Administrador o Líder de Proceso que te asigne acceso en la <strong className="text-slate-600">Matriz de Permisos</strong> dentro de Configuración.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={`tab-view-${activeTab}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="w-full"
    >
      {activeTab === 'gerencia' && (
        <ManagementView
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
      )}

      {activeTab === 'process_dashboard' && (
        <ProcessDashboardView
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
      )}

      {activeTab === 'ventas' && (
        <SalesView
          currentMember={currentMember}
          members={members}
          companies={companies}
          processes={processes}
          activeSubTab={ventasSubTab}
          onSubTabChange={(tab) => setVentasSubTab(tab)}
          onCreateCompany={handleCreateCompanyForCRM}
          onCreateMember={handleCreateMemberForCRM}
        />
      )}

      {activeTab === 'capacitacion' && (
        <TrainingView
          currentMember={currentMember}
          activeSubTab={capacitacionSubTab}
          onSubTabChange={(tab) => setCapacitacionSubTab(tab)}
          members={members}
          companies={companies}
          processes={processes}
          roles={roles}
          onCreateMember={handleCreateMemberForCRM}
        />
      )}

      {activeTab === 'acreditacion' && (
        <AcreditacionView
          currentMember={currentMember}
          members={members}
          companies={companies}
          industries={industries}
          activeSubTab={acreditacionSubTab}
          onSubTabChange={(tab) => setAcreditacionSubTab(tab)}
        />
      )}

      {activeTab === 'productos' && (
        <ProductsView
          currentMember={currentMember}
          products={products}
          companies={companies}
          members={members}
          activeSubTab={productosSubTab}
          onSubTabChange={(tab) => setProductosSubTab(tab)}
          accessLevel={getModuleAccess(currentMember, roles, 'productos')}
        />
      )}

      {activeTab === 'qhse' && (
        <QHSEView
          currentMember={currentMember}
          members={members}
          companies={companies}
          activeSubTab={qhseSubTab}
          onSubTabChange={(tab) => setQhseSubTab(tab)}
          accessLevel={getModuleAccess(currentMember, roles, 'qhse')}
        />
      )}

      {activeTab === 'importaciones' && (
        <ImportacionesView
          companies={companies}
          currentMember={currentMember}
          accessLevel={getModuleAccess(currentMember, roles, 'importaciones')}
          activeSubTab={importacionesSubTab}
          onSubTabChange={(tab) => setImportacionesSubTab(tab)}
        />
      )}

      {activeTab === 'marketing' && (
        <MarketingView
          currentMember={currentMember}
          members={members}
          processes={processes}
          tasks={tasks}
          projects={projects}
          companies={companies}
          accessLevel={getModuleAccess(currentMember, roles, 'marketing')}
          activeSubTab={marketingSubTab}
          onSubTabChange={(tab) => setMarketingSubTab(tab)}
          onAddTask={onAddTaskMarketing}
          onAddProject={onAddProjectMarketing}
          onOpenTask={openEditTask}
          onOpenCreateTaskModal={(initialOverrides) => openAddTaskModal('backlog', initialOverrides)}
        />
      )}

      {activeTab === 'dashboard' && (
        <DashboardView
          members={members}
          processes={processes}
          onNavigateToTranscript={() => handleTabClick('transcript')}
          onNavigateToProcess={(processId) => {
            setSelectedProcessId(processId);
            handleTabClick('process_dashboard');
          }}
        />
      )}

      {activeTab === 'directory' && (
        <DirectoryView
          directorySubTab={directorySubTab}
          setDirectorySubTab={handleDirectorySubTabClick}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          members={members}
          sortedMembers={sortedMembers}
          companies={companies}
          industries={industries}
          setIndustries={setIndustries}
          processes={processes}
          roles={roles}
          isAddingMember={isAddingMember}
          setIsAddingMember={setIsAddingMember}
          editingMember={editingMember}
          setEditingMember={setEditingMember}
          newMemberData={newMemberData}
          setNewMemberData={setNewMemberData}
          handleAddMember={handleAddMember}
          openEditMember={openEditMember}
          handleDeleteMember={handleDeleteMember}
          isAddingCompany={isAddingCompany}
          setIsAddingCompany={setIsAddingCompany}
          editingCompany={editingCompany}
          setEditingCompany={setEditingCompany}
          newCompanyData={newCompanyData}
          setNewCompanyData={setNewCompanyData}
          handleAddCompany={handleAddCompany}
          openEditCompany={openEditCompany}
          handleDeleteCompany={handleDeleteCompany}
          setViewingCompany={setViewingCompany}
          normalizeText={normalizeText}
        />
      )}

      {activeTab === 'transcript' && (
        <TranscriptView 
          members={members}
          processes={processes}
          onNavigateToDashboard={() => setActiveTab('dashboard')}
        />
      )}

      {activeTab === 'projects' && (
        <ProjectsView
          processes={processes}
          projects={projects}
          tasks={tasks}
          currentMember={currentMember}
          roles={roles}
          showCompletedProjects={showCompletedProjects}
          getModuleAccess={getModuleAccess}
          isTaskVisibleForMember={isTaskVisibleForMember}
          openEditProject={openEditProject}
          handleDeleteProject={handleDeleteProject}
        />
      )}

      {activeTab === 'tasks' && (
        <TasksView
          tasks={tasks}
          filteredTasks={filteredTasks}
          sortedTasks={sortedTasks}
          members={members}
          sortedMembers={sortedMembers}
          processes={processes}
          projects={projects}
          roles={roles}
          tasksSubTab={tasksSubTab}
          taskViewMode={taskViewMode}
          tableFilters={tableFilters}
          setTableFilters={setTableFilters}
          tableSort={tableSort}
          setTableSort={setTableSort}
          handleTableSort={handleTableSort}
          collapsedColumns={collapsedColumns}
          setCollapsedColumns={setCollapsedColumns}
          showAllDoneTasks={showAllDoneTasks}
          setShowAllDoneTasks={setShowAllDoneTasks}
          currentMember={currentMember}
          openAddTaskModal={openAddTaskModal}
          openEditTask={openEditTask}
          updateTaskStatus={updateTaskStatus}
          handleDeleteTask={handleDeleteTask}
          parseLocalDate={parseLocalDate}
        />
      )}

      {activeTab === 'planner' && (
        <PlannerView 
          members={members}
          processes={processes}
          onCreateActivityAsTask={createActivityAsTask}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsContainerView
          settingsSubTab={settingsSubTab}
          members={members}
          sortedMembers={sortedMembers}
          processes={processes}
          companies={companies}
          roles={roles}
          permSearch={permSearch}
          setPermSearch={setPermSearch}
          selectedMemberId={selectedMemberId}
          handleMemberClick={handleMemberClick}
          draftIsSystemAdmin={draftIsSystemAdmin}
          setDraftIsSystemAdmin={setDraftIsSystemAdmin}
          draftModuleAccess={draftModuleAccess}
          setDraftModuleAccess={setDraftModuleAccess}
          hasUnsavedPermissionsChanges={hasUnsavedPermissionsChanges}
          savePermissions={savePermissions}
          setLastInitializedMemberId={setLastInitializedMemberId}
          draftCanViewAllCompanyLinks={draftCanViewAllCompanyLinks}
          setDraftCanViewAllCompanyLinks={setDraftCanViewAllCompanyLinks}
          draftSupervisedMembersForLinks={draftSupervisedMembersForLinks}
          setDraftSupervisedMembersForLinks={setDraftSupervisedMembersForLinks}
          linksSupervisorSearch={linksSupervisorSearch}
          setLinksSupervisorSearch={setLinksSupervisorSearch}
          setIsAddingProcess={setIsAddingProcess}
          setEditingProcess={setEditingProcess}
          setNewProcessData={setNewProcessData}
          openEditProcess={openEditProcess}
          handleDeleteProcess={handleDeleteProcess}
          isAddingMember={isAddingMember}
          setIsAddingMember={setIsAddingMember}
          editingMember={editingMember}
          setEditingMember={setEditingMember}
          newMemberData={newMemberData}
          setNewMemberData={setNewMemberData}
          handleAddMember={handleAddMember}
          openEditMember={openEditMember}
          handleDeleteMember={handleDeleteMember}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          normalizeText={normalizeText}
        />
      )}
    </motion.div>
  );
};
