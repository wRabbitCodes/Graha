import { useState, useCallback } from "react";
import { ChatOllama } from "@langchain/ollama"; // ✅ correct package
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { RunnablePassthrough, RunnableSequence, RunnableWithMessageHistory } from "@langchain/core/runnables";
import { BaseMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";

const ALLOWED = [
  "Mercury", "Venus", "Earth", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune",
];

type ChainInput = {
  chat_history: BaseMessage[];
  question: string;
};

export function useLangChain(sessionId: string = "default") {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runQuery = useCallback(async (userInput: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);



    const messageHistories: Record<string, InMemoryChatMessageHistory> = {};
    try {
      const llm = new ChatOllama({
        model: "smollm2:360m",         // or llama3, mistral, etc.
        baseUrl: "http://localhost:11434",
        temperature: 0,
      });

      const contextualizeQSystemPrompt = `Given a chat history and the latest user question
        which might reference context in the chat history, formulate a standalone question
        which can be understood without the chat history. Do NOT answer the question,
        just reformulate it if needed and otherwise return it as is.`;

      const contextualizeQPrompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(contextualizeQSystemPrompt),
        new MessagesPlaceholder("chat_history"),
        HumanMessagePromptTemplate.fromTemplate("{input}"),
      ])
      const filterMessages = (input: ChainInput) => {
        input.chat_history.slice(-10);
        return input;
      };

      const contextualizeQChain = contextualizeQPrompt
        .pipe(llm)
        .pipe(new StringOutputParser())


      const contextualizedQuestion = (input: ChainInput) => {
        if (input.chat_history?.length !== 0) {
          return contextualizeQChain;
        }
        return input.question;
      };

      const prompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
          `You are a interstellar pirate named "The Wastard". Only answer concisely about our solar 
            system and its member entities like: ${ALLOWED.join(", ")}. Politely decline unrelated questions. 
            Always speak like a pirate the best you can. If you don't know the answer, just say you don't know.
            Keep your answers concise and use maximum of five sentences.
            
            {context}`
        ),
        HumanMessagePromptTemplate.fromTemplate("{question}"),
      ]);


      // const chain = RunnableSequence.from<ChainInput>([
      //   RunnablePassthrough.assign({
      //     chat_history: filterMessages,
      //   }),
      //   prompt,
      //   llm,
      // ]);


    const ragChain = RunnableSequence.from<ChainInput>([
      RunnablePassthrough.assign({
        context: (input: ChainInput) => {
          const filteredInput = filterMessages(input);
          if (filteredInput.chat_history.length !==0) {
            return contextualizedQuestion(filteredInput);
          }
          return "";
        },
      }),
      prompt,
      llm,
    ]);

      // const chain = RunnableSequence.from([prompt, llm]);
      // const result: any = await chain.invoke({ input: userInput });
      const withMessageHistory = new RunnableWithMessageHistory({
        runnable: ragChain,
        getMessageHistory: async (sessionId) => {
          if (messageHistories[sessionId] === undefined) {
            messageHistories[sessionId] = new InMemoryChatMessageHistory();
          }
          return messageHistories[sessionId];
        },
        inputMessagesKey: "input",
        historyMessagesKey: "chat_history",
      });

      const config = {
        configurable: {
          sessionId,
        },
      };

      const response = await withMessageHistory.invoke(
        {
          question: userInput,
          chat_history: [],
        },
        config
      );
      // let text = "";
      // if (typeof response === "string") {
      //   text = response;
      // } else if (Array.isArray(response?.content)) {
      //   text = response.content.map((c: any) => (typeof c === "string" ? c : c?.text ?? "")).join(" ");
      // } else if (typeof response?.content === "string") {
      //   text = response.content;
      // } else if (response?.content?.text) {
      //   text = response.content.text;
      // }
      // debugger;
      setResponse(response.content as string);


    } catch (err: any) {
      setError(err.message || "Error running model");
    } finally {
      setLoading(false);
    }
  }, []);

  return { runQuery, response, error, loading };
}
