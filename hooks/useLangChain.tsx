// hooks/useLangChain.ts
import { useState, useCallback } from "react";
import { BaseMessage, AIMessage, HumanMessage } from "@langchain/core/messages";

export function useLangChain(sessionId: string = "default") {
  const [response, setResponse] = useState<string | null>(null);
  const [messages, setMessages] = useState<BaseMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runQuery = useCallback(async (userInput: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userInput,
          sessionId,
          messages,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");

      setResponse(data.output);
      setMessages(data.messages);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [sessionId, messages]);

  return { runQuery, response, messages, loading, error };
}
