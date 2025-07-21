"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLangChain } from "@/hooks/useLangChain";
import { motion } from "framer-motion";
import { SendHorizonal } from "lucide-react";
import clsx from "clsx";

export function PlanetChatbox() {
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const { runQuery, response, error, loading } = useLangChain();

  const containerRef = useRef<HTMLDivElement>(null);

  const send = useCallback(async () => {
    const query = q.trim();
    if (!query) return;
    setMsgs((prev) => [...prev, { role: "user", text: query }]);
    setQ("");
    await runQuery(query);
  }, [q, runQuery]);

  useEffect(() => {
    if (response || error) {
      setMsgs((prev) => [
        ...prev,
        { role: "bot", text: response || error || "Error" },
      ]);
    }
  }, [response, error]);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  return (
    <div className="w-full h-full flex flex-col text-white font-mono bg-black/30 backdrop-blur-md border border-gray-700 rounded-xl overflow-hidden">
      {/* Chat Display Area */}
      <div
        className="h-1/2 w-full overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
        ref={containerRef}
      >
        {msgs.length === 0 ? (
          <div className="text-gray-400 text-center mt-10">Ask me about the planets...</div>
        ) : (
          msgs.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={clsx(
                "px-4 py-2 rounded-lg max-w-[85%]",
                m.role === "user"
                  ? "bg-blue-900 ml-auto text-blue-200"
                  : "bg-gray-800 mr-auto text-green-300"
              )}
            >
              {m.text}
            </motion.div>
          ))
        )}
        {loading && <div className="text-center text-gray-500 text-sm">Thinking...</div>}
      </div>

      {/* Input Section */}
      <div className="h-1/2 w-full border-t border-gray-600 px-4 py-3 flex flex-col justify-end">
        <div className="flex items-center gap-2 bg-black/60 border border-gray-600 rounded-xl px-4 py-3 focus-within:ring-2 ring-blue-500 transition-all">
          <input
            className="bg-transparent outline-none text-white flex-1 placeholder-gray-500"
            placeholder="Type your question here..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !q.trim()}
            className={clsx(
              "transition-all text-white hover:text-green-400",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            <SendHorizonal className="w-5 h-5" />
          </button>
        </div>
        {error && <div className="text-red-400 text-xs mt-2">{error}</div>}
      </div>
    </div>
  );
}
