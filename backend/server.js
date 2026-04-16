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

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

app.post("/generate", async (req, res) => {
  const { name, desc, tone } = req.body;

  try {
    // THE FIX: A strict, bulletproof prompt structure
    const prompt = `
Write exactly 5 different email replies based on the following:
Receiver: ${name}
Context: ${desc}
Tone: ${tone}

STRICT RULES:
1. DO NOT include any introductory text like "Here are your emails".
2. DO NOT include any concluding text.
3. Separate each of the 5 emails using EXACTLY this string: |||
4. Provide only the email subjects and bodies without markdown bolding.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({
      result: response.text,
    });

  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "Error generating emails" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
