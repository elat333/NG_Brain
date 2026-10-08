/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PersonCategory = 
  | 'miembro' 
  | 'colaborador' 
  | 'cliente' 
  | 'proveedor' 
  | 'aliado' 
  | 'contacto' 
  | 'alumno' 
  | 'docente' 
  | 'otro';

export interface PartyContactMechanism {
  id: string;
  type: 'email' | 'phone' | 'mobile' | 'whatsapp' | 'website';
  value: string;
  label?: string; // e.g. "Facturación", "Personal", "Gerencia"
  isPrimary?: boolean;
}

export type PartyRelationType = 
  | 'empleado'
  | 'representante_legal'
  | 'gerente'
  | 'contacto_comercial'
  | 'socio'
  | 'proveedor'
  | 'cliente'
  | 'consultor'
  | 'contacto_emergencia'
  | 'matriz'
  | 'filial'
  | 'alianza'
  | 'otro';

export interface PartyRelation {
  id: string;
  sourceId: string;
  sourceType: 'person' | 'company';
  targetId: string;
  targetType: 'person' | 'company';
  targetName: string;
  relationType: PartyRelationType;
  roleOrPosition?: string;
  notes?: string;
  createdAt?: string;
}

export interface Company {
  id: string;
  name: string;
  commercialName?: string;
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
  contactMechanisms?: PartyContactMechanism[];
  requiresEpp?: boolean; // Si la empresa tiene política activa de dotación de EPP para su personal
  relations?: PartyRelation[];
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
  email?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  commercialName?: string; // Para Persona Natural con RUC
  role: string; // Basic profile job title (e.g. "Especialista en Seguridad")
  systemRoleId?: string; // Link to Role.id
  isSystemAdmin?: boolean; // If true, has absolute full access without any restriction
  moduleAccess?: {
    [moduleId: string]: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
  };
  categories: PersonCategory[]; 
  processId?: string;
  companyAssociations: CompanyAssociation[]; // List of companies and roles
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
  address?: string;
  contactMechanisms?: PartyContactMechanism[];
  requiresEpp?: boolean; // Si este colaborador específico es sujeto de dotación de EPP
  relations?: PartyRelation[]; // Vínculos bidireccionales cruzados (Tryton)
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

export interface TaskComment {
  id: string;
  taskId?: string;
  taskTitle?: string;
  authorId: string;
  authorName: string;
  authorRole?: string; // 'Líder' | 'Colaborador' | 'Revisor' | 'Administrador' | 'Observador'
  authorAvatar?: string;
  text: string;
  createdAt: string;
  requiresReview?: boolean; // Si es una solicitud de revisión/cambio formal
  status?: 'pending' | 'resolved'; // Estado global de la solicitud de revisión / corrección
  resolvedAt?: string;
  resolvedBy?: string;
  archived?: boolean; // Si el comentario fue archivado globalmente
  archivedAt?: string;
  archivedBy?: string;
  readByMemberIds?: string[]; // IDs de miembros que ya marcaron como Visto de forma individual
  targetMemberId?: string;
  mentionedMemberIds?: string[];
}

export type CommentEntityType = 'task' | 'link' | 'note' | 'campaign' | 'project';

export interface UniversalComment {
  id: string;
  entityType: CommentEntityType;
  entityId: string;
  entityTitle?: string;
  processId?: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  requiresReview?: boolean;
  status?: 'pending' | 'resolved';
  resolvedAt?: string;
  resolvedBy?: string;
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  readByMemberIds?: string[]; // IDs de miembros que ya marcaron como Visto de forma individual
  targetMemberId?: string;
  mentionedMemberIds?: string[];
}

/**
 * Alias de compatibilidad Scrum: Story / UserStory representa un elemento del flujo ágil
 */
export type Story = Task;
export type UserStory = Task;

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
  actualStartDate?: string; // Fecha de inicio real
  actualStartTime?: string; // Hora de inicio real
  actualEndTime?: string; // Hora de fin / entrega real
  priority?: 'baja' | 'media' | 'alta' | 'meteoric_crash'; // Nivel de prioridad
  storyDescription?: string; // Descripción de la historia de usuario (NUEVO)
  acceptanceCriteria?: string; // Criterios de aceptación (NUEVO)
  taskTemplate?: 'standard' | 'design_post' | 'design_video' | 'design_carousel';
  designData?: DesignPostData;
  blockedByTaskIds?: string[]; // IDs de tareas que bloquean a esta tarea
  comments?: TaskComment[]; // Comentarios y solicitudes de revisión (retrocompatibilidad)
  commentsCount?: number; // Contador ligero de comentarios desacoplados
  hasPendingReview?: boolean; // Indicador ligero si hay observaciones pendientes
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
  leaderId?: string; // Líder / Responsable asignado al proyecto
  auxiliaryMemberIds?: string[]; // Auxiliares / Colaboradores asignados
  createdAt: string;
}

export interface Process {
  id: string;
  name: string;
  description: string;
  goals: string[];
  color?: string;
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

export type PersonalLink = ProcessLink;

export interface NoteHistoryEntry {
  id: string;
  savedAt: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  content: string;
  summary?: string;
  wordsCount?: number;
}

export interface PersonalNote {
  id: string;
  title: string;
  content: string; // Markdown body
  category?: string; // Folder/Category
  tags?: string[];
  processId?: string;
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
  history?: NoteHistoryEntry[];
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

// Module: Inventario & EPPs
export interface Warehouse {
  id: string;
  name: string;
  code: string; // ej: "BOD-MATRIZ", "BOD-PLANTA", "BOD-MOVIL-01"
  type: 'fija' | 'movil' | 'campo';
  location?: string;
  responsibleMemberId?: string; // Custodio (TeamMember.id)
  responsibleMemberName?: string;
  description?: string;
  status: 'activa' | 'inactiva';
  createdAt: string;
  updatedAt?: string;
}

export interface InventoryStockItem {
  id: string; // `${warehouseId}_${productId}`
  warehouseId: string;
  warehouseName: string;
  productId: string;
  productName: string;
  productSku?: string;
  productCategory: string; // 'epp' | 'equipos' | etc.
  currentStock: number;
  minStock: number;
  unit: string; // 'unidad', 'par', 'juego', 'caja'
  sizesStock?: Record<string, number>; // Desglose por tallas: {"38": 4, "39": 6, "40": 10}
  updatedAt: string;
}

export interface EPPItemDelivered {
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  size?: string;
  condition?: 'nuevo' | 'reacondicionado';
}

export interface InventoryUpdateRequest {
  id: string;
  requestCode: string; // ej: "SOL-EPP-2026-0001"
  warehouseId: string;
  warehouseName: string;
  workerId: string;
  workerName: string;
  workerIdNumber?: string; // Cédula
  workerRole?: string;
  deliveredById: string;
  deliveredByName: string;
  deliveryDate: string;
  deliveryReason: 'dotacion_inicial' | 'reposicion_desgaste' | 'perdida_dano' | 'prestamo_temporal';
  items: EPPItemDelivered[];
  photoEquipmentUrl?: string; // Evidencia 1: Foto del EPP
  photoWorkerUrl?: string; // Evidencia 2: Foto del trabajador con el EPP
  signatureUrl?: string; // Firma digital táctil
  pdfReportUrl?: string; // URL o base64 del Acta PDF
  status: 'pendiente' | 'aprobada' | 'rechazada';
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
  source: 'app_movil' | 'web';
  createdAt: string;
}

export interface InventoryInvoiceItem {
  productId: string;        // ID del producto en Novagreen
  productName: string;      // Nombre o descripción
  productSku?: string;
  quantity: number;         // Cantidad facturada
  unitPrice: number;        // Precio unitario
  totalPrice: number;       // Total línea
  size?: string;            // Talla (opcional: ej. "M", "L", "40", "42", "Única")
}

export interface InventoryInvoice {
  id: string;
  invoiceNumber: string;     // ej: "001-002-000012345"
  supplierName: string;      // Razón social del proveedor
  supplierRuc?: string;      // RUC del proveedor
  invoiceDate: string;       // Fecha de emisión
  totalAmount: number;       // Monto total de la factura
  warehouseId: string;       // Bodega de destino donde ingresó el stock
  warehouseName: string;     // Nombre de la bodega
  items: InventoryInvoiceItem[];
  pdfUrl?: string;           // Enlace al archivo PDF en Firebase Storage
  pdfStoragePath?: string;
  status: 'cargada' | 'anulada';
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
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

// --- Tryton ERP Financial & Banking Core Types ---
export type FiscalTaxType = 'iva_15' | 'iva_0' | 'exento' | 'no_objeto';
export type FiscalInvoiceType = 
  | 'factura_emitida'     // Venta / Ingreso con Factura emitida al cliente
  | 'factura_recibida'    // Compra / Gasto con Factura recibida del proveedor/docente
  | 'nota_venta_rimpe'    // Comprobante de negocio popular / RIMPE
  | 'recibo_honorarios'   // Recibo o comprobante interno
  | 'sin_comprobante';    // Gasto menor sin factura

export type FinancialStage = 'planificado' | 'comprometido' | 'ejecutado_validado' | 'anulado';
export type PaymentMethod = 'transferencia' | 'tarjeta' | 'efectivo' | 'cheque' | 'retencion' | 'otro';

// Tryton: bank (Directorio de Entidades Bancarias & Códigos SWIFT/BIC)
export interface BankEntity {
  id: string;
  name: string;                         // ej. "Banco Pichincha C.A.", "Banco Guayaquil", "Produbanco"
  code: string;                         // ej. "BPICH", "BGYE", "PROD"
  bicSwift?: string;                    // ej. "PICHECEQ", "GUAYECEG"
  country?: string;                     // ej. "Ecuador"
  website?: string;
  phone?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

// Tryton: account.account (Plan General Contable / Árbol de Cuentas)
export type AccountCategoryType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface AccountChartNode {
  id: string;
  code: string;                         // ej. "1", "1.1", "1.1.01", "1.1.01.001"
  name: string;                         // ej. "Activo", "Activo Corriente", "Bancos y Cajas", "Banco Pichincha Cta Cte"
  type: AccountCategoryType;
  parentCode?: string;                  // Código de la cuenta padre
  level: number;                        // 1, 2, 3, 4
  balance?: number;                     // Saldo contable acumulado
  isReconcilable?: boolean;             // Permite conciliación directa
  isActive: boolean;
  notes?: string;
}

// Tryton: account.journal (Diarios Contables)
export type JournalType = 'bank' | 'cash' | 'sale' | 'purchase' | 'general' | 'situation';

export interface AccountJournal {
  id: string;
  code: string;                         // ej. "BNK1", "CAJA", "VENTAS", "COMPRAS", "GEN"
  name: string;                         // ej. "Diario Banco Pichincha", "Diario Caja Chica Quito"
  type: JournalType;
  defaultDebitAccountId?: string;       // Cuenta contable asociada por defecto
  defaultCreditAccountId?: string;
  sequence?: number;
  isActive: boolean;
  createdAt: string;
}

// Tryton: account.fiscalyear & account.period (Años y Periodos Fiscales)
export interface FiscalPeriod {
  id: string;
  fiscalYearId: string;
  name: string;                         // ej. "Enero 2026", "Febrero 2026"
  code: string;                         // ej. "2026-01"
  startDate: string;                    // YYYY-MM-DD
  endDate: string;                      // YYYY-MM-DD
  state: 'abierto' | 'cerrado' | 'bloqueado';
}

export interface FiscalYear {
  id: string;
  name: string;                         // ej. "Ejercicio Fiscal 2026"
  code: string;                         // ej. "FY2026"
  startDate: string;                    // 2026-01-01
  endDate: string;                      // 2026-12-31
  state: 'abierto' | 'cerrado' | 'bloqueado';
  periods?: FiscalPeriod[];
  createdAt: string;
}

// Tryton: account.tax (Configuración de Impuestos y Retenciones SRI)
export interface FiscalTaxConfig {
  id: string;
  code: string;                         // ej. "IVA-15", "IVA-0", "RET-IR-1.75", "RET-IVA-30"
  name: string;                         // ej. "IVA 15% General Ecuador", "Retención Impuesto a la Renta 1.75%"
  type: 'iva' | 'retencion_renta' | 'retencion_iva';
  rate: number;                         // 0.15, 0.00, 0.0175, 0.30
  description?: string;
  accountDebitId?: string;              // Cuenta contable compras / retención asumida
  accountCreditId?: string;             // Cuenta contable ventas / retención efectuada
  isActive: boolean;
}

// Tryton: account_statement (Extracto Bancario Oficial)
export interface BankStatement {
  id: string;
  bankAccountId: string;
  statementNumber?: string;             // No. de Extracto bancario
  statementDate: string;                // Fecha de corte YYYY-MM-DD
  startBalance: number;                 // Saldo inicial del extracto
  endBalanceCalculated: number;         // Saldo según transacciones registradas
  endBalanceReal: number;               // Saldo final oficial del estado de cuenta
  difference: number;                   // Descuadre (endBalanceReal - endBalanceCalculated)
  state: 'borrador' | 'validado' | 'conciliado';
  linesCount: number;
  notes?: string;
  reconciledAt?: string;
  reconciledByMemberId?: string;
  createdAt: string;
}

// Tryton: bank & bank.account
export interface BankAccount {
  id: string;
  bankName: string;                     // ej. "Banco Pichincha", "Produbanco", "Caja Chica Matriz"
  accountNumber: string;                // ej. "2100123456"
  accountType: 'corriente' | 'ahorros' | 'caja_chica' | 'billetera_digital';
  currency: 'USD' | 'EUR';
  holderName: string;                   // Razón Social / Titular
  holderTaxId?: string;                 // RUC del titular
  initialBalance: number;               // Saldo inicial de apertura
  currentBalance: number;               // Saldo actual calculado
  isCompanyAccount: boolean;            // true si es de la empresa, false si es de un tercero
  ownerDirectoryId?: string;            // Vinculado a Company.id o TeamMember.id (para docentes/proveedores)
  status: 'activa' | 'inactiva' | 'bloqueada';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// Tryton: account.statement.line (Libro de Banco / Movimiento de Tesorería)
export interface BankTransaction {
  id: string;
  accountId: string;                    // ID de la BankAccount afectada
  accountName: string;
  type: 'ingreso' | 'egreso' | 'transferencia_interna';
  date: string;                         // YYYY-MM-DD
  amount: number;                       // Monto neto de la transacción
  
  // Detalle Fiscal Tryton
  hasTax?: boolean;
  taxType?: FiscalTaxType;
  taxAmount?: number;
  subtotal?: number;
  
  // Categorización y Eje Analítico
  category: 
    | 'cobro_capacitacion' 
    | 'pago_honorarios_docente' 
    | 'cobro_ventas_b2b' 
    | 'pago_importacion' 
    | 'gasto_logistica' 
    | 'gasto_marketing' 
    | 'pago_servicios' 
    | 'transferencia_interna' 
    | 'otro';
    
  concept: string;                      // Glosa / Descripción de la transacción
  referenceNumber?: string;             // No. de transferencia, cheque o comprobante
  voucherUrl?: string;                  // Comprobante PDF / Foto de la transferencia
  
  // Vinculación Operativa (Centros de Costo Tryton)
  trainingPlanId?: string;              // Vinculado a un curso
  projectId?: string;                   // Vinculado a un proyecto
  importProformaId?: string;            // Vinculado a una importación
  clientId?: string;                    // Vinculado a un cliente
  supplierId?: string;                  // Vinculado a un proveedor
  trainerId?: string;                   // Vinculado a un capacitador
  
  // Conciliación
  isReconciled: boolean;
  reconciledWithInvoiceNumber?: string;
  reconciledAt?: string;
  reconciledBy?: string;
  
  registeredByMemberId: string;
  registeredByName?: string;
  createdAt: string;
}

// Tryton: account.statement (Resumen de Tesorería)
export interface TreasuryOverview {
  totalLiquidity: number;               // Suma de todas las cuentas bancarias + cajas
  monthlyInflows: number;               // Total ingresos del mes
  monthlyOutflows: number;              // Total egresos del mes
  netCashFlow: number;                  // Flujo neto mensual (Inflows - Outflows)
  pendingReconciliationsCount: number;  // Transacciones pendientes de comprobante/factura
}

// Module: Capacitación & Talento Types
export interface Trainer {
  id: string;
  type: 'interno' | 'externo';
  directoryId: string; // Links to TeamMember if internal, or could be general
  specialties?: string;
  hourlyRate?: number;
  relationshipType?: 'aliado_estrategico' | 'planta' | 'honorarios' | 'proveedor_frecuente';
  teachingInterests?: string;       // Qué sabe y le gusta enseñar
  teachingDislikes?: string;        // Qué no le gusta / restricciones
  preferredModality?: 'presencial' | 'virtual' | 'hibrido';
  logisticsNotes?: string;          // Condiciones de viaje, viáticos, requerimientos
  relationshipNotes?: string;       // Notas sobre la relación institucional o acuerdos
  rating?: number;                  // Calificación promedio (1-5)
  certifications?: string[];        // Lista de títulos / certificados
  cvUrl?: string;                   // Enlace al CV o hoja de vida
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountType: 'ahorros' | 'corriente';
    holderName: string;
    holderTaxId: string;
  };
  createdAt?: string;
  updatedAt?: string;
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

// Tryton: account.budget.line (Gasto Planificado vs Validado)
export interface TrainingExpenseItem {
  id: string;
  description: string;
  category?: 'honorarios' | 'logistica' | 'aulas' | 'marketing' | 'certificados' | 'materiales' | 'otro';
  
  // Fase: Planificado vs Real
  isPlanned?: boolean;                  // true si es presupuesto planificado, false si es real
  stage?: FinancialStage;               // 'planificado' | 'comprometido' | 'ejecutado_validado'
  
  quantity: number;
  unitPrice: number;                    // sin IVA (Base Imponible)
  subtotal: number;                     // quantity * unitPrice (sin IVA)
  
  // Fiscal Tryton (account.tax)
  hasIva?: boolean;
  taxType?: FiscalTaxType;              // 'iva_15' | 'iva_0' | 'exento'
  taxRate?: number;                     // 0.15 para 15%
  taxAmount?: number;                   // subtotal * taxRate
  total?: number;                       // subtotal + taxAmount
  
  // Comprobante Fiscal Tryton (account.invoice)
  invoiceType?: FiscalInvoiceType;      // 'factura_recibida' | 'nota_venta_rimpe' | 'sin_comprobante'
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceUrl?: string;
  
  // Validación de Auditoría
  isValidated?: boolean;
  validatedBy?: string;
  validatedAt?: string;
  
  notes?: string;
}

// Tryton: account.budget.line (Ingreso Planificado vs Validado)
export interface TrainingIncomeItem {
  id: string;
  concept: string;                      // e.g. "Inscripción 15 participantes", "Venta In-Company"
  
  // Fase: Planificado vs Real
  isPlanned?: boolean;                  // true si es proyección, false si es cobro real
  stage?: FinancialStage;               // 'planificado' | 'comprometido' | 'ejecutado_validado'
  
  quantity: number;                     // Cantidad de cupos o participantes
  unitPrice: number;                    // Precio unitario sin IVA
  subtotal: number;                     // quantity * unitPrice (sin IVA)
  
  // Fiscal Tryton (account.tax)
  hasIva?: boolean;
  taxType?: FiscalTaxType;              // 'iva_15' | 'iva_0' | 'exento'
  taxRate?: number;                     // 0.15 para 15%
  taxAmount?: number;                   // subtotal * taxRate
  total?: number;                       // subtotal + taxAmount
  
  // Facturación y Cobro (account.invoice)
  paymentStatus?: 'cobrado' | 'pendiente' | 'parcial';
  invoiceType?: FiscalInvoiceType;      // 'factura_emitida' | 'nota_venta_rimpe' | 'sin_comprobante'
  invoiceOrReceiptNumber?: string;
  invoiceUrl?: string;
  clientId?: string;
  clientName?: string;
  
  // Validación de Tesorería
  isValidated?: boolean;
  validatedBy?: string;
  validatedAt?: string;
  
  notes?: string;
}

export interface TrainingParticipant {
  id: string;
  name: string;
  identification?: string;              // Cédula o RUC
  email?: string;
  phone?: string;
  companyName?: string;
  attendancePercent?: number;           // % de asistencia a clases
  finalGrade?: number;                  // Calificación final (0-10 o 0-100)
  status: 'inscrito' | 'en_curso' | 'aprobado' | 'reprobado' | 'retirado';
  certificateIssued?: boolean;
  certificateCode?: string;
  paymentStatus?: 'pagado' | 'pendiente' | 'becado' | 'parcial';
  amountPaid?: number;
  notes?: string;
}

export interface TrainingSession {
  id: string;
  date: string;               // YYYY-MM-DD
  startTime: string;          // HH:mm (ej. 10:00)
  endTime: string;            // HH:mm (ej. 12:00)
  trainerId: string;          // ID del capacitador asignado a esta sesión
  spaceId: string;            // ID del espacio físico o virtual
  topic?: string;             // Tema o módulo específico de la sesión
  notes?: string;             // Notas específicas de la sesión
  hourlyRate?: number;        // Tarifa por hora acordada para esta sesión (editable)
  plannedHours?: number;      // Horas planificadas calculadas de startTime a endTime
  executedHours?: number;     // Horas reales ejecutadas/dictadas

  // Modalidad y Horarios para Capacitador Interno
  workScheduleType?: 'horario_laboral' | 'fuera_horario_laboral' | 'mixto';
  workHoursInSchedule?: number; // Horas dentro del horario laboral regular
  workHoursOutSchedule?: number; // Horas fuera del horario laboral / horas extra
}

export interface TrainingPlan {
  id: string;
  title: string;
  code?: string;
  description?: string;
  sessions?: TrainingSession[];
  trainerId: string;
  spaceId: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  totalHours?: number;
  totalExecutedHours?: number;
  status: 'programada' | 'completada' | 'cancelada';
  participants?: TrainingParticipant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainingManagement {
  id: string;
  code: string; // e.g. CAP-2026-001
  planId: string; // link to TrainingPlan for date, trainer, space
  clientId?: string; // Optional: if given to a specific client
  
  // Origen de la Capacitación
  originType?: 'marketing_campaign' | 'project' | 'direct_client' | 'internal_initiative' | 'other';
  marketingCampaignId?: string; // Optional: if linked to a campaign
  projectId?: string; // Optional: if linked to a company Project
  originDetails?: string; // Optional description/notes about the origin
  
  totalHours: number; // Horas planificadas totales
  totalExecutedHours?: number; // Horas ejecutadas totales

  // Presupuesto Planificado (Tryton account.budget)
  plannedTotalIncome?: number;
  plannedTotalCost?: number;
  plannedNetProfit?: number;
  plannedProfitMargin?: number;

  // Costos y Gastos Reales/Validados (sin IVA)
  totalTrainerCost?: number; // Total honorarios docentes sin IVA
  totalLogisticsCost?: number; // Total logística sin IVA
  totalSpaceCost?: number; // Total uso de aulas / Zoom sin IVA
  totalMarketingCost?: number; // Total gastos marketing sin IVA
  totalCertificateCost?: number; // Total gastos en certificados y acreditaciones sin IVA
  totalCost: number; // Gran total de costos sin IVA

  // Ingresos y Rentabilidad Real/Validada (sin IVA)
  incomes?: TrainingIncomeItem[];
  totalIncome?: number; // Gran total de ingresos sin IVA
  netProfit?: number; // Utilidad neta: totalIncome - totalCost
  profitMargin?: number; // Margen de rentabilidad %

  // Desviación Presupuestaria (Tryton Variance)
  incomeVariance?: number;
  expenseVariance?: number;
  profitVariance?: number;

  status: 'ejecutada' | 'pendiente';
  logisticsExpenses?: TrainingExpenseItem[];
  spaceExpenses?: TrainingExpenseItem[];
  marketingExpenses?: TrainingExpenseItem[];
  certificateExpenses?: TrainingExpenseItem[]; // Gastos en certificados y acreditaciones
  createdAt?: string;
  updatedAt?: string;
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

// ==========================================
// Module: QHSE - Inspección de Andamios
// Formato Oficial: JLC-REG-SST-017
// ==========================================

export type ScaffoldItemStatus = 'BE' | 'EA' | 'ME' | 'NA'; // BE: Buen Estado, EA: Estado Aceptable, ME: Mal Estado, NA: No Aplica

export interface ScaffoldInspectionItem {
  id: string; // '01', '02', etc.
  code: string; // '01', '02', etc.
  description: string;
  status: ScaffoldItemStatus;
  observations?: string;
}

export interface ScaffoldFindingCommitment {
  id: string;
  finding: string; // Hallazgo / Compromiso
  responsible: string; // Responsable
  executionDate: string; // Fecha de Ejecución
  status?: 'pendiente' | 'en_proceso' | 'completado';
}

export interface ScaffoldInspectionPhoto {
  id: string;
  url: string; // base64 / storage url
  caption?: string;
  createdAt: string;
}

export interface ScaffoldInspection {
  id: string;
  code: string; // ej: "INS-AND-2026-0001"
  formatCode: string; // "JLC-REG-SST-017"
  controlledCopy: boolean; // Copia controlada
  version: string; // "1"
  formatDate: string; // "20/07/2025"
  
  // Datos Generales
  assemblySupervisor: string; // ENCARGADO DEL MONTAJE
  client: string; // CLIENTE
  projectId?: string; // ID proyecto vinculado
  projectName: string; // PROYECTO
  location: string; // UBICACIÓN
  inspectionDate: string; // FECHA (YYYY-MM-DD)
  inspectionTime?: string; // HORA

  // Estado General de la Inspección
  generalStatus: 'conforme' | 'con_observaciones' | 'no_conforme' | 'borrador';

  // 23 Items de Inspección
  items: ScaffoldInspectionItem[];

  // Seguimiento de Hallazgos
  findings: ScaffoldFindingCommitment[];

  // Firmas y Responsables
  activitySupervisorName: string; // Nombre y Firma del Supervisor de la Actividad
  activitySupervisorSignatureUrl?: string; // Firma digital táctil
  
  scaffoldSupervisorName: string; // Nombre y Firma del Supervisor de Andamios
  scaffoldSupervisorSignatureUrl?: string; // Firma digital táctil

  // Registro Fotográfico desde Tablet / Móvil
  photos: ScaffoldInspectionPhoto[];

  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdByMemberId?: string;
  createdByName?: string;
}
