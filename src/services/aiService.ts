/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { TeamMember, Process, ExtractedUpdates, SuggestedActivity, MemberDraft } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function analyzeTranscript(
  transcript: string,
  members: TeamMember[],
  processes: Process[]
): Promise<ExtractedUpdates> {
  const prompt = `
    Analiza la siguiente transcripción de la reunión. Tu objetivo es identificar actualizaciones para miembros específicos del equipo y procesos corporativos.
    
    Miembros actuales del equipo:
    ${JSON.stringify(members.map(m => ({ id: m.id, name: m.name })), null, 2)}
    
    Procesos actuales:
    ${JSON.stringify(processes.map(p => ({ id: p.id, name: p.name })), null, 2)}
    
    Instrucciones:
    1. Busca nuevas habilidades mencionadas para miembros específicos.
    2. Busca nuevas responsabilidades asignadas o mencionadas.
    3. Busca menciones de Equipo de Protección Personal (EPP) necesario para miembros específicos.
    4. Busca logros recientes o tareas hechas (Done).
    5. Busca actualizaciones sobre lo que está haciendo un proceso o sus nuevas metas.
    6. Solo devuelve actualizaciones para miembros/procesos que estén explícitamente mencionados o sean claramente identificables.
    7. IMPORTANTE: Devuelve TODAS las descripciones y textos en ESPAÑOL.
    
    Transcripción:
    ${transcript}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          memberUpdates: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                memberId: { type: Type.STRING, description: "ID of the team member" },
                newSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                newResponsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
                epp: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Personal Protective Equipment (EPP) mentioned" },
                achievements: { type: Type.ARRAY, items: { type: Type.STRING } },
                roleUpdate: { type: Type.STRING }
              },
              required: ["memberId"]
            }
          },
          processUpdates: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                processId: { type: Type.STRING, description: "ID of the process" },
                descriptionUpdate: { type: Type.STRING },
                newGoals: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["processId"]
            }
          }
        }
      }
    }
  });

  const rawText = response.text;
  if (!rawText) return { memberUpdates: [], processUpdates: [] };
  
  return JSON.parse(rawText) as ExtractedUpdates;
}

export async function processMemberInput(
  input: string,
  members: TeamMember[],
  processes: Process[]
): Promise<MemberDraft | null> {
  const prompt = `
    Eres un Asistente de Gestión de Talento. El usuario te dará un comando o información sobre miembros del equipo.
    Tu objetivo es decidir si el usuario quiere CREAR un nuevo miembro o ACTUALIZAR uno existente.
    
    Miembros actuales:
    ${JSON.stringify(members.map(m => ({ id: m.id, name: m.name, role: m.role })), null, 2)}
    
    Procesos disponibles:
    ${JSON.stringify(processes.map(p => ({ id: p.id, name: p.name })), null, 2)}
    
    Entrada: "${input}"
    
    Devuelve un JSON que indique:
    1. type: 'create' o 'update'.
    2. memberId: solo si es update.
    3. data: los campos a cambiar/crear. Si es una actualización, solo incluye los campos que cambian o se añaden (por ejemplo, añade nuevas habilidades a la lista existente si se mencionan).
    4. explanation: una breve explicación en español de qué estás sugiriendo cambiar.
    
    Si el usuario dice "Crea a Juan Pérez como diseñador en el proceso de marketing", el tipo es 'create'.
    Si el usuario dice "Juan ahora sabe Python", y Juan ya existe, el tipo es 'update'.
    
    IMPORTANTE: Todo el texto debe estar en ESPAÑOL.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['create', 'update'] },
          memberId: { type: Type.STRING, nullable: true },
          data: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              role: { type: Type.STRING },
              processId: { type: Type.STRING },
              skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
              epp: { type: Type.ARRAY, items: { type: Type.STRING } },
              personality: { type: Type.STRING },
              notes: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING }
            }
          },
          explanation: { type: Type.STRING }
        },
        required: ["type", "data", "explanation"]
      }
    }
  });

  const text = response.text;
  if (!text) return null;
  return JSON.parse(text) as MemberDraft;
}

export async function getPlanningSuggestions(
  input: string,
  members: TeamMember[],
  processes: Process[]
): Promise<SuggestedActivity[]> {
  const prompt = `
    Eres un Asistente de Planificación Semanal experto. El usuario te ha proporcionado una descripción de sus planes, ideas o una transcripción de voz sobre las actividades de la semana.
    
    Tu tarea es:
    1. Analizar el texto y extraer una lista de actividades concretas y convertibles en tareas.
    2. Para cada actividad, sugiere un título corto y una descripción clara.
    3. Si es posible, identifica qué miembro del equipo o proceso sería el más apto para realizarla basándote en la información proporcionada.
    4. Sugiere un día de la semana si se menciona o se puede inferir.
    
    Miembros del equipo:
    ${JSON.stringify(members.map(m => ({ id: m.id, name: m.name, role: m.role, skills: m.skills })), null, 2)}
    
    Procesos:
    ${JSON.stringify(processes.map(p => ({ id: p.id, name: p.name })), null, 2)}
    
    Entrada del usuario:
    "${input}"
    
    Devuelve la respuesta estrictamente en formato JSON siguiendo el esquema proporcionado. Todo el texto debe estar en ESPAÑOL.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                processId: { type: Type.STRING, nullable: true },
                memberId: { type: Type.STRING, nullable: true },
                suggestedDay: { type: Type.STRING, nullable: true }
              },
              required: ["id", "title", "description"]
            }
          }
        }
      }
    }
  });

  const rawText = response.text;
  if (!rawText) return [];
  
  try {
    const parsed = JSON.parse(rawText);
    return parsed.activities || [];
  } catch (e) {
    console.error("Failed to parse activities", e);
    return [];
  }
}
