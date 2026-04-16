import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

    // Choose the fast, free tier model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Generate the content
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.json({
      result: responseText,
    });

  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "Error generating emails" });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
