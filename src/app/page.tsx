import { Sidebar } from "@/components/chat/sidebar";
import { ChatView } from "@/components/chat/chat-view";

export default function HomePage() {
  return (
    <div className="flex h-screen w-full bg-zinc-950 font-sans overflow-hidden">
      <Sidebar />
      <ChatView />
    </div>
  );
}
