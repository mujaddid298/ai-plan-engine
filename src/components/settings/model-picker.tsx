"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { Search, RefreshCw, AlertTriangle, Check, ChevronDown, Sparkles } from "lucide-react";
import type { ModelInfo } from "@/lib/ai/models";

interface ModelPickerProps {
  models: ModelInfo[];
  value: string;
  loading?: boolean;
  error?: string | null;
  onChange: (modelId: string) => void;
  onReload: () => void;
  className?: string;
}

export function ModelPicker({
  models,
  value,
  loading = false,
  error = null,
  onChange,
  onReload,
  className = "",
}: ModelPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    return models.filter((m) => m.isChat && (!s || m.id.toLowerCase().includes(s) || m.label.toLowerCase().includes(s)));
  }, [models, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ModelInfo[]>();
    for (const m of filtered) {
      const g = m.group || "lainnya";
      map.set(g, [...(map.get(g) ?? []), m]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const exists = models.some((m) => m.id === value);
  const isCustom = !!value && models.length > 0 && !exists;

  return (
    <div ref={containerRef} className={`space-y-2 relative ${className}`}>
      {/* Search & Trigger Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            className="w-full rounded-xl bg-[#161618] border border-[#333336] focus:border-[#2997ff] px-3.5 py-2.5 font-mono text-xs text-white placeholder-gray-500 outline-none transition"
            placeholder={loading ? "Memuat model dari gateway..." : "Cari model atau ketik ID kustom"}
            value={isOpen ? query : value}
            onFocus={() => {
              setIsOpen(true);
              setQuery("");
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-3 top-3 text-gray-400 hover:text-white"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-[#272729] hover:bg-[#333336] text-xs font-medium text-gray-300 hover:text-white flex items-center gap-1.5 transition disabled:opacity-50 border border-[#333336]"
          title="Muat ulang daftar model dari gateway"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#2997ff]" : ""}`} />
          <span className="hidden sm:inline">{loading ? "Memuat..." : "Muat Ulang"}</span>
        </button>
      </div>

      {/* Status & Warning Info */}
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {!error && models.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
          <span>{models.length} model aktif tersedia di gateway</span>
          {value && (
            <span className="font-mono text-gray-300">
              Terpilih: <strong className="text-[#2997ff]">{value}</strong>
            </span>
          )}
        </div>
      )}

      {isCustom && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            ID <code>{value}</code> tidak ada di daftar gateway. Jalankan <strong>Tes Koneksi</strong> untuk memverifikasi.
          </span>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-72 overflow-y-auto rounded-xl border border-[#333336] bg-[#161618] shadow-2xl p-2 space-y-2">
          {/* Custom ID option if typing something not in list */}
          {query.trim() && !models.some((m) => m.id === query.trim()) && (
            <button
              type="button"
              className="w-full p-2.5 text-left text-xs rounded-lg bg-[#2997ff]/10 hover:bg-[#2997ff]/20 text-[#2997ff] border border-[#2997ff]/30 flex items-center gap-2 transition"
              onClick={() => {
                onChange(query.trim());
                setIsOpen(false);
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                Gunakan ID kustom: <strong className="font-mono">{query.trim()}</strong>
              </span>
            </button>
          )}

          {grouped.map(([group, items]) => (
            <div key={group} className="space-y-1">
              <div className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {group} ({items.length})
              </div>
              {items.map((m) => {
                const isSelected = m.id === value;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`w-full px-3 py-2 text-left font-mono text-xs rounded-lg flex items-center justify-between transition ${
                      isSelected
                        ? "bg-[#2997ff] text-white"
                        : "text-gray-300 hover:bg-[#272729] hover:text-white"
                    }`}
                    onClick={() => {
                      onChange(m.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="truncate mr-2">
                      <div className="font-semibold truncate">{m.id}</div>
                      {m.label && m.label !== m.id && (
                        <div className={`text-[10px] truncate ${isSelected ? "text-white/80" : "text-gray-500"}`}>
                          {m.label}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}

          {grouped.length === 0 && !loading && (
            <div className="p-4 text-center text-xs text-gray-500">
              Tidak ada model yang cocok dengan pencarian "{query}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
