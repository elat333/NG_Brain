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
