import dynamic from "next/dynamic";
const Engine = dynamic(() => import("@/components/Engine"), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <Engine />
    </div>   
  );
}
