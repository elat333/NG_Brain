/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PersonCategory = 'miembro' | 'cliente' | 'proveedor' | 'aliado' | 'contacto' | 'otro';

export interface Company {
  id: string;
  name: string;
  ruc: string;
  industry?: string;
  description?: string; // Long description of the company
  email?: string;
  phone?: string;
  website?: string;
  address?: string; // Used for backwards compatibility or general address
  mainAddress?: string; // Address of the headquarters (Matriz)
  branchAddresses?: string[]; // Array of branch addresses (Sucursales)
  industries?: string[]; // Multiple industries or sectors
  notes?: string;
  createdAt: string;
}

export interface Industry {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  moduleAccess?: {
    [moduleId: string]: 'ninguno' | 'lector' | 'colaborador' | 'lider';
  };
  createdAt: string;
}

export interface CompanyAssociation {
  companyId: string;
  role: string; // Specific role/relationship with this company
}

export interface TeamMember {
  id: string;
  name: string;
  role: string; // Basic profile job title (e.g. "Especialista en Seguridad")
  systemRoleId?: string; // Link to Role.id
  isSystemAdmin?: boolean; // If true, has absolute full access without any restriction
  moduleAccess?: {
    [moduleId: string]: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  };
  categories: PersonCategory[]; 
  processId?: string;
  companyAssociations: CompanyAssociation[]; // New: list of companies and roles
  identificationId?: string; // Cedula or Passport
  hasRuc?: boolean; // If they have a RUC
  ruc?: string; // For "Persona Natural con RUC"
  skills: string[];
  responsibilities: string[];
  recentAchievements: string[];
  avatar?: string;
  personality?: string; 
  notes?: string;       
  email?: string;
  phone?: string;
  epp?: string[];      
}

export interface Deliverable {
  id: string;
  label: string;
  url: string;
}

export interface TaskHistoryItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'create' | 'status_change' | 'field_update' | 'custom';
  details: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'review' | 'done' | 'rejected' | 'correction';
  memberId?: string; // Enlazada a un responsable
  auxiliaryId?: string; // Miembro auxiliar opcional (MANTENIDO PARA RETROCOMPATIBILIDAD)
  auxiliaryIds?: string[]; // Miembros auxiliares múltiples (NUEVO)
  revisorId?: string; // Encargado de la revisión (NUEVO)
  processId: string; // Enlazada a un proceso
  projectId?: string; // Enlazada a un proyecto (NUEVO)
  deliverables?: Deliverable[]; // Nueva sección de entregables
  plannedHours?: number; // Horas planificadas
  actualHours?: number; // Horas reales
  dueDate?: string; // Fecha de entrega
  plannedDate?: string; // Fecha planificada para realizar la actividad (NUEVO)
  plannedEndDate?: string; // Fecha planificada para finalizar la actividad (Opcional)
  priority?: 'baja' | 'media' | 'alta' | 'meteoric_crash'; // Nivel de prioridad
  storyDescription?: string; // Descripción de la historia de usuario (NUEVO)
  acceptanceCriteria?: string; // Criterios de aceptación (NUEVO)
  blockedByTaskIds?: string[]; // IDs de tareas que bloquean a esta tarea
  createdAt: string;
  history?: TaskHistoryItem[]; // Historial de cambios
}

export interface Project {
  id: string;
  name: string;
  description: string;
  processId: string; // Relacionado con un proceso
  status: 'activo' | 'completado' | 'pausado';
  city?: string; // Ciudad a la que pertenece la campaña/proyecto
  createdAt: string;
}

export interface Process {
  id: string;
  name: string;
  description: string;
  goals: string[];
}

export interface MeetingTranscript {
  id: string;
  date: string;
  title: string;
  content: string;
  processed: boolean;
}

export interface ExtractedUpdates {
  memberUpdates: {
    memberId: string;
    newSkills?: string[];
    newResponsibilities?: string[];
    achievements?: string[];
    roleUpdate?: string;
  }[];
  processUpdates: {
    processId: string;
    descriptionUpdate?: string;
    newGoals?: string[];
  }[];
}

export interface AIInsight {
  id: string;
  date: string;
  type: 'member_update' | 'process_update' | 'new_project';
  targetId: string;
  description: string;
  confidence: number;
}

export interface SuggestedActivity {
  id: string;
  title: string;
  description: string;
  processId?: string;
  memberId?: string;
  suggestedDay?: string;
}

export interface MemberDraft {
  type: 'create' | 'update';
  memberId?: string;
  data: {
    name?: string;
    identificationId?: string;
    hasRuc?: boolean;
    role?: string;
    processId?: string;
    companyAssociations?: { companyId: string, role: string }[];
    skills?: string[];
    responsibilities?: string[];
    personality?: string;
    notes?: string;
    email?: string;
    phone?: string;
    epp?: string[];
  };
  explanation: string;
}

export interface ProcessLink {
  id: string;
  title: string;
  url: string;
  processId: string;
  createdByMemberId?: string;
  createdAt: string;
  category?: string;
  code?: string;
  description?: string;
  sharedWith?: NoteShareAccess[];
}

export interface NoteShareAccess {
  memberId: string;
  access: 'ver' | 'editar'; // 'ver' = read-only, 'editar' = can edit
}

export interface ProcessNote {
  id: string;
  title: string;
  content: string;
  processId: string;
  createdByMemberId: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
  sharedWith?: NoteShareAccess[];
}

// --- Módulo de Gerencia Types ---

export interface ManagementNote {
  id: string;
  title: string;
  content: string;
  category: 'decisión' | 'estrategia' | 'reunión' | 'análisis' | 'acuerdo' | 'general';
  tags?: string[];
  authorMemberId: string;
  authorName: string;
  isAiGenerated?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SwotItem {
  id: string;
  category: 'fortaleza' | 'oportunidad' | 'debilidad' | 'amenaza';
  text: string;
  impactLevel: 'alto' | 'medio' | 'bajo';
  strategy?: string;
}

export interface OKRGoal {
  id: string;
  title: string;
  description: string;
  objectiveArea: string;
  progress: number; // 0-100
  targetValue: string;
  currentValue: string;
  ownerId?: string;
  status: 'en_camino' | 'en_riesgo' | 'atrasado' | 'logrado';
  quarter: string;
  keyResults: { id: string; description: string; achieved: boolean }[];
}

export interface StrategicRisk {
  id: string;
  title: string;
  description: string;
  probability: 'alta' | 'media' | 'baja';
  impact: 'critico' | 'alto' | 'medio' | 'bajo';
  mitigationPlan: string;
  responsibleMemberId?: string;
  status: 'identificado' | 'mitigando' | 'controlado' | 'materializado';
}

export interface ManagementStrategyData {
  id: string;
  mission?: string;
  vision?: string;
  swotItems: SwotItem[];
  okrGoals: OKRGoal[];
  strategicRisks: StrategicRisk[];
  lastUpdated: string;
}

export interface AIGuardrail {
  id: string;
  title: string;
  ruleDescription: string;
  isEnabled: boolean;
  category: 'anti_alucinacion' | 'tono_estilo' | 'cumplimiento_iso' | 'confidencialidad';
}

export interface AICalibrationRecord {
  id: string;
  timestamp: string;
  promptOrTopic: string;
  aiResponseSnippet: string;
  rating: 'correct' | 'needs_tuning' | 'hallucination';
  managerCorrection: string;
  appliedRuleTitle?: string;
}

export interface ManagementAIGovernanceData {
  id: string;
  tone: 'ejecutivo_analitico' | 'consultor_iso' | 'estratega_conservador' | 'mentor_innovador';
  selectedModel?: string; // 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-1.5-flash'
  systemDirectives: string;
  guardrails: AIGuardrail[];
  calibrationHistory: AICalibrationRecord[];
  updatedAt: string;
}

export interface ManagementChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedNote?: {
    title: string;
    content: string;
    category: ManagementNote['category'];
  };
  suggestedAction?: {
    type: 'add_swot' | 'add_okr' | 'add_risk';
    data: any;
  };
}

export interface ImportProduct {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  supplierId: string;
  supplierName: string;
  unit: string;
  unitPrice: number;
  currency: string;
  minOrderQuantity?: number;
  hsCode?: string;
  originCountry?: string;
  specifications?: Record<string, string>;
  status: 'activo' | 'inactivo' | 'en_revision';
  createdAt: string;
  updatedAt?: string;
}

export interface ImportSupplier {
  id: string;
  companyId: string; // Linked to Company.id
  companyName: string;
  code: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  city?: string;
  paymentTerms?: string;
  rating?: number; // 1 to 5
  notes?: string;
  createdAt: string;
}

export interface ImportProformaItem {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
  hsCode?: string;
  isValidated?: boolean;
}

export interface ImportProforma {
  id: string;
  proformaNumber: string;
  supplierId: string;
  supplierName: string;
  issueDate: string;
  expirationDate: string;
  currency: string;
  subtotal: number;
  shippingCost: number;
  taxes: number;
  totalAmount: number;
  incoterm: 'FOB' | 'CIF' | 'EXW' | 'DDP' | 'CFR' | 'otro';
  status: 'pendiente' | 'validada' | 'aprobada' | 'rechazada';
  fileUrl?: string;
  items: ImportProformaItem[];
  notes?: string;
  createdAt: string;
}



