import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/ai/analyze-transcript", async (req, res) => {
    try {
      const { transcript, members, processes } = req.body;
      const prompt = `
        Analiza la siguiente transcripción de la reunión. Tu objetivo es identificar actualizaciones para miembros específicos del equipo y procesos corporativos.
        
        Miembros actuales del equipo:
        ${JSON.stringify(members.map((m: any) => ({ id: m.id, name: m.name })), null, 2)}
        
        Procesos actuales:
        ${JSON.stringify(processes.map((p: any) => ({ id: p.id, name: p.name })), null, 2)}
        
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
        model: "gemini-3.5-flash", // Using stable model
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
      if (!rawText) return res.json({ memberUpdates: [], processUpdates: [] });
      res.json(JSON.parse(rawText));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to analyze transcript" });
    }
  });

  app.post("/api/ai/process-member-input", async (req, res) => {
    try {
      const { input, members, processes } = req.body;
      const prompt = `
        Eres un Asistente de Gestión de Talento. El usuario te dará un comando o información sobre miembros del equipo.
        Tu objetivo es decidir si el usuario quiere CREAR un nuevo miembro o ACTUALIZAR uno existente.
        
        Miembros actuales:
        ${JSON.stringify(members.map((m: any) => ({ id: m.id, name: m.name, role: m.role })), null, 2)}
        
        Procesos disponibles:
        ${JSON.stringify(processes.map((p: any) => ({ id: p.id, name: p.name })), null, 2)}
        
        Entrada: "${input}"
        
        Instrucciones:
        1. type: 'create' o 'update'.
        2. memberId: solo si es update.
        3. data: los campos a cambiar/crear. Si encuentras una cédula o pasaporte, asígnalo a identificationId. Si menciona que tiene RUC, pon hasRuc en true. 
           Si menciona compañías y cargos, asígnalos a companyAssociations como un arreglo de objetos con companyId y role.
        4. explanation: una breve explicación en español de qué estás sugiriendo cambiar.
        
        IMPORTANTE: Todo el texto debe estar en ESPAÑOL.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
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
                  identificationId: { type: Type.STRING },
                  hasRuc: { type: Type.BOOLEAN },
                  role: { type: Type.STRING },
                  processId: { type: Type.STRING },
                  companyAssociations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        companyId: { type: Type.STRING },
                        role: { type: Type.STRING }
                      }
                    }
                  },
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
      if (!text) return res.status(404).json({ error: "No response from AI" });
      res.json(JSON.parse(text));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to process member input" });
    }
  });

  app.post("/api/ai/planning-suggestions", async (req, res) => {
    try {
      const { input, members, processes } = req.body;
      const prompt = `
        Eres un Asistente de Planificación Semanal experto.
        Analiza el texto y extrae una lista de actividades concretas y convertibles en tareas.
        
        Miembros del equipo:
        ${JSON.stringify(members.map((m: any) => ({ id: m.id, name: m.name, role: m.role, skills: m.skills })), null, 2)}
        
        Procesos:
        ${JSON.stringify(processes.map((p: any) => ({ id: p.id, name: p.name })), null, 2)}
        
        Entrada del usuario:
        "${input}"
        
        Devuelve la respuesta strictly en formato JSON. Todo el texto debe estar en ESPAÑOL.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
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
      if (!rawText) return res.json({ activities: [] });
      res.json(JSON.parse(rawText));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to get planning suggestions" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
