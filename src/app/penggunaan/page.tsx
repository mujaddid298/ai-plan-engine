"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/chat/sidebar";
import {
  BarChart3,
  DollarSign,
  Layers,
  MessageSquare,
  Calendar,
} from "lucide-react";

interface UsageItem {
  date: string;
  inputTokens: number;
  outputTokens: number;
  messageCount: number;
  totalTokens: number;
  costUsd: number;
}

interface BudgetStatus {
  allowed: boolean;
  reason?: string;
  currentCostUsd: number;
  maxBudgetUsd: number;
}

export default function PenggunaanPage() {
  const [history, setHistory] = useState<UsageItem[]>([]);
  const [todayStatus, setTodayStatus] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch("/api/usage");
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
          setTodayStatus(data.today || null);
        }
      } catch (err) {
        console.error("Gagal memuat riwayat penggunaan:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, []);

  const currentCost = todayStatus?.currentCostUsd || 0;
  const maxBudget = todayStatus?.maxBudgetUsd || 5.0;
  const percentage = Math.min(100, Math.round((currentCost / maxBudget) * 100));

  return (
    <div className="flex h-screen w-full bg-[#000000] font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#000000] text-[#f5f5f7]">
        <div className="max-w-4xl mx-auto space-y-6 pl-12 md:pl-0">
          {/* Header */}
          <div className="border-b border-[#333336]/60 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-appleMd bg-[#1d1d1f] flex items-center justify-center text-[#2997ff] shadow-appleCard">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#f5f5f7]">
                  Penggunaan & Estimasi Biaya
                </h1>
                <p className="text-xs sm:text-sm text-[#86868b] tracking-tight">
                  Pantau jumlah token dan pengeluaran harian API Anda.
                </p>
              </div>
            </div>
          </div>

          {/* Today's Budget Status Card */}
          <div className="p-6 rounded-appleMd bg-[#1d1d1f] shadow-appleCard space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#2997ff]" />
                <h2 className="text-sm font-semibold tracking-tight text-[#f5f5f7]">
                  Anggaran Hari Ini
                </h2>
              </div>
              <span
                className={`text-xs px-3 py-1 rounded-pill font-medium ${
                  todayStatus?.allowed
                    ? "bg-[#30d158]/20 text-[#30d158]"
                    : "bg-[#ff453a]/20 text-[#ff453a]"
                }`}
              >
                {todayStatus?.allowed ? "Normal" : "Batas Tercapai"}
              </span>
            </div>

            {/* Apple Progress Bar (6px pill) */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#86868b]">
                <span>
                  Pengeluaran:{" "}
                  <strong className="text-[#f5f5f7] font-mono">
                    ${currentCost.toFixed(4)}
                  </strong>
                </span>
                <span>
                  Batas:{" "}
                  <strong className="text-[#f5f5f7] font-mono">
                    ${maxBudget.toFixed(2)}
                  </strong>
                </span>
              </div>

              <div className="w-full h-2 bg-[#272729] rounded-pill overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-pill ${
                    percentage > 85
                      ? "bg-[#ff453a]"
                      : percentage > 50
                      ? "bg-[#ffd60a]"
                      : "bg-[#2997ff]"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-[#86868b] pt-1">
                <span>{percentage}% terpakai</span>
                <span>Tersedia: ${(maxBudget - currentCost).toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-appleMd bg-[#1d1d1f] shadow-appleCard flex items-center gap-4">
              <div className="w-11 h-11 rounded-appleMd bg-[#272729] flex items-center justify-center text-[#2997ff] flex-shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-[#86868b]">Total Hari</p>
                <p className="text-xl font-semibold text-[#f5f5f7] font-mono">
                  {history.length}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-appleMd bg-[#1d1d1f] shadow-appleCard flex items-center gap-4">
              <div className="w-11 h-11 rounded-appleMd bg-[#272729] flex items-center justify-center text-[#2997ff] flex-shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-[#86868b]">Total Token</p>
                <p className="text-xl font-semibold text-[#f5f5f7] font-mono">
                  {history
                    .reduce((acc, h) => acc + h.totalTokens, 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-appleMd bg-[#1d1d1f] shadow-appleCard flex items-center gap-4">
              <div className="w-11 h-11 rounded-appleMd bg-[#272729] flex items-center justify-center text-[#2997ff] flex-shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-[#86868b]">Estimasi Biaya</p>
                <p className="text-xl font-semibold text-[#f5f5f7] font-mono">
                  $
                  {history
                    .reduce((acc, h) => acc + h.costUsd, 0)
                    .toFixed(4)}
                </p>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="p-6 rounded-appleMd bg-[#1d1d1f] shadow-appleCard space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#f5f5f7]">
              <Calendar className="w-4 h-4 text-[#2997ff]" />
              <span>Riwayat Harian</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-[#86868b]">Memuat data...</div>
            ) : history.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#86868b]">
                Belum ada data penggunaan tercatat.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-appleMd border border-[#333336]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#272729] text-[#86868b] uppercase tracking-wider font-semibold border-b border-[#333336]">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Pesan</th>
                      <th className="px-4 py-3">Input Token</th>
                      <th className="px-4 py-3">Output Token</th>
                      <th className="px-4 py-3">Total Token</th>
                      <th className="px-4 py-3">Estimasi Biaya</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#333336] text-[#f5f5f7] font-mono">
                    {history.map((row) => (
                      <tr key={row.date} className="hover:bg-[#272729]/40 transition-colors">
                        <td className="px-4 py-3 font-semibold">{row.date}</td>
                        <td className="px-4 py-3">{row.messageCount}</td>
                        <td className="px-4 py-3 text-[#86868b]">{row.inputTokens.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[#86868b]">{row.outputTokens.toLocaleString()}</td>
                        <td className="px-4 py-3 font-semibold">{row.totalTokens.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[#2997ff]">${row.costUsd.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
