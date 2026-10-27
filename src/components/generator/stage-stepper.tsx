"use client";

import React from "react";
import { CheckCircle2, Circle, Loader2, AlertCircle, RefreshCw } from "lucide-react";

export type StageState = "pending" | "running" | "done" | "failed";

export interface StageInfo {
  key: "intake" | "prd" | "blueprint" | "mvc" | "review";
  name: string;
  shortDesc: string;
  status: StageState;
  tokenCount?: number;
  durationMs?: number;
  errorMessage?: string;
}

interface StageStepperProps {
  stages: StageInfo[];
  currentStageKey?: string;
  onRetryStage?: (key: StageInfo["key"]) => void;
  className?: string;
}

export function StageStepper({
  stages,
  currentStageKey,
  onRetryStage,
  className = "",
}: StageStepperProps) {
  const completedCount = stages.filter((s) => s.status === "done").length;
  const progressPercent = Math.round((completedCount / stages.length) * 100);

  return (
    <div className={`p-5 rounded-2xl bg-[#1d1d1f] border border-[#333336] ${className}`}>
      {/* Header and overall progress */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight">Pipeline Rekayasa Dokumen</h3>
          <p className="text-xs text-gray-400">
            {completedCount} dari {stages.length} tahap selesai ({progressPercent}%)
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#272729] text-gray-300 border border-[#333336]">
            {progressPercent === 100 ? "✅ Siap Digunakan" : "⚡ Berjalan Bertahap"}
          </span>
        </div>
      </div>

      {/* Progress track */}
      <div className="w-full bg-[#272729] h-1.5 rounded-full mb-6 overflow-hidden">
        <div
          className="bg-gradient-to-r from-[#2997ff] to-[#30d158] h-full transition-all duration-500 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stepper items */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {stages.map((stage, idx) => {
          const isCurrent = stage.key === currentStageKey;
          const isDone = stage.status === "done";
          const isRunning = stage.status === "running";
          const isFailed = stage.status === "failed";

          return (
            <div
              key={stage.key}
              className={`p-3.5 rounded-xl border transition-all ${
                isRunning
                  ? "bg-[#2997ff]/10 border-[#2997ff]/50 shadow-[0_0_15px_rgba(41,151,255,0.15)]"
                  : isDone
                  ? "bg-[#161618] border-[#30d158]/30"
                  : isFailed
                  ? "bg-red-500/10 border-red-500/40"
                  : "bg-[#161618] border-[#272729] opacity-75"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-gray-400">Tahap {idx}</span>
                {isRunning && <Loader2 className="w-4 h-4 text-[#2997ff] animate-spin" />}
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#30d158]" />}
                {isFailed && <AlertCircle className="w-4 h-4 text-red-400" />}
                {stage.status === "pending" && <Circle className="w-4 h-4 text-gray-600" />}
              </div>

              <div className="font-medium text-xs text-white mb-1">{stage.name}</div>
              <div className="text-[11px] text-gray-400 leading-snug mb-2">{stage.shortDesc}</div>

              {stage.tokenCount !== undefined && stage.tokenCount > 0 && (
                <div className="text-[10px] font-mono text-gray-500">
                  {stage.tokenCount.toLocaleString()} tokens
                </div>
              )}

              {isFailed && onRetryStage && (
                <button
                  onClick={() => onRetryStage(stage.key)}
                  className="mt-2 w-full py-1 px-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[11px] font-medium flex items-center justify-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Coba Lagi
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
