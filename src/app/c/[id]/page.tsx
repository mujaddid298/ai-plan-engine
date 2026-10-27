import { Sidebar } from "@/components/chat/sidebar";
import { ChatView } from "@/components/chat/chat-view";

export default function ConversationPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="flex h-screen w-full bg-zinc-950 font-sans overflow-hidden">
      <Sidebar currentId={params.id} />
      <ChatView initialConversationId={params.id} />
    </div>
  );
}
