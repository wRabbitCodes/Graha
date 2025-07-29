// pages/api/ask.ts
import { LangChainService } from "@/lib/langchainservice";
import type { NextApiRequest, NextApiResponse } from "next";

const service = new LangChainService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { question, messages = [], sessionId = "default" } = req.body;

  try {
    const result = await service.runQuery({ question, sessionId, chat_history: messages });
    res.status(200).json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Unknown error" });
  }
}
