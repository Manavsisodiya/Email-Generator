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
    const prompt = `Write exactly 3 distinct email replies based on the following:
Receiver: ${name}
Context: ${desc}
Tone: ${tone}

You must return the output STRICTLY as a JSON array of objects.
Each object must have exactly two keys: "subject" and "body".`;

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
    console.error(err);
    res.status(500).json({ error: "Server crashed", details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
