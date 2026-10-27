'use client';

import { useRef } from 'react';
import SkillsMenu from './SkillsMenu';
import { Skill } from '@/lib/skills';
import { TEMPLATES, PromptTemplate } from '@/lib/promptTemplates';
import { ArrowUp, Loader2 } from 'lucide-react';

interface ChatComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  loading?: boolean;
  placeholder?: string;
}

export default function ChatComposer({
  input,
  setInput,
  onSend,
  loading = false,
  placeholder = 'Tanyakan kode atau perbaikan bug... (Enter untuk kirim)',
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextH = Math.min(el.scrollHeight, 360);
    el.style.height = `${nextH}px`;
  };

  // Fungsi umum: set teks, fokus, kursor di akhir. TIDAK memanggil onSend().
  function fillInput(next: string) {
    setInput(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.length, next.length);
      resize();
      el.scrollTop = el.scrollHeight;
    });
  }

  function insertSkill(s: Skill) {
    fillInput(s.build(input)); // teks yang sudah diketik user menjadi konteks proyek
  }

  function insertTemplate(t: PromptTemplate) {
    fillInput(t.build(input));
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="space-y-2">
      {/* Actions / Skills row */}
      <div className="flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={() => insertTemplate(TEMPLATES[0])}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1d1d1f] hover:bg-[#272729] border border-[#333336] text-xs font-medium text-gray-200 hover:text-white transition shadow-sm cursor-pointer"
          title="Wawancarai ide satu per satu"
        >
          <span>🔥 Grill Me</span>
        </button>

        <SkillsMenu onPick={insertSkill} />
      </div>

      {/* Textarea Input Card */}
      <div className="relative rounded-appleMd bg-[#1d1d1f] focus-within:ring-2 focus-within:ring-[#2997ff] transition-all shadow-appleCard">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            resize();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent px-4 py-3.5 pr-14 text-[15px] text-[#f5f5f7] placeholder-[#86868b] resize-none outline-none max-h-[360px] scrollbar-thin tracking-tight"
          style={{ height: 'auto', minHeight: '50px' }}
        />

        <button
          onClick={onSend}
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
    </div>
  );
}
