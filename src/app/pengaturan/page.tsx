"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/chat/sidebar";
import {
  Settings,
  Save,
  CheckCircle,
  AlertCircle,
  Layers,
  Loader2,
} from "lucide-react";
import GatewayModelPicker from "@/components/GatewayModelPicker";

export default function PengaturanPage() {
  const [maxTokens, setMaxTokens] = useState(4096);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful, expert AI programming assistant."
  );
  const [dailyBudgetUsd, setDailyBudgetUsd] = useState(5.0);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Initial settings load for parameters & budget
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          const s = data.settings;
          if (s.maxTokens) setMaxTokens(parseInt(s.maxTokens, 10));
          if (s.systemPrompt) setSystemPrompt(s.systemPrompt);
          if (s.dailyBudgetUsd) setDailyBudgetUsd(parseFloat(s.dailyBudgetUsd));
        }
      } catch (err) {
        console.error("Gagal memuat pengaturan:", err);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveParameters = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxTokens,
          systemPrompt,
          dailyBudgetUsd,
        }),
      });

      if (!res.ok) throw new Error("Gagal menyimpan ke database");

      setMessage({
        type: "success",
        text: "Parameter respon dan batas anggaran berhasil diperbarui!",
      });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Gagal menyimpan perubahan",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#000000] text-[#f5f5f7] overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-4 md:px-12 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div className="border-b border-[#272729] pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#2997ff]/10 border border-[#2997ff]/20 text-[#2997ff]">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Pengaturan Model & Gateway
                </h1>
                <p className="text-xs text-[#86868b] mt-0.5">
                  Alur: Pilih provider → isi key → validasi → baru model muncul → tes koneksi nyata.
                </p>
              </div>
            </div>
          </div>

          {/* Alert Message */}
          {message && (
            <div
              className={`p-4 rounded-appleCard flex items-start gap-3 border transition-all ${
                message.type === "success"
                  ? "bg-[#30d158]/10 border-[#30d158]/30 text-[#30d158]"
                  : "bg-[#ff453a]/10 border-[#ff453a]/30 text-[#ff453a]"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div className="text-sm font-medium">{message.text}</div>
            </div>
          )}

          {/* Core Gateway & Model Picker */}
          <GatewayModelPicker />

          {/* Parameter Respon & Anggaran Form */}
          <form onSubmit={handleSaveParameters} className="space-y-6">
            <div className="bg-[#1d1d1f] p-6 rounded-appleCard border border-[#333336] shadow-appleCard space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Layers className="w-4 h-4 text-[#2997ff]" />
                <span>Parameter Respon & Batas Anggaran</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
                    Max Tokens per Respons
                  </label>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 4096)}
                    min={256}
                    max={65536}
                    step={256}
                    className="w-full bg-[#161618] border border-[#333336] focus:border-[#2997ff] rounded-appleMd px-3.5 py-2.5 text-xs font-mono text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
                    Batas Anggaran Harian (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-[#86868b] text-xs">$</span>
                    <input
                      type="number"
                      value={dailyBudgetUsd}
                      onChange={(e) => setDailyBudgetUsd(parseFloat(e.target.value) || 5.0)}
                      min={0.1}
                      max={100}
                      step={0.5}
                      className="w-full bg-[#161618] border border-[#333336] focus:border-[#2997ff] rounded-appleMd pl-7 pr-3.5 py-2.5 text-xs font-mono text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-1.5 pt-2 border-t border-[#272729]">
                <label className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
                  System Prompt Asisten Pribadi
                </label>
                <textarea
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full bg-[#161618] border border-[#333336] focus:border-[#2997ff] rounded-appleMd p-3 text-xs text-white outline-none resize-y"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#2997ff] hover:bg-[#1a85ee] text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-[#2997ff]/20 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Parameter</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
