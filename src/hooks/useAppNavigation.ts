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
  | 'qhse';

export type VentasSubTabType = 'links' | 'notes' | 'crm' | 'pipeline' | 'quotes' | 'goals';
export type SettingsSubTabType = 'roles' | 'processes' | 'members' | 'general';
export type DirectorySubTabType = 'people' | 'companies' | 'industries';
export type ProcessSubTabType = 'summary' | 'projects' | 'links' | 'notes';
export type ManagementSubTabType = 'consultant' | 'notes' | 'strategy' | 'governance' | 'links';
export type ImportacionesSubTabType = 'products' | 'suppliers' | 'proformas' | 'upload_proforma';
export type AcreditacionSubTabType = 'links' | 'notes' | 'allies' | 'certifications';

export function useAppNavigation() {
  const [activeTab, setActiveTab] = useState<MainTabType>('dashboard');
  const [lastTab, setLastTab] = useState<string | null>(null);
  const [expandedNavModule, setExpandedNavModule] = useState<string | null>(null);

  // Sub-pestañas de cada módulo
  const [tasksSubTab, setTasksSubTab] = useState<'board' | 'permissions'>('board');
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
    qhseSubTab, 
    importacionesSubTab,
    tasksSubTab
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
