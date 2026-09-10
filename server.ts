import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    aiClient = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API routes
  app.post("/api/ai/analyze-transcript", async (req, res) => {
    try {
      const { transcript, members, processes } = req.body;
      const ai = getAI();
      const prompt = `
        Analiza la siguiente transcripción de la reunión. Tu objetivo es identificar actualizaciones para miembros específicos del equipo y procesos corporativos.
        
        Miembros actuales del equipo:
        ${JSON.stringify((members || []).map((m: any) => ({ id: m.id, name: m.name })), null, 2)}
        
        Procesos actuales:
        ${JSON.stringify((processes || []).map((p: any) => ({ id: p.id, name: p.name })), null, 2)}
        
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
        model: "gemini-2.5-flash", // Using standard recommended alias
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
      const ai = getAI();
      const prompt = `
        Eres un Asistente de Gestión de Talento. El usuario te dará un comando o información sobre miembros del equipo.
        Tu objetivo es decidir si el usuario quiere CREAR un nuevo miembro o ACTUALIZAR uno existente.
        
        Miembros actuales:
        ${JSON.stringify((members || []).map((m: any) => ({ id: m.id, name: m.name, role: m.role })), null, 2)}
        
        Procesos disponibles:
        ${JSON.stringify((processes || []).map((p: any) => ({ id: p.id, name: p.name })), null, 2)}
        
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
        model: "gemini-2.5-flash",
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
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: error?.message || "Failed to process member input" });
    }
  });

  app.post("/api/ai/planning-suggestions", async (req, res) => {
    try {
      const { input, members, processes } = req.body;
      const ai = getAI();
      const prompt = `
        Eres un Asistente de Planificación Semanal experto.
        Analiza el texto y extrae una lista de actividades concretas y convertibles en tareas.
        
        Miembros del equipo:
        ${JSON.stringify((members || []).map((m: any) => ({ id: m.id, name: m.name, role: m.role, skills: m.skills })), null, 2)}
        
        Procesos:
        ${JSON.stringify((processes || []).map((p: any) => ({ id: p.id, name: p.name })), null, 2)}
        
        Entrada del usuario:
        "${input}"
        
        Devuelve la respuesta strictly en formato JSON. Todo el texto debe estar en ESPAÑOL.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: error?.message || "Failed to get planning suggestions" });
    }
  });

  app.post("/api/ai/management-chat", async (req, res) => {
    try {
      const { userQuery, messages, notes, strategy, governance, members, processes, tasks, marketing } = req.body;
      const ai = getAI();

      // Extract governance config
      const toneId = governance?.tone || 'estructuracion_descripcion';
      
      const defaultProfiles = [
        {
          id: 'estructuracion_descripcion',
          name: 'Estructuración & Descripción de Empresa',
          prompt: 'Enfócate en estructurar la empresa, describir detalladamente lo que hace Novagreen, analizar los procesos corporativos y cómo se interconectan e interactúan sus partes operativas y administrativas.',
          activeContexts: { strategy: true, processes: true, members: true, tasks: true, marketing: false },
          selectedNotes: (notes || []).map((n: any) => n.id),
          activeGuardrails: (governance?.guardrails || []).map((g: any) => g.id)
        },
        {
          id: 'consultor_iso',
          name: 'Consultor ISO & Gestión Integrada',
          prompt: 'Enmarca cada análisis bajo los principios de la Gestión Integrada de Calidad, Medio Ambiente y Seguridad (ISO 9001/14001/45001), trazabilidad, evidencia auditable y mejora continua.',
          activeContexts: { strategy: false, processes: true, members: false, tasks: false, marketing: false },
          selectedNotes: (notes || []).map((n: any) => n.id),
          activeGuardrails: (governance?.guardrails || []).map((g: any) => g.id)
        },
        {
          id: 'gobernanza_riesgos',
          name: 'Gobernanza, Riesgos & Estrategia',
          prompt: 'Prioriza la matriz de riesgos directivos, resiliencia financiera, cumplimiento normativo y seguimiento riguroso de OKRs estratégicos.',
          activeContexts: { strategy: true, processes: false, members: false, tasks: false, marketing: false },
          selectedNotes: (notes || []).map((n: any) => n.id),
          activeGuardrails: (governance?.guardrails || []).map((g: any) => g.id)
        }
      ];

      const currentProfiles = governance?.styleProfiles?.length > 0 ? governance.styleProfiles : defaultProfiles;
      const activeProfile = currentProfiles.find((p: any) => p.id === toneId) || currentProfiles[0];
      
      const systemDirectives = governance?.systemDirectives || '';
      
      // Filter guardrails based on activeProfile's activeGuardrails array
      const enabledGuardrails = (governance?.guardrails || []).filter((g: any) => activeProfile.activeGuardrails?.includes(g.id) ?? false);
      const calibrationHistory = governance?.calibrationHistory || [];

      // Construct System Instruction dynamically
      let systemInstruction = `Eres un Consultor y Asistente Ejecutivo de Gerencia de Novagreen especialista en Estructuración, Descripción de Empresa y Gestión Estratégica.
Tu función principal es ayudar a definir, estructurar y refinar la descripción de la empresa, sus procesos y la manera en que interactúan las distintas áreas organizacionales.

PERFIL DE CONSULTOR ACTIVO: ${activeProfile.name}
INSTRUCCIÓN PRINCIPAL DEL PERFIL:
${activeProfile.prompt}
`;

      if (systemDirectives) {
        systemInstruction += `\nDIRECTIVAS MAESTRAS DE LA DIRECCIÓN:\n${systemDirectives}\n`;
      }

      if (enabledGuardrails.length > 0) {
        systemInstruction += `\nREGLAS DE SEGURIDAD Y GUARDRAILS ANTI-ALUCINACIÓN VINCULADOS A ESTE PERFIL:\n`;
        enabledGuardrails.forEach((g: any) => {
          systemInstruction += `- [${g.title}]: ${g.ruleDescription}\n`;
        });
      }

      if (calibrationHistory.length > 0) {
        systemInstruction += `\nRETROALIMENTACIÓN Y CORRECCIONES PREVIAS DEL GERENTE (APRENDIZAJE EN TIEMPO REAL):\n`;
        calibrationHistory.slice(-5).forEach((c: any) => {
          systemInstruction += `- TEMA: ${c.promptOrTopic} | CORRECCIÓN DEL GERENTE: ${c.managerCorrection}\n`;
        });
      }

      systemInstruction += `\nSISTEMA Y DATOS DISPONIBLES DE LA EMPRESA (El gerente ha filtrado esta información para ti):\n`;
      
      if (activeProfile.selectedNotes && activeProfile.selectedNotes.length > 0) {
        const filteredNotes = (notes || []).filter((n: any) => activeProfile.selectedNotes.includes(n.id));
        systemInstruction += `BITÁCORA Y NOTAS DE GERENCIA EXISTENTES:\n${JSON.stringify(filteredNotes, null, 2)}\n\n`;
      }
      
      if (activeProfile.activeContexts.strategy) {
        systemInstruction += `MATRIZ ESTRATÉGICA (FODA, OKRs Y RIESGOS):\n${JSON.stringify(strategy || {}, null, 2)}\n\n`;
      }
      
      if (activeProfile.activeContexts.processes) {
        systemInstruction += `PROCESOS CORPORATIVOS:\n${JSON.stringify((processes || []).map((p: any) => ({ id: p.id, name: p.name, description: p.description, goals: p.goals })), null, 2)}\n\n`;
      }
      
      if (activeProfile.activeContexts.members) {
        systemInstruction += `MIEMBROS DEL EQUIPO Y ROLES:\n${JSON.stringify((members || []).map((m: any) => ({ name: m.name, role: m.role, skills: m.skills, responsibilities: m.responsibilities })), null, 2)}\n\n`;
      }
      
      if (activeProfile.activeContexts.tasks) {
        systemInstruction += `TAREAS CORPORATIVAS ACTUALES:\n${JSON.stringify((tasks || []).map((t: any) => ({ title: t.title, status: t.status, priority: t.priority, area: t.area })), null, 2)}\n\n`;
      }
      
      if (activeProfile.activeContexts.marketing) {
        systemInstruction += `INFORMACIÓN DE MARKETING (Campañas y Métricas):\n${JSON.stringify(marketing || {}, null, 2)}\n\n`;
      }

      systemInstruction += `INSTRUCCIONES CLAVE DE RESPUESTA Y COMPORTAMIENTO:\n
1. Responde de forma altamente profesional, estructurada y en ESPAÑOL.
2. REGLA OBLIGATORIA SOBRE LA BITÁCORA Y GUARDAR/EDITAR INFORMACIÓN:
   - Siempre busca y apóyate primero en la información almacenada en las notas de la Bitácora y Procesos.
   - En lugar de crear automáticamente notas nuevas sin consultar, lo PRIMERO que debes hacer cuando el gerente te pida redactar o mejorar una descripción/acuerdo es consultar la bitácora e INDAGAR/PREGUNTAR si desea guardar/actualizar los cambios en alguna de las notas de la bitácora ya existentes (mencionando sus títulos) o si prefiere crear una nueva nota.
   - ÚNICAMENTE incluye el objeto "suggestedNote" en tu respuesta cuando el gerente explícitamente confirme o solicite guardar/crear la nota en la bitácora.
3. Si el gerente te pide ajustar FODA, OKRs o Riesgos, incluye "suggestedAction" con { type: ('add_swot' | 'add_okr' | 'add_risk'), data: ... }.
`;

      const selectedModel = governance?.selectedModel || 'gemini-2.5-flash';

      const formattedContents = [
        ...((messages || []).map((m: any) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }))),
        { role: 'user', parts: [{ text: `Gerente: ${userQuery}` }] }
      ];

      let response;
      try {
        response = await ai.models.generateContent({
          model: selectedModel === 'gemini-2.5-pro-preview' ? 'gemini-2.5-pro' : selectedModel,
          contents: formattedContents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "La respuesta analítica y ejecutiva del asistente" },
                suggestedNote: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                    category: { type: Type.STRING, enum: ['decisión', 'estrategia', 'reunión', 'análisis', 'acuerdo', 'general'] }
                  },
                  required: ["title", "content", "category"]
                },
                suggestedAction: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    type: { type: Type.STRING, enum: ['add_swot', 'add_okr', 'add_risk'] },
                    data: { type: Type.OBJECT }
                  },
                  required: ["type", "data"]
                }
              },
              required: ["text"]
            }
          }
        });
      } catch (e: any) {
        console.warn("Primary model failed, falling back to gemini-2.5-flash", e.message);
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
          ...((messages || []).map((m: any) => `${m.sender === 'user' ? 'Gerente' : 'Asistente'}: ${m.text}`)),
          `Gerente: ${userQuery}`
        ].join('\n'),
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "La respuesta analítica y ejecutiva del asistente" },
              suggestedNote: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  category: { type: Type.STRING, enum: ['decisión', 'estrategia', 'reunión', 'análisis', 'acuerdo', 'general'] }
                },
                required: ["title", "content", "category"]
              },
              suggestedAction: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  type: { type: Type.STRING, enum: ['add_swot', 'add_okr', 'add_risk'] },
                  data: { type: Type.OBJECT }
                },
                required: ["type", "data"]
              }
            },
            required: ["text"]
          }
        }
      });
      }

      let rawText = response.text || "";
      if (!rawText) return res.status(500).json({ error: "No text returned from Gemini" });
      
      // Clean up markdown block if present
      rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      
      try {
        const parsed = JSON.parse(rawText);
        res.json(parsed);
      } catch (parseError: any) {
        console.error("Failed to parse Gemini JSON:", parseError, "\nRaw text:", rawText);
        res.status(500).json({ error: "El Asistente devolvió un formato inválido. Reintente." });
      }
    } catch (error: any) {
      console.error("Management AI Error:", error); /* fs.writeFileSync removed */
      res.status(500).json({ error: error?.message || "Failed to query management AI" });
    }
  });

  // 404 handler for unhandled API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
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
