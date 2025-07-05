export default function Controls() {
  return (
    <div className="absolute bottom-4 left-4 p-4 bg-black/70 text-white rounded-lg">
      <button className="mr-2 px-4 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded">
        Select Planet
      </button>
      <button className="px-4 py-1 bg-green-500 hover:bg-green-600 text-white rounded">
        Lock Camera
      </button>
    </div>
  );
}
