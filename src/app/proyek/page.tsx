"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Layers,
  Calendar,
  Trash2,
  ExternalLink,
  Search,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function ProyekListPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (res.ok) {
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Hapus proyek dan seluruh dokumennya?")) return;

    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      alert("Gagal menghapus proyek");
    }
  };

  const filtered = projects.filter((p) =>
    (p.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.idea || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#272729] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Arsip Proyek Dokumen</h1>
            <p className="text-xs text-gray-400 mt-1">
              Daftar seluruh paket dokumen rekayasa perangkat lunak yang telah disusun.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/")}
              className="px-3 py-1.5 rounded-xl bg-[#1d1d1f] hover:bg-[#272729] border border-[#333336] text-xs font-medium text-gray-300 transition"
            >
              Kembali ke Chat
            </button>
            <button
              onClick={() => router.push("/buat")}
              className="px-4 py-2 rounded-xl bg-[#2997ff] hover:bg-[#1a85ee] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Buat Paket Baru</span>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari proyek berdasarkan judul atau kata kunci ide..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1d1d1f] border border-[#333336] focus:border-[#2997ff] text-xs text-white placeholder-gray-500 outline-none transition"
          />
        </div>

        {/* Project List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-xs text-gray-500 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#2997ff]" />
            <span>Memuat arsip proyek...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-[#333336] bg-[#161618] p-8 space-y-3">
            <FolderOpen className="w-10 h-10 text-gray-600 mx-auto" />
            <h3 className="text-sm font-semibold text-gray-300">Belum Ada Proyek</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Mulai buat dokumen software pertamamu dengan satu prompt sederhana.
            </p>
            <button
              onClick={() => router.push("/buat")}
              className="mt-2 px-4 py-2 rounded-xl bg-[#2997ff] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Buat Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((project) => {
              const createdDate = project.createdAt
                ? new Date(project.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "-";

              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/proyek/${project.id}`)}
                  className="p-5 rounded-2xl bg-[#1d1d1f] border border-[#272729] hover:border-[#333336] hover:bg-[#242426] transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-semibold text-sm text-white group-hover:text-[#2997ff] transition">
                        {project.title}
                      </h3>
                      {project.score !== null && project.score !== undefined && (
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                            project.score >= 85
                              ? "bg-[#30d158]/20 text-[#30d158]"
                              : project.score >= 70
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          Skor {project.score}/100
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-1 max-w-2xl">{project.idea}</p>

                    <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {createdDate}
                      </span>
                      <span>•</span>
                      <span>{project.documentsCount || 0} Dokumen</span>
                      {project.totalTokens > 0 && (
                        <>
                          <span>•</span>
                          <span>{project.totalTokens.toLocaleString()} tokens</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleDelete(project.id, e)}
                      className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Hapus Proyek"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="p-2 rounded-xl bg-[#272729] text-gray-400 group-hover:text-white group-hover:bg-[#2997ff] transition">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
