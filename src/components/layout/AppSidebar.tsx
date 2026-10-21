import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LogOut,
  Zap,
  Camera,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { TeamMember, Role } from '../../types';
import { isSubnavVisible } from '../../lib/permissions';
import { AvatarCropModal, isCustomAvatar, getAvatarFallbackUrl } from '../common/AvatarCropModal';
import { db, doc, updateDoc, setDoc } from '../../lib/firebase';
import {
  getEnabledModules,
  type ERPModuleConfig,
  type ERPMenuConfig,
  type ERPSubmenuConfig,
} from '../../config/erpNavigationRegistry';

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

  finanzasSubTab?: string;
  setFinanzasSubTab?: (tab: any) => void;

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
  commentsSubTab = 'inbox',
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
  finanzasSubTab = 'treasury',
  setFinanzasSubTab,
  directorySubTab,
  setDirectorySubTab,
  importacionesSubTab,
  setImportacionesSubTab,
  settingsSubTab,
  handleSettingsSubTabClick,
}) => {
  const [isAvatarModalOpen, setIsAvatarModalOpen] = React.useState(false);

  // Estado de expansión para menús agrupadores de Nivel 2 (kind === 'group') que contienen Submenús de Nivel 3
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const mod of getEnabledModules()) {
      for (const menu of mod.menus) {
        if (menu.kind === 'group') {
          initial[`${mod.id}:${menu.id}`] = menu.defaultOpen ?? true;
        }
      }
    }
    return initial;
  });

  const toggleMenuGroup = (groupKey: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Diccionario unificado de subTab activo por módulo
  const activeSubTabMap: Record<string, string> = {
    tasks: tasksSubTab,
    comments: commentsSubTab,
    process_dashboard: processSubTab,
    gerencia: managementSubTab,
    acreditacion: acreditacionSubTab,
    capacitacion: capacitacionSubTab,
    finanzas: finanzasSubTab,
    qhse: qhseSubTab,
    marketing: marketingSubTab,
    ventas: ventasSubTab,
    productos: productosSubTab,
    inventario: inventarioSubTab,
    directory: directorySubTab,
    importaciones: importacionesSubTab,
    settings: settingsSubTab,
  };

  // Diccionario unificado de actualizadores de subTab por módulo
  const setSubTabForModule = (moduleId: string, subTab: string) => {
    switch (moduleId) {
      case 'tasks':
        setTasksSubTab(subTab);
        break;
      case 'comments':
        setCommentsSubTab?.(subTab);
        break;
      case 'process_dashboard':
        setProcessSubTab(subTab);
        break;
      case 'gerencia':
        setManagementSubTab(subTab);
        break;
      case 'acreditacion':
        setAcreditacionSubTab(subTab);
        break;
      case 'capacitacion':
        setCapacitacionSubTab(subTab);
        break;
      case 'finanzas':
        setFinanzasSubTab?.(subTab);
        break;
      case 'qhse':
        setQhseSubTab(subTab);
        break;
      case 'marketing':
        setMarketingSubTab(subTab);
        break;
      case 'ventas':
        setVentasSubTab(subTab);
        break;
      case 'productos':
        setProductosSubTab(subTab);
        break;
      case 'inventario':
        setInventarioSubTab?.(subTab);
        break;
      case 'directory':
        setDirectorySubTab(subTab);
        break;
      case 'importaciones':
        setImportacionesSubTab(subTab);
        break;
      case 'settings':
        handleSettingsSubTabClick(subTab);
        break;
    }
  };

  const isUserAdmin = Boolean(
    currentMember?.isSystemAdmin || currentMember?.systemRoleId === 'role-admin'
  );

  // Evalúa si un módulo de Nivel 1 es visible para el usuario actual
  const isModuleVisible = (mod: ERPModuleConfig): boolean => {
    if (!mod.enabled) return false;
    if (mod.id === 'tasks') {
      const hasTasks = getModuleAccess(currentMember, roles, 'tasks') !== 'ninguno';
      const hasProjects = getModuleAccess(currentMember, roles, 'projects') !== 'ninguno';
      const hasPlanner = getModuleAccess(currentMember, roles, 'planner') !== 'ninguno';
      return hasTasks || hasProjects || hasPlanner;
    }
    const permKey = mod.permissionKey || mod.id;
    return getModuleAccess(currentMember, roles, permKey) !== 'ninguno';
  };

  // Evalúa si un Submenú de Nivel 3 es visible
  const isSubmenuVisible = (sub: ERPSubmenuConfig): boolean => {
    if (sub.enabled === false) return false;
    if (sub.permissionKey) {
      return getModuleAccess(currentMember, roles, sub.permissionKey) !== 'ninguno';
    }
    return true;
  };

  // Evalúa si un Menú de Nivel 2 es visible
  const isMenuVisible = (mod: ERPModuleConfig, menu: ERPMenuConfig): boolean => {
    if (menu.enabled === false) return false;
    const kind = menu.kind || 'view';

    if (kind === 'links') {
      return isSubnavVisible(currentMember, 'links', mod.id);
    }
    if (kind === 'notes') {
      return isSubnavVisible(currentMember, 'notes', mod.id);
    }
    if (kind === 'permissions') {
      return isUserAdmin || getModuleAccess(currentMember, roles, mod.id) === 'lider';
    }
    if (kind === 'group') {
      const visibleSubs = (menu.submenus || []).filter(isSubmenuVisible);
      return visibleSubs.length > 0;
    }
    if (menu.permissionKey) {
      return getModuleAccess(currentMember, roles, menu.permissionKey) !== 'ninguno';
    }
    return true;
  };

  // Resuelve qué subTab seleccionar al abrir un módulo desde el Nivel 1
  const resolveLandingSubTab = (mod: ERPModuleConfig): string | undefined => {
    const currentSubTab = activeSubTabMap[mod.id];
    const visibleMenus = mod.menus.filter((m) => isMenuVisible(mod, m));

    // Aplanar todos los IDs de menús/submenús de vista disponibles
    const validViewIds: string[] = [];
    for (const m of visibleMenus) {
      if (m.kind === 'group') {
        for (const sub of (m.submenus || []).filter(isSubmenuVisible)) {
          validViewIds.push(sub.id);
        }
      } else if (m.kind !== 'action' && m.kind !== 'permissions' && !m.targetTab) {
        validViewIds.push(m.id);
      }
    }

    if (currentSubTab && currentSubTab !== 'permissions' && validViewIds.includes(currentSubTab)) {
      return currentSubTab;
    }

    if (mod.defaultSubTab && validViewIds.includes(mod.defaultSubTab)) {
      return mod.defaultSubTab;
    }

    return validViewIds[0] || mod.defaultSubTab;
  };

  const handleSaveOwnAvatar = async (croppedDataUrl: string) => {
    const emailClean = (user.email || '').toLowerCase().trim();
    const matchedMember =
      currentMember ||
      members.find(
        (m) =>
          m.email?.toLowerCase().trim() === emailClean ||
          m.companyAssociations?.some((ca) => ca.email?.toLowerCase().trim() === emailClean)
      );

    if (matchedMember?.id) {
      await updateDoc(doc(db, 'members', matchedMember.id), {
        avatar: croppedDataUrl,
        updatedAt: new Date().toISOString(),
      });
    } else if (emailClean) {
      const newId = `mem-${Date.now()}`;
      const newMemberDoc: TeamMember = {
        id: newId,
        name: user.displayName || emailClean.split('@')[0] || 'Usuario ERP',
        role: 'Integrante del Equipo',
        systemRoleId: 'role-colaborador',
        categories: ['miembro'],
        processId: '',
        companyAssociations: [],
        identificationId: '',
        hasRuc: false,
        skills: [],
        responsibilities: [],
        recentAchievements: [],
        avatar: croppedDataUrl,
        personality: '',
        notes: '',
        email: emailClean,
        phone: '',
      };
      await setDoc(doc(db, 'members', newId), newMemberDoc);
      await setDoc(doc(db, 'user_mappings', emailClean), { memberId: newId });
    }
  };

  const enabledModules = getEnabledModules();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-ng-black border-r border-ng-gray/10 z-10 hidden md:flex flex-col">
      <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
        <div className="flex items-center gap-3 text-ng-lime mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-ng-lime/10 transition-all duration-300">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <span className="font-black text-xl tracking-tighter text-white">Novagreen IA</span>
        </div>

        {/* NAVEGACIÓN DECLARATIVA DE 3 NIVELES: MÓDULOS -> MENÚS -> SUBMENÚS */}
        <nav className="space-y-1">
          {enabledModules.map((mod) => {
            if (!isModuleVisible(mod)) return null;

            const ModuleIcon = mod.icon;
            const navKey = mod.navKey || mod.id;
            const visibleMenus = mod.menus.filter((m) => isMenuVisible(mod, m));
            const hasMenus = visibleMenus.length > 0;
            const currentSubTab = activeSubTabMap[mod.id];

            const isModuleActive =
              mod.id === 'tasks'
                ? activeTab === 'tasks' || activeTab === 'projects' || activeTab === 'planner'
                : activeTab === mod.id;

            const isExpanded = expandedNavModule === navKey;

            return (
              <React.Fragment key={mod.id}>
                {/* NIVEL 1: MÓDULO */}
                <NavButton
                  active={isModuleActive}
                  icon={<ModuleIcon size={20} />}
                  label={mod.label}
                  onClick={() => {
                    if (!hasMenus) {
                      setExpandedNavModule(null);
                      handleTabClick(mod.id);
                      return;
                    }

                    toggleNavModule(navKey, () => {
                      if (mod.id === 'tasks') {
                        const hasTasks = getModuleAccess(currentMember, roles, 'tasks') !== 'ninguno';
                        const hasProjects = getModuleAccess(currentMember, roles, 'projects') !== 'ninguno';
                        const hasPlanner = getModuleAccess(currentMember, roles, 'planner') !== 'ninguno';
                        if (hasTasks) {
                          setTasksSubTab('board');
                          handleTabClick('tasks', 'board');
                        } else if (hasProjects) {
                          handleTabClick('projects');
                        } else if (hasPlanner) {
                          handleTabClick('planner');
                        }
                        return;
                      }

                      const targetSubTab = resolveLandingSubTab(mod);
                      if (targetSubTab && mod.id !== 'settings') {
                        setSubTabForModule(mod.id, targetSubTab);
                      }
                      handleTabClick(mod.id, targetSubTab);
                    });
                  }}
                />

                {/* NIVEL 2: MENÚS DEL MÓDULO */}
                {hasMenus && (
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="pl-4 pr-1 py-1 space-y-1 border-l border-white/10 ml-5 my-1 overflow-hidden"
                      >
                        {visibleMenus.map((menu) => {
                          const MenuIcon = menu.icon;
                          const kind = menu.kind || 'view';

                          // CASO A: MENÚ AGRUPADOR CON SUBMENÚS (NIVEL 3)
                          if (kind === 'group') {
                            const visibleSubmenus = (menu.submenus || []).filter(isSubmenuVisible);
                            if (visibleSubmenus.length === 0) return null;

                            const groupKey = `${mod.id}:${menu.id}`;
                            const hasActiveChild =
                              activeTab === mod.id &&
                              visibleSubmenus.some((sub) => sub.id === currentSubTab);
                            const isGroupOpen = openGroups[groupKey] ?? true;

                            return (
                              <div key={menu.id} className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => toggleMenuGroup(groupKey)}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                    hasActiveChild
                                      ? 'text-ng-lime bg-white/5 font-bold'
                                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={hasActiveChild ? 'text-ng-lime' : 'text-gray-500'}>
                                      <MenuIcon size={16} />
                                    </span>
                                    <span className="truncate">{menu.label}</span>
                                  </div>
                                  <span className="text-gray-500 shrink-0">
                                    {isGroupOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </span>
                                </button>

                                {/* NIVEL 3: SUBMENÚS */}
                                <AnimatePresence initial={false}>
                                  {isGroupOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                                      className="pl-3 ml-3 border-l border-white/10 space-y-1 overflow-hidden"
                                    >
                                      {visibleSubmenus.map((sub) => {
                                        const SubIcon = sub.icon;
                                        const isSubActive =
                                          sub.targetTab
                                            ? activeTab === sub.targetTab
                                            : activeTab === mod.id && currentSubTab === sub.id;

                                        return (
                                          <SubNavButton
                                            key={sub.id}
                                            active={isSubActive}
                                            label={sub.label}
                                            icon={<SubIcon size={15} />}
                                            onClick={() => {
                                              if (sub.targetTab) {
                                                handleTabClick(sub.targetTab);
                                              } else {
                                                setSubTabForModule(mod.id, sub.id);
                                                handleTabClick(mod.id, sub.id);
                                              }
                                            }}
                                          />
                                        );
                                      })}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          }

                          // CASO B: MENÚ DE ACCIÓN DIRECTA (Exportar / Importar tareas)
                          if (kind === 'action') {
                            return (
                              <SubNavButton
                                key={menu.id}
                                active={false}
                                label={menu.label}
                                icon={<MenuIcon size={16} />}
                                onClick={() => {
                                  if (menu.id === 'export') {
                                    handleExportTasks();
                                  } else if (menu.id === 'import') {
                                    fileInputRef.current?.click();
                                  }
                                }}
                              />
                            );
                          }

                          // CASO C: MENÚ ESTÁNDAR DE NIVEL 2 (Vista, Enlaces, Notas o Permisos)
                          const isMenuActive = menu.targetTab
                            ? activeTab === menu.targetTab
                            : activeTab === mod.id && currentSubTab === menu.id;

                          return (
                            <SubNavButton
                              key={menu.id}
                              active={isMenuActive}
                              label={menu.label}
                              icon={<MenuIcon size={16} />}
                              onClick={() => {
                                if (menu.targetTab) {
                                  handleTabClick(menu.targetTab);
                                  return;
                                }
                                if (mod.id === 'settings') {
                                  handleSettingsSubTabClick(menu.id);
                                  return;
                                }
                                setSubTabForModule(mod.id, menu.id);
                                handleTabClick(mod.id, menu.id);
                              }}
                            />
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-3 border-t border-ng-gray/10 shrink-0">
        <div className="bg-ng-gray/5 p-2.5 rounded-xl border border-ng-gray/10 flex items-center justify-between gap-2.5">
          {/* Square Avatar with Camera Upload Trigger */}
          <button
            type="button"
            onClick={() => setIsAvatarModalOpen(true)}
            className="relative shrink-0 group cursor-pointer"
            title="Haz clic para subir o cambiar tu foto de perfil cuadrada (1:1)"
          >
            <img
              src={
                isCustomAvatar(currentMember?.avatar)
                  ? currentMember!.avatar!
                  : getAvatarFallbackUrl(currentMember?.name || user.displayName || 'Usuario')
              }
              className="w-9 h-9 rounded-lg aspect-square border border-ng-gray/20 object-cover group-hover:border-ng-lime transition-all"
              alt={currentMember?.name || user.displayName || 'User'}
            />
            <span className="absolute inset-0 rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-ng-lime transition-opacity">
              <Camera size={14} />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-ng-lime border-2 border-ng-black animate-pulse" />
          </button>

          {/* Compact User Info */}
          <div
            onClick={() => setIsAvatarModalOpen(true)}
            className="overflow-hidden flex-1 text-left min-w-0 cursor-pointer group"
            title="Haz clic para cambiar tu foto de perfil"
          >
            <p className="text-xs font-black text-white group-hover:text-ng-lime transition-colors truncate leading-tight">
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

        <AvatarCropModal
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          onSave={handleSaveOwnAvatar}
          currentAvatar={currentMember?.avatar}
          personName={currentMember?.name || user.displayName || 'Mi Perfil'}
          title="Mi Foto de Perfil Cuadrada (1:1)"
        />

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
