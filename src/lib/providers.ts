export type ProviderId =
  | '9router' | 'openrouter' | 'openai' | 'deepseek' | 'groq' | 'custom';

export interface ProviderPreset {
  id: ProviderId;
  name: string;
  desc: string;
  baseUrl: string;      // default
  editableUrl: boolean; // hanya custom / editable yang boleh diubah bebas
}

export const PROVIDERS: ProviderPreset[] = [
  { id: '9router',   name: '9Router',         desc: 'Multi-provider AI router',  baseUrl: 'http://localhost:20128/v1', editableUrl: true },
  { id: 'openrouter',name: 'OpenRouter',      desc: 'Katalog model publik',      baseUrl: 'https://openrouter.ai/api/v1', editableUrl: false },
  { id: 'openai',    name: 'OpenAI Direct',   desc: 'API resmi OpenAI',          baseUrl: 'https://api.openai.com/v1', editableUrl: false },
  { id: 'deepseek',  name: 'DeepSeek Direct', desc: 'API resmi DeepSeek',        baseUrl: 'https://api.deepseek.com', editableUrl: false },
  { id: 'groq',      name: 'Groq',            desc: 'Inference ultra cepat',     baseUrl: 'https://api.groq.com/openai/v1', editableUrl: false },
  { id: 'custom',    name: 'Custom / Local',  desc: 'Gateway lokal lain',        baseUrl: 'http://localhost:11434/v1', editableUrl: true },
];

export const getProvider = (id: string) => PROVIDERS.find(p => p.id === id);
