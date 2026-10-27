"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, AlertCircle, Sparkles, Calendar, Layers, ShieldCheck, Cpu } from "lucide-react";
import { DocumentTabView } from "@/components/generator/document-tab-view";

export default function ProyekDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [stageRuns, setStageRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal memuat proyek");
      }

      setProject(data.project);
      setDocuments(data.documents);
      setStageRuns(data.stageRuns || []);
    } catch (err: any) {
      console.error("Error fetching project:", err);
      setError(err.message || "Gagal memuat dokumen proyek");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const handleRegenerateStage = async (stageKey: "intake" | "prd" | "blueprint" | "mvc" | "review") => {
    if (!confirm(`Apakah Anda yakin ingin meregenerasi tahap ${stageKey.toUpperCase()}?`)) {
      return;
    }

    try {
      setIsRegenerating(true);
      const res = await fetch("/api/generate/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          stage: stageKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal meregenerasi tahap");
      }

      // Refresh documents
      await fetchProjectData();
    } catch (err: any) {
      alert(`Error regenerasi: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#f5f5f7] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin text-[#2997ff]" />
          <span>Memuat paket dokumen rekayasa...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#f5f5f7] p-8 max-w-3xl mx-auto">
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Gagal Membuka Proyek</h2>
          <p className="text-xs text-red-300">{error || "Proyek tidak ditemukan"}</p>
          <button
            onClick={() => router.push("/proyek")}
            className="px-4 py-2 rounded-xl bg-[#272729] hover:bg-[#333336] text-white text-xs font-medium"
          >
            Kembali ke Daftar Proyek
          </button>
        </div>
      </div>
    );
  }

  const createdDate = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

  const reviewDoc = documents.find((d) => d.type === "review");
  let computedScore: number | null = null;
  if (reviewDoc?.content) {
    try {
      const parsed = JSON.parse(reviewDoc.content);
      if (typeof parsed.skorKonsistensi === "number") {
        computedScore = parsed.skorKonsistensi;
      }
    } catch {}
  }

  const modelUsed = stageRuns.find((s) => s.model)?.model;

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#272729] pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/proyek")}
              className="p-2 rounded-xl bg-[#1d1d1f] border border-[#333336] text-gray-400 hover:text-white transition cursor-pointer"
              title="Kembali ke Daftar Proyek"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">{project.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {createdDate}
                </span>
                <span>•</span>
                <span className="uppercase text-[11px] font-mono text-gray-500">{project.language}</span>
                {modelUsed && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-[#2997ff] bg-[#2997ff]/10 px-2.5 py-0.5 rounded-full border border-[#2997ff]/20">
                      <Cpu className="w-3 h-3" /> {modelUsed}
                    </span>
                  </>
                )}
                {computedScore !== null && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-[#30d158] bg-[#30d158]/10 px-2.5 py-0.5 rounded-full border border-[#30d158]/20">
                      <ShieldCheck className="w-3.5 h-3.5" /> Skor: {computedScore}/100
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/buat")}
              className="px-3 py-1.5 rounded-xl bg-[#2997ff] hover:bg-[#1a85ee] text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Buat Proyek Baru</span>
            </button>
          </div>
        </div>

        {/* Tab View Document Component */}
        <DocumentTabView
          projectId={project.id}
          projectTitle={project.title}
          documents={documents}
          score={computedScore}
          onRegenerateStage={handleRegenerateStage}
          isRegenerating={isRegenerating}
        />
      </div>
    </div>
  );
}
