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

type ChainInput = {
  chat_history: BaseMessage[];
  question: string;
};
class Sentinel extends Error {
  constructor(public output: string) {
    super("Sentinel triggered");
  }
}
export function useLangChain(sessionId: string = "default") {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<HumanMessage | AIMessage>>([]);

  const messageHistoriesRef = useRef<
    Record<string, InMemoryChatMessageHistory>
  >({});

  const llm = useMemo(
    () =>
      new ChatOllama({
        model: "smollm2:360m",
        baseUrl: "http://localhost:11434",
        temperature: 0,
      }),
    []
  );

  const wikipediaTool = useMemo(
    () =>
      new WikipediaQueryRun({
        topKResults: 1,
        maxDocContentLength: 512,
      }),
    []
  );

  const classifyIntentChain = useMemo(
    () =>
      PromptTemplate.fromTemplate(
        `
      Classify the following user input into one of the following categories:
      QUESTION, GREETING, THANKS, CHATTER, UNKNOWN

      Respond ONLY with the category name.

      User Input: "{input}"
      Category:
    `
      )
        .pipe(llm)
        .pipe(new StringOutputParser()),
    [llm]
  );

  const contextualizeQChain = useMemo(
    () =>
      ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(`
        You are a question rewriter that receives a chat history and the latest user message. 
        Rewrite the latest message into a clear, standalone question.
        Return ONLY the rewritten question.`),
        new MessagesPlaceholder("chat_history"),
        HumanMessagePromptTemplate.fromTemplate("{question}"),
      ])
        .pipe(llm)
        .pipe(new StringOutputParser()),
    [llm]
  );

  // ✅ NEW: Classifier that checks if the question is about the Solar System
  const isRelevantQuestionChain = useMemo(() =>
    PromptTemplate.fromTemplate(`
      Determine if the following question is strictly about the Solar System or one of its 8 main planets:
      ${ALLOWED.join(", ")}.

      Instructions:
      - If the question lanet or concept in the solar system, say YES.
      - If not, or if you are unsure, say NO.
      - Only respond with one word: YES or NO.

      Question: "{input}"
      Answer:
      `).pipe(llm).pipe(new StringOutputParser()),
    [llm]);


  const prompt = useMemo(
    () =>
      ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
          `You are a space-farin pirate called "The Wastard", answering questions only about the solar system: ${ALLOWED.join(
            ", "
          )}.
         Strict rules:
         - If the question is not about these, refuse politely in pirate fashion saying you don't know.
         - You can introduce yourself as "Wastard" if the question is about your identity.
         - Stay in pirate tone. Max 5 sentences.`
        ),
        HumanMessagePromptTemplate.fromTemplate("{question}"),
      ]),
    []
  );


  const refusalChain = useMemo(() =>
      PromptTemplate.fromTemplate(`
        You are a pirate called "The Wastard" who only answers questions related to the solar system. 
        Assume you have been asked a question not related to our solar system. Reply politely, in pirate style, that you can't answer it. Stay in character.
        
        Pirate Response:
      `)
      .pipe(llm)
      .pipe(new StringOutputParser()),
    [llm]);

  const ragChain = useMemo(
    () =>
      RunnableSequence.from<ChainInput>([
        // ✅ First: Check if the question is relevant using LLM
        RunnablePassthrough.assign({
          shouldProceed: async (input: ChainInput) => {
            debugger;
            try {
              const result = await isRelevantQuestionChain.invoke({
                input: input.question,
              });
              const cleaned = result.trim().toUpperCase().split(/\s+/)[0]; // just take first word
              console.log("[Classifier Output]:", cleaned);

              return cleaned === "YES";

            } catch (err) {
              console.warn("LLM classification failed:", err);
              return false;
            }
          },
        }),

        // ✅ Then: Gate the rest of the chain with this wrapper
        async (input: ChainInput & { shouldProceed: boolean }) => {
          debugger;
          if (!input.shouldProceed) {
            throw new Sentinel("Arr! That be beyond me starmaps, matey!");
          }

          const wikiContext = await wikipediaTool
            .invoke(input.question)
            .catch(() => "");

          const filteredInput: ChainInput = {
            ...input,
            chat_history: input.chat_history.slice(-10),
          };

          let context = wikiContext;

          if (filteredInput.chat_history.length > 0) {
            try {
              const intent = await classifyIntentChain.invoke({
                input: filteredInput.question,
              });

              const intentCategory = intent.trim().toUpperCase();
              const validIntents = ["QUESTION", "GREETING", "THANKS", "CHATTER", "UNKNOWN"];

              if (validIntents.includes(intentCategory)) {
                const rewritten = await contextualizeQChain.invoke({
                  question: filteredInput.question,
                  chat_history: filteredInput.chat_history,
                });

                context ||= rewritten; // only overwrite if wikiContext was empty
              }
            } catch (err) {
              console.warn("Intent classification/contextualization failed", err);
            }
          }

          // fallback if no context from either source
          context ||= input.question;


          return { ...input, context };
        },

        prompt,
        llm,
      ]),
    [isRelevantQuestionChain, contextualizeQChain, prompt, llm, wikipediaTool]
  );

  const withMessageHistory = useMemo(
    () =>
      new RunnableWithMessageHistory({
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
      }),
    [ragChain]
  );
  

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
        { configurable: { sessionId } }
      );

      const aiMessage = new AIMessage(result.content ?? result);
      const humanMessage = new HumanMessage(userInput);

      setResponse(aiMessage.content as string);
      setMessages((prev) => [...prev, humanMessage, aiMessage]);
    } catch (err: any) {
        if (err instanceof Sentinel) {
          // 🧠 Generate pirate refusal response dynamically
          const rejectionResponse = await refusalChain.invoke({});

          const aiMessage = new AIMessage(rejectionResponse ?? err.message);
          const humanMessage = new HumanMessage(userInput);

          setResponse(aiMessage.content.toString());
          setMessages((prev) => [...prev, humanMessage, aiMessage]);

          const history = await messageHistoriesRef.current[sessionId];
          if (history) {
            const msgs = await history.getMessages();
            const trimmed = msgs.slice(0, -2); // drop last 2
            await history.clear();
            for (const msg of trimmed) {
              await history.addMessage(msg);
            }
          }
          return; // ✅ graceful early return
        }

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
