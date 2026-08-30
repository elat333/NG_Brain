import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: 'Hola',
    });
    console.log("Success gemini-2.5-pro");
  } catch (err) {
    console.error("Error gemini-2.5-pro:", err);
  }
}
run();
