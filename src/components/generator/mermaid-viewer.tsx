"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidViewerProps {
  chart: string;
  className?: string;
}

export function MermaidViewer({ chart, className = "" }: MermaidViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function renderChart() {
      if (!chart.trim()) return;

      try {
        setLoading(true);
        setError(null);

        // Initialize mermaid with Apple dark theme styling
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            darkMode: true,
            background: "#161618",
            primaryColor: "#2997ff",
            primaryTextColor: "#f5f5f7",
            primaryBorderColor: "#333336",
            lineColor: "#86868b",
            secondaryColor: "#30d158",
            tertiaryColor: "#bf5af2",
            fontFamily: "inherit",
          },
          securityLevel: "loose",
        });

        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, chart.trim());

        if (isMounted) {
          setSvgContent(svg);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn("Mermaid rendering error:", err);
          setError(err.message || "Gagal merender diagram Mermaid");
          setLoading(false);
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className={`my-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-mono overflow-x-auto ${className}`}>
        <div className="font-semibold text-red-400 mb-1">⚠️ Diagram Syntax Issue:</div>
        <div>{error}</div>
        <details className="mt-2 text-gray-400 cursor-pointer">
          <summary className="text-[11px] underline">Lihat Kode Diagram Asli</summary>
          <pre className="mt-2 p-2 rounded bg-black/50 text-[10px] whitespace-pre-wrap">{chart}</pre>
        </details>
      </div>
    );
  }

  return (
    <div className={`my-4 p-4 rounded-xl border border-[#333336] bg-[#161618] overflow-x-auto ${className}`}>
      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400 text-xs">
          <span className="inline-block animate-spin mr-2">⏳</span> Merender diagram...
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      )}
    </div>
  );
}
