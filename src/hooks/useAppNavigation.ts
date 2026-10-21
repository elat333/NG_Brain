import { useState, useCallback, useMemo } from 'react';
import type { CapacitacionSubTab } from '../components/CapacitacionModule';
import type { AcreditacionSubTab } from '../components/AcreditacionModule';
import type { MarketingSubTab } from '../components/MarketingModule';
import type { QHSESubTab } from '../components/QHSEModule';
import type { VentasSubTab } from '../components/VentasModule';
import type { ProductSubTab } from '../components/ProductosModule';
import type { FinanzasSubTab } from '../components/FinanzasModule';
import { ERP_MODULES_REGISTRY } from '../config/erpNavigationRegistry';

export type ActiveTab =
  | 'dashboard'
  | 'gerencia'
  | 'tasks'
  | 'planner'
  | 'projects'
  | 'directory'
  | 'transcript'
  | 'process_dashboard'
  | 'ventas'
  | 'marketing'
  | 'capacitacion'
  | 'acreditacion'
  | 'productos'
  | 'inventario'
  | 'finanzas'
  | 'qhse'
  | 'importaciones'
  | 'ia'
  | 'comments'
  | 'settings';

export type SettingsSubTabType = 'roles' | 'catalogs' | 'labels' | 'processes' | 'profile' | 'backup';
export type DirectorySubTabType = 'people' | 'companies' | 'providers' | 'client_contacts' | 'provider_contacts' | 'external' | 'notes' | 'links' | 'permissions';
export type TasksSubTabType = 'tasks' | 'projects' | 'planner' | 'notes' | 'links' | 'permissions';
export type ProcessSubTabType = 'summary' | 'kpis' | 'diagram' | 'tasks' | 'notes' | 'links' | 'permissions';
export type ManagementSubTabType = 'kpis' | 'tasks' | 'projects' | 'notes' | 'links' | 'permissions';
export type ImportacionesSubTabType = 'products' | 'providers' | 'orders' | 'calc' | 'notes' | 'links' | 'permissions';
export type AcreditacionSubTabType = AcreditacionSubTab;
export type VentasSubTabType = VentasSubTab;
export type InventarioSubTabType = 'existencias' | 'almacenes' | 'movimientos' | 'recepciones' | 'despachos' | 'transferencias' | 'ajustes' | 'kardex' | 'configuracion' | 'notes' | 'links' | 'permissions';
export type CommentsSubTabType = 'my_comments' | 'general_comments' | 'notes' | 'links' | 'permissions';
export type FinanzasSubTabType = FinanzasSubTab;
export type IASubTab = 'assistant' | 'prompts' | 'config';
export type InventarioSubTab = InventarioSubTabType;
export type CommentsSubTab = CommentsSubTabType;

export type ExpandedNavModule = string | null;

const getInitialSubTabs = (): Record<string, string> => {
  const defaults: Record<string, string> = {
    tasks: 'tasks',
    comments: 'my_comments',
    process_dashboard: 'summary',
    gerencia: 'notes',
    acreditacion: 'allies',
    capacitacion: 'management',
    finanzas: 'treasury',
    qhse: 'inspections',
    marketing: 'campaigns',
    ventas: 'pipeline',
    productos: 'todos',
    inventario: 'existencias',
    directory: 'people',
    importaciones: 'products',
    settings: 'roles',
    ia: 'assistant',
  };

  for (const mod of ERP_MODULES_REGISTRY) {
    if (mod.defaultSubTab) {
      defaults[mod.id] = mod.defaultSubTab;
    }
  }
  return defaults;
};

export function useAppNavigation() {
  // Primary module navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [expandedNavModule, setExpandedNavModule] = useState<ExpandedNavModule>(null);

  // Unified dynamic dictionary for all module sub-tabs (present and future)
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, string>>(getInitialSubTabs);

  const getSubTab = useCallback(
    (moduleId: string): string => activeSubTabs[moduleId] || '',
    [activeSubTabs]
  );

  const setSubTab = useCallback(
    (moduleId: string, subTab: string | ((prev: any) => string)) => {
      setActiveSubTabs((prev) => {
        const currentVal = prev[moduleId] || '';
        const nextVal = typeof subTab === 'function' ? subTab(currentVal) : subTab;
        if (currentVal === nextVal) return prev;
        return { ...prev, [moduleId]: nextVal };
      });
    },
    []
  );

  // Scrum / Tasks specific filters
  const [selectedProcessFilter, setSelectedProcessFilter] = useState<string>('all');
  const [taskViewMode, setTaskViewMode] = useState<'board' | 'table'>('board');
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [showFicha, setShowFicha] = useState(false);

  // Specific setters bound to unified state map
  const setSettingsSubTab = useCallback((v: any) => setSubTab('settings', v), [setSubTab]);
  const setDirectorySubTab = useCallback((v: any) => setSubTab('directory', v), [setSubTab]);
  const setImportacionesSubTab = useCallback((v: any) => setSubTab('importaciones', v), [setSubTab]);
  const setCapacitacionSubTab = useCallback((v: any) => setSubTab('capacitacion', v), [setSubTab]);
  const setAcreditacionSubTab = useCallback((v: any) => setSubTab('acreditacion', v), [setSubTab]);
  const setMarketingSubTab = useCallback((v: any) => setSubTab('marketing', v), [setSubTab]);
  const setQhseSubTab = useCallback((v: any) => setSubTab('qhse', v), [setSubTab]);
  const setVentasSubTab = useCallback((v: any) => setSubTab('ventas', v), [setSubTab]);
  const setProductosSubTab = useCallback((v: any) => setSubTab('productos', v), [setSubTab]);
  const setInventarioSubTab = useCallback((v: any) => setSubTab('inventario', v), [setSubTab]);
  const setFinanzasSubTab = useCallback((v: any) => setSubTab('finanzas', v), [setSubTab]);
  const setIaSubTab = useCallback((v: any) => setSubTab('ia', v), [setSubTab]);
  const setManagementSubTab = useCallback((v: any) => setSubTab('gerencia', v), [setSubTab]);
  const setTasksSubTab = useCallback((v: any) => setSubTab('tasks', v), [setSubTab]);
  const setProcessSubTab = useCallback((v: any) => setSubTab('process_dashboard', v), [setSubTab]);
  const setCommentsSubTab = useCallback((v: any) => setSubTab('comments', v), [setSubTab]);

  // Toggle helper for sidebar accordion items
  const toggleNavModule = useCallback((moduleName: ExpandedNavModule, onExpand?: () => void) => {
    setExpandedNavModule((prev) => {
      if (prev === moduleName) return null;
      return moduleName;
    });
    if (onExpand) onExpand();
  }, []);

  return useMemo(
    () => ({
      activeTab,
      setActiveTab,
      expandedNavModule,
      setExpandedNavModule,
      activeSubTabs,
      getSubTab,
      setSubTab,
      settingsSubTab: (activeSubTabs.settings || 'roles') as 'roles' | 'processes' | 'members',
      setSettingsSubTab,
      directorySubTab: (activeSubTabs.directory || 'people') as
        | 'people'
        | 'companies'
        | 'industries'
        | 'permissions',
      setDirectorySubTab,
      importacionesSubTab: (activeSubTabs.importaciones || 'products') as
        | 'products'
        | 'suppliers'
        | 'proformas'
        | 'upload_proforma'
        | 'permissions',
      setImportacionesSubTab,
      capacitacionSubTab: (activeSubTabs.capacitacion || 'management') as CapacitacionSubTab,
      setCapacitacionSubTab,
      acreditacionSubTab: (activeSubTabs.acreditacion || 'allies') as AcreditacionSubTab,
      setAcreditacionSubTab,
      marketingSubTab: (activeSubTabs.marketing || 'campaigns') as MarketingSubTab,
      setMarketingSubTab,
      qhseSubTab: (activeSubTabs.qhse || 'inspections') as QHSESubTab,
      setQhseSubTab,
      ventasSubTab: (activeSubTabs.ventas || 'pipeline') as VentasSubTab,
      setVentasSubTab,
      productosSubTab: (activeSubTabs.productos || 'todos') as ProductSubTab,
      setProductosSubTab,
      inventarioSubTab: (activeSubTabs.inventario || 'existencias') as InventarioSubTab,
      setInventarioSubTab,
      finanzasSubTab: (activeSubTabs.finanzas || 'treasury') as FinanzasSubTab,
      setFinanzasSubTab,
      iaSubTab: (activeSubTabs.ia || 'assistant') as IASubTab,
      setIaSubTab,
      managementSubTab: (activeSubTabs.gerencia || 'notes') as
        | 'notes'
        | 'links'
        | 'consultant'
        | 'strategy'
        | 'governance'
        | 'permissions',
      setManagementSubTab,
      tasksSubTab: (activeSubTabs.tasks || 'tasks') as 'tasks' | 'notes' | 'links' | 'permissions',
      setTasksSubTab,
      selectedProcessFilter,
      setSelectedProcessFilter,
      taskViewMode,
      setTaskViewMode,
      selectedProcessId,
      setSelectedProcessId,
      processSubTab: (activeSubTabs.process_dashboard || 'summary') as
        | 'summary'
        | 'projects'
        | 'links'
        | 'notes'
        | 'permissions',
      setProcessSubTab,
      commentsSubTab: (activeSubTabs.comments || 'my_comments') as CommentsSubTab,
      setCommentsSubTab,
      showFicha,
      setShowFicha,
      toggleNavModule,
    }),
    [
      activeTab,
      expandedNavModule,
      activeSubTabs,
      getSubTab,
      setSubTab,
      setSettingsSubTab,
      setDirectorySubTab,
      setImportacionesSubTab,
      setCapacitacionSubTab,
      setAcreditacionSubTab,
      setMarketingSubTab,
      setQhseSubTab,
      setVentasSubTab,
      setProductosSubTab,
      setInventarioSubTab,
      setFinanzasSubTab,
      setIaSubTab,
      setManagementSubTab,
      setTasksSubTab,
      selectedProcessFilter,
      taskViewMode,
      selectedProcessId,
      setProcessSubTab,
      setCommentsSubTab,
      showFicha,
      toggleNavModule,
    ]
  );
}
