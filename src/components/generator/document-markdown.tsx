"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidViewer } from "./mermaid-viewer";
import { CodeBlock } from "@/components/chat/code-block";

interface DocumentMarkdownProps {
  content: string;
  className?: string;
}

export function DocumentMarkdown({ content, className = "" }: DocumentMarkdownProps) {
  return (
    <div className={`prose prose-invert max-w-none text-[#f5f5f7] leading-relaxed text-sm ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const codeString = String(children).replace(/\n$/, "");

            if (!inline && language === "mermaid") {
              return <MermaidViewer chart={codeString} />;
            }

            if (!inline && language) {
              return <CodeBlock language={language} value={codeString} />;
            }

            if (!inline) {
              return (
                <pre className="p-3 my-3 rounded-xl bg-[#161618] border border-[#333336] overflow-x-auto text-xs font-mono text-gray-300">
                  <code>{children}</code>
                </pre>
              );
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-[#272729] text-[#2997ff] text-xs font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-white tracking-tight mt-6 mb-4 pb-2 border-b border-[#333336]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-white tracking-tight mt-6 mb-3 flex items-center">
              <span className="w-1.5 h-4 bg-[#2997ff] rounded-full mr-2 inline-block"></span>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-medium text-gray-200 mt-4 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-3 text-[#d1d1d6]">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-3 space-y-1 text-[#d1d1d6]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-3 space-y-1 text-[#d1d1d6]">{children}</ol>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-[#333336]">
              <table className="w-full text-left text-xs border-collapse bg-[#161618]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#272729] text-gray-300 border-b border-[#333336]">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 font-semibold text-gray-200">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 border-t border-[#272729] text-gray-300">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#2997ff] pl-3 py-1 my-3 bg-[#2997ff]/5 rounded-r-lg text-gray-300 italic text-xs">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
