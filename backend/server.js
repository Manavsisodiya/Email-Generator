import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'], 
  allowedHeaders: ['Content-Type'] 
}));
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/generate", async (req, res) => {
  const { name, desc, tone } = req.body;

  try {
    const prompt = `
Write exactly 3 distinct, professional email replies based on:
Receiver: ${name}
Context: ${desc}
Tone: ${tone}

STRICT RULES:
1. Return the output ONLY as a valid JSON array of 3 strings.
2. Each string must contain a Subject line and the Email Body.
3. Use \\n for new lines within the strings.
4. DO NOT include any text outside of the JSON array.
5. DO NOT use markdown code blocks like \`\`\`json.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const emailArray = JSON.parse(response.text);
    res.json({ result: emailArray });

  } catch (err) {
    console.error("BACKEND ERROR:", err);
    res.status(500).json({ error: "Generation failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
