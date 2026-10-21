import {
  TrendingUp,
  CheckCircle2,
  MessageSquare,
  Activity,
  Briefcase,
  Award,
  GraduationCap,
  Landmark,
  ShieldCheck,
  ShieldAlert,
  Megaphone,
  DollarSign,
  Boxes,
  Package,
  Contact,
  Sparkles,
  Settings,
  Link as LinkIcon,
  Bookmark,
  BookOpen,
  Bot,
  Target,
  Sliders,
  Shield,
  FileText,
  Users,
  Calendar,
  Clock,
  Download,
  BarChart2,
  Building2,
  Monitor,
  Wallet,
  Receipt,
  FileCheck,
  Scale,
  Layers,
  Percent,
  Copy,
  HardHat,
  Wrench,
  User,
  Globe,
  UploadCloud,
  FolderKanban,
  type LucideIcon,
} from 'lucide-react';
import type { ActiveTab } from '../hooks/useAppNavigation';

/**
 * ============================================================================
 * REGISTRO CENTRAL DE NAVEGACIÓN ERP (MÓDULOS -> MENÚS -> SUBMENÚS)
 * ============================================================================
 *
 * ¿CÓMO AGREGAR, QUITAR O MODIFICAR MÓDULOS, MENÚS Y SUBMENÚS?
 * 1. Para OCULTAR temporalmente cualquier Módulo, Menú o Submenú:
 *    Cambia su propiedad `enabled: false`.
 * 2. Para ELIMINAR un Módulo, Menú o Submenú:
 *    Borra su bloque del arreglo `ERP_MODULES_REGISTRY`.
 * 3. Para AGREGAR un nuevo Módulo, Menú (Nivel 2) o Submenú (Nivel 3):
 *    Añade un objeto al arreglo correspondiente. El Sidebar, el Header,
 *    los estados de navegación y los controles de permisos lo detectarán
 *    automáticamente sin tocar otros archivos.
 */

export type MenuKind = 'view' | 'links' | 'notes' | 'permissions' | 'group' | 'action';

export interface ERPSubmenuConfig {
  /** Identificador único del submenú (se asigna como subTab activo del módulo) */
  id: string;
  /** Texto visible en la barra lateral */
  label: string;
  /** Título opcional para mostrar en la cabecera (AppHeader) cuando está activo */
  headerTitle?: string;
  /** Ícono de Lucide React */
  icon: LucideIcon;
  /** Activar o desactivar este submenú (default: true) */
  enabled?: boolean;
  /** Clave de permiso opcional (ej: 'finanzas_config_chart') */
  permissionKey?: string;
  /** Si este submenú cambia a otro activeTab global distinto al del módulo padre */
  targetTab?: ActiveTab;
}

export interface ERPMenuConfig {
  /** Identificador único del menú (se asigna como subTab activo si no es un grupo) */
  id: string;
  /** Texto visible en la barra lateral */
  label: string;
  /** Título opcional para mostrar en la cabecera (AppHeader) cuando está activo */
  headerTitle?: string;
  /** Ícono de Lucide React */
  icon: LucideIcon;
  /** Activar o desactivar este menú (default: true) */
  enabled?: boolean;
  /**
   * Tipo de comportamiento del menú:
   * - 'view' (por defecto): abre la vista correspondiente al subTab
   * - 'links': menú utilitario de Enlaces de Interés (respeta isSubnavVisible)
   * - 'notes': menú utilitario de Notas (respeta isSubnavVisible)
   * - 'permissions': menú de Matriz de Permisos (visible para Admin o Líder del módulo)
   * - 'group': contenedor desplegable que agrupa submenús de 3er nivel (`submenus`)
   * - 'action': botón de acción especial (ej: exportar/importar tareas)
   */
  kind?: MenuKind;
  /** Clave de permiso específica (ej: 'capacitacion_calendar') */
  permissionKey?: string;
  /** Si este menú abre un activeTab global distinto al del módulo padre */
  targetTab?: ActiveTab;
  /** Por defecto abierto si es un grupo con submenús (default: true) */
  defaultOpen?: boolean;
  /** Nivel 3: Lista de submenús hijos dentro de este menú */
  submenus?: ERPSubmenuConfig[];
}

export interface ERPModuleConfig {
  /** ID del módulo (coincide con ActiveTab) */
  id: ActiveTab;
  /** Clave de expansión en el sidebar (por defecto igual a `id`) */
  navKey?: string;
  /** Nombre visible en el menú principal */
  label: string;
  /** Título principal en la cabecera superior (AppHeader) */
  headerTitle: string;
  /** Ícono principal del módulo */
  icon: LucideIcon;
  /** Activar o desactivar el módulo completo en toda la aplicación */
  enabled: boolean;
  /** Clave de permiso en getModuleAccess (por defecto igual a `id`) */
  permissionKey?: string;
  /** SubTab que se selecciona por defecto al abrir el módulo */
  defaultSubTab?: string;
  /** Nivel 2: Lista de Menús del módulo (pueden contener Submenús de Nivel 3) */
  menus: ERPMenuConfig[];
}

export const ERP_MODULES_REGISTRY: ERPModuleConfig[] = [
  // ==========================================================================
  // 1. DASHBOARD
  // ==========================================================================
  {
    id: 'dashboard',
    label: 'Dashboard',
    headerTitle: 'Vista Ejecutiva',
    icon: TrendingUp,
    enabled: true,
    menus: [],
  },

  // ==========================================================================
  // 2. SCRUM / GESTIÓN DE HISTORIAS
  // ==========================================================================
  {
    id: 'tasks',
    label: 'Scrum',
    headerTitle: 'Seguimiento de Historias',
    icon: CheckCircle2,
    enabled: true,
    defaultSubTab: 'board',
    menus: [
      {
        id: 'board',
        label: 'Historias',
        headerTitle: 'Seguimiento de Historias',
        icon: CheckCircle2,
        permissionKey: 'tasks',
        enabled: true,
      },
      {
        id: 'projects',
        label: 'Proyectos',
        headerTitle: 'Gestión de Proyectos',
        icon: FolderKanban,
        targetTab: 'projects',
        permissionKey: 'projects',
        enabled: true,
      },
      {
        id: 'planner',
        label: 'Planificador IA',
        headerTitle: 'Planificador Inteligente',
        icon: Calendar,
        targetTab: 'planner',
        permissionKey: 'planner',
        enabled: true,
      },
      {
        id: 'export',
        label: 'Exportar tareas',
        icon: Download,
        kind: 'action',
        permissionKey: 'tasks_export',
        enabled: true,
      },
      {
        id: 'import',
        label: 'Importar tareas',
        icon: UploadCloud,
        kind: 'action',
        permissionKey: 'tasks_import',
        enabled: true,
      },
      {
        id: 'permissions',
        label: 'Permisos Scrum',
        headerTitle: 'Permisos del Módulo Scrum',
        icon: Shield,
        kind: 'permissions',
        enabled: true,
      },
    ],
  },

  // ==========================================================================
  // 3. COLABORACIÓN (COMENTARIOS, NOTAS, ENLACES)
  // ==========================================================================
  {
    id: 'comments',
    label: 'Colaboración',
    headerTitle: 'Centro de Comentarios',
    icon: Users,
    enabled: true,
    defaultSubTab: 'inbox',
    menus: [
      {
        id: 'inbox',
        label: 'Comentarios',
        headerTitle: 'Centro de Comentarios',
        icon: MessageSquare,
        enabled: true,
      },
      {
        id: 'notes',
        label: 'Notas',
        headerTitle: 'Notas de Colaboración',
        icon: FileText,
        enabled: true,
      },
      {
        id: 'links',
        label: 'Enlaces de Interés',
        headerTitle: 'Enlaces de Interés',
        icon: Bookmark,
        enabled: true,
      },
      {
        id: 'permissions',
        label: 'Permisos',
        headerTitle: 'Permisos de Colaboración',
        icon: Shield,
        kind: 'permissions',
        enabled: true,
      },
    ],
  },

  // ==========================================================================
  // 4. VENTAS
  // ==========================================================================
  {
    id: 'ventas',
    label: 'Ventas',
    headerTitle: 'Gestión Comercial & CRM',
    icon: DollarSign,
    enabled: true,
    defaultSubTab: 'pipeline',
    menus: [
      {
        id: 'links',
        label: 'Enlaces de Interés',
        headerTitle: 'Enlaces de Ventas',
        icon: LinkIcon,
        kind: 'links',
        enabled: true,
      },
      {
        id: 'notes',
        label: 'Notas',
        headerTitle: 'Notas de Ventas',
        icon: FileText,
        kind: 'notes',
        enabled: true,
      },
      {
        id: 'crm',
        label: 'Clientes',
        headerTitle: 'Directorio de Clientes (CRM)',
        icon: Users,
        enabled: true,
      },
      {
        id: 'pipeline',
        label: 'Oportunidades',
        headerTitle: 'Pipeline de Oportunidades',
        icon: Target,
        enabled: true,
      },
      {
        id: 'quotes',
        label: 'Proformas',
        headerTitle: 'Proformas Comerciales',
        icon: FileText,
        enabled: true,
      },
      {
        id: 'quote_templates',
        label: 'Proformas Modelo',
        headerTitle: 'Proformas Modelo',
        icon: Copy,
        enabled: true,
      },
      {
        id: 'goals',
        label: 'Metas & KPIs',
        headerTitle: 'Metas Comerciales & KPIs',
        icon: BarChart2,
        enabled: true,
      },
      {
        id: 'permissions',
        label: 'Permisos',
        headerTitle: 'Permisos de Ventas',
        icon: Shield,
        kind: 'permissions',
        enabled: true,
      },
    ],
  },

  // ==========================================================================
  // 5. GESTIÓN POR PROCESOS
  // ==========================================================================
  {
    id: 'process_dashboard',
    label: 'Gestión',
    headerTitle: 'Tablero de Procesos',
    icon: Activity,
    enabled: true,
    defaultSubTab: 'summary',
    menus: [
      {
        id: 'summary',
        label: 'Horas e Historias',
        headerTitle: 'Tablero de Procesos',
        icon: Clock,
        enabled: true,
      },
      {
        id: 'projects',
        label: 'Bases de Proyectos',
        headerTitle: 'Bases de Proyectos',
        icon: FolderKanban,
        enabled: true,
      },
      {
        id: 'notes',
        label: 'Notas',
        headerTitle: 'Notas del Proceso',
        icon: FileText,
        enabled: true,
      },
      {
        id: 'links',
        label: 'Enlaces de Interés',
        headerTitle: 'Enlaces del Proceso',
        icon: Bookmark,
        enabled: true,
      },
      {
        id: 'permissions',
        label: 'Permisos',
        headerTitle: 'Permisos de Gestión',
        icon: Shield,
        kind: 'permissions',
        enabled: true,
      },
    ],
  },

  // ==========================================================================
  // 5. GERENCIA
  // ==========================================================================
  {
    id: 'gerencia',
    label: 'Gerencia',
    headerTitle: 'Módulo de Gerencia',
    icon: Briefcase,
    enabled: true,
    defaultSubTab: 'notes',
    menus: [
      {
        id: 'links',
        label: 'Enlaces de Interés',
        headerTitle: 'Enlaces de Interés',
        icon: LinkIcon,
        kind: 'links',
        enabled: true,
      },
      {
        id: 'notes',
        label: 'Notas',
        headerTitle: 'Notas de Gerencia',
        icon: BookOpen,
        kind: 'notes',
        enabled: true,
      },
      {
        id: 'consultant',
        label: 'Asistente IA',
        headerTitle: 'Asistente Directivo IA',
        icon: Bot,
        enabled: true,
      },
      {
        id: 'strategy',
        label: 'Estrategia & OKRs',
        headerTitle: 'Estrategia & OKRs',
        icon: Target,
        enabled: true,
      },
      {
        id: 'governance',
        label: 'Gobernanza IA',
        headerTitle: 'Gobernanza de IA',
        icon: Sliders,
        enabled: true,
      },
      {
        id: 'permissions',
        label: 'Permisos',
        headerTitle: 'Permisos de Gerencia',
        icon: Shield,
        kind: 'permissions',
        enabled: true,
      },
    ],
  },

  // ==========================================================================
  // 6. ACREDITACIÓN
  // ==========================================================================
  {
    id: 'acreditacion',
    label: 'Acreditación',
    headerTitle: 'Acreditación & Certificaciones',
    icon: Award,
    enabled: true,
    defaultSubTab: 'allies',
    menus: [
      {
        id: 'links',
        label: 'Enlaces de Interés',
        headerTitle: 'Enlaces de Acreditación',
        icon: LinkIcon,
        kind: 'links',
        enabled: true,
      },
      {
        id: 'notes',
        label: 'Notas',
        headerTitle: 'Notas de Acreditación',
        icon: FileText,
        kind: 'notes',
        enabled: true,
      },
      {
        id: 'allies',
        label: 'Aliados Estratégicos',
        headerTitle: 'Aliados Estratégicos',
        icon: Users,
        enabled: true,
      },
      {
        id: 'certifications',
        label: 'Catálogo de Ofertas',
        headerTitle: 'Catálogo de Ofertas',
        icon: Award,
        enabled: true,
      },
      {
        id: 'permissions',
        label: 'Permisos',
        headerTitle: 'Permisos de Acreditación',
        icon: Shield,
        kind: 'permissions',
        enabled: true,
      },
    ],
  },

  // ==========================================================================
  // 7. CAPACITACIÓN
  // ==========================================================================
  {
    id: 'capacitacion',
    label: 'Capacitación',
    headerTitle: 'Centro de Capacitación',
    icon: GraduationCap,
    enabled: true,
    defaultSubTab: 'management',
    menus: [
      {
        id: 'links',
        label: 'Enlaces de Interés',
        headerTitle: 'Enlaces de Capacitación',
        icon: LinkIcon,
        kind: 'links',
        enabled: true,
      },
      {
        id: 'notes',
        label: 'Notas',
        headerTitle: 'Notas de Capacitación',
        icon: FileText,
        kind: 'notes',
        enabled: true,
      },
      {
        id: 'calendar',
        label: 'Calendario',
        headerTitle: 'Calendario de Capacitaciones',
        icon: Calendar,
        permissionKey: 'capacitacion_calendar',
        enabled: true,
      },
      {
        id: 'management',
        label: 'Gestión de Capacitaciones',
        headerTitle: 'Gestión de Capacitaciones',
        icon: BarChart2,
        permissionKey: 'capacitacion_management',
        enabled: true,
      },
      {
        id: 'trainers',
        label: 'Capacitadores',
        headerTitle: 'Directorio de Capacitadores',
        icon: Users,
        permissionKey: 'capacitacion_trainers',
        enabled: true,
      },
      {
        id: 'physical_spaces',
        label: 'Lugares',
        headerTitle: 'Lugares Físicos',
        icon: Building2,
        permissionKey: 'capacitacion_physical_spaces',
        enabled: true,
      },
      {
        id: 'virtual_spaces',
        label: 'Aulas Virtuales',
        headerTitle: 'Aulas Virtuales',
        icon: Monitor,
        permissionKey: 'capacitacion_virtual_spaces',
        enabled: true,
      },
      {
        id: 'permissions',
        label: 'Permisos',
        headerTitle: 'Permisos de Capacitación',
        icon: Shield,
        kind: 'permissions',
        enabled: true,
      },
    ],
  },

  // ==========================================================================
  // 8. FINANZAS & BANCOS (Demostración de 3 Niveles: Módulo -> Menú -> Submenú)
  // ==========================================================================
  {
    id: 'finanzas',
    label: 'Finanzas & Bancos',
    headerTitle: 'Finanzas, Tesorería & Contabilidad',
    icon: Landmark,
    enabled: true,
    defaultSubTab: 'treasury',
    menus: [
      {
        id: 'treasury',
        label: 'Dashboard de Liquidez',
        headerTitle: 'Tesorería & Liquidez Consolidada',
        icon: BarChart2,
        permissionKey: 'finanzas_treasury',
        enabled: true,
      },
      {
        id: 'bancos_group',
        label: 'Bancos & Cajas',
        icon: Wallet,
        kind: 'group',
        defaultOpen: true,
        permissionKey: 'finanzas_accounts',
        enabled: true,
        submenus: [
          {
            id: 'accounts',
            label: 'Cuentas Bancarias',
            headerTitle: 'Cuentas Bancarias & Cajas',
            icon: Wallet,
            permissionKey: 'finanzas_accounts',
            enabled: true,
          },
          {
            id: 'bank_entities',
            label: 'Directorio de Bancos',
            headerTitle: 'Directorio de Entidades Bancarias',
            icon: Building2,
            permissionKey: 'finanzas_bank_entities',
            enabled: true,
          },
        ],
      },
      {
        id: 'contabilidad_group',
        label: 'Movimientos & Control',
        icon: Receipt,
        kind: 'group',
        defaultOpen: true,
        enabled: true,
        submenus: [
          {
            id: 'statements',
            label: 'Libro de Movimientos',
            headerTitle: 'Libro Mayor de Movimientos',
            icon: Receipt,
            permissionKey: 'finanzas_statements',
            enabled: true,
          },
          {
            id: 'bank_statements',
            label: 'Extractos Bancarios',
            headerTitle: 'Extractos Bancarios Oficiales',
            icon: FileCheck,
            permissionKey: 'finanzas_bank_statements',
            enabled: true,
          },
          {
            id: 'budgets',
            label: 'Control Presupuestario',
            headerTitle: 'Control Presupuestario & Costos',
            icon: Target,
            permissionKey: 'finanzas_budgets',
            enabled: true,
          },
          {
            id: 'reconciliation',
            label: 'Conciliación Bancaria',
            headerTitle: 'Conciliación Bancaria',
            icon: Scale,
            permissionKey: 'finanzas_reconciliation',
            enabled: true,
          },
        ],
      },
      {
        id: 'config_group',
        label: 'Configuración Contable',
        icon: Settings,
        kind: 'group',
        defaultOpen: false,
        permissionKey: 'finanzas_config',
        enabled: true,
        submenus: [
          {
            id: 'config_chart',
            label: 'Plan de Cuentas',
            headerTitle: 'Plan General de Cuentas',
            icon: Layers,
            permissionKey: 'finanzas_config_chart',
            enabled: true,
          },
          {
            id: 'config_journals',
            label: 'Diarios Contables',
            headerTitle: 'Diarios Contables',
            icon: BookOpen,
            permissionKey: 'finanzas_config_journals',
            enabled: true,
          },
          {
            id: 'config_taxes',
            label: 'Impuestos & Retenciones',
            headerTitle: 'Impuestos & Retenciones SRI',
            icon: Percent,
            permissionKey: 'finanzas_config_taxes',
            enabled: true,
          },
        ],
      },
      {
        id: 'permissions',
        label: 'Permisos',
        headerTitle: 'Permisos de Finanzas',
        icon: Shield,
        kind: 'permissions',
        enabled: true,
      },
    ],
  },

  // ==========================================================================
  // 9. QHSE
  // ==========================================================================
  {
    id: 'qhse',
    label: 'QHSE',
    headerTitle: 'Seguridad, Salud y Ambiente (QHSE)',
    icon: ShieldCheck,
    enabled: true,
    defaultSubTab: 'inspections',
    menus: [
      {
        id: 'inspections',
        label: 'Registro de Inspección',
        headerTitle: 'Registro de Inspección QHSE',
        icon: Layers,
        enabled: true,
      },
      {
        id: 'links',
        label: 'Enlaces de Interés',
        headerTitle: 'Enlaces QHSE',
        icon: LinkIcon,
        kind: 'links',
        enabled: true,
      },
      {
        id: 'notes',
        label: 'Notas',
        headerTitle: 'Notas QHSE',
        icon: FileText,
        kind: 'notes',
        enabled: true,
      },
      {
        id: 'permissions',
        label: 'Permisos',
        headerTitle: 'Permisos QHSE',
        icon: Shield,
        kind: 'permissions',
        enabled: true,
      },
    ],
  },

  // ==========================================================================
  // 10. MARKETING
  // ==========================================================================
  {
    id: 'marketing',
    label: 'Marketing',
    headerTitle: 'Marketing & Crecimiento',
    icon: Megaphone,
    enabled: true,
    defaultSubTab: 'campaigns',
    menus: [
      {
        id: 'links',
        label: 'Enlaces de Interés',
        headerTitle: 'Enlaces de Marketing',
        icon: LinkIcon,
        kind: 'links',
        enabled: true,
      },
      {
        id: 'notes',
        label: 'Notas',
        headerTitle: 'Notas de Marketing',
        icon: FileText,
        kind: 'notes',
        enabled: true,
      },
      {
        id: 'campaigns',
        label: 'Campañas',
        headerTitle: 'Campañas de Marketing',
        icon: Target,
        enabled: true,
      },
      {
        id: 'leads',
        label: 'Prospectos (CRM)',
        headerTitle: 'Prospectos (CRM)',
        icon: Users,
        enabled: true,
      },
      {
        id: 'content_calendar',
        label: 'Contenido & Calendario',
        headerTitle: 'Contenido & Calendario',
        icon: Calendar,
        enabled: true,
      },
      {
        id: 'metrics_analytics',
        label: 'Métricas & KPIs',
        headerTitle: 'Métricas & KPIs de Marketing',
        icon: BarChart2,
        enabled: true,
      },
      {
        id: 'permissions',
        label: 'Permisos',
        headerTitle: 'Permisos de Marketing',
        icon: Shield,
        kind: 'permissions',
        enabled: true,
      },
    ],
  },

  // ==========================================================================
  // 12. PRODUCTOS
  // ==========================================================================
  {
    id: 'productos',
    label: 'Productos',
    headerTitle: 'Catálogo de Productos & Servicios',
    icon: Boxes,
    enabled: true,
    defaultSubTab: 'todos',
    menus: [
      {
        id: 'todos',
        label: 'Todos los Productos',
        headerTitle: 'Todos los Productos',
        icon: Boxes,
        enabled: true,
      },
      {
        id: 'certificacion',
        label: 'Certificación',
        headerTitle: 'Productos de Certificación',
        icon: Award,
        enabled: true,
      },
      {
        id: 'capacitacion',
        label: 'Capacitación',
        headerTitle: 'Productos de Capacitación',
        icon: GraduationCap,
        enabled: true,
      },
      {
        id: 'qhse',
        label: 'QHSE',
        headerTitle: 'Servicios QHSE',
        icon: ShieldAlert,
        enabled: true,
      },
      {
        id: 'epp',
        label: 'EPP',
        headerTitle: 'Equipos de Protección Personal (EPP)',
        icon: HardHat,
        enabled: true,
      },
      {
        id: 'equipos',
        label: 'Equipos',
        headerTitle: 'Maquinaria y Equipos',
        icon: Wrench,
        enabled: true,
      },
      {
        id: 'permissions',
        label: 'Permisos',
        headerTitle: 'Permisos de Productos',
        icon: Shield,
        kind: 'permissions',
        enabled: true,
      },
    ],
  },

  // ==========================================================================
  // 13. INVENTARIO
  // ==========================================================================
  {
    id: 'inventario',
    label: 'Inventario',
    headerTitle: 'Inventario & Bodegas',
    icon: Package,
    enabled: true,
    defaultSubTab: 'existencias',
    menus: [
      {
        id: 'existencias',
        label: 'Existencias & Stock',
        headerTitle: 'Existencias & Stock',
        icon: Layers,
        enabled: true,
      },
      {
        id: 'bodegas',
        label: 'Gestión de Bodegas',
        headerTitle: 'Gestión de Bodegas',
        icon: Building2,
        enabled: true,
      },
      {
        id: 'solicitudes',
        label: 'Entrega de EPP',
        headerTitle: 'Entrega de EPP',
        icon: FileCheck,
        enabled: true,
      },
      {
        id: 'facturas',
        label: 'Carga por Factura',
        headerTitle: 'Carga por Factura',
        icon: Receipt,
        enabled: true,
      },
      {
        id: 'permissions',
        label: 'Permisos',
        headerTitle: 'Permisos de Inventario',
        icon: Shield,
        kind: 'permissions',
        enabled: true,
      },
    ],
  },

  // ==========================================================================
  // 14. DIRECTORIO
  // ==========================================================================
  {
    id: 'directory',
    label: 'Directorio',
    headerTitle: 'Directorio Corporativo',
    icon: Contact,
    enabled: true,
    defaultSubTab: 'people',
    menus: [
      {
        id: 'people',
        label: 'Personas',
        headerTitle: 'Directorio de Personas',
        icon: User,
        enabled: true,
      },
      {
        id: 'companies',
        label: 'Compañías',
        headerTitle: 'Directorio de Compañías',
        icon: Building2,
        enabled: true,
      },
      {
        id: 'industries',
        label: 'Industrias',
        headerTitle: 'Catálogo de Industrias',
        icon: Layers,
        enabled: true,
      },
      {
        id: 'permissions',
        label: 'Permisos',
        headerTitle: 'Permisos de Directorio',
        icon: Shield,
        kind: 'permissions',
        enabled: true,
      },
    ],
  },

  // ==========================================================================
  // 15. IMPORTACIONES
  // ==========================================================================
  {
    id: 'importaciones',
    label: 'Importaciones',
    headerTitle: 'Comercio Exterior & Importaciones',
    icon: Package,
    enabled: true,
    defaultSubTab: 'products',
    menus: [
      {
        id: 'products',
        label: 'Base de Productos',
        headerTitle: 'Base de Productos de Importación',
        icon: Package,
        enabled: true,
      },
      {
        id: 'suppliers',
        label: 'Proveedores Internacionales',
        headerTitle: 'Proveedores Internacionales',
        icon: Globe,
        enabled: true,
      },
      {
        id: 'proformas',
        label: 'Proformas / Órdenes',
        headerTitle: 'Proformas / Órdenes de Compra',
        icon: FileText,
        enabled: true,
      },
      {
        id: 'upload_proforma',
        label: 'Cargar y Validar',
        headerTitle: 'Cargar y Validar Proforma',
        icon: UploadCloud,
        enabled: true,
      },
      {
        id: 'permissions',
        label: 'Permisos',
        headerTitle: 'Permisos de Importaciones',
        icon: Shield,
        kind: 'permissions',
        enabled: true,
      },
    ],
  },

  // ==========================================================================
  // 16. ANALIZAR REUNIÓN (IA)
  // ==========================================================================
  {
    id: 'transcript',
    label: 'Analizar Reunión',
    headerTitle: 'Analizador de Reuniones con IA',
    icon: Sparkles,
    enabled: true,
    menus: [],
  },

  // ==========================================================================
  // 17. CONFIGURACIÓN
  // ==========================================================================
  {
    id: 'settings',
    label: 'Configuración',
    headerTitle: 'Configuración del Sistema',
    icon: Settings,
    enabled: true,
    defaultSubTab: 'roles',
    menus: [
      {
        id: 'roles',
        label: 'Permisos',
        headerTitle: 'Matriz General de Permisos',
        icon: Shield,
        enabled: true,
      },
      {
        id: 'processes',
        label: 'Procesos',
        headerTitle: 'Configuración de Procesos',
        icon: Building2,
        enabled: true,
      },
      {
        id: 'members',
        label: 'Equipo',
        headerTitle: 'Gestión de Equipo',
        icon: Users,
        enabled: true,
      },
    ],
  },
];

/**
 * Helpers de consulta rápida sobre el registro
 */
export const getEnabledModules = (): ERPModuleConfig[] =>
  ERP_MODULES_REGISTRY.filter((m) => m.enabled);

export const getModuleConfig = (moduleId: string): ERPModuleConfig | undefined =>
  ERP_MODULES_REGISTRY.find((m) => m.id === moduleId || m.navKey === moduleId);

export const getModuleLabel = (moduleId: string): string => {
  if (moduleId === 'projects') return 'Proyectos';
  if (moduleId === 'planner') return 'Planificador IA';
  return getModuleConfig(moduleId)?.label || 'Configuración';
};

export const getActiveHeaderTitle = (activeTab: string, activeSubTab?: string): string => {
  if (activeTab === 'projects') return 'Gestión de Proyectos';
  if (activeTab === 'planner') return 'Planificador Inteligente';
  const mod = getModuleConfig(activeTab);
  if (!mod) return 'Configuración del Sistema';
  if (activeSubTab) {
    for (const menu of mod.menus) {
      if (menu.id === activeSubTab) {
        return menu.headerTitle || menu.label;
      }
      if (menu.submenus) {
        const sub = menu.submenus.find((s) => s.id === activeSubTab);
        if (sub) {
          return sub.headerTitle || sub.label;
        }
      }
    }
  }
  return mod.headerTitle || mod.label;
};

