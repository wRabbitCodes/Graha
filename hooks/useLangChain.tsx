import { useState, useCallback } from "react";
import { ChatOllama } from "@langchain/ollama";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";

const ALLOWED = [
  "Mercury",
  "Venus",
  "Earth",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
];

// 👇 Wrapped tool with schema for LLM usage
const wikiTool = tool(
  async (input: unknown) => {
    const parsed = z
      .object({
        query: z.string().describe("The name of the planet to look up"),
      })
      .safeParse(input);

    if (!parsed.success) {
      throw new Error("Invalid input for wikiTool");
    }

    const { query } = parsed.data;
    if (!ALLOWED.includes(query)) {
      return `Sorry, I can only provide information on the following planets: ${ALLOWED.join(
        ", "
      )}.`;
    }
    const wiki = new WikipediaQueryRun({
      topKResults: 1,
      maxDocContentLength: 4000,
    });
    return await wiki.invoke(query);
  },
  {
    name: "wiki_planet_info",
    description: "Look up information about a plane in Wikipedia.",
    schema: z.object({
      query: z.string().describe("The name of the planet to look up"),
    }),
  }
);

// In-memory session message storage
const messageHistories: Record<string, InMemoryChatMessageHistory> = {};

export function useLangChain(sessionId: string = "default") {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<HumanMessage | AIMessage>>([]);

  const runQuery = useCallback(
    async (userInput: string) => {
      setLoading(true);
      setError(null);
      setResponse(null);

      try {
        // 💬 Ensure message history is initialized
        if (!messageHistories[sessionId]) {
          messageHistories[sessionId] = new InMemoryChatMessageHistory();
        }
        const messageHistory = messageHistories[sessionId];

        // ➕ Add user input
        const humanMessage = new HumanMessage(userInput);
        await messageHistory.addMessage(humanMessage);

        // 🔗 Set up LLM + tool binding
        const llm = new ChatOllama({
          model: "qwen2.5:0.5b",
          baseUrl: "http://localhost:11434",
        });

        const llmWithTools = llm.bindTools([wikiTool]);

        // 🧠 Create prompt chain
        const prompt = ChatPromptTemplate.fromMessages([
          SystemMessagePromptTemplate.fromTemplate(
            `You are a planetary assistant with access to a tool called 'wiki_planet_info' that retrieves detailed information about planets.
              ONLY answer questions about these planets: ${ALLOWED.join(", ")}.
              Politely decline anything unrelated.

              When detailed facts (e.g., radius, atmosphere, composition) are needed, use the 'wiki_planet_info' tool by formatting your response as a JSON object with a 'tool_call' field, like this:
              {{
                "tool_call": {{
                  "name": "wiki_planet_info",
                  "arguments": {{
                    "query": "<planet_name>"
                  }}
                }}
              }}
              Otherwise, respond with plain text for general queries.`
          ),
          HumanMessagePromptTemplate.fromTemplate("{input}"),
        ]);

        const chain = RunnableSequence.from([
          {
            input: (input: { input: string }) => input.input,
            chat_history: async () => await messageHistory.getMessages(),
          },
          prompt,
          llmWithTools,
        ]);

        // 🚀 Invoke chain
        const result = await chain.invoke({ input: userInput });

        let text = "";
        let toolResult: string | null = null;

        // 🛠️ Check for tool call
        if (
          result?.content &&
          typeof result.content === "object" &&
          "tool_call" in result.content
        ) {
          const toolCall = (result.content as any).tool_call;
          if (toolCall.name === "wiki_planet_info") {
            const { query } = toolCall.arguments;
            if (ALLOWED.includes(query)) {
              toolResult = await wikiTool.invoke({ query });
              text = toolResult ?? "";
            } else {
              text = `Sorry, I can only provide information on the following planets: ${ALLOWED.join(
                ", "
              )}.`;
            }
          }
        } else if (typeof result === "string") {
          text = result;
        } else if (typeof result?.content === "string") {
          text = result.content;
        } else if (Array.isArray(result?.content)) {
          text = result.content
            .map((c: any) => (typeof c === "string" ? c : c?.text ?? ""))
            .join(" ");
        } else {
          text = JSON.stringify(result, null, 2);
        }

        const cleanText = text.trim();

        // ➕ Add AI message to history
        await messageHistory.addMessage(new AIMessage(cleanText));

        // 📥 Update local message state
        setMessages(await messageHistory.getMessages());
        setResponse(cleanText);
      } catch (err: any) {
        console.error("LLM Error:", err);
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  return { runQuery, response, error, loading, messages };
}
