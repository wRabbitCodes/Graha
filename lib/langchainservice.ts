// lib/langchainService.ts

import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
  AIMessagePromptTemplate,
} from "@langchain/core/prompts";
import {
  RunnableSequence,
  RunnablePassthrough,
  RunnableWithMessageHistory,
} from "@langchain/core/runnables";
import { ChatOllama } from "@langchain/ollama";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";
import { AIMessage, BaseMessage, HumanMessage, MessageContent } from "@langchain/core/messages";

const ALLOWED = [
  "Mercury", "Venus", "Earth", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune"
];

class Sentinel extends Error {
  constructor(public output: string) {
    super("Sentinel triggered");
  }
}

function extractStringContent(content: MessageContent): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((c) =>
      typeof c === "string" ? c : (c as any).text ?? ""
    ).join(" ");
  }
  return String(content ?? "");
}

export class LangChainService {
  private llm = new ChatOllama({
    model: "smollm2:360m",
    baseUrl: "http://localhost:11434",
    temperature: 0,
  });

  private wikipediaTool = new WikipediaQueryRun({
    topKResults: 1,
    maxDocContentLength: 512,
  });

  private classifyIntentChain = PromptTemplate.fromTemplate(`
    Classify the following user input into one of the following categories:
    QUESTION, GREETING, THANKS, CHATTER, UNKNOWN

    Respond ONLY with the category name.

    User Input: "{input}"
    Category:
  `).pipe(this.llm).pipe(new StringOutputParser());

  private contextualizeQChain = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
      You are a question rewriter that receives a chat history and the latest user message. 
      Rewrite the latest message into a clear, standalone question.
      Return ONLY the rewritten question.`),
    new MessagesPlaceholder("chat_history"),
    HumanMessagePromptTemplate.fromTemplate("{question}"),
  ]).pipe(this.llm).pipe(new StringOutputParser());

  private isRelevantQuestionChain = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
      Classify the following user question into one of the following categories:
      YES, NO

      - If the question is about the solar system and planets: ${ALLOWED.join(",")} => YES
      - If not => NO

      Respond ONLY with YES or NO

      User Question: "{question}"
      Category:
    `),
  ]).pipe(this.llm).pipe(new StringOutputParser());

  private refusalChain = PromptTemplate.fromTemplate(`
    You are space-farin pirate called "The Wastard". Assume you have been asked a question not related to our solar system.
    Say that you can't answer it in pirate style. Keep your response short and maximum of three sentence.
    Pirate Response:
  `).pipe(this.llm).pipe(new StringOutputParser());

  private prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
      You are a space-farin pirate called "The Wastard" who is serving as helpful assistant. 
      - Always stay in character. 
      - Your answers should be feisty like said by a pirate.
      - Keep your responses concise. Max five sentences.
    `),
    AIMessagePromptTemplate.fromTemplate("Helpful context:\n{context}"),
    new MessagesPlaceholder("chat_history"),
    HumanMessagePromptTemplate.fromTemplate("{question}"),
  ]);

  public async runQuery({
    question,
    sessionId = "default",
    chat_history = [],
  }: {
    question: string;
    sessionId?: string;
    chat_history?: BaseMessage[];
  }): Promise<{ output: string; messages: BaseMessage[] }> {
    const messageHistory = new InMemoryChatMessageHistory();
    for (const msg of chat_history) {
      await messageHistory.addMessage(msg);
    }

    const ragChain = RunnableSequence.from([
      RunnablePassthrough.assign({
        shouldProceed: async (input) => {
          try {
            const result = await this.isRelevantQuestionChain.invoke({
              question: input.question,
            });
            return result.trim().toUpperCase().includes("YES");
          } catch {
            return false;
          }
        },
      }),

      async (input: any) => {
        if (!input.shouldProceed) {
          throw new Sentinel("Arr! That be beyond me starmaps, matey!");
        }

        let context = "";
        try {
          const wiki = await this.wikipediaTool
            .invoke(input.question)
            .catch(() => "");
          context += wiki ? wiki + "\n\n" : "";
        } catch {}

        const recentHistory = input.chat_history.slice(-10);
        try {
          const intent = await this.classifyIntentChain.invoke({
            input: input.question,
          });

          if (["QUESTION", "CHATTER"].includes(intent.trim().toUpperCase())) {
            const rewritten = await this.contextualizeQChain.invoke({
              question: input.question,
              chat_history: recentHistory,
            });
            context += `\n\nRewritten Query:\n${rewritten}`;
          }
        } catch {}

        return { ...input, context: context || input.question };
      },

      this.prompt,
      this.llm,
    ]);

    const chainWithHistory = new RunnableWithMessageHistory({
      runnable: ragChain,
      getMessageHistory: async () => messageHistory,
      inputMessagesKey: "question",
      historyMessagesKey: "chat_history",
    });

    try {
      const result = await chainWithHistory.invoke(
        {
          question,
          chat_history,
        },
        { configurable: { sessionId } }
      );

      const aiContent = extractStringContent(result.content ?? result);
      const aiMessage = new AIMessage({ content: aiContent });

      return {
        output: aiContent,
        messages: [...chat_history, new HumanMessage(question), aiMessage],
      };
    } catch (err: any) {
      if (err instanceof Sentinel) {
        const pirateResponse = await this.refusalChain.invoke({});
        const content = extractStringContent(pirateResponse);
        const aiMessage = new AIMessage({ content });
        return {
          output: content,
          messages: [...chat_history, new HumanMessage(question), aiMessage],
        };
      }
      throw err;
    }
  }
}
