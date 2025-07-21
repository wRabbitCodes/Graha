import { useState } from "react";
import { useLangChain } from "@/hooks/useLangChain";

export function PlanetChatbox() {
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<{ role: string; text: string }[]>([]);
  const { runQuery, response, loading, error } = useLangChain();

  const send = async () => {
    if (!q.trim()) return;
    setMsgs((prev) => [...prev, { role: "user", text: q }]);
    await runQuery(q);
    setMsgs((prev) => [
      ...prev,
      { role: "bot", text: response || error || "" },
    ]);
    setQ("");
  };

  return (
    <div>
      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ color: m.role === "user" ? "blue" : "green" }}>
            <strong>{m.role}:</strong> {m.text}
          </div>
        ))}
        {loading && <div>Loading...</div>}
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
      />
      <button onClick={send} disabled={loading}>Ask</button>
    </div>
  );
}
