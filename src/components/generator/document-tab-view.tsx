"use client";

import React, { useState } from "react";
import { DocumentMarkdown } from "./document-markdown";
import {
  FileText,
  Layers,
  Cpu,
  Code2,
  CheckCheck,
  Download,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Info,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";

export type DocType = "brief" | "prd" | "blueprint" | "mvc" | "review";

interface DocumentItem {
  id: string;
  type: DocType;
  content: string;
  version: number;
}

interface DocumentTabViewProps {
  projectId: string;
  projectTitle: string;
  documents: DocumentItem[];
  score?: number | null;
  onRegenerateStage?: (stage: "intake" | "prd" | "blueprint" | "mvc" | "review") => void;
  isRegenerating?: boolean;
}

export function DocumentTabView({
  projectId,
  projectTitle,
  documents,
  score,
  onRegenerateStage,
  isRegenerating = false,
}: DocumentTabViewProps) {
  const [activeTab, setActiveTab] = useState<DocType>("prd");
  const [copied, setCopied] = useState<boolean>(false);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  const docMap = new Map<DocType, string>();
  for (const doc of documents) {
    docMap.set(doc.type, doc.content);
  }

  const currentContent = docMap.get(activeTab) || "";

  const handleCopy = async () => {
    if (!currentContent) return;
    await navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { type: DocType; label: string; icon: any; stageKey: "intake" | "prd" | "blueprint" | "mvc" | "review" }[] = [
    { type: "brief", label: "Product Brief", icon: FileText, stageKey: "intake" },
    { type: "prd", label: "PRD", icon: Layers, stageKey: "prd" },
    { type: "blueprint", label: "Blueprint", icon: Cpu, stageKey: "blueprint" },
    { type: "mvc", label: "Desain MVC", icon: Code2, stageKey: "mvc" },
    { type: "review", label: "Laporan Review", icon: CheckCheck, stageKey: "review" },
  ];

  const currentTabInfo = tabs.find((t) => t.type === activeTab)!;

  // Helper for Review rendering
  let reviewData: any = null;
  if (activeTab === "review" && currentContent) {
    try {
      reviewData = JSON.parse(currentContent);
    } catch {
      // fallback to markdown/raw
    }
  }

  // Helper for Brief rendering
  let briefData: any = null;
  if (activeTab === "brief" && currentContent) {
    try {
      briefData = JSON.parse(currentContent);
    } catch {
      // fallback
    }
  }

  return (
    <div className="rounded-2xl border border-[#333336] bg-[#1d1d1f] overflow-hidden flex flex-col">
      {/* Top action bar */}
      <div className="p-4 border-b border-[#333336] flex flex-wrap items-center justify-between gap-3 bg-[#161618]">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const hasDoc = docMap.has(tab.type);
            const isActive = activeTab === tab.type;

            return (
              <button
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#2997ff] text-white shadow-sm"
                    : hasDoc
                    ? "bg-[#272729] text-gray-300 hover:text-white hover:bg-[#333336]"
                    : "bg-[#272729]/40 text-gray-500 cursor-not-allowed"
                }`}
                disabled={!hasDoc}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.type === "review" && score !== undefined && score !== null && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      score >= 85
                        ? "bg-[#30d158]/20 text-[#30d158]"
                        : score >= 70
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {score}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onRegenerateStage && (
            <button
              onClick={() => onRegenerateStage(currentTabInfo.stageKey)}
              disabled={isRegenerating}
              className="px-2.5 py-1.5 rounded-xl border border-[#333336] bg-[#272729] hover:bg-[#333336] text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
              title="Regenerasi tahap ini saja"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Regen Tahap Ini</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 rounded-xl border border-[#333336] bg-[#272729] hover:bg-[#333336] text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
            title="Salin isi dokumen aktif"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#30d158]" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? "Tersalin!" : "Salin"}</span>
          </button>

          <a
            href={`/api/projects/${projectId}/export?format=md`}
            download
            className="px-2.5 py-1.5 rounded-xl border border-[#333336] bg-[#272729] hover:bg-[#333336] text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
            title="Unduh satu file Markdown gabungan"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">.md</span>
          </a>

          <a
            href={`/api/projects/${projectId}/export?format=zip`}
            download
            className="px-3 py-1.5 rounded-xl bg-[#30d158] hover:bg-[#28b84c] text-black text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="Unduh paket lengkap ZIP (PRD, Blueprint, MVC, Review, PLAN.md)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor ZIP</span>
          </a>
        </div>
      </div>

      {/* Document Content View */}
      <div className="p-6 overflow-y-auto max-h-[75vh]">
        {!currentContent ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            Dokumen untuk tahap ini belum tersedia atau masih diproses.
          </div>
        ) : activeTab === "brief" && briefData ? (
          <div>
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-[#333336]">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">{briefData.namaProduk}</h2>
                <p className="text-sm text-gray-400 mt-1">{briefData.ringkasan}</p>
              </div>
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-xs text-[#2997ff] hover:underline"
              >
                {showRawJson ? "Tampilan Rapi" : "Lihat JSON"}
              </button>
            </div>

            {showRawJson ? (
              <pre className="p-4 rounded-xl bg-[#161618] border border-[#333336] text-xs font-mono text-gray-300 overflow-x-auto">
                {currentContent}
              </pre>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#161618] border border-[#333336]">
                    <div className="text-xs font-semibold text-[#2997ff] uppercase tracking-wider mb-2">
                      Masalah Utama
                    </div>
                    <p className="text-sm text-gray-300">{briefData.masalah}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#161618] border border-[#333336]">
                    <div className="text-xs font-semibold text-[#30d158] uppercase tracking-wider mb-2">
                      Pengguna Utama
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-gray-300">
                      {briefData.penggunaUtama?.map((u: string, idx: number) => (
                        <li key={idx}>{u}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Asumsi */}
                <div className="p-4 rounded-xl bg-[#161618] border border-[#333336]">
                  <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-3">
                    Asumsi Eksplisit & Risiko ({briefData.asumsi?.length || 0})
                  </div>
                  <div className="space-y-2">
                    {briefData.asumsi?.map((a: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-[#272729] text-xs border border-[#333336]/60">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[#2997ff] font-bold">{a.id}</span>
                          <span className="text-gray-200 font-medium">{a.isi}</span>
                        </div>
                        <div className="text-gray-400 pl-4 border-l-2 border-yellow-500/40 mt-1">
                          Risiko jika salah: <span className="text-yellow-300/90">{a.risikoJikaSalah}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Batasan & Non-Goals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#161618] border border-[#333336]">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Batasan Sistem
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-gray-300">
                      {briefData.batasan?.map((b: string, idx: number) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-[#161618] border border-[#333336]">
                    <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                      Di Luar Cakupan (Non-goals)
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-gray-300">
                      {briefData.diLuarCakupan?.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "review" && reviewData ? (
          <div>
            {/* Review Summary Score Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#161618] to-[#272729] border border-[#333336] mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold font-mono text-xl border ${
                    reviewData.skorKonsistensi >= 85
                      ? "bg-[#30d158]/10 text-[#30d158] border-[#30d158]/30"
                      : reviewData.skorKonsistensi >= 70
                      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                      : "bg-red-500/10 text-red-400 border-red-500/30"
                  }`}
                >
                  <span>{reviewData.skorKonsistensi}</span>
                  <span className="text-[10px] font-normal text-gray-400">/ 100</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Audit Konsistensi Lintas Dokumen</h3>
                  <p className="text-xs text-gray-300 mt-1 max-w-xl">{reviewData.ringkasanReview}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-xs text-[#2997ff] hover:underline"
              >
                {showRawJson ? "Tampilan Rapi" : "Lihat JSON"}
              </button>
            </div>

            {showRawJson ? (
              <pre className="p-4 rounded-xl bg-[#161618] border border-[#333336] text-xs font-mono text-gray-300 overflow-x-auto">
                {currentContent}
              </pre>
            ) : (
              <div className="space-y-6">
                {/* Findings List */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Temuan & Rekomendasi ({reviewData.temuan?.length || 0})
                  </h4>
                  <div className="space-y-3">
                    {reviewData.temuan?.map((t: any, idx: number) => {
                      const isKritis = t.tingkat === "kritis";
                      const isPenting = t.tingkat === "penting";
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border ${
                            isKritis
                              ? "bg-red-500/10 border-red-500/30"
                              : isPenting
                              ? "bg-yellow-500/10 border-yellow-500/30"
                              : "bg-[#161618] border-[#333336]"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-300">{t.id}</span>
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                  isKritis
                                    ? "bg-red-500/20 text-red-300"
                                    : isPenting
                                    ? "bg-yellow-500/20 text-yellow-300"
                                    : "bg-blue-500/20 text-blue-300"
                                }`}
                              >
                                {t.tingkat}
                              </span>
                              <span className="text-xs text-gray-400">
                                Dokumen: <strong className="text-gray-200 uppercase">{t.dokumen}</strong> ({t.bagian})
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-300 mb-2">
                            <strong>Masalah:</strong> {t.masalah}
                          </div>
                          <div className="text-xs text-[#30d158] pl-3 border-l-2 border-[#30d158]/50">
                            <strong>Rekomendasi Perbaikan:</strong> {t.perbaikan}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Remaining Risks */}
                {reviewData.risikoTersisa?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-yellow-400 mb-3">
                      Risiko Tersisa & Rekomendasi
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {reviewData.risikoTersisa.map((r: any, idx: number) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-[#161618] border border-[#333336]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-200">{r.risiko}</span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">
                              {r.tingkat}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{r.saran}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <DocumentMarkdown content={currentContent} />
        )}
      </div>
    </div>
  );
}
