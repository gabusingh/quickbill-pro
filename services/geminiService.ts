
import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceItem } from "../types";

// Vite exposes env vars via import.meta.env and only those
// prefixed with VITE_ are available in the client bundle.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

// Lazily-initialised client so we don't throw when the key is missing.
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  // Keep the UI functional even if AI is not configured.
  console.warn("VITE_GEMINI_API_KEY is not set; AI item parsing is disabled.");
}

export const parseItemsWithAI = async (text: string): Promise<Partial<InvoiceItem>[]> => {
  // If there is no configured client, just return an empty result.
  if (!ai) {
    console.warn("Skipping AI parsing because Gemini API is not configured.");
    return [];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert gemologist assistant for an astrology store. Parse the following billing request:
      Input text: "${text}"
      
      Instructions:
      1. Particulars: Identify the Gemstone (e.g. Neelam, Pukhraj, Emerald) or Service (Consultation).
      2. Weight: Extract the numeric value of weight.
      3. WeightUnit: Default to 'ct' (carats) for stones, or 'ratti' if mentioned. Use '-' for services.
      4. Quantity: Default to 1.
      5. UnitPrice: Extract the price per piece or per carat if possible.
      
      Return as a JSON array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              particulars: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              weight: { type: Type.NUMBER },
              weightUnit: { type: Type.STRING },
              unitPrice: { type: Type.NUMBER }
            },
            required: ["particulars", "quantity", "unitPrice"]
          }
        }
      }
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Gem Parsing Error:", error);
    return [];
  }
};
