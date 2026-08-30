import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: 'Hola',
    });
    console.log("Success gemini-1.5-pro");
  } catch (err) {
    console.error("Error gemini-1.5-pro:", err);
  }
}
run();
