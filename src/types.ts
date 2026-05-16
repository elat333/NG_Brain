/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  processId: string;
  skills: string[];
  responsibilities: string[];
  recentAchievements: string[];
  avatar?: string;
  personality?: string; // Información sobre personalidad y percepciones
  notes?: string;       // Notas adicionales o "dictados"
  email?: string;
  phone?: string;
  epp?: string[];      // Equipo de Protección Personal (NUEVO)
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pendiente' | 'en_progreso' | 'completada';
  memberId?: string; // Enlazada a un responsable
  auxiliaryId?: string; // Miembro auxiliar opcional (NUEVO)
  processId: string; // Enlazada a un proceso
  projectId?: string; // Enlazada a un proyecto (NUEVO)
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  processId: string; // Relacionado con un proceso
  status: 'activo' | 'completado' | 'pausado';
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
    role?: string;
    processId?: string;
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
