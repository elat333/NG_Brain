import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hola',
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
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
    console.log("Success:", response.text);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
