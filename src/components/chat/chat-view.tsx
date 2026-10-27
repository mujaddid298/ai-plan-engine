"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatMessageItem, MessageItemProps } from "./chat-message-item";
import { ModelPicker } from "@/components/settings/model-picker";
import type { ModelInfo } from "@/lib/ai/models";
import {
  ArrowUp,
  Loader2,
  Code2,
  Terminal,
  Cpu,
  Shield,
  AlertCircle,
  Command,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import SkillsMenu from "@/components/SkillsMenu";
import { Skill } from "@/lib/skills";
import { TEMPLATES, PromptTemplate } from "@/lib/promptTemplates";

interface ChatViewProps {
  initialConversationId?: string;
}

export function ChatView({ initialConversationId }: ChatViewProps) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId
  );
  const [messages, setMessages] = useState<MessageItemProps[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Model selection state
  const [currentModel, setCurrentModel] = useState<string>("");
  const [defaultModel, setDefaultModel] = useState<string>("");
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextH = Math.min(el.scrollHeight, 360);
    el.style.height = `${nextH}px`;
  };

  // Generalized input filler: sets input, focuses, sets cursor at end, scrolls, does NOT submit
  const fillInput = (next: string) => {
    setInput(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.length, next.length);
      resizeTextarea();
      el.scrollTop = el.scrollHeight;
    });
  };

  const insertSkill = (s: Skill) => {
    fillInput(s.build(input)); // existing typed text becomes the project context
  };

  const insertTemplate = (t: PromptTemplate) => {
    fillInput(t.build(input));
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // Load gateway models from server
  const loadModels = async (force = false) => {
    try {
      setLoadingModels(true);
      setModelsError(null);
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: force }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memuat model");
      }
      setModels(data.models || []);
    } catch (err: any) {
      setModelsError(err.message || "Gagal menghubungi endpoint model");
    } finally {
      setLoadingModels(false);
    }
  };

  // Load global default model settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          const savedModel = data.model || data.settings?.model;
          if (savedModel) {
            setDefaultModel(savedModel);
            setCurrentModel((prev) => (prev ? prev : savedModel));
          }
        }
      } catch (err) {
        console.error("Gagal memuat pengaturan model:", err);
      }
    };

    loadSettings();
    loadModels();
  }, []);

  // Load conversation details when ID changes
  useEffect(() => {
    setConversationId(initialConversationId);
    if (!initialConversationId) {
      setMessages([]);
      setIsCustomModel(false);
      if (defaultModel) setCurrentModel(defaultModel);
      return;
    }

    const loadConversation = async () => {
      try {
        const res = await fetch(`/api/conversations/${initialConversationId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
          if (data.conversation?.model) {
            setCurrentModel(data.conversation.model);
            setIsCustomModel(true);
          } else {
            setIsCustomModel(false);
            if (defaultModel) setCurrentModel(defaultModel);
          }
        } else {
          setErrorMessage("Percakapan tidak ditemukan.");
        }
      } catch (err) {
        console.error("Gagal memuat percakapan:", err);
      }
    };

    loadConversation();
  }, [initialConversationId, defaultModel]);

  const handleModelChange = async (newModel: string) => {
    const selected = newModel.trim();
    setCurrentModel(selected);
    setIsCustomModel(!!selected);
    setIsModelPickerOpen(false);

    // 1. If in an active conversation, update conversation model
    if (conversationId) {
      try {
        await fetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: selected || null }),
        });
      } catch (err) {
        console.error("Gagal menyimpan model percakapan:", err);
      }
    }

    // 2. Always persist model globally so it stays synchronized everywhere
    if (selected) {
      setDefaultModel(selected);
      try {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: selected }),
        });
      } catch (err) {
        console.error("Gagal menyimpan model default global:", err);
      }
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || loading) return;

    setInput("");
    setErrorMessage(null);
    setLoading(true);
    setStreamingContent("");

    const userMsg: MessageItemProps = {
      role: "user",
      content: textToSend,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: textToSend,
          model: currentModel || undefined,
        }),
      });

      const responseConvId = res.headers.get("X-Conversation-Id");
      if (responseConvId && responseConvId !== conversationId) {
        setConversationId(responseConvId);
        router.replace(`/c/${responseConvId}`);
      }

      const modelUsedHeader = res.headers.get("X-Model-Used");
      const modelUsed = modelUsedHeader
        ? decodeURIComponent(modelUsedHeader)
        : currentModel || defaultModel;

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP Error ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Gagal membaca streaming respons");

      const decoder = new TextDecoder();
      let fullAssistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullAssistantText += chunk;
        setStreamingContent(fullAssistantText);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: fullAssistantText,
          model: modelUsed,
          createdAt: new Date().toISOString(),
        },
      ]);
      setStreamingContent("");
    } catch (err: any) {
      console.error("Chat error:", err);
      setErrorMessage(err.message || "Terjadi kesalahan saat menghubungi model AI.");
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const samplePrompts = [
    {
      icon: Code2,
      label: "Refactor Kode",
      prompt: "Bantu saya merefaktor kode TypeScript ini agar lebih modular dan type-safe: ",
    },
    {
      icon: Terminal,
      label: "Debug Masalah",
      prompt: "Saya menemukan error ini pada aplikasi Next.js saya: ",
    },
    {
      icon: Cpu,
      label: "Desain Arsitektur",
      prompt: "Jelaskan rancangan arsitektur microservices vs modular monolith untuk asisten AI.",
    },
    {
      icon: Shield,
      label: "Audit Keamanan",
      prompt: "Lakukan audit keamanan pada middleware otentikasi dan API route ini: ",
    },
  ];

  const activeModelDisplay = currentModel || defaultModel || "Pilih Model";

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#000000] text-[#f5f5f7] overflow-hidden relative">
      {/* Top Glass Header */}
      <div className="h-12 border-b border-[#333336]/60 px-6 flex items-center justify-between bg-[#000000]/80 backdrop-blur-xl z-10 pl-14 md:pl-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#30d158]" />
          <span className="text-xs font-medium tracking-tight text-[#f5f5f7]">
            Engine Aktif
          </span>
        </div>
        <div className="text-xs text-[#86868b] font-mono flex items-center gap-1.5">
          <Command className="w-3.5 h-3.5 text-[#2997ff]" />
          <span>Unified Brain (Web & Telegram)</span>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {messages.length === 0 && !loading && (
          <div className="h-full max-w-2xl mx-auto px-4 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-[#1d1d1f] flex items-center justify-center text-[#2997ff] shadow-appleCard border border-[#333336]">
              <Command className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-[#f5f5f7]">
                ngopai
              </h2>
              <p className="text-[15px] text-[#86868b] max-w-md leading-relaxed tracking-tight">
                Asisten AI pribadi satu pengguna. Terhubung langsung ke API model pilihan Anda melalui satu database SQLite.
              </p>
            </div>

            {/* Apple Pill Suggestions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2">
              {samplePrompts.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(s.prompt)}
                    className="p-3.5 rounded-appleMd bg-[#1d1d1f] hover:bg-[#272729] text-left transition-colors flex flex-col gap-1 cursor-pointer group shadow-appleCard"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#f5f5f7] group-hover:text-[#2997ff] transition-colors">
                      <Icon className="w-3.5 h-3.5 text-[#2997ff]" />
                      <span>{s.label}</span>
                    </div>
                    <span className="text-xs text-[#86868b] line-clamp-1">
                      {s.prompt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Existing Messages */}
        <div className="pb-4">
          {messages.map((msg, index) => (
            <ChatMessageItem key={index} {...msg} />
          ))}

          {/* Streaming Assistant Response */}
          {loading && streamingContent && (
            <ChatMessageItem
              role="assistant"
              content={streamingContent}
              model={activeModelDisplay}
              isStreaming={true}
            />
          )}

          {/* Loading Indicator */}
          {loading && !streamingContent && (
            <div className="py-6 px-6 max-w-4xl mx-auto flex items-center gap-3 text-[#86868b] text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-[#2997ff]" />
              <span>Menghubungi model AI ({activeModelDisplay})...</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="max-w-4xl mx-auto my-4 p-4 rounded-appleMd bg-[#1d1d1f] border-l-4 border-[#ff453a] text-[#f5f5f7] text-sm flex items-start justify-between gap-3 shadow-appleCard">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#ff453a] mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-[#ff453a]">
                    {errorMessage.includes("MODEL_INVALID")
                      ? "Model tidak tersedia di gateway"
                      : "Gagal memproses pesan"}
                  </p>
                  <p className="text-xs text-[#86868b] leading-relaxed font-mono">
                    {errorMessage.replace("MODEL_INVALID: ", "")}
                  </p>
                </div>
              </div>
              {(errorMessage.includes("MODEL_INVALID") ||
                errorMessage.includes("Belum ada model dipilih")) && (
                <button
                  onClick={() => {
                    setIsModelPickerOpen(true);
                    if (models.length === 0) loadModels();
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-[#2997ff] hover:opacity-90 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pilih model lain</span>
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-[#000000]/80 backdrop-blur-xl border-t border-[#333336]/60">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Active Model Selector Chip & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !isModelPickerOpen;
                    setIsModelPickerOpen(nextState);
                    if (nextState && models.length === 0) {
                      loadModels();
                    }
                  }}
                  className="group flex items-center gap-2 px-3 py-1 rounded-full bg-[#1d1d1f] hover:bg-[#272729] border border-[#333336] text-xs font-mono text-gray-300 transition shadow-sm cursor-pointer"
                  title="Klik untuk memilih model untuk percakapan ini"
                >
                  <span className="w-2 h-2 rounded-full bg-[#30d158]" />
                  <span className="font-medium text-white max-w-[200px] sm:max-w-xs truncate">
                    {activeModelDisplay}
                  </span>
                  {isCustomModel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2997ff]/20 text-[#2997ff] font-sans">
                      percakapan ini
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-white transition" />
                </button>

                {/* Popover Model Picker */}
                {isModelPickerOpen && (
                  <div className="absolute left-0 bottom-full mb-2 w-80 sm:w-96 p-3 rounded-2xl bg-[#161618] border border-[#333336] shadow-2xl z-50 space-y-2 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between pb-1 border-b border-[#272729]">
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#2997ff]" />
                        <span>Model Percakapan Ini</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsModelPickerOpen(false)}
                        className="text-gray-400 hover:text-white text-xs px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <ModelPicker
                      models={models}
                      value={currentModel || defaultModel || ""}
                      loading={loadingModels}
                      error={modelsError}
                      onChange={handleModelChange}
                      onReload={() => loadModels(true)}
                    />
                    <div className="text-[11px] text-gray-400 flex items-center justify-between pt-1 border-t border-[#272729]">
                      <span>
                        Global default:{" "}
                        <code className="text-gray-300">
                          {defaultModel || "Belum disetel"}
                        </code>
                      </span>
                      {isCustomModel && (
                        <button
                          type="button"
                          onClick={() => handleModelChange("")}
                          className="text-[#2997ff] hover:underline cursor-pointer"
                        >
                          Reset ke default
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Grill Me Chip */}
              <button
                type="button"
                onClick={() => insertTemplate(TEMPLATES[0])}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1d1d1f] hover:bg-[#272729] border border-[#333336] text-xs font-medium text-gray-200 hover:text-white transition shadow-sm cursor-pointer"
                title="Wawancarai ide satu per satu secara mendalam"
              >
                <span>🔥 Grill Me</span>
              </button>

              {/* Skills Menu Chip */}
              <SkillsMenu onPick={insertSkill} />
            </div>

            <div className="text-[11px] text-[#86868b] font-mono hidden sm:flex items-center gap-1.5">
              <Command className="w-3 h-3 text-[#2997ff]" />
              <span>Enter kirim • Shift+Enter baris baru</span>
            </div>
          </div>

          {/* Textarea Input Card */}
          <div className="relative rounded-appleMd bg-[#1d1d1f] focus-within:ring-2 focus-within:ring-[#2997ff] transition-all shadow-appleCard">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                resizeTextarea();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan kode atau ketik ide software... (Enter untuk kirim)"
              className="w-full bg-transparent px-4 py-3.5 pr-14 text-[15px] text-[#f5f5f7] placeholder-[#86868b] resize-none outline-none max-h-[360px] scrollbar-thin tracking-tight"
              style={{
                height: "auto",
                minHeight: "50px",
              }}
            />

            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="absolute right-2.5 bottom-2.5 p-2 rounded-full bg-[#2997ff] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-opacity cursor-pointer shadow-sm active:scale-95"
              title="Kirim pesan"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#86868b] px-2 pt-1 sm:hidden">
            <span>Tekan Enter untuk kirim • Shift+Enter baris baru</span>
            <span>Apple Style</span>
          </div>
        </div>
      </div>
    </div>
  );
}
