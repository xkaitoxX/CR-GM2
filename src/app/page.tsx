import AssistantChat from "@/components/assistant-chat";

export default function AssistantPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-6 sm:px-6">
      <h1 className="sr-only">Assistant</h1>
      <AssistantChat />
    </main>
  );
}
