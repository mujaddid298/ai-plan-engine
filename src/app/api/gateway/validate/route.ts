import { NextResponse } from 'next/server';
import { getProvider, PROVIDERS } from '@/lib/providers';
import { getKey, saveKey, mask } from '@/lib/keystore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const savedKeys: Record<string, string> = {};
    for (const p of PROVIDERS) {
      const k = await getKey(p.id);
      if (k) {
        savedKeys[p.id] = mask(k);
      }
    }
    return NextResponse.json({ savedKeys });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { providerId, baseUrl, apiKey } = await req.json();

    const preset = getProvider(providerId);
    if (!preset) {
      return NextResponse.json({ valid: false, reason: 'Provider tidak dikenal' }, { status: 400 });
    }

    // Anti-SSRF: provider non-editable dikunci ke URL preset
    const finalUrl = (preset.editableUrl && baseUrl ? baseUrl : preset.baseUrl).replace(/\/+$/, '');

    const key = apiKey?.trim() || (await getKey(providerId));
    if (!key) {
      return NextResponse.json({ valid: false, reason: 'API key belum diisi' });
    }

    try {
      const r = await fetch(`${finalUrl}/models`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      });

      if (r.status === 401 || r.status === 403) {
        return NextResponse.json({ valid: false, reason: 'API key ditolak' });
      }
      if (!r.ok) {
        return NextResponse.json({ valid: false, reason: `Gateway merespons ${r.status}` });
      }

      const json = await r.json();
      const models: string[] = (json.data ?? json.models ?? [])
        .map((m: any) => m.id ?? m.name)
        .filter(Boolean)
        .sort();

      if (apiKey?.trim()) {
        await saveKey(providerId, key); // simpan hanya jika valid
      }

      return NextResponse.json({ valid: true, models, maskedKey: mask(key) });
    } catch {
      return NextResponse.json({ valid: false, reason: 'Tidak bisa terhubung ke Base URL' });
    }
  } catch (err: any) {
    return NextResponse.json({ valid: false, reason: err.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
