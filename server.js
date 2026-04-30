import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));


const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    reply: "ส่งข้อความเร็วเกินไปนิดนึง รอสักครู่แล้วลองใหม่อีกครั้งนะ"
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.OPENROUTER_API_KEY)
  });
});

app.post("/api/chat", chatLimiter, async (req, res) => {
  try {
    const { message, watchData, history } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ reply: "กรุณาพิมพ์คำถามก่อนนะ" });
    }

    if (message.length > 1200) {
      return res.status(400).json({ reply: "ข้อความยาวเกินไป ลองย่อให้สั้นลงนิดนึงนะ" });
    }

    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "PUT_YOUR_KEY_HERE") {
      return res.status(500).json({
        reply: "ยังไม่ได้ใส่ OPENROUTER_API_KEY ในไฟล์ .env นะ ไปใส่ key ก่อนแล้ว restart server ด้วย npm start"
      });
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-8).map(item => ({
          role: item.role === "assistant" ? "assistant" : "user",
          content: String(item.content || "").slice(0, 1000)
        }))
      : [];

    const systemPrompt = `
You are Wellnest AI, a friendly fitness and wellness chatbot.

Your role:
- Answer questions about exercise, sleep, hydration, calories, steps, heart rate, recovery, and basic wellness.
- Use simple, warm, practical language.
- If the user writes Thai, answer in Thai. If English, answer in English.
- Use the smartwatch data when relevant.
- Do not claim to diagnose disease.
- Do not give dangerous medical advice.
- If the user reports chest pain, severe breathing difficulty, fainting, severe dizziness, one-sided weakness, or emergency symptoms, tell them to seek urgent medical care immediately.
- Keep answers concise but useful.
- Give routines in clear steps when asked.

Current smartwatch data:
${JSON.stringify(watchData || {}, null, 2)}
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-OpenRouter-Title": "Wellnest AI Health Chatbot"
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "nousresearch/hermes-3-llama-3.1-405b:free",
        messages: [
          { role: "system", content: systemPrompt },
          ...safeHistory,
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", data);
      return res.status(response.status).json({
        reply: data?.error?.message || "OpenRouter API error. ลองเช็ก API key, credits, หรือ model name อีกครั้ง"
      });
    }

    const reply = data.choices?.[0]?.message?.content || "ขอโทษนะ ตอนนี้ยังไม่มีคำตอบจากโมเดล";
    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      reply: "Server error: " + error.message
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app; 