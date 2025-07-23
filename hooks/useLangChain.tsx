import { useState, useCallback, useMemo, useRef } from "react";
import { ChatOllama } from "@langchain/ollama";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
} from "@langchain/core/prompts";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import {
  RunnablePassthrough,
  RunnableSequence,
  RunnableWithMessageHistory,
} from "@langchain/core/runnables";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";

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

type ChainInput = {
  chat_history: BaseMessage[];
  question: string;
};

function isQuestion(text: string): boolean {
  const trimmed = text.trim().toLowerCase();

  // Basic check: ends with a "?"
  if (trimmed.endsWith("?")) return true;

  // Check for common question words
  const questionWords = [
    "who",
    "what",
    "when",
    "where",
    "why",
    "how",
    "is",
    "are",
    "do",
    "does",
    "can",
    "could",
    "would",
    "should",
  ];
  return questionWords.some((word) => trimmed.startsWith(word + " "));
}

export function useLangChain(sessionId: string = "default") {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<HumanMessage | AIMessage>>([]);

  // Persist message history across calls
  const messageHistoriesRef = useRef<
    Record<string, InMemoryChatMessageHistory>
  >({});

  // LLM instance (memoized)
  const llm = useMemo(() => {
    return new ChatOllama({
      model: "smollm2:360m",
      baseUrl: "http://localhost:11434",
      temperature: 0,
    });
  }, []);

  const classifyIntentPrompt = PromptTemplate.fromTemplate(`
    Classify the following user input into one of the following categories:
    QUESTION, GREETING, THANKS, CHATTER, UNKNOWN

    Respond ONLY with the category name. Do not include explanations or examples.

    User Input: "{input}"
    Category:
    `);

  const classifyIntentChain = classifyIntentPrompt
    .pipe(llm)
    .pipe(new StringOutputParser());

  const contextualizeQChain = useMemo(() => {
    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(`
        You are a question rewriter that receives a chat history and the latest user message. 
        Your job is to rewrite the latest message into a clear, standalone question, 
        in plain English, so that it can be understood without prior context.

        Rules:
        - ONLY return the rewritten question.
        - Do NOT include any commentary, explanations, greetings, or Markdown.
        - Do NOT include phrases like "Instruction", "Ahoy", or "Your task".
        - Respond with JUST the question as a single line of text.`),
      new MessagesPlaceholder("chat_history"),
      HumanMessagePromptTemplate.fromTemplate("{question}"),
    ]);
    return prompt.pipe(llm).pipe(new StringOutputParser());
  }, [llm]);

  const prompt = useMemo(() => {
    return ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(
        `You are a interstellar pirate called "The Wastard" who serves as an helpful assistant.
        ONLY questions about our solar system and its known celestial bodies: ${ALLOWED.join(", ")}.
        STRICT RULES:
        - If a question is NOT about the solar system or those entities, REFUSE to answer. Say: "Arr! That be beyond me starmaps, matey!"
        - Never answer questions about people, history, music, or Earthly matters unless they relate directly to the solar system.
        - Always speak like a space-farin pirate in five sentences or less.
        - NEVER break character or provide unrelated facts.

        IGNORE THE CONTEXT IF THE QUESTION VIOLATES ABOVE STRICT RULES.
        CONTEXT: 
        {context}`
      ),
      HumanMessagePromptTemplate.fromTemplate("{question}"),
    ]);
  }, []);

  const ragChain = useMemo(() => {
    return RunnableSequence.from<ChainInput>([
      RunnablePassthrough.assign({
        context: async (input: ChainInput) => {
          const filteredInput: ChainInput = {
            ...input,
            chat_history: input.chat_history.slice(-10),
          };
          if (filteredInput.chat_history.length > 0) {
            const intent = await classifyIntentChain.invoke({
              input: filteredInput.question,
            });

            if (["QUESTION", "GREETING", "THANKS", "CHATTER", "UNKNOWN"].includes(intent.trim().toUpperCase())) {
              const context = await contextualizeQChain.invoke({
                question: filteredInput.question,
                chat_history: filteredInput.chat_history,
              });
              return context;
            }
          }
          return ""; // fallback context for greetings, thanks, etc.
        },
      }),
      prompt,
      llm,
    ]);
  }, [contextualizeQChain, prompt, llm]);

  const withMessageHistory = useMemo(() => {
    return new RunnableWithMessageHistory({
      runnable: ragChain,
      getMessageHistory: async (sessionId: string) => {
        const histories = messageHistoriesRef.current;
        if (!histories[sessionId]) {
          histories[sessionId] = new InMemoryChatMessageHistory();
        }
        return histories[sessionId];
      },
      inputMessagesKey: "question",
      historyMessagesKey: "chat_history",
    });
  }, [ragChain]);

  const runQuery = useCallback(
    async (userInput: string) => {
      setLoading(true);
      setError(null);
      setResponse(null);

      try {
        const result = await withMessageHistory.invoke(
          {
            question: userInput,
            chat_history: messages,
          },
          {
            configurable: { sessionId },
          }
        );

        const aiMessage = new AIMessage(result.content);
        const humanMessage = new HumanMessage(userInput);

        setResponse(result.content);
        setMessages((prev) => [...prev, humanMessage, aiMessage]);
      } catch (err: any) {
        console.error("LangChain Error:", err);
        setError(err.message || "Error running model");
      } finally {
        setLoading(false);
      }
    },
    [withMessageHistory, sessionId, messages]
  );

  return { runQuery, response, error, loading, messages };
}
