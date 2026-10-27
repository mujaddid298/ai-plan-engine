"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";
import { Sparkles, Terminal } from "lucide-react";

export interface MessageItemProps {
  role: "user" | "assistant" | "system";
  content: string;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  createdAt?: string | Date;
  isStreaming?: boolean;
}

export function ChatMessageItem({
  role,
  content,
  model,
  inputTokens,
  outputTokens,
  isStreaming,
}: MessageItemProps) {
  const isUser = role === "user";

  return (
    <div
      className={`group w-full py-5 px-4 sm:px-6 transition-colors ${
        isUser
          ? "bg-[#000000]"
          : "bg-[#1d1d1f] shadow-appleCard"
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-[#333336] flex items-center justify-center text-[#f5f5f7] text-xs font-semibold shadow-sm">
              Kamu
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#2997ff] flex items-center justify-center text-white shadow-sm">
              <Terminal className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-tight text-[#f5f5f7]">
              {isUser ? "Kamu" : "AI Assistant"}
            </span>

            {!isUser && model && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#272729] text-[#2997ff] font-mono flex items-center gap-1 border border-[#333336]">
                <Sparkles className="w-2.5 h-2.5" />
                {model}
              </span>
            )}

            {!isUser && (inputTokens || outputTokens) && (
              <span className="text-[11px] text-[#86868b] font-mono hidden sm:inline">
                ({inputTokens ?? 0} in / {outputTokens ?? 0} out)
              </span>
            )}
          </div>

          {/* Markdown Content */}
          <div className="text-[15px] sm:text-[16px] leading-relaxed text-[#f5f5f7] break-words tracking-tight">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  const codeString = String(children).replace(/\n$/, "");

                  if (!inline && match) {
                    return (
                      <CodeBlock
                        language={match[1]}
                        value={codeString}
                      />
                    );
                  }

                  if (!inline && codeString.includes("\n")) {
                    return (
                      <CodeBlock
                        language="text"
                        value={codeString}
                      />
                    );
                  }

                  return (
                    <code
                      className="px-1.5 py-0.5 rounded-appleSm bg-[#272729] text-[#2997ff] font-mono text-[13px] border border-[#333336]"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                p({ children }) {
                  return <p className="mb-3.5 last:mb-0 text-[#f5f5f7]">{children}</p>;
                },
                ul({ children }) {
                  return <ul className="list-disc pl-5 mb-3.5 space-y-1.5 text-[#f5f5f7]">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal pl-5 mb-3.5 space-y-1.5 text-[#f5f5f7]">{children}</ol>;
                },
                li({ children }) {
                  return <li className="text-[#f5f5f7]">{children}</li>;
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-2 border-[#2997ff] pl-4 py-1 italic my-3 text-[#86868b] bg-[#272729]/60 rounded-r-appleMd">
                      {children}
                    </blockquote>
                  );
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-4 rounded-appleMd border border-[#333336]">
                      <table className="min-w-full divide-y divide-[#333336] text-left text-xs sm:text-sm">
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th className="bg-[#272729] px-4 py-2.5 font-semibold text-[#f5f5f7]">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="px-4 py-2.5 border-t border-[#333336] text-[#f5f5f7]">
                      {children}
                    </td>
                  );
                },
                a({ href, children }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2997ff] hover:underline font-medium"
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>

            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-[#2997ff] animate-pulse rounded-sm align-middle" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
