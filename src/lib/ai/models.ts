export type ModelInfo = {
  id: string;
  label: string;
  group: string;
  ownedBy?: string;
  contextLength?: number;
  isChat: boolean;
};

export type UpstreamCode =
  | "AUTH"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "NOT_JSON"
  | "NETWORK"
  | "MODEL_INVALID"
  | "UPSTREAM";

export class UpstreamError extends Error {
  constructor(
    public code: UpstreamCode,
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

const NON_CHAT = /(embed|whisper|tts|speech|transcri|moderation|rerank|dall-e|imagen|image-gen|sora|veo)/i;

/**
 * Normalizes user-provided base URL:
 * - Ensures http:// or https:// prefix
 * - Strips trailing slashes
 * - Strips accidental /chat/completions or /models suffix
 */
export function normalizeBaseUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) {
    throw new UpstreamError("NETWORK", "Base URL harus diawali http:// atau https://");
  }
  u = u.replace(/\/+$/, "").replace(/\/(chat\/completions|models)$/i, "");
  try {
    const parsed = new URL(u);
    if (!parsed.pathname || parsed.pathname === "/" || parsed.pathname === "") {
      parsed.pathname = "/v1";
      u = parsed.toString().replace(/\/+$/, "");
    }
  } catch {
    // fallback if URL constructor fails
  }
  return u;
}

async function call(
  url: string,
  apiKey: string | undefined,
  init: RequestInit = {},
  timeoutMs = 15000
) {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (e: any) {
    if (e?.name === "TimeoutError") {
      throw new UpstreamError("TIMEOUT", "Server tidak merespons dalam 15 detik.");
    }
    const host = (() => {
      try {
        return new URL(url).host;
      } catch {
        return url;
      }
    })();
    throw new UpstreamError(
      "NETWORK",
      `Tidak bisa terhubung ke ${host}. Cek URL dan koneksi jaringan.`
    );
  }

  const text = await res.text();
  const isJson = (res.headers.get("content-type") ?? "").includes("json");
  let body: any = null;
  if (isJson) {
    try {
      body = JSON.parse(text);
    } catch {
      // Handled below
    }
  }

  if (res.status === 401 || res.status === 403) {
    throw new UpstreamError("AUTH", "API key ditolak atau belum diisi.", res.status);
  }
  if (res.status === 429) {
    throw new UpstreamError("RATE_LIMIT", "Terkena batas penggunaan (rate limit).", res.status);
  }
  if (!res.ok) {
    const msg = body?.error?.message ?? body?.message ?? text.slice(0, 200);
    if (res.status === 404 || res.status === 400) {
      throw new UpstreamError(
        /model/i.test(msg) ? "MODEL_INVALID" : "NOT_FOUND",
        msg,
        res.status
      );
    }
    throw new UpstreamError("UPSTREAM", msg, res.status);
  }
  if (!body) {
    throw new UpstreamError(
      "NOT_JSON",
      "Respons bukan JSON. Base URL kemungkinan salah (biasanya harus berakhir di /v1)."
    );
  }
  return body;
}

/**
 * Fetch available models dynamically from {baseUrl}/models
 */
export async function fetchModels(baseUrl: string, apiKey?: string): Promise<ModelInfo[]> {
  const base = normalizeBaseUrl(baseUrl);
  const body = await call(`${base}/models`, apiKey);
  const raw: any[] = Array.isArray(body) ? body : body.data ?? body.models ?? [];
  const seen = new Set<string>();
  const out: ModelInfo[] = [];

  for (const m of raw) {
    const id = typeof m === "string" ? m : m.id ?? m.name;
    if (!id || seen.has(id)) continue;
    seen.add(id);

    // Grouping logic:
    // If id has a slash like 'anthropic/claude-3' -> group = 'anthropic'
    // Else if id has a prefix with '/' or owned_by
    let group = "lainnya";
    if (id.includes("/")) {
      group = id.split("/")[0];
    } else if (typeof m === "object" && m.owned_by) {
      group = m.owned_by;
    } else if (id.includes("-")) {
      group = id.split("-")[0];
    }

    out.push({
      id,
      label: (typeof m === "object" && m.name) || id,
      group,
      ownedBy: typeof m === "object" ? m.owned_by : undefined,
      contextLength: typeof m === "object" ? m.context_length ?? m.context_window : undefined,
      isChat: !NON_CHAT.test(id),
    });
  }

  return out.sort((a, b) => a.group.localeCompare(b.group) || a.id.localeCompare(b.id));
}

/**
 * Real model test sending a live ping completion to the model
 */
export async function testModel(
  baseUrl: string,
  apiKey: string | undefined,
  model: string
): Promise<{ latencyMs: number; reply: string }> {
  const base = normalizeBaseUrl(baseUrl);
  const t0 = Date.now();

  const body = await call(
    `${base}/chat/completions`,
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Balas hanya dengan kata: OK" }],
        max_tokens: 16,
        stream: false,
      }),
    },
    30000
  );

  const reply = body.choices?.[0]?.message?.content;
  if (typeof reply !== "string") {
    throw new UpstreamError(
      "UPSTREAM",
      "Respons tidak berformat OpenAI (tidak ditemukan choices[0].message.content)."
    );
  }

  return {
    latencyMs: Date.now() - t0,
    reply: reply.slice(0, 120).trim(),
  };
}
