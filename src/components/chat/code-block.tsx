"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  language: string;
  value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin kode:", err);
    }
  };

  return (
    <div className="relative my-4 rounded-appleMd overflow-hidden bg-[#1d1d1f] shadow-appleCard group">
      {/* Apple style header with macOS window dots and copy button */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#272729] text-xs text-[#86868b] border-b border-[#333336]/60">
        <div className="flex items-center gap-2">
          {/* macOS traffic light dots */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <span className="font-mono text-[11px] font-medium tracking-wide text-[#f5f5f7]">
            {language || "code"}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded-appleSm bg-[#333336] hover:bg-[#2997ff] text-[#f5f5f7] transition-all text-xs font-medium cursor-pointer active:scale-95"
          title="Salin kode"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span className="text-white">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>

      <pre className="p-4 overflow-x-auto text-[13.5px] font-mono text-[#f5f5f7] leading-relaxed selection:bg-[#2997ff]/30">
        <code>{value}</code>
      </pre>
    </div>
  );
}
