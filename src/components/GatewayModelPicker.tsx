'use client';

import { useReducer, useState, useEffect } from 'react';
import { PROVIDERS, ProviderId, getProvider } from '@/lib/providers';
import {
  Globe,
  Key,
  Cpu,
  Zap,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

export type PState = {
  baseUrl: string;
  keyInput: string;
  maskedKey: string | null;
  status: 'idle' | 'checking' | 'valid' | 'invalid';
  error: string | null;
  models: string[];
  selectedModel: string | null;
};

const init = (): Record<ProviderId, PState> =>
  Object.fromEntries(
    PROVIDERS.map((p) => [
      p.id,
      {
        baseUrl: p.baseUrl,
        keyInput: '',
        maskedKey: null,
        status: 'idle',
        error: null,
        models: [],
        selectedModel: null,
      },
    ])
  ) as unknown as Record<ProviderId, PState>;

type Action =
  | { type: 'patch'; id: ProviderId; patch: Partial<PState> }
  | { type: 'reset'; id: ProviderId }
  | { type: 'initSavedKeys'; keys: Record<string, string> };

function reducer(s: Record<ProviderId, PState>, a: Action): Record<ProviderId, PState> {
  if (a.type === 'patch') {
    return { ...s, [a.id]: { ...s[a.id], ...a.patch } };
  }
  if (a.type === 'initSavedKeys') {
    const updated = { ...s };
    for (const [id, masked] of Object.entries(a.keys)) {
      if (updated[id as ProviderId]) {
        updated[id as ProviderId] = {
          ...updated[id as ProviderId],
          maskedKey: masked,
        };
      }
    }
    return updated;
  }
  const base = PROVIDERS.find((p) => p.id === a.id)!.baseUrl;
  return { ...s, [a.id]: { ...init()[a.id], baseUrl: base } };
}

interface GatewayModelPickerProps {
  onModelSelected?: (model: string, provider: ProviderId, baseUrl: string) => void;
}

export default function GatewayModelPicker({ onModelSelected }: GatewayModelPickerProps) {
  const [active, setActive] = useState<ProviderId>('9router');
  const [all, dispatch] = useReducer(reducer, undefined, init);
  const [test, setTest] = useState<{ ok: boolean; text: string; ms?: number } | null>(null);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const preset = getProvider(active) || PROVIDERS[0];
  const st = all[active]; // hanya state provider aktif
  const patch = (p: Partial<PState>) => dispatch({ type: 'patch', id: active, patch: p });
  const valid = st.status === 'valid';

  // Load existing saved keys on mount
  useEffect(() => {
    async function loadSavedKeys() {
      try {
        const res = await fetch('/api/gateway/validate');
        if (res.ok) {
          const data = await res.json();
          if (data.savedKeys) {
            dispatch({ type: 'initSavedKeys', keys: data.savedKeys });
          }
        }
      } catch {
        // Silently ignore
      }
    }
    loadSavedKeys();
  }, []);

  // Setiap perubahan URL atau key membatalkan validasi & mengosongkan model
  const invalidate = (p: Partial<PState>) =>
    patch({ ...p, status: 'idle', models: [], selectedModel: null, error: null });

  async function validate() {
    patch({ status: 'checking', error: null });
    setTest(null);

    try {
      const r = await fetch('/api/gateway/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: active,
          baseUrl: st.baseUrl,
          apiKey: st.keyInput,
        }),
      });

      const d = await r.json();
      if (d.valid) {
        const chosen = d.models[0] ?? null;
        patch({
          status: 'valid',
          models: d.models,
          maskedKey: d.maskedKey,
          keyInput: '',
          selectedModel: chosen,
        });

        if (chosen) {
          // Sync with application settings
          syncModelChoice(chosen, active, st.baseUrl);
        }
      } else {
        patch({
          status: 'invalid',
          error: d.reason || 'Validasi gagal',
          models: [],
          selectedModel: null,
        });
      }
    } catch {
      patch({
        status: 'invalid',
        error: 'Tidak bisa terhubung ke server',
        models: [],
        selectedModel: null,
      });
    }
  }

  async function runTest() {
    if (!st.selectedModel) return;
    setTesting(true);
    setTest(null);

    try {
      const r = await fetch('/api/gateway/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: active,
          baseUrl: st.baseUrl,
          model: st.selectedModel,
        }),
      });

      const d = await r.json();
      if (d.ok) {
        setTest({
          ok: true,
          ms: d.ms,
          text: `Model merespons (${d.ms} ms)`,
        });
      } else {
        setTest({
          ok: false,
          text: d.reason || 'Gagal terhubung ke model',
        });
      }
    } catch {
      setTest({
        ok: false,
        text: 'Timeout / gagal terhubung ke endpoint tes',
      });
    } finally {
      setTesting(false);
    }
  }

  const syncModelChoice = async (model: string, providerId: ProviderId, url: string) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          baseUrl: url,
          model,
        }),
      });
      if (onModelSelected) {
        onModelSelected(model, providerId, url);
      }
    } catch {
      // Silently ignore settings sync failure
    }
  };

  const handleModelChange = (newModel: string) => {
    patch({ selectedModel: newModel });
    setTest(null);
    if (newModel) {
      syncModelChoice(newModel, active, st.baseUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Pilih provider */}
      <section className="bg-[#1d1d1f] p-6 rounded-appleCard border border-[#333336] shadow-appleCard space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Globe className="w-4 h-4 text-[#2997ff]" />
            <span>1. Pilih Gateway / Provider</span>
          </div>
          <span className="text-[11px] font-mono text-[#86868b]">
            Model terisolasi per provider
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PROVIDERS.map((p) => {
            const isSelected = p.id === active;
            const hasKey = !!all[p.id]?.maskedKey;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActive(p.id);
                  setTest(null);
                }}
                className={`p-3.5 rounded-appleMd border text-left transition-all relative ${
                  isSelected
                    ? 'bg-[#2997ff]/15 border-[#2997ff] text-white shadow-sm ring-1 ring-[#2997ff]/40'
                    : 'bg-[#161618] border-[#333336] text-[#86868b] hover:text-white hover:border-[#424245]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <b className="text-xs font-semibold text-white">{p.name}</b>
                  {hasKey && (
                    <span className="w-2 h-2 rounded-full bg-[#30d158]" title="Key tersimpan" />
                  )}
                </div>
                <small className="block text-[10px] text-gray-400 mt-1 line-clamp-1">
                  {p.desc}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. URL + key */}
      <section className="bg-[#1d1d1f] p-6 rounded-appleCard border border-[#333336] shadow-appleCard space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Key className="w-4 h-4 text-[#2997ff]" />
          <span>2. Konfigurasi Endpoint & Kredensial ({preset.name})</span>
        </div>

        {/* Base URL */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
              Base URL Endpoint
            </label>
            {!preset.editableUrl && (
              <span className="text-[10px] text-[#86868b] bg-[#272729] px-2 py-0.5 rounded font-mono">
                Terkunci (Anti-SSRF)
              </span>
            )}
          </div>
          <input
            type="text"
            value={st.baseUrl}
            disabled={!preset.editableUrl}
            onChange={(e) => invalidate({ baseUrl: e.target.value })}
            placeholder={preset.baseUrl}
            className="w-full bg-[#161618] border border-[#333336] focus:border-[#2997ff] disabled:opacity-60 disabled:cursor-not-allowed rounded-appleMd px-3.5 py-2.5 text-xs font-mono text-white placeholder-[#86868b] outline-none transition-colors"
          />
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
              API Key
            </label>
            {st.maskedKey && (
              <span className="text-[10px] text-[#30d158] flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3 h-3" /> Tersimpan ({st.maskedKey})
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={st.keyInput}
              placeholder={
                st.maskedKey
                  ? 'Kosongkan jika tidak ingin mengubah key tersimpan'
                  : 'Masukkan API key untuk provider ini...'
              }
              onChange={(e) => invalidate({ keyInput: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && validate()}
              className="w-full bg-[#161618] border border-[#333336] focus:border-[#2997ff] rounded-appleMd px-3.5 py-2.5 text-xs font-mono text-white placeholder-[#86868b] outline-none transition-colors pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-2.5 text-[#86868b] hover:text-white"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Action Button & Feedback */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={validate}
            disabled={st.status === 'checking'}
            className="px-5 py-2.5 rounded-appleMd bg-[#2997ff] hover:bg-[#1a85ee] text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-sm"
          >
            {st.status === 'checking' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memvalidasi API Key…</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Validasi API Key</span>
              </>
            )}
          </button>

          {st.status === 'invalid' && (
            <div className="flex items-center gap-1.5 text-xs text-[#ff453a] font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{st.error || 'API key ditolak'}</span>
            </div>
          )}

          {valid && (
            <div className="flex items-center gap-1.5 text-xs text-[#30d158] font-mono">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>API key valid · {st.models.length} model tersedia</span>
            </div>
          )}
        </div>
      </section>

      {/* 3. Model (terkunci sampai valid) */}
      <section className="bg-[#1d1d1f] p-6 rounded-appleCard border border-[#333336] shadow-appleCard space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Cpu className="w-4 h-4 text-[#2997ff]" />
            <span>3. Model {preset.name}</span>
          </div>
          {valid && (
            <span className="text-[10px] text-[#30d158] bg-[#30d158]/10 border border-[#30d158]/30 px-2 py-0.5 rounded font-mono">
              Terkoneksi
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
              Pilih Model Aktif
            </label>
            <div className="relative">
              <select
                disabled={!valid}
                value={st.selectedModel ?? ''}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full bg-[#161618] border border-[#333336] focus:border-[#2997ff] disabled:opacity-50 disabled:cursor-not-allowed rounded-appleMd px-3.5 py-2.5 text-xs text-white outline-none cursor-pointer transition-colors"
              >
                {!valid && <option value="">Validasi API key dulu untuk membuka model</option>}
                {valid && st.models.length === 0 && (
                  <option value="">Tidak ada model ditemukan</option>
                )}
                {st.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons: Muat Ulang & Tes Koneksi */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={!valid || st.status === 'checking'}
              onClick={validate}
              className="px-4 py-2 rounded-appleMd bg-[#272729] hover:bg-[#333336] border border-[#333336] text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${st.status === 'checking' ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>

            <button
              type="button"
              disabled={!valid || !st.selectedModel || testing}
              onClick={runTest}
              className="px-4 py-2 rounded-appleMd bg-[#272729] hover:bg-[#333336] border border-[#333336] text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2997ff]" />
                  <span>Menguji…</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Tes Koneksi Nyata</span>
                </>
              )}
            </button>

            {st.selectedModel && valid && (
              <span className="text-[11px] font-mono text-gray-400 ml-auto">
                Model aktif: <strong className="text-white">{st.selectedModel}</strong>
              </span>
            )}
          </div>

          {/* Test Result Message */}
          {test && (
            <div
              className={`p-3 rounded-appleMd border text-xs font-mono transition-all ${
                test.ok
                  ? 'bg-[#30d158]/10 border-[#30d158]/30 text-[#30d158]'
                  : 'bg-[#ff453a]/10 border-[#ff453a]/30 text-[#ff453a]'
              }`}
            >
              <div className="flex items-center gap-2">
                {test.ok ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-[#30d158]" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#ff453a]" />
                )}
                <span>
                  {test.ok ? '✅ ' : '❌ '}
                  {test.text}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
