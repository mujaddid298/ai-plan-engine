"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  MessageSquare,
  Plus,
  Trash2,
  Settings,
  BarChart3,
  Send,
  Globe,
  Menu,
  X,
  Command,
  Sparkles,
  FolderGit2,
} from "lucide-react";

export interface ConversationItem {
  id: string;
  title: string | null;
  channel: "web" | "telegram";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function Sidebar({ currentId }: { currentId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Gagal mengambil percakapan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [currentId]);

  const handleNewChat = () => {
    router.push("/");
    setMobileOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (!confirm("Hapus percakapan ini?")) return;

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentId === id) {
          router.push("/");
        }
      }
    } catch (err) {
      console.error("Gagal menghapus percakapan:", err);
    }
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#1d1d1f]/90 backdrop-blur-xl border-r border-[#333336] w-72 text-[#f5f5f7] select-none">
      {/* Brand & New Chat */}
      <div className="p-4 border-b border-[#333336]/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-appleMd bg-[#272729] text-[#2997ff] flex items-center justify-center font-bold">
              <Command className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-[#f5f5f7]">
                ngopai
              </h1>
              <p className="text-[11px] text-[#86868b]">Personal Assistant</p>
            </div>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-appleMd text-[#86868b] hover:text-[#f5f5f7] hover:bg-[#272729]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Apple Pill CTA */}
        <button
          onClick={handleNewChat}
          className="w-full py-2 px-4 rounded-pill bg-[#2997ff] hover:opacity-90 active:scale-98 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Percakapan Baru</span>
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin">
        <div className="px-3 pb-2 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
          Percakapan
        </div>

        {loading ? (
          <div className="p-4 text-center text-xs text-[#86868b]">Memuat...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#86868b]">Belum ada riwayat</div>
        ) : (
          conversations.map((conv) => {
            const isActive = currentId === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => {
                  router.push(`/c/${conv.id}`);
                  setMobileOpen(false);
                }}
                className={`group flex items-center justify-between px-3 py-2 rounded-appleMd text-xs font-medium cursor-pointer transition-colors ${
                  isActive
                    ? "bg-[#272729] text-white shadow-sm"
                    : "hover:bg-[#272729]/50 text-[#86868b] hover:text-[#f5f5f7]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                  {conv.channel === "telegram" ? (
                    <Send className="w-3 h-3 text-[#2997ff] flex-shrink-0" />
                  ) : (
                    <Globe className="w-3 h-3 text-[#86868b] flex-shrink-0" />
                  )}
                  <span className="truncate">
                    {conv.title || "Percakapan Tanpa Judul"}
                  </span>
                </div>

                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#333336] text-[#86868b] hover:text-[#ff453a] transition-all"
                  title="Hapus"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-[#333336]/60 space-y-1 bg-[#1d1d1f]/40 text-xs font-medium">
        <button
          onClick={() => {
            router.push("/");
            setMobileOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-appleMd transition-colors cursor-pointer ${
            pathname === "/" || pathname?.startsWith("/c/")
              ? "bg-[#272729] text-white font-semibold"
              : "text-[#86868b] hover:bg-[#272729]/50 hover:text-[#f5f5f7]"
          }`}
        >
          <MessageSquare className="w-4 h-4 text-[#2997ff]" />
          <span>Chat AI</span>
        </button>

        <button
          onClick={() => {
            router.push("/buat");
            setMobileOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-appleMd transition-colors cursor-pointer ${
            pathname === "/buat"
              ? "bg-[#2997ff] text-white font-semibold shadow-sm"
              : "text-[#2997ff] hover:bg-[#2997ff]/10 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Generator Dokumen</span>
        </button>

        <button
          onClick={() => {
            router.push("/proyek");
            setMobileOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-appleMd transition-colors cursor-pointer ${
            pathname?.startsWith("/proyek")
              ? "bg-[#272729] text-white font-semibold"
              : "text-[#86868b] hover:bg-[#272729]/50 hover:text-[#f5f5f7]"
          }`}
        >
          <FolderGit2 className="w-4 h-4 text-[#86868b]" />
          <span>Arsip Dokumen</span>
        </button>

        <button
          onClick={() => {
            router.push("/pengaturan");
            setMobileOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-appleMd transition-colors cursor-pointer ${
            pathname === "/pengaturan"
              ? "bg-[#272729] text-white font-semibold"
              : "text-[#86868b] hover:bg-[#272729]/50 hover:text-[#f5f5f7]"
          }`}
        >
          <Settings className="w-4 h-4 text-[#86868b]" />
          <span>Pengaturan Model</span>
        </button>

        <button
          onClick={() => {
            router.push("/penggunaan");
            setMobileOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-appleMd transition-colors cursor-pointer ${
            pathname === "/penggunaan"
              ? "bg-[#272729] text-white font-semibold"
              : "text-[#86868b] hover:bg-[#272729]/50 hover:text-[#f5f5f7]"
          }`}
        >
          <BarChart3 className="w-4 h-4 text-[#86868b]" />
          <span>Penggunaan & Biaya</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Trigger */}
      <div className="md:hidden fixed top-3 left-3 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-appleMd bg-[#1d1d1f]/90 border border-[#333336] text-[#f5f5f7] shadow-appleCard backdrop-blur-md"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block h-screen flex-shrink-0">
        {navContent}
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10">{navContent}</div>
        </div>
      )}
    </>
  );
}
