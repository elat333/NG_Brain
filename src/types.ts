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

export type SystemRole = Role;

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
  supervisedMembersForLinks?: string[]; // IDs de personas cuyos links de interés puede ver y supervisar
  canViewAllCompanyLinks?: boolean; // Si tiene permiso para ver todos los enlaces creados en la empresa
  supervisedMembersForNotes?: string[]; // IDs de personas cuyas notas puede ver y supervisar
  canViewAllCompanyNotes?: boolean; // Si tiene permiso para ver todas las notas creadas en la empresa
}

export interface Deliverable {
  id: string;
  label?: string;
  description?: string;
  folderLocation?: string;
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
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'correction' | 'done' | 'blocked' | 'rejected';
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
  plannedStartTime?: string; // Hora de inicio planificada
  plannedEndTime?: string; // Hora de fin planificada
  plannedEndDate?: string; // Fecha planificada para finalizar la actividad (Opcional)
  actualEndDate?: string; // Fecha de entrega real
  priority?: 'baja' | 'media' | 'alta' | 'meteoric_crash'; // Nivel de prioridad
  storyDescription?: string; // Descripción de la historia de usuario (NUEVO)
  acceptanceCriteria?: string; // Criterios de aceptación (NUEVO)
  taskTemplate?: 'standard' | 'design_post' | 'design_video' | 'design_carousel';
  designData?: DesignPostData;
  blockedByTaskIds?: string[]; // IDs de tareas que bloquean a esta tarea
  createdAt: string;
  history?: TaskHistoryItem[]; // Historial de cambios
}

export interface DesignElement {
  id: string;
  element: string; // Ej: Imagen principal, Logo, Texto 1, Texto 2...
  content: string; // Ej: Profesional de seguridad...
  visual: string; // Ej: Fotografía profesional...
  observations: string; // Ej: Evitar imágenes genéricas...
  slideIndex?: number; // Para agrupar elementos en carruseles (Imagen 1, Imagen 2, etc.)
}

export interface VideoScene {
  id: string;
  time: string; // Ej: 0:00 - 0:05
  stage: string; // Ej: Gancho / Captar atención
  visual: string; // Ej: Imágenes dinámicas...
  onScreenText: string; // Ej: ¿Trabajas en construcción?
  voiceOver: string; // Ej: Sabías que podrías estar perdiendo...
  observations?: string;
  customFields?: Record<string, string>;
}

export interface VisualReference {
  id: string;
  type: 'image' | 'video_link';
  url: string; // The base64 data URL for images, or a youtube/vimeo/etc. link for videos
  comment: string;
}

export interface DesignPostData {
  campaign: string;
  formats: string;
  elements: DesignElement[];
  videoScenes?: VideoScene[];
  customVideoColumns?: { id: string, name: string }[];
  references?: VisualReference[];
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
    epp?: string[];
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
  order?: number;
  sharedWith?: NoteShareAccess[];
  sharedMemberIds?: string[];
}

export interface NoteShareAccess {
  memberId: string;
  access?: 'ver' | 'editar'; // 'ver' = read-only, 'editar' = can edit
  role?: 'viewer' | 'editor';
  sharedAt?: string;
  sharedByMemberId?: string;
}

export interface PersonalNote {
  id: string;
  title: string;
  content: string; // Markdown body
  category?: string; // Folder/Category
  tags?: string[];
  createdByMemberId: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  order?: number;
  color?: string;
  sharedMemberIds?: string[];
  sharedWith?: NoteShareAccess[];
  isCompanyPublic?: boolean;
  moduleContext?: string;
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

export interface AIStyleProfile {
  id: string;
  name: string;
  description: string;
  prompt: string;
  activeContexts: {
    strategy: boolean;
    processes: boolean;
    members: boolean;
    tasks?: boolean;
    marketing?: boolean;
    notes?: boolean;
  };
  selectedNotes?: string[];
  activeGuardrails: string[];
}

export interface ManagementAIGovernanceData {
  id: string;
  tone: string; // ID of the selected style profile
  selectedModel?: string; // 'gemini-2.5-flash' | 'gemini-2.5-pro'
  systemDirectives: string;
  guardrails: AIGuardrail[];
  calibrationHistory: AICalibrationRecord[];
  updatedAt: string;
  styleProfiles?: AIStyleProfile[];
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

// --- Módulo de Marketing & Ventas Types ---

export interface MarketingCampaign {
  id: string;
  code: string; // Código de campaña / Nomenclatura
  name: string;
  description?: string;
  objective?: 'leads' | 'ventas' | 'branding' | 'engagement' | 'evento' | 'otro' | '';
  status: 'planificacion' | 'activa' | 'en_pausa' | 'completada' | 'cancelada';
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  targetAudience: string;
  channels: string[]; // ['Meta Ads (FB/IG)', 'Google Ads', 'TikTok Ads', 'Email Marketing', 'Eventos / BTL', 'LinkedIn Ads', 'Orgánico']
  city?: string;
  leaderMemberId?: string;
  processId?: string;
  projectId?: string; // Enlace sincronizado con la tabla de Proyectos
  targetKpis?: {
    targetLeads?: number;
    targetSales?: number;
    targetCpl?: number;
    targetReach?: number;
  };
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MarketingContent {
  id: string;
  campaignId?: string;
  title: string;
  copy: string;
  channel: 'instagram' | 'tiktok' | 'facebook' | 'linkedin' | 'youtube' | 'web_blog' | 'email' | 'otro';
  format: 'reel_video' | 'carrusel' | 'post_estatico' | 'story' | 'articulo' | 'newsletter' | 'anuncio_pauta';
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm
  status: 'idea' | 'redaccion' | 'diseno_edicion' | 'revision' | 'programado' | 'publicado';
  authorMemberId?: string;
  designerMemberId?: string;
  assetUrl?: string;
  tags?: string[];
  metrics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    clicks?: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface MarketingLead {
  id: string;
  campaignId?: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  channel: 'meta_ads' | 'google_ads' | 'tiktok' | 'linkedin' | 'organico' | 'referido' | 'evento' | 'directo' | 'otro';
  stage: 'nuevo' | 'contactado' | 'calificado' | 'propuesta' | 'negociacion' | 'ganado' | 'perdido';
  estimatedValue: number;
  assignedMemberId?: string;
  city?: string;
  notes?: string;
  tags?: string[];
  lastContactDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MarketingMetricRecord {
  id: string;
  campaignId?: string;
  campaignCode?: string;
  period: string; // e.g. "2026-07"
  channel: string;
  adSpend: number;
  impressions: number;
  clicks: number;
  leadsGenerated: number;
  dealsClosed: number;
  revenueGenerated: number;
  cpl: number;
  roas: number;
  notes?: string;
  updatedAt: string;
}





// --- Ventas Module Types ---
export interface SalesClient {
  id: string;
  clientType: 'B2B' | 'B2C';
  directoryId: string; // Links to Company.id (B2B) or TeamMember.id (B2C)
  status: 'prospecto' | 'activo' | 'inactivo';
  createdAt: string;
}

export interface SalesDeal {
  id: string;
  title: string;
  clientId: string;
  amount: number;
  stage: 'contacto' | 'reunion' | 'propuesta' | 'negociacion' | 'ganado' | 'perdido';
  expectedCloseDate: string;
  responsibleId: string;
  createdAt: string;
}

export interface SalesQuote {
  id: string;
  quoteNumber: string;
  clientId: string;
  amount: number;
  status: 'borrador' | 'enviada' | 'aprobada' | 'rechazada';
  date: string;
  createdAt: string;
}

export interface Trainer {
  id: string;
  type: 'interno' | 'externo';
  directoryId: string; // Links to TeamMember if internal, or could be general
  specialties?: string;
  hourlyRate?: number;
  createdAt?: string;
}

export interface TrainingSpace {
  id: string;
  type: 'fisico' | 'virtual';
  name: string;
  city?: string;
  platform?: string; // e.g. Zoom, Meet
  capacity?: number;
  link?: string;
  notes?: string;
  createdAt?: string;
}

export interface TrainingPlan {
  id: string;
  title: string;
  trainerId: string;
  spaceId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'programada' | 'completada' | 'cancelada';
  createdAt?: string;
}

export interface TrainingManagement {
  id: string;
  code: string; // e.g. CAP-2026-001
  planId: string; // link to TrainingPlan for date, trainer, space
  clientId?: string; // Optional: if given to a specific client
  marketingCampaignId?: string; // Optional: if linked to a campaign
  totalHours: number;
  totalCost: number; // Derived from trainer hourly rate * hours or fixed cost
  status: 'ejecutada' | 'pendiente';
  createdAt?: string;
}

// Module: Productos Types
export type ProductCategory = 'certificacion' | 'capacitacion' | 'qhse' | 'epp' | 'equipos';

export interface ProductPriceTier {
  id: string;
  minQty: number;
  maxQty?: number;
  price: number;
  currency?: 'USD' | 'EUR';
  description?: string;
}

export interface ProductItem {
  id: string;
  sku: string; // Internal Code / SKU e.g. PROD-CERT-001
  name: string;
  category: ProductCategory;
  subcategory?: string; // Sub-tipo or classification
  description: string;
  technicalSpecs?: string; // Specifications, Normativa, ISO, Hours, Sizes, etc.
  benefits?: string[];
  status: 'activo' | 'en_desarrollo' | 'inactivo';
  basePrice: number;
  costPrice?: number;
  currency: 'USD' | 'EUR';
  volumePricing?: ProductPriceTier[];
  durationOrLeadTime?: string; // e.g. "40 Horas", "3-5 Días", "1 Año"
  certificationsOrNorms?: string[]; // e.g. ["ISO 9001", "OSHA", "ANSI"]
  specialistId?: string; // Linked TeamMember.id
  specialistName?: string;
  companyAllyId?: string; // Optional linked Company.id
  companyAllyName?: string;
  documentsUrl?: string; // Ficha técnica, Brochure o Catálogo PDF Link
  imageUrl?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// Module: Acreditación / Certificación Types (Compatibility & Dedicated Views)
export interface AcreditationAlly {
  id: string;
  name: string;
  companyId: string; // Mandatory link to Company.id in Directory
  companyName: string;
  contactId?: string; // Link to TeamMember.id
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'active' | 'in_progress' | 'inactive';
  agreementDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VolumePriceTier {
  id: string;
  minQty: number;
  maxQty?: number;
  price: number;
  note?: string;
}

export interface AcreditationCertification {
  id: string;
  name: string;
  code?: string;
  productId?: string; // Linked to products collection (id)
  productSku?: string; // SKU of the linked product
  type: 'OEC' | 'CI' | 'OC'; // OEC: Organismo Evaluador Conformidad, CI: Evaluador Independiente, OC: Operador Capacitación
  allyId: string; // Linked to AcreditationAlly.id
  allyName: string;
  companyName?: string;
  purchasePrice: number; // Cost / buying price
  price1: number; // Base selling price (Precio 1)
  volumePrices?: VolumePriceTier[]; // Scaled pricing by volume
  validityDate?: string; // Expiration or validity date
  academicHours?: number;
  description?: string;
  requirements?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}



