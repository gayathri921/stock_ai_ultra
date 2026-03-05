import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeStock(symbol: string, question: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the stock ${symbol} based on this question: ${question}.`,
    config: {
      systemInstruction: "You are a fast, concise stock market analyst. Provide brief, accurate insights. Do not be wordy. Use real-time data if available.",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          recommendation: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          riskLevel: { type: Type.STRING },
          explanation: { type: Type.STRING },
          disclaimer: { type: Type.STRING },
        },
        required: ["summary", "recommendation", "confidence", "riskLevel", "explanation", "disclaimer"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
