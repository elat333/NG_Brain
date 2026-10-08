import React from 'react';
import {
  TrendingUp,
  Landmark,
  Receipt,
  Target,
  Scale,
  Settings,
  Megaphone,
  BookOpen,
  Image,
  FileSpreadsheet,
  BarChart2,
  Bookmark,
  Calendar,
  GraduationCap,
  Users,
  Award,
  ShieldCheck,
  ShieldAlert,
  HardHat,
  FileCheck,
  DollarSign,
  Contact,
  Boxes,
  Package,
  Layers,
  Wrench,
  Bot,
  Sparkles,
  Sliders,
  CheckSquare,
  FolderKanban,
  Download,
  UploadCloud,
  Kanban
} from 'lucide-react';

export interface SubModuleItem {
  id: string;
  name: string;
  desc: string;
  iconName: string;
  color: string;
  bg: string;
}

export const MODULE_SUBMODULES_REGISTRY: Record<string, SubModuleItem[]> = {
  tasks: [
    {
      id: 'tasks',
      name: 'Tablero de Historias Ágiles',
      desc: 'Flujo Kanban/Scrum, estados (Backlog, To Do, In Progress, Review, Done).',
      iconName: 'CheckSquare',
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'projects',
      name: 'Gestión de Proyectos',
      desc: 'Portafolio de iniciativas, hitos estratégicos y vinculación con historias.',
      iconName: 'FolderKanban',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-200'
    },
    {
      id: 'planner',
      name: 'Planificador Inteligente IA',
      desc: 'Estructuración y sugerencias de sprints con modelos de Gemini.',
      iconName: 'Calendar',
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200'
    },
    {
      id: 'tasks_export',
      name: 'Exportación de Tareas & Historias',
      desc: 'Permiso para descargar y exportar backups del backlog en JSON / Excel.',
      iconName: 'Download',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200'
    },
    {
      id: 'tasks_import',
      name: 'Importación Masiva de Historias',
      desc: 'Permiso para cargar y restaurar tareas e historias desde archivos externos.',
      iconName: 'UploadCloud',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200'
    }
  ],

  finanzas: [
    {
      id: 'finanzas_treasury',
      name: 'Tesorería & Liquidez',
      desc: 'Métricas de liquidez consolidada, saldos por cuenta, flujo neto y KPIs.',
      iconName: 'TrendingUp',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-200'
    },
    {
      id: 'finanzas_accounts',
      name: 'Cuentas Bancarias & Cajas',
      desc: 'Catálogo de cuentas corrientes, ahorros, cajas chicas y directorio de bancos.',
      iconName: 'Landmark',
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'finanzas_bank_entities',
      name: 'Directorio de Bancos',
      desc: 'Entidades bancarias homologadas, códigos de transferencia y gestión institucional.',
      iconName: 'Building2',
      color: 'text-cyan-600',
      bg: 'bg-cyan-50 border-cyan-200'
    },
    {
      id: 'finanzas_statements',
      name: 'Libro Mayor de Movimientos',
      desc: 'Registro de cobros, pagos, facturas, impuestos SRI y libro diario contable.',
      iconName: 'Receipt',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200'
    },
    {
      id: 'finanzas_bank_statements',
      name: 'Extractos Bancarios',
      desc: 'Importación de estados de cuenta bancarios oficiales y conciliación previa.',
      iconName: 'FileCheck',
      color: 'text-teal-600',
      bg: 'bg-teal-50 border-teal-200'
    },
    {
      id: 'finanzas_budgets',
      name: 'Control Presupuestario & Costos',
      desc: 'Presupuestos planificados vs ejecutados reales y márgenes por centro de costo.',
      iconName: 'Target',
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200'
    },
    {
      id: 'finanzas_reconciliation',
      name: 'Conciliación Bancaria',
      desc: 'Cotejo y liquidación de extractos bancarios oficiales contra registros internos.',
      iconName: 'Scale',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200'
    },
    {
      id: 'finanzas_config_chart',
      name: 'Plan General de Cuentas',
      desc: 'Árbol contable estructurado por activos, pasivos, patrimonio, ingresos y gastos.',
      iconName: 'Layers',
      color: 'text-slate-600',
      bg: 'bg-slate-50 border-slate-200'
    },
    {
      id: 'finanzas_config_journals',
      name: 'Diarios Contables',
      desc: 'Definición de diarios financieros, compras, ventas, caja y operaciones varias.',
      iconName: 'BookOpen',
      color: 'text-orange-600',
      bg: 'bg-orange-50 border-orange-200'
    },
    {
      id: 'finanzas_config_taxes',
      name: 'Impuestos & Retenciones SRI',
      desc: 'Tarifas de IVA (15%, 0%), retenciones en la fuente y parametrización tributaria.',
      iconName: 'Settings',
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-200'
    }
  ],

  marketing: [
    {
      id: 'marketing_campaigns',
      name: 'Campañas Publicitarias',
      desc: 'Planificación, presupuesto y seguimiento de campañas de marketing digital y físico.',
      iconName: 'Megaphone',
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-200'
    },
    {
      id: 'marketing_stories',
      name: 'Historias & Publicaciones',
      desc: 'Cronograma editorial, parrilla de contenidos en redes sociales y copies aprobados.',
      iconName: 'Image',
      color: 'text-pink-600',
      bg: 'bg-pink-50 border-pink-200'
    },
    {
      id: 'marketing_media',
      name: 'Directorio de Medios & Canales',
      desc: 'Canales de difusión, medios de prensa, influencers y proveedores creativos.',
      iconName: 'Contact',
      color: 'text-violet-600',
      bg: 'bg-violet-50 border-violet-200'
    },
    {
      id: 'marketing_leads',
      name: 'Formularios & Leads B2B',
      desc: 'Captura de prospectos digitales, segmentación de audiencia e integración CRM.',
      iconName: 'FileSpreadsheet',
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'marketing_analytics',
      name: 'Analítica & KPIs',
      desc: 'Métricas de conversión, costo por adquisición (CAC), ROI y alcance de marca.',
      iconName: 'BarChart2',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200'
    },
    {
      id: 'marketing_notes',
      name: 'Notas & Enlaces de Marketing',
      desc: 'Repositorio de recursos creativos, lineamientos de marca y bitácora del área.',
      iconName: 'Bookmark',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200'
    }
  ],

  capacitacion: [
    {
      id: 'capacitacion_calendar',
      name: 'Calendario Formativo',
      desc: 'Agenda visual de cursos programados, fechas límite y sesiones en vivo.',
      iconName: 'Calendar',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-200'
    },
    {
      id: 'capacitacion_management',
      name: 'Gestión de Cursos & Programas',
      desc: 'Administración de programas educativos, malla curricular y registro de participantes.',
      iconName: 'GraduationCap',
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'capacitacion_trainers',
      name: 'Instructores & Docentes',
      desc: 'Directorio de capacitadores, perfiles académicos y asignación de cursos.',
      iconName: 'Users',
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200'
    },
    {
      id: 'capacitacion_certifications',
      name: 'Certificaciones & Evaluaciones',
      desc: 'Emisión de certificados, calificaciones de aprobación y registro de asistencias.',
      iconName: 'Award',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200'
    },
    {
      id: 'capacitacion_notes',
      name: 'Notas & Enlaces de Capacitación',
      desc: 'Material didáctico, guías de estudio y bitácora pedagógica.',
      iconName: 'Bookmark',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200'
    }
  ],

  qhse: [
    {
      id: 'qhse_risks',
      name: 'Matriz de Riesgos & Incidentes',
      desc: 'Identificación de peligros laborales, evaluación IPER y registro de accidentes/incidentes.',
      iconName: 'ShieldAlert',
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200'
    },
    {
      id: 'qhse_inspections',
      name: 'Inspecciones & Auditorías',
      desc: 'Listas de chequeo en sitio, programas de inspección y planes de acción correctiva.',
      iconName: 'FileCheck',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200'
    },
    {
      id: 'qhse_ppe',
      name: 'Equipos de Protección (EPP)',
      desc: 'Control de entrega de indumentaria de seguridad, stock de protección y vencimientos.',
      iconName: 'HardHat',
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'qhse_compliance',
      name: 'Normativas & Cumplimiento',
      desc: 'Gestión de requisitos legales de seguridad, salud ocupacional y medio ambiente.',
      iconName: 'ShieldCheck',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200'
    },
    {
      id: 'qhse_notes',
      name: 'Notas & Enlaces QHSE',
      desc: 'Protocolos de emergencia, hojas MSDS y manuales de bioseguridad.',
      iconName: 'Bookmark',
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200'
    }
  ],

  ventas: [
    {
      id: 'ventas_pipeline',
      name: 'Pipeline de Oportunidades',
      desc: 'Embudo de ventas comercial, etapas de negociación y probabilidad de cierre.',
      iconName: 'DollarSign',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200'
    },
    {
      id: 'ventas_clients',
      name: 'Directorio de Clientes B2B',
      desc: 'Cuentas corporativas, historial de interacciones y contactos comerciales.',
      iconName: 'Contact',
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'ventas_quotes',
      name: 'Cotizaciones & Propuestas',
      desc: 'Generación de cotizaciones formales, términos de pago y seguimiento de aprobaciones.',
      iconName: 'Receipt',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-200'
    },
    {
      id: 'ventas_goals',
      name: 'Metas Comerciales & KPIs',
      desc: 'Objetivos mensuales de ventas, comisiones y rendimiento del equipo comercial.',
      iconName: 'Target',
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200'
    },
    {
      id: 'ventas_notes',
      name: 'Notas & Enlaces Comerciales',
      desc: 'Argumentarios de venta, fichas de productos y acuerdos con clientes.',
      iconName: 'Bookmark',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200'
    }
  ],

  importaciones: [
    {
      id: 'importaciones_shipments',
      name: 'Seguimiento de Embarques',
      desc: 'Tracking marítimo/aéreo, números de contenedor, BL y fechas estimadas de arribo (ETA).',
      iconName: 'Boxes',
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'importaciones_suppliers',
      name: 'Proveedores Internacionales',
      desc: 'Fabricantes en origen, contratos Incoterms, términos de pago y agentes de carga.',
      iconName: 'Contact',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-200'
    },
    {
      id: 'importaciones_customs',
      name: 'Costeo & Liquidación Aduanera',
      desc: 'Declaraciones aduaneras (DAI), aranceles, fletes internacionales y costeo en bodega.',
      iconName: 'Receipt',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200'
    },
    {
      id: 'importaciones_notes',
      name: 'Notas & Enlaces de Importaciones',
      desc: 'Documentación de aduanas, normativas arancelarias y procedimientos de comercio exterior.',
      iconName: 'Bookmark',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200'
    }
  ],

  productos: [
    {
      id: 'productos_catalog',
      name: 'Catálogo de Productos',
      desc: 'Portafolio maestro de productos, líneas, SKU y descripciones comerciales.',
      iconName: 'Package',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-200'
    },
    {
      id: 'productos_specs',
      name: 'Fichas Técnicas & Certificaciones',
      desc: 'Especificaciones técnicas, certificados de calidad, registros sanitarios y manuales.',
      iconName: 'FileCheck',
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'productos_pricing',
      name: 'Listas de Precios & Tarifas',
      desc: 'Estructura de precios mayoristas, distribuidores, márgenes y políticas de descuento.',
      iconName: 'DollarSign',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200'
    },
    {
      id: 'productos_notes',
      name: 'Notas & Enlaces de Productos',
      desc: 'Investigación y desarrollo de productos, benchmarking y documentación de marca.',
      iconName: 'Bookmark',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200'
    }
  ],

  inventario: [
    {
      id: 'inventario_stock',
      name: 'Existencias & Stock en Vivo',
      desc: 'Niveles de stock disponible, reservado, mínimo de seguridad y alertas de reposición.',
      iconName: 'Boxes',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200'
    },
    {
      id: 'inventario_movements',
      name: 'Movimientos de Almacén',
      desc: 'Kardex de entradas, salidas, transferencias entre bodegas y ajustes de inventario.',
      iconName: 'Receipt',
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'inventario_valuation',
      name: 'Valoración de Inventario',
      desc: 'Costos promedio ponderado (PMP), valor total en almacén y depreciación de stock.',
      iconName: 'DollarSign',
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200'
    },
    {
      id: 'inventario_warehouses',
      name: 'Bodegas & Almacenes',
      desc: 'Gestión de ubicaciones físicas, estanterías, bodegas principales y centros satélite.',
      iconName: 'Layers',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200'
    }
  ],

  acreditacion: [
    {
      id: 'acreditacion_standards',
      name: 'Requisitos & Normas ISO',
      desc: 'Estructura de requisitos normativos, cláusulas de acreditación y estándares aplicables.',
      iconName: 'ShieldCheck',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-200'
    },
    {
      id: 'acreditacion_evidence',
      name: 'Evidencias & Auditorías',
      desc: 'Carga y verificación de evidencias de cumplimiento, hallazgos y no conformidades.',
      iconName: 'FileCheck',
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'acreditacion_certificates',
      name: 'Dictámenes & Certificados',
      desc: 'Emisión de dictámenes técnicos, auditorías de certificación y sellos otorgados.',
      iconName: 'Award',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200'
    },
    {
      id: 'acreditacion_notes',
      name: 'Notas & Enlaces de Acreditación',
      desc: 'Guías de auditoría, reglamentos técnicos y actas de comités de acreditación.',
      iconName: 'Bookmark',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200'
    }
  ],

  gerencia: [
    {
      id: 'gerencia_dashboard',
      name: 'Dashboard Ejecutivo & KPIs',
      desc: 'Métricas consolidadas de la empresa, rendimiento global y estado de operaciones.',
      iconName: 'BarChart2',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-200'
    },
    {
      id: 'gerencia_strategy',
      name: 'Estrategia & Objetivos OKR',
      desc: 'Plan estratégico institucional, metas a largo plazo y seguimiento de objetivos clave.',
      iconName: 'Target',
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200'
    },
    {
      id: 'gerencia_governance',
      name: 'Gobernanza IA & Políticas',
      desc: 'Directrices éticas, auditoría de agentes de IA y políticas corporativas de uso.',
      iconName: 'ShieldCheck',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200'
    },
    {
      id: 'gerencia_consultant',
      name: 'Consultor Directivo IA',
      desc: 'Asistente de inteligencia artificial para análisis financiero, operativo y toma de decisiones.',
      iconName: 'Bot',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200'
    }
  ]
};
