import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers';
import { getKey } from '@/lib/keystore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { providerId, baseUrl, model } = await req.json();

    const preset = getProvider(providerId);
    const key = await getKey(providerId);
    if (!preset || !key || !model) {
      return NextResponse.json({ ok: false, reason: 'Data tidak lengkap' }, { status: 400 });
    }

    const finalUrl = (preset.editableUrl && baseUrl ? baseUrl : preset.baseUrl).replace(/\/+$/, '');
    const t0 = Date.now();

    try {
      const r = await fetch(`${finalUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(20_000),
      });

      const ms = Date.now() - t0;
      if (!r.ok) {
        const text = await r.text();
        return NextResponse.json({ ok: false, reason: `Error ${r.status}: ${text.slice(0, 200)}`, ms });
      }
      return NextResponse.json({ ok: true, ms });
    } catch {
      return NextResponse.json({ ok: false, reason: 'Timeout / gagal terhubung' });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, reason: err.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
