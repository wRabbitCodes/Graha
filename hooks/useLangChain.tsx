import { useState, useCallback } from "react";
import { ChatOllama } from "@langchain/ollama"; // ✅ correct package
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

const ALLOWED = [
  "Mercury", "Venus", "Earth", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune",
];

export function useLangChain() {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runQuery = useCallback(async (userInput: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const llm = new ChatOllama({
        model: "phi3",         // or llama3, mistral, etc.
        baseUrl: "http://localhost:11434",
      });

      const prompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
          `You are a planetary assistant. Only answer concisely about: ${ALLOWED.join(
            ", "
          )}. Politely decline unrelated questions no matter what.`
        ),
        HumanMessagePromptTemplate.fromTemplate("{input}"),
      ]);

      const chain = RunnableSequence.from([prompt, llm]);
      const result: any = await chain.invoke({ input: userInput });
      let text = "";
      if (typeof result === "string") {
        text = result;
      } else if (Array.isArray(result?.content)) {
        text = result.content.map((c: any) => (typeof c === "string" ? c : c?.text ?? "")).join(" ");
      } else if (typeof result?.content === "string") {
        text = result.content;
      } else if (result?.content?.text) {
        text = result.content.text;
      }
      setResponse(text.trim());
    } catch (err: any) {
      setError(err.message || "Error running model");
    } finally {
      setLoading(false);
    }
  }, []);

  return { runQuery, response, error, loading };
}
