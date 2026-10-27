import { promises as fs } from 'fs';
import path from 'path';
import { getProvider } from '@/lib/providers';
import { saveProviderConfig } from '@/lib/db/provider';

const FILE = path.join(process.cwd(), '.data', 'keys.json');

async function readAll(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch {
    return {};
  }
}

export async function getKey(providerId: string): Promise<string | null> {
  return (await readAll())[providerId] ?? null;
}

export async function saveKey(providerId: string, key: string): Promise<void> {
  const all = await readAll();
  all[providerId] = key;
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all, null, 2), 'utf8');

  try {
    const preset = getProvider(providerId);
    if (preset) {
      await saveProviderConfig({
        preset: providerId,
        baseUrl: preset.baseUrl,
        apiKey: key,
      });
    }
  } catch {
    // Ignore DB sync error if any
  }
}

export const mask = (k: string) => '••••••••' + k.slice(-4);
