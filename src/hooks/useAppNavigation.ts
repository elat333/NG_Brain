import { useState, useEffect } from 'react';
import { MarketingSubTab } from '../components/MarketingModule';
import { CapacitacionSubTab } from '../components/CapacitacionModule';
import { ProductSubTab } from '../components/ProductosModule';
import { QHSESubTab } from '../components/QHSEModule';

export type MainTabType = 
  | 'dashboard' 
  | 'transcript' 
  | 'tasks' 
  | 'planner' 
  | 'projects' 
  | 'settings' 
  | 'directory' 
  | 'process_dashboard' 
  | 'gerencia' 
  | 'importaciones' 
  | 'marketing' 
  | 'ventas' 
  | 'capacitacion' 
  | 'acreditacion' 
  | 'productos' 
  | 'inventario'
  | 'qhse'
  | 'comments';

export type InventarioSubTabType = 'existencias' | 'bodegas' | 'solicitudes' | 'facturas' | 'permissions';
export type VentasSubTabType = 'links' | 'notes' | 'crm' | 'pipeline' | 'quotes' | 'goals' | 'permissions';
export type SettingsSubTabType = 'roles' | 'processes' | 'members' | 'general';
export type DirectorySubTabType = 'people' | 'companies' | 'industries' | 'permissions';
export type ProcessSubTabType = 'summary' | 'projects' | 'links' | 'notes' | 'permissions';
export type ManagementSubTabType = 'consultant' | 'notes' | 'strategy' | 'governance' | 'links' | 'permissions';
export type ImportacionesSubTabType = 'products' | 'suppliers' | 'proformas' | 'upload_proforma' | 'permissions';
export type AcreditacionSubTabType = 'links' | 'notes' | 'allies' | 'certifications' | 'permissions';
export type TasksSubTabType = 'board' | 'permissions' | 'comments';
export type CommentsSubTabType = 'inbox' | 'notes' | 'links' | 'permissions';

export function useAppNavigation() {
  const [activeTab, setActiveTab] = useState<MainTabType>('dashboard');
  const [lastTab, setLastTab] = useState<string | null>(null);
  const [expandedNavModule, setExpandedNavModule] = useState<string | null>(null);

  // Sub-pestañas de cada módulo
  const [inventarioSubTab, setInventarioSubTab] = useState<InventarioSubTabType>('existencias');
  const [tasksSubTab, setTasksSubTab] = useState<TasksSubTabType>('board');
  const [commentsSubTab, setCommentsSubTab] = useState<CommentsSubTabType>('inbox');
  const [ventasSubTab, setVentasSubTab] = useState<VentasSubTabType>('links');
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTabType>('general');
  const [directorySubTab, setDirectorySubTab] = useState<DirectorySubTabType>('people');
  const [processSubTab, setProcessSubTab] = useState<ProcessSubTabType>('summary');
  const [managementSubTab, setManagementSubTab] = useState<ManagementSubTabType>('consultant');
  const [importacionesSubTab, setImportacionesSubTab] = useState<ImportacionesSubTabType>('products');
  const [marketingSubTab, setMarketingSubTab] = useState<MarketingSubTab>('campaigns');
  const [capacitacionSubTab, setCapacitacionSubTab] = useState<CapacitacionSubTab>('calendar');
  const [acreditacionSubTab, setAcreditacionSubTab] = useState<AcreditacionSubTabType>('links');
  const [productosSubTab, setProductosSubTab] = useState<ProductSubTab>('todos');
  const [qhseSubTab, setQhseSubTab] = useState<QHSESubTab>('links');

  // Estados visuales de procesos/fichas
  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [showFicha, setShowFicha] = useState<boolean>(false);
  const [showProcessPermissions, setShowProcessPermissions] = useState<boolean>(false);

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

  // Cierre automático de fichas y permisos al cambiar de módulo o sub-pestaña
  useEffect(() => {
    setShowFicha(false);
    setShowProcessPermissions(false);
  }, [
    activeTab, 
    settingsSubTab, 
    directorySubTab, 
    processSubTab, 
    managementSubTab, 
    ventasSubTab, 
    capacitacionSubTab, 
    acreditacionSubTab, 
    productosSubTab, 
    inventarioSubTab,
    qhseSubTab, 
    importacionesSubTab,
    tasksSubTab,
    commentsSubTab
  ]);

  return {
    activeTab,
    setActiveTab,
    lastTab,
    setLastTab,
    expandedNavModule,
    setExpandedNavModule,
    toggleNavModule,
    tasksSubTab,
    setTasksSubTab,
    commentsSubTab,
    setCommentsSubTab,
    ventasSubTab,
    setVentasSubTab,
    settingsSubTab,
    setSettingsSubTab,
    directorySubTab,
    setDirectorySubTab,
    processSubTab,
    setProcessSubTab,
    managementSubTab,
    setManagementSubTab,
    importacionesSubTab,
    setImportacionesSubTab,
    marketingSubTab,
    setMarketingSubTab,
    capacitacionSubTab,
    setCapacitacionSubTab,
    acreditacionSubTab,
    setAcreditacionSubTab,
    productosSubTab,
    setProductosSubTab,
    inventarioSubTab,
    setInventarioSubTab,
    qhseSubTab,
    setQhseSubTab,
    selectedProcessId,
    setSelectedProcessId,
    showFicha,
    setShowFicha,
    showProcessPermissions,
    setShowProcessPermissions
  };
}
