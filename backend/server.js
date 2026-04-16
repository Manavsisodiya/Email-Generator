import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

// The CORS fix that successfully opened the door!
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'], 
  allowedHeaders: ['Content-Type'] 
}));
app.use(express.json());

// Initialize the NEW Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

app.post("/generate", async (req, res) => {
  const { name, desc, tone } = req.body;

  try {
    const prompt = `
Write 5 email replies.

Receiver: ${name}
Context: ${desc}
Tone: ${tone}

Make them clean and ready to send.
`;

    // The new syntax for calling Gemini 2.5 Flash
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({
      result: response.text,
    });

  } catch (err) {
    // If it fails again, this will print the EXACT reason in your Render Logs
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "Error generating emails" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});