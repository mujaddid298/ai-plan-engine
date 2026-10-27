"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  HelpCircle,
  Cpu,
  ChevronDown,
  Flame,
  ArrowLeft,
} from "lucide-react";
import { StageStepper, StageInfo, StageState } from "@/components/generator/stage-stepper";
import { ModelPicker } from "@/components/settings/model-picker";
import { GrillMeInterview, UserAnswer } from "@/components/generator/grill-me-interview";
import type { GrillMeQuestion } from "@/app/api/generate/grill-me/route";
import type { ModelInfo } from "@/lib/ai/models";

const TEMPLATE_IDEAS = [
  {
    title: "Aplikasi Booking Futsal",
    desc: "Aplikasi booking lapangan futsal untuk pemilik lapangan dan pemain di Indonesia dengan DP dan jadwal otomatis.",
  },
  {
    title: "Marketplace Barang Preloved",
    desc: "Platform jual beli pakaian bekas terverifikasi dengan sistem escrow pembayaran dan integrasi kurir lokal.",
  },
  {
    title: "SaaS Manajemen Inventaris Gudang",
    desc: "Sistem multi-gudang berbasis barcode dengan peringatan stok kritis dan sinkronisasi ke Shopee/Tokopedia.",
  },
  {
    title: "API Gateway & Billing",
    desc: "API gateway publik dengan autentikasi API key, rate limiting bertingkat (free/pro), dan invoice bulanan otomatis.",
  },
];

const INITIAL_STAGES: StageInfo[] = [
  {
    key: "intake",
    name: "Product Brief",
    shortDesc: "Ekstraksi asumsi, batasan, & persona",
    status: "pending",
  },
  {
    key: "prd",
    name: "PRD",
    shortDesc: "User story, kebutuhan FR/NFR, MVP",
    status: "pending",
  },
  {
    key: "blueprint",
    name: "Blueprint",
    shortDesc: "Arsitektur, diagram Mermaid, & ADR",
    status: "pending",
  },
  {
    key: "mvc",
    name: "Desain MVC",
    shortDesc: "ERD, endpoint, model, & folder",
    status: "pending",
  },
  {
    key: "review",
    name: "Review & Audit",
    shortDesc: "Audit konsistensi & skor 0-100",
    status: "pending",
  },
];

export default function BuatProyekPage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [language, setLanguage] = useState("Indonesia");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [stages, setStages] = useState<StageInfo[]>(INITIAL_STAGES);
  const [currentStageKey, setCurrentStageKey] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Workflow State: 'input' | 'interview' | 'generating'
  const [workflowState, setWorkflowState] = useState<"input" | "interview" | "generating">("input");
  const [isPreparingInterview, setIsPreparingInterview] = useState(false);
  const [grillMeQuestions, setGrillMeQuestions] = useState<GrillMeQuestion[]>([]);
  const [interviewAnswers, setInterviewAnswers] = useState<UserAnswer[]>([]);

  // Model Synchronization State
  const [activeModel, setActiveModel] = useState<string>("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState<boolean>(false);

  // Load active model from settings
  const loadSettingsAndModels = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        const savedModel = data.model || data.settings?.model;
        if (savedModel) {
          setActiveModel(savedModel);
        }
      }
    } catch (err) {
      console.error("Gagal memuat pengaturan model:", err);
    }

    try {
      setLoadingModels(true);
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.models)) {
        setModels(data.models);
      }
    } catch (err: any) {
      setModelsError(err.message || "Gagal memuat model");
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    loadSettingsAndModels();
  }, []);

  const handleModelChange = async (newModelId: string) => {
    const selected = newModelId.trim();
    setActiveModel(selected);
    setShowModelPicker(false);

    if (selected) {
      try {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: selected }),
        });
      } catch (err) {
        console.error("Gagal menyimpan model pilihan:", err);
      }
    }
  };

  const updateStageStatus = (
    key: StageInfo["key"],
    status: StageState,
    tokenCount?: number,
    errorMessage?: string
  ) => {
    setStages((prev) =>
      prev.map((s) =>
        s.key === key
          ? {
              ...s,
              status,
              tokenCount: tokenCount !== undefined ? (s.tokenCount || 0) + tokenCount : s.tokenCount,
              errorMessage,
            }
          : s
      )
    );
  };

  // 1. Start Grill Me Interview
  const handleStartGrillMe = async () => {
    if (!idea.trim() || idea.trim().length < 5) {
      setGeneralError("Ide proyek minimal 5 karakter.");
      return;
    }

    setGeneralError(null);
    setIsPreparingInterview(true);

    try {
      const res = await fetch("/api/generate/grill-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea.trim(),
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.questions || data.questions.length === 0) {
        throw new Error(data.error || "Gagal menyiapkan pertanyaan wawancara");
      }

      setGrillMeQuestions(data.questions);
      setWorkflowState("interview");
    } catch (err: any) {
      console.error("Grill Me question preparation error:", err);
      setGeneralError(err.message || "Gagal memuat pertanyaan wawancara. Anda tetap dapat melanjutkan secara langsung.");
    } finally {
      setIsPreparingInterview(false);
    }
  };

  // 2. Start Full Generation Pipeline (with or without interview answers)
  const handleExecutePipeline = async (answers: UserAnswer[] = []) => {
    if (!idea.trim() || idea.trim().length < 5) {
      setGeneralError("Ide proyek minimal 5 karakter.");
      return;
    }

    setGeneralError(null);
    setWorkflowState("generating");
    setStages(INITIAL_STAGES);
    setInterviewAnswers(answers);

    try {
      // 1. Create project in DB with enriched interview responses
      const startRes = await fetch("/api/generate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea.trim(),
          language,
          interviewAnswers: answers,
        }),
      });

      const startData = await startRes.json();
      if (!startRes.ok) {
        throw new Error(startData.error || "Gagal memulai proyek");
      }

      const newProjectId = startData.projectId;
      setProjectId(newProjectId);

      // 2. Sequential execution of stages
      const stageKeys: StageInfo["key"][] = ["intake", "prd", "blueprint", "mvc", "review"];

      for (const stageKey of stageKeys) {
        setCurrentStageKey(stageKey);
        updateStageStatus(stageKey, "running");

        const stageRes = await fetch("/api/generate/stage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: newProjectId,
            stage: stageKey,
          }),
        });

        const stageData = await stageRes.json();

        if (!stageRes.ok) {
          updateStageStatus(stageKey, "failed", 0, stageData.error);
          throw new Error(stageData.error || `Gagal di tahap ${stageKey}`);
        }

        const tokens = (stageData.output?.inputTokens || 0) + (stageData.output?.outputTokens || 0);
        updateStageStatus(stageKey, "done", tokens);
      }

      setCurrentStageKey(undefined);

      // Redirect to project viewer after 1 second
      setTimeout(() => {
        router.push(`/proyek/${newProjectId}`);
      }, 1200);
    } catch (err: any) {
      console.error("Pipeline generation error:", err);
      setGeneralError(err.message || "Terjadi kesalahan saat memproses pipeline.");
    }
  };

  const handleRetryStage = async (stageKey: StageInfo["key"]) => {
    if (!projectId) return;

    setGeneralError(null);
    setWorkflowState("generating");
    setCurrentStageKey(stageKey);
    updateStageStatus(stageKey, "running");

    try {
      const stageRes = await fetch("/api/generate/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          stage: stageKey,
        }),
      });

      const stageData = await stageRes.json();

      if (!stageRes.ok) {
        updateStageStatus(stageKey, "failed", 0, stageData.error);
        throw new Error(stageData.error || `Gagal di tahap ${stageKey}`);
      }

      const tokens = (stageData.output?.inputTokens || 0) + (stageData.output?.outputTokens || 0);
      updateStageStatus(stageKey, "done", tokens);

      setCurrentStageKey(undefined);

      // If review is retried and passes, redirect
      if (stageKey === "review") {
        setTimeout(() => {
          router.push(`/proyek/${projectId}`);
        }, 1000);
      }
    } catch (err: any) {
      console.error("Retry error:", err);
      setGeneralError(err.message || "Gagal mengulang tahap.");
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#272729] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2997ff]/10 border border-[#2997ff]/20 text-[#2997ff] text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Mesin Rekayasa Dokumen Software
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Buat Paket Dokumen Software</h1>
            <p className="text-sm text-gray-400 mt-1 max-w-xl">
              Tulis ide aplikasi, ikuti wawancara penajaman (Grill Me) dengan opsi klik, lalu biarkan AI menghasilkan Product Brief, PRD, Blueprint arsitektur, dan Desain MVC.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/proyek")}
              className="px-4 py-2 rounded-xl bg-[#1d1d1f] hover:bg-[#272729] border border-[#333336] text-xs font-medium text-gray-300 transition cursor-pointer"
            >
              Arsip Proyek
            </button>
          </div>
        </div>

        {/* Synchronized Model Badge */}
        <div className="relative rounded-2xl bg-[#1d1d1f] border border-[#333336] p-4 shadow-appleCard">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2997ff]/10 text-[#2997ff] flex items-center justify-center shrink-0 border border-[#2997ff]/20">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
                  Model AI Generator
                </div>
                <div className="text-sm font-mono font-semibold text-[#f5f5f7] flex items-center gap-2 mt-0.5">
                  <span className="truncate max-w-[240px] sm:max-w-md">
                    {activeModel || "Memuat konfigurasi model..."}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#30d158]/10 text-[#30d158] font-sans border border-[#30d158]/20 shrink-0">
                    Tersinkronisasi
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowModelPicker(!showModelPicker)}
              disabled={workflowState === "generating"}
              className="px-3.5 py-2 rounded-xl bg-[#272729] hover:bg-[#333336] text-xs font-medium text-gray-200 border border-[#333336] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2997ff]" />
              <span>{showModelPicker ? "Tutup Pilihan" : "Ganti Model"}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showModelPicker ? "rotate-180" : ""}`} />
            </button>
          </div>

          {showModelPicker && (
            <div className="mt-4 pt-4 border-t border-[#272729] space-y-2 animate-in fade-in slide-in-from-top-2">
              <div className="text-xs text-gray-400">
                Pilih model AI yang akan mengeksekusi pipeline generasi dokumen:
              </div>
              <ModelPicker
                models={models}
                value={activeModel}
                loading={loadingModels}
                error={modelsError}
                onChange={handleModelChange}
                onReload={() => loadSettingsAndModels()}
              />
            </div>
          )}
        </div>

        {/* Error Alert */}
        {generalError && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{generalError}</span>
            </div>
            {projectId && (
              <button
                onClick={() => router.push(`/proyek/${projectId}`)}
                className="underline text-red-200 hover:text-white ml-3 shrink-0"
              >
                Lihat Dokumen Yang Berhasil
              </button>
            )}
          </div>
        )}

        {/* STEP 1: Main Prompt Input Form */}
        {workflowState === "input" && (
          <div className="p-6 rounded-2xl bg-[#1d1d1f] border border-[#333336] space-y-6 shadow-appleCard">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Ide Aplikasi / Sistem yang Ingin Dibuat
                </label>
                <span className="text-[11px] text-orange-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> Dilengkapi Wawancara Grill Me
                </span>
              </div>

              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Contoh: Aplikasi profil kafe dan booking event untuk reservasi ruangan, pemesanan menu online, serta integrasi WhatsApp dan Google Maps..."
                rows={5}
                className="w-full p-4 rounded-xl bg-[#161618] border border-[#333336] focus:border-[#2997ff] text-sm text-white placeholder-gray-500 outline-none transition resize-y tracking-tight"
              />
              <div className="flex justify-between items-center text-[11px] text-gray-500 mt-1 px-1">
                <span>Tulis ide singkat atau detail. AI akan memandu dengan pertanyaan opsi yang bisa diklik.</span>
                <span>{idea.length} / 3.000 karakter</span>
              </div>
            </div>

            {/* Language and Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#272729]">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Bahasa Output:
                </span>
                <div className="flex items-center bg-[#161618] p-1 rounded-xl border border-[#333336]">
                  <button
                    type="button"
                    onClick={() => setLanguage("Indonesia")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      language === "Indonesia"
                        ? "bg-[#2997ff] text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Bahasa Indonesia
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("English")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      language === "English"
                        ? "bg-[#2997ff] text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Action Buttons: Grill Me vs Direct Generate */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleExecutePipeline([])}
                  disabled={isPreparingInterview || !idea.trim()}
                  className="px-4 py-3 rounded-xl bg-[#272729] hover:bg-[#333336] border border-[#333336] disabled:opacity-40 text-gray-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Lewati wawancara dan langsung buat dokumen dari prompt awal"
                >
                  <span>Langsung Generate</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartGrillMe}
                  disabled={isPreparingInterview || !idea.trim()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-[#2997ff] hover:opacity-90 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition cursor-pointer active:scale-95 flex-1 sm:flex-initial"
                >
                  {isPreparingInterview ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyiapkan Pertanyaan Wawancara...</span>
                    </>
                  ) : (
                    <>
                      <Flame className="w-4 h-4 text-amber-300" />
                      <span>Mulai Grill Me (Rekomendasi)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Interactive Grill Me Interview with Clickable Options */}
        {workflowState === "interview" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWorkflowState("input")}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Edit Ide</span>
              </button>
              <div className="text-xs text-gray-400 font-mono">
                Ide: <span className="text-white italic">"{idea.slice(0, 35)}..."</span>
              </div>
            </div>

            <GrillMeInterview
              questions={grillMeQuestions}
              ideaText={idea}
              onFinish={(answers) => handleExecutePipeline(answers)}
              onSkip={() => handleExecutePipeline([])}
            />
          </div>
        )}

        {/* STEP 3: Sequential Stage Generation Stepper */}
        {workflowState === "generating" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {interviewAnswers.length > 0 && (
              <div className="p-4 rounded-appleCard bg-[#1d1d1f] border border-[#333336] text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-orange-400">
                  <Flame className="w-4 h-4" />
                  <span>Klarifikasi Grill Me Diterapkan ke Pipeline ({interviewAnswers.length} Jawaban):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-300">
                  {interviewAnswers.map((ans, aIdx) => (
                    <div key={aIdx} className="p-2.5 rounded-lg bg-[#161618] border border-[#272729]">
                      <div className="font-semibold text-white text-[11px] truncate">
                        {ans.question}
                      </div>
                      <div className="text-[11px] text-[#2997ff] mt-0.5 truncate">
                        Opsi {ans.selectedOptionKey}: {ans.selectedOptionLabel}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <StageStepper
              stages={stages}
              currentStageKey={currentStageKey}
              onRetryStage={handleRetryStage}
            />
          </div>
        )}

        {/* Quick Inspiration / Preset Ideas (when in input state) */}
        {workflowState === "input" && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              💡 Inspirasi Ide Siap Uji
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEMPLATE_IDEAS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setIdea(item.desc)}
                  className="p-4 text-left rounded-xl bg-[#161618] border border-[#272729] hover:border-[#333336] hover:bg-[#1d1d1f] transition group cursor-pointer"
                >
                  <div className="font-semibold text-xs text-white group-hover:text-[#2997ff] transition mb-1">
                    {item.title}
                  </div>
                  <div className="text-xs text-gray-400 line-clamp-2">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
