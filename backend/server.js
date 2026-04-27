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
    const prompt = `
Write exactly 3 distinct email replies based on the following:
Receiver: ${name}
Context: ${desc}
Tone: ${tone}

CRITICAL INSTRUCTION:
You MUST return your answer strictly as a valid JSON array of 3 strings. 
Do not include any introductory text. Do not use markdown outside of the JSON block.

EXAMPLE FORMAT:
[
  "Subject: First Idea\n\nDear Name,\n\nBody here...",
  "Subject: Second Idea\n\nHi Name,\n\nBody here...",
  "Subject: Third Idea\n\nHello Name,\n\nBody here..."
]
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let cleanText = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const emailArray = JSON.parse(cleanText);

    res.json({ result: emailArray });

  } catch (err) {
    res.status(500).json({ error: "Error generating emails" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
