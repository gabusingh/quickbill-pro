
import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseItemsWithAI = async (text: string): Promise<Partial<InvoiceItem>[]> => {
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
