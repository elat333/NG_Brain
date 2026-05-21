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

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'review' | 'done' | 'rejected';
  memberId?: string; // Enlazada a un responsable
  auxiliaryId?: string; // Miembro auxiliar opcional (NUEVO)
  processId: string; // Enlazada a un proceso
  projectId?: string; // Enlazada a un proyecto (NUEVO)
  deliverables?: Deliverable[]; // Nueva sección de entregables
  plannedHours?: number; // Horas planificadas
  actualHours?: number; // Horas reales
  dueDate?: string; // Fecha de entrega
  blockedByTaskIds?: string[]; // IDs de tareas que bloquean a esta tarea
  createdAt: string;
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
