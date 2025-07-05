import Controls from "@/components/Controls";

export default function Home() {
  return (
    <>
      <main className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-900 to-black">
        <h1 className="text-white text-4xl font-bold tracking-tight">
          🚀 Hello from Graha Engine + React + Tailwind!
          <div className="relative w-screen h-screen"></div>
        </h1>
      </main>
      <Controls />
    </>
  );
}
