/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TeamMember, Process, Task, Company, Industry, Role } from "../types";

export const initialRoles: Role[] = [
  {
    id: "role-admin",
    name: "Administrador",
    description: "Tiene acceso total a todas las configuraciones, gestión de usuarios, procesos y datos financieros del sistema.",
    permissions: ["gestionar_usuarios", "editar_configuracion", "gestionar_procesos", "ver_reportes", "gestionar_roles"],
    createdAt: new Date().toISOString()
  },
  {
    id: "role-lider",
    name: "Líder de Proceso",
    description: "Responsable de la gestión operativa de un proceso específico, supervisión de tareas y cumplimiento de objetivos.",
    permissions: ["gestionar_tareas_proceso", "editar_proceso", "ver_reportes_proceso", "asignar_responsables"],
    createdAt: new Date().toISOString()
  },
  {
    id: "role-colaborador",
    name: "Colaborador",
    description: "Integrante del equipo que ejecuta tareas diarias y reporta avances sobre los proyectos asignados.",
    permissions: ["ver_tareas", "actualizar_propios_avances", "comentar_tareas"],
    createdAt: new Date().toISOString()
  },
  {
    id: "role-invitado",
    name: "Invitado",
    description: "Acceso limitado para visualización de progreso general sin permisos de edición.",
    permissions: ["ver_dashboard", "ver_miembros"],
    createdAt: new Date().toISOString()
  }
];

export const initialIndustries: Industry[] = [
  { id: "ind-1", name: "Construcción", createdAt: new Date().toISOString() },
  { id: "ind-2", name: "Tecnología", createdAt: new Date().toISOString() },
  { id: "ind-3", name: "Publicidad", createdAt: new Date().toISOString() },
  { id: "ind-4", name: "Energía", createdAt: new Date().toISOString() },
  { id: "ind-5", name: "Servicios", createdAt: new Date().toISOString() }
];

export const initialCompanies: Company[] = [
  {
    id: "comp-1",
    name: "Tech Solutions Inc.",
    ruc: "1790011223001",
    industry: "Tecnología",
    industries: ["Tecnología", "Servicios"],
    email: "contacto@techsolutions.com",
    phone: "+593 2 2555666",
    address: "Av. de los Granados, Quito",
    mainAddress: "Av. de los Granados, Quito",
    createdAt: new Date().toISOString()
  },
  {
    id: "comp-2",
    name: "Marketing Experts S.A.",
    ruc: "1790022334001",
    industry: "Publicidad",
    industries: ["Publicidad"],
    email: "info@marketingexperts.ec",
    phone: "+593 2 2444555",
    address: "La Floresta, Quito",
    mainAddress: "La Floresta, Quito",
    createdAt: new Date().toISOString()
  }
];

export const initialProcesses: Process[] = [
  {
    id: "proc-transformacion",
    name: "Transformación Digital",
    description: "Modernización de infraestructura y adopción de IA en flujos de trabajo.",
    goals: ["Reducir tiempos de respuesta en 30%", "Migrar legacy a cloud"]
  },
  {
    id: "proc-operativa",
    name: "Excelencia Operativa",
    description: "Optimización de procesos internos y gestión de calidad.",
    goals: ["Cero errores en deployments", "Documentación al 100%"]
  },
  {
    id: "proc-eng",
    name: "Desarrollo de Software",
    description: "Proceso responsable de construir y mantener la infraestructura central de nuestro producto.",
    goals: ["Mejorar el tiempo de actividad del sistema al 99.9%", "Completar la migración a Cloud Run"]
  },
  {
    id: "proc-mkt",
    name: "Crecimiento y Marketing",
    description: "Proceso enfocado en el reconocimiento de marca y la adquisición de usuarios.",
    goals: ["Lanzar campaña del Q2", "Aumentar suscriptores del boletín en un 20%"]
  },
  {
    id: "proc-hr",
    name: "Gestión de Talento",
    description: "Proceso que gestiona la adquisición de talento y el bienestar de los empleados.",
    goals: ["Reclutar 5 nuevos desarrolladores", "Implementar nueva política de trabajo remoto"]
  }
];

export const initialMembers: TeamMember[] = [
  {
    id: "mem-1",
    name: "Elena Rodriguez",
    role: "Desarrolladora Fullstack Senior",
    systemRoleId: "role-lider",
    categories: ["miembro"],
    processId: "proc-eng",
    companyAssociations: [
      { companyId: "comp-1", role: "Arquitecta de Software" },
      { companyId: "comp-2", role: "Consultora Técnica" }
    ],
    identificationId: "1721548796",
    hasRuc: true,
    ruc: "1721548796001",
    skills: ["React", "Node.js", "PostgreSQL"],
    responsibilities: ["Arquitectura de API", "Líder de Frontend"],
    recentAchievements: ["Optimización de consultas de base de datos en un 40%"],
    avatar: "https://picsum.photos/seed/elena/150/150",
    personality: "Analítica, meticulosa y muy orientada a la resolución de problemas técnicos complejos.",
    notes: "Prefiere trabajar en bloques de tiempo enfocados sin interrupciones.",
    email: "elena.rodriguez@teampulse.ai",
    phone: "+593 998877665"
  },
  {
    id: "mem-2",
    name: "Lucas Smith",
    role: "Marketer de Crecimiento",
    systemRoleId: "role-colaborador",
    categories: ["miembro"],
    processId: "proc-mkt",
    companyAssociations: [
      { companyId: "comp-2", role: "Líder de Estrategia" }
    ],
    identificationId: "1715487623",
    hasRuc: false,
    skills: ["SEO", "Estrategia de Contenido", "GA4"],
    responsibilities: ["Gestión de campañas", "Optimización SEO"],
    recentAchievements: ["Primer puesto en términos clave de la industria"],
    avatar: "https://picsum.photos/seed/lucas/150/150",
    personality: "Creativo, comunicativo y siempre buscando nuevas tendencias en el mercado digital.",
    notes: "Excelente para lluvia de ideas grupal.",
    email: "lucas.smith@teampulse.ai",
    phone: "+593 997766554"
  },
  {
    id: "mem-3",
    name: "Sofia Chen",
    role: "Directora de Operaciones",
    systemRoleId: "role-admin",
    categories: ["miembro"],
    processId: "proc-hr",
    companyAssociations: [
      { companyId: "comp-1", role: "Directora Ejecutiva" }
    ],
    identificationId: "1709854123",
    hasRuc: true,
    ruc: "1709854123001",
    skills: ["Estrategia", "Presupuesto", "Oratoria"],
    responsibilities: ["Escalamiento del equipo", "Supervisión de presupuesto"],
    recentAchievements: ["Cierre de ronda de inversión de $2M"],
    avatar: "https://picsum.photos/seed/sofia/150/150",
    personality: "Líder nata, empática y con una visión estratégica muy clara para el crecimiento organizacional.",
    notes: "Se enfoca mucho en la cultura empresarial.",
    email: "sofia.chen@teampulse.ai",
    phone: "+593 996655443"
  }
];

export const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "Migración a Cloud Run",
    description: "Mover todos los servicios actuales de la infraestructura antigua a Cloud Run para mejorar escalabilidad.",
    status: "in_progress",
    processId: "proc-eng",
    memberId: "mem-1",
    createdAt: new Date().toISOString()
  },
  {
    id: "task-2",
    title: "Campaña Q2",
    description: "Diseñar y ejecutar la campaña de marketing para el segundo trimestre.",
    status: "todo",
    processId: "proc-mkt",
    memberId: "mem-2",
    createdAt: new Date().toISOString()
  },
  {
    id: "task-3",
    title: "Contratación Desarrolladores",
    description: "Entrevistar y seleccionar a los 5 nuevos desarrolladores para el equipo técnico.",
    status: "backlog",
    processId: "proc-hr",
    memberId: "mem-3",
    createdAt: new Date().toISOString()
  }
];

export const initialManagementNotes = [
  {
    id: "note-init-1",
    title: "Plan de Sostenibilidad y Sistemas Integrados 2026",
    content: "Se acuerda priorizar la auditoría interna ISO 9001/14001 para el segundo semestre, integrando la gestión de riesgos en todos los procesos clave de Novagreen.",
    category: "estrategia" as const,
    tags: ["ISO", "Estrategia", "2026"],
    authorMemberId: "mem-3",
    authorName: "Sofia Chen",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const initialManagementStrategy = {
  id: "strat-main",
  mission: "Liderar la transformación sostenible de Novagreen optimizando la excelencia operativa mediante automatización e Inteligencia Artificial.",
  vision: "Convertirnos en el referente regional en eficiencia operacional y gestión integrada con tecnología de vanguardia.",
  swotItems: [
    { id: "s1", category: "fortaleza" as const, text: "Equipo altamente calificado en desarrollo y gestión de proyectos", impactLevel: "alto" as const, strategy: "Liderar iniciativas complejas de innovación" },
    { id: "o1", category: "oportunidad" as const, text: "Demanda creciente de soluciones automatizadas e integración ISO", impactLevel: "alto" as const, strategy: "Escalar productos de software corporativo" },
    { id: "d1", category: "debilidad" as const, text: "Documentación de procesos legacy en fase de estandarización", impactLevel: "medio" as const, strategy: "Acelerar digitalización con asistencia IA" },
    { id: "a1", category: "amenaza" as const, text: "Volatilidad regulatoria e incertidumbre económica global", impactLevel: "medio" as const, strategy: "Mantener reservas de contingencia y flexibilidad operativa" }
  ],
  okrGoals: [
    {
      id: "okr-1",
      title: "Optimización de Infraestructura Cloud y Tiempos de Respuesta",
      description: "Migrar todos los procesos críticos y lograr 99.9% de uptime con baja latencia",
      objectiveArea: "Tecnología & Operaciones",
      progress: 65,
      targetValue: "99.9%",
      currentValue: "98.5%",
      status: "en_camino" as const,
      quarter: "2026-Q3",
      keyResults: [
        { id: "kr1", description: "Completar migración a Cloud Run", achieved: true },
        { id: "kr2", description: "Implementar monitoreo en tiempo real", achieved: false }
      ]
    }
  ],
  strategicRisks: [
    {
      id: "risk-1",
      title: "Riesgo de Seguridad e Interrupción Operativa",
      description: "Posibles vulnerabilidades en integraciones de terceros o indisponibilidad de servidor",
      probability: "baja" as const,
      impact: "alto" as const,
      mitigationPlan: "Arquitectura redundante Cloud Run, respaldos automáticos y auditoría de seguridad",
      status: "controlado" as const
    }
  ],
  lastUpdated: new Date().toISOString()
};

export const initialManagementGovernance = {
  id: "gov-main",
  tone: "estructuracion_descripcion" as const,
  selectedModel: "gemini-2.5-flash",
  systemDirectives: "Alinear todas las recomendaciones con los estándares corporativos de Novagreen. Priorizar la sostenibilidad financiera, el cumplimiento de metas trimestrales y las normativas ISO de Sistemas Integrados de Gestión.",
  guardrails: [
    {
      id: "g1",
      title: "Transparencia y Causalidad de Datos",
      ruleDescription: "Indicar explícitamente el level de certeza (Alto, Medio, Bajo) al brindar estimaciones u opiniones técnicas.",
      isEnabled: true,
      category: "anti_alucinacion" as const
    },
    {
      id: "g2",
      title: "Verificación de Trazabilidad Interna",
      ruleDescription: "Fundamentar análisis en las notas de bitácora y matriz de estrategia sin inventar regulaciones ni acuerdos no registrados.",
      isEnabled: true,
      category: "anti_alucinacion" as const
    },
    {
      id: "g3",
      title: "Evaluación Obligatoria de Riesgos ISO",
      ruleDescription: "Al sugerir cambios operacionales, incluir un análisis breve de impacto en calidad, costo y seguridad.",
      isEnabled: true,
      category: "cumplimiento_iso" as const
    }
  ],
  calibrationHistory: [],
  updatedAt: new Date().toISOString()
};

export const initialMarketingCampaigns = [
  {
    id: "camp-asi-virtual-2026",
    code: "260701 - ASÍ virtual",
    name: "ASÍ virtual",
    objective: "leads" as const,
    status: "activa" as const,
    startDate: "2026-07-01",
    endDate: "2026-08-31",
    budget: 2500,
    spent: 980,
    targetAudience: "Gerentes de Operaciones, Directores de Planta y Líderes de Sostenibilidad Industrial",
    channels: ["Meta Ads (FB/IG)", "Google Ads", "LinkedIn Ads", "Email Marketing"],
    city: "Nacional / Remoto",
    leaderMemberId: "mem-3",
    processId: "proc-mkt",
    projectId: "proj-asi-virtual",
    targetKpis: {
      targetLeads: 120,
      targetSales: 15,
      targetCpl: 20,
      targetReach: 45000
    },
    notes: "Campaña de lanzamiento del programa ASÍ Virtual (Asesoría en Sostenibilidad e Innovación). Enfoque en captación B2B con webinars y diagnósticos gratuitos.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "camp-eco-solar-2026",
    code: "260815 - Paneles Novagreen Pro",
    name: "Paneles Novagreen Pro",
    objective: "ventas" as const,
    status: "planificacion" as const,
    startDate: "2026-08-15",
    endDate: "2026-10-15",
    budget: 3500,
    spent: 120,
    targetAudience: "Empresas agroindustriales y constructoras en Guayaquil, Quito y Cuenca",
    channels: ["Meta Ads (FB/IG)", "Google Ads", "TikTok Ads"],
    city: "Quito / Guayaquil",
    leaderMemberId: "mem-3",
    processId: "proc-mkt",
    projectId: "proj-paneles-pro",
    targetKpis: {
      targetLeads: 200,
      targetSales: 25,
      targetCpl: 17.5,
      targetReach: 60000
    },
    notes: "Promoción de la nueva línea de paneles fotovoltaicos importados de alta eficiencia con financiamiento directo.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const initialMarketingContents = [
  {
    id: "mkt-cnt-1",
    campaignId: "camp-asi-virtual-2026",
    title: "Reel: 3 Errores al digitalizar la sostenibilidad en tu empresa",
    copy: "¿Sabías que el 70% de las auditorías de calidad fallan por falta de trazabilidad en tiempo real? 🌿⚡ Descubre cómo ASÍ Virtual de Novagreen automatiza tus reportes y elimina el retrabajo. 👉 Agenda tu diagnóstico gratuito en el link de la bio.",
    channel: "instagram" as const,
    format: "reel_video" as const,
    scheduledDate: "2026-08-12",
    scheduledTime: "10:30",
    status: "programado" as const,
    authorMemberId: "mem-3",
    designerMemberId: "mem-2",
    assetUrl: "https://drive.google.com/novagreen/artes/reel-01-asi.mp4",
    tags: ["Sostenibilidad", "ISO", "Innovación", "Novagreen"],
    metrics: {
      views: 3420,
      likes: 215,
      comments: 18,
      shares: 42,
      clicks: 89
    },
    createdAt: new Date().toISOString()
  },
  {
    id: "mkt-cnt-2",
    campaignId: "camp-asi-virtual-2026",
    title: "Carrusel LinkedIn: Caso de Éxito y Metodología ASÍ Virtual",
    copy: "Caso práctico: Cómo una planta manufacturera optimizó un 35% sus horas de supervisión técnica integrando gestión predictiva con IA. Te explicamos el paso a paso en este carrusel. 📊💡 #EficienciaOperativa #Sostenibilidad",
    channel: "linkedin" as const,
    format: "carrusel" as const,
    scheduledDate: "2026-08-14",
    scheduledTime: "08:00",
    status: "revision" as const,
    authorMemberId: "mem-3",
    tags: ["B2B", "LinkedIn", "CasosDeExito"],
    createdAt: new Date().toISOString()
  },
  {
    id: "mkt-cnt-3",
    campaignId: "camp-eco-solar-2026",
    title: "Anuncio Meta Ads: Paneles Solares PERC con garantía extendida",
    copy: "Reduce hasta un 80% tu factura eléctrica industrial con la tecnología solar de vanguardia Novagreen. Cotización personalizada en menos de 24 horas. ⚡🔋 Haz clic en 'Más Información'.",
    channel: "facebook" as const,
    format: "anuncio_pauta" as const,
    scheduledDate: "2026-08-16",
    scheduledTime: "09:00",
    status: "redaccion" as const,
    authorMemberId: "mem-3",
    tags: ["MetaAds", "Pauta", "SolarEnergy"],
    createdAt: new Date().toISOString()
  }
];

export const initialMarketingLeads = [
  {
    id: "lead-1",
    campaignId: "camp-asi-virtual-2026",
    name: "Carlos Villacís",
    companyName: "Industrias Lácteas del Sur",
    email: "carlos.villacis@lacteasdelsur.ec",
    phone: "+593 99 876 5432",
    channel: "meta_ads" as const,
    stage: "calificado" as const,
    estimatedValue: 4800,
    assignedMemberId: "mem-3",
    city: "Cuenca",
    notes: "Interesado en la asesoría ASÍ Virtual para auditoría ambiental y reducción de huella energética. Requiere cotización para 2 plantas.",
    tags: ["Calificado", "B2B", "Urgente"],
    lastContactDate: "2026-08-10",
    createdAt: new Date().toISOString()
  },
  {
    id: "lead-2",
    campaignId: "camp-asi-virtual-2026",
    name: "Ing. Mariana Torres",
    companyName: "Constructora Andes Verde",
    email: "mtorres@andesverde.com",
    phone: "+593 98 123 4567",
    channel: "linkedin" as const,
    stage: "propuesta" as const,
    estimatedValue: 7500,
    assignedMemberId: "mem-3",
    city: "Quito",
    notes: "Se envió propuesta formal de integración y consultoría. Reunión de cierre agendada para el próximo martes.",
    tags: ["Propuesta Enviada", "Alta Prioridad"],
    lastContactDate: "2026-08-11",
    createdAt: new Date().toISOString()
  },
  {
    id: "lead-3",
    campaignId: "camp-asi-virtual-2026",
    name: "Rodrigo Morales",
    companyName: "AgroExportadora San José",
    email: "rmorales@sanjoseexport.ec",
    phone: "+593 99 555 7788",
    channel: "google_ads" as const,
    stage: "ganado" as const,
    estimatedValue: 6200,
    assignedMemberId: "mem-3",
    city: "Guayaquil",
    notes: "Contrato firmado para implementación de ASÍ Virtual durante 6 meses.",
    tags: ["Cliente Ganado", "Contrato Firmado"],
    lastContactDate: "2026-08-09",
    createdAt: new Date().toISOString()
  },
  {
    id: "lead-4",
    campaignId: "camp-eco-solar-2026",
    name: "Esteban Salazar",
    companyName: "Logística Fría del Pacífico",
    email: "esalazar@logisticafria.com",
    phone: "+593 97 444 3322",
    channel: "meta_ads" as const,
    stage: "nuevo" as const,
    estimatedValue: 12000,
    assignedMemberId: "mem-3",
    city: "Manta",
    notes: "Registro de formulario por anuncio de paneles solares para bodegas de congelación.",
    tags: ["Nuevo Prospecto"],
    lastContactDate: "2026-08-11",
    createdAt: new Date().toISOString()
  }
];

export const initialMarketingMetrics = [
  {
    id: "metric-jul-2026",
    campaignId: "camp-asi-virtual-2026",
    campaignCode: "260701 - ASÍ virtual",
    period: "2026-07",
    channel: "Meta Ads (FB/IG)",
    adSpend: 650,
    impressions: 34500,
    clicks: 1240,
    leadsGenerated: 38,
    dealsClosed: 3,
    revenueGenerated: 14200,
    cpl: 17.10,
    roas: 21.8,
    notes: "Excelente rendimiento en el público de gerentes de operaciones en Pichincha y Azuay.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "metric-google-jul-2026",
    campaignId: "camp-asi-virtual-2026",
    campaignCode: "260701 - ASÍ virtual",
    period: "2026-07",
    channel: "Google Ads (Search)",
    adSpend: 330,
    impressions: 8900,
    clicks: 410,
    leadsGenerated: 14,
    dealsClosed: 1,
    revenueGenerated: 4800,
    cpl: 23.57,
    roas: 14.5,
    notes: "Palabras clave con alta intención de búsqueda en consultoría ISO y sostenibilidad.",
    updatedAt: new Date().toISOString()
  }
];

export const initialProducts = [
  {
    id: "prod-cert-001",
    sku: "NG-CERT-001",
    name: "Certificación ISO 9001:2015 Sistemas de Gestión de la Calidad",
    category: "certificacion" as const,
    subcategory: "Auditoría de Certificación Externa",
    description: "Evaluación y emisión de certificación internacional acreditada para sistemas de gestión de calidad en organizaciones de todo tamaño.",
    technicalSpecs: "Norma: ISO 9001:2015\nAlcance: Etapa 1 (Documental) + Etapa 2 (Auditoría en Sitio)\nVigencia: 3 años con auditorías anuales de seguimiento.\nAcreditación internacional IAF.",
    benefits: [
      "Reconocimiento internacional de la calidad de sus procesos",
      "Puntuación preferencial en compras públicas y licitaciones privadas",
      "Reducción de mermas, reclamos y costos operativos"
    ],
    status: "activo" as const,
    basePrice: 3500,
    costPrice: 1800,
    currency: "USD" as const,
    durationOrLeadTime: "30 - 45 Días",
    certificationsOrNorms: ["ISO 9001:2015", "IAF", "SAE"],
    createdAt: new Date().toISOString()
  },
  {
    id: "prod-cap-001",
    sku: "NG-CAP-001",
    name: "Curso Auditor Interno Integral HSEQ (ISO 9001, 14001, 45001)",
    category: "capacitacion" as const,
    subcategory: "Formación de Auditores",
    description: "Programa intensivo para capacitar y calificar auditores internos bajo directrices de la norma ISO 19011:2018.",
    technicalSpecs: "Carga Horaria: 40 horas pedagógicas\nModalidad: Híbrida (Virtual sincrónico + talleres presenciales)\nMaterial: Guías de auditoría, formatos de no conformidad y casos de estudio reales.",
    benefits: [
      "Doble titulación avalada por Novagreen y OEC aliado",
      "Talleres prácticos con simulaciones de auditoría",
      "Acceso a aula virtual con grabaciones por 6 meses"
    ],
    status: "activo" as const,
    basePrice: 450,
    costPrice: 180,
    currency: "USD" as const,
    durationOrLeadTime: "40 Horas",
    certificationsOrNorms: ["ISO 19011:2018", "ISO 9001", "ISO 14001", "ISO 45001"],
    createdAt: new Date().toISOString()
  },
  {
    id: "prod-qhse-001",
    sku: "NG-QHSE-001",
    name: "Estudio de Medición de Ruido y Dosimetría Ocupacional",
    category: "qhse" as const,
    subcategory: "Higiene Industrial & Monitoreo",
    description: "Medición técnica de niveles de presión sonora (sonometría y dosimetría) con sonómetros integradores calibrados para cumplimiento ante el Ministerio del Trabajo y el IESS.",
    technicalSpecs: "Instrumental: Sonómetros Tipo 1 / 2 con calibrador acústico trazable.\nInforme: Mapas de ruido, curvas isofónicas y plan de medidas preventivas con firma de técnico calificado.",
    benefits: [
      "Cumplimiento legal obligatorio ante el SART / IESS y MDT",
      "Prevención de hipoacusia laboral y sanciones administrativas",
      "Recomendación exacta de protectores auditivos requeridos"
    ],
    status: "activo" as const,
    basePrice: 1200,
    costPrice: 550,
    currency: "USD" as const,
    durationOrLeadTime: "5 - 7 días laborables",
    certificationsOrNorms: ["Decreto Ejecutivo 2393", "ISO 9612", "ANSI S1.4"],
    createdAt: new Date().toISOString()
  },
  {
    id: "prod-epp-001",
    sku: "NG-EPP-001",
    name: "Arnés de Seguridad Multipropósito de 4 Puntos para Trabajo en Altura",
    category: "epp" as const,
    subcategory: "Protección Contra Caídas",
    description: "Arnés de cuerpo entero con 1 anillo dorsal en D y 3 anillos de posicionamiento en cintura y esternón, con indicador de impacto y herrajes de aleación de alta resistencia.",
    technicalSpecs: "Norma: ANSI Z359.11-2021 / OSHA 1926.502\nMaterial: Cinta de poliéster de 45mm con tratamiento hidrófugo\nCapacidad: Hasta 140 kg (usuario + herramientas)\nTallas: Universal ajustable (M a XL)",
    benefits: [
      "Máxima seguridad y confort durante jornadas prolongadas",
      "Indicadores visuales de caída para inspección inmediata",
      "Certificado de conformidad de lote incluido"
    ],
    status: "activo" as const,
    basePrice: 85,
    costPrice: 48,
    currency: "USD" as const,
    durationOrLeadTime: "Entrega Inmediata",
    certificationsOrNorms: ["ANSI Z359.11", "OSHA 1926", "EN 361"],
    createdAt: new Date().toISOString()
  },
  {
    id: "prod-eq-001",
    sku: "NG-EQ-001",
    name: "Detector Multigas Portátil 4 Gases (O2, LEL, CO, H2S)",
    category: "equipos" as const,
    subcategory: "Instrumentación y Monitoreo de Gases",
    description: "Equipo de detección rápida y continua de atmósferas peligrosas en espacios confinados con alarma sonora, visual y vibratoria.",
    technicalSpecs: "Gases: Oxígeno (O2), Combustibles (LEL), Monóxido de Carbono (CO), Ácido Sulfhídrico (H2S)\nProtección: IP68 resistente a caídas y agua\nBatería: Autonomía de 18 horas continuas\nCertificado: Calibración trazable con gas patrón",
    benefits: [
      "Garantía de ingreso seguro a tanques, pozos y zanjas",
      "Registro de datos y eventos descargable por USB",
      "Soporte técnico y recalibración periódica en Novagreen"
    ],
    status: "activo" as const,
    basePrice: 650,
    costPrice: 410,
    currency: "USD" as const,
    durationOrLeadTime: "3 - 5 días",
    certificationsOrNorms: ["ATEX Zona 0", "IECEx", "OSHA 1910.146"],
    createdAt: new Date().toISOString()
  }
];



