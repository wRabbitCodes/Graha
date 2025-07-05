"use client";
import * as Dialog from "@radix-ui/react-dialog";

export default function Controls() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="p-2 bg-blue-600 text-white rounded">Open Dialog</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-20 left-20 bg-black p-6 rounded shadow-lg">
          <Dialog.Title className="mb-4 font-bold">Hello!</Dialog.Title>
          <Dialog.Close asChild>
            <button className="px-4 py-2 bg-red-500 text-white rounded">Close</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
