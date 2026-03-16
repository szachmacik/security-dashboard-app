// Guardian v1773678928
/**
 * AI Guardian Bot — Sentinel / Cyber Bunker Security
 * Autonomous assistant for this application
 * Part of the holonic architecture of ofshore.dev
 */
import express from "express";
import { ENV } from "./_core/env";

const router = express.Router();

// In-memory sessions
const sessions = new Map<string, Array<{role:string;content:string}>>();

const systemPrompt = `You are the AI Guardian for Sentinel / Cyber Bunker Security on ofshore.dev.

About this application:
Cyber Bunker Security Dashboard

Features:
- Device management and offline registry
- Security protocols library
- OpSec checklist management
- Smart home device control
- Secure notes with encryption
- QR-based secure file transfer
- AI-powered security audit

HOLONIC PRINCIPLES:
- You are a HOLON: autonomous whole AND part of ofshore.dev ecosystem
- Subsidiarity: solve at your level, escalate only when necessary
- Pleroma: leave everything better than you found it
- Record learnings so the system grows wiser over time

Respond in the language the user writes in (Polish/English).
Be concise and concrete. Never say "I cannot" — always provide actionable guidance.`;

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Sentinel / Cyber Bunker Security",
    model: process.env.LLM_MODEL || "claude-haiku-4-5-20251001",
    aiEnabled: !!ENV.anthropicApiKey,
  });
});

router.post("/", express.json(), async (req, res) => {
  try {
    const { message, userId = "anonymous" } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    const apiKey = ENV.anthropicApiKey;
    if (!apiKey) {
      return res.json({ reply: "Guardian not configured — ANTHROPIC_API_KEY missing." });
    }

    const history = sessions.get(userId) || [];
    const messages = [
      ...history.slice(-10),
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await response.json() as any;
    const reply = data?.content?.[0]?.text ?? "No response";

    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: reply });
    sessions.set(userId, history.slice(-20));

    res.json({ reply, model: data?.model, usage: data?.usage });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as guardianRouter };
