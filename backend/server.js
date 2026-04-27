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

app.post("/stream", async (req, res) => {
  const { name, desc, tone } = req.body;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); 

  try {
    const prompt = `
Write exactly 3 concise, different email replies based on the following:
Receiver: ${name}
Context: ${desc}
Tone: ${tone}

STRICT RULES:
1. DO NOT include any introductory text.
2. DO NOT include any concluding text.
3. Separate each of the 3 emails using EXACTLY this string: |||
4. Provide only the email subjects and bodies.
`;

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    for await (const chunk of responseStream) {
        if (chunk.text) {
            res.write(chunk.text);
        }
    }
    
    res.end(); 
    
  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).write("Error generating emails");
    res.end();
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
