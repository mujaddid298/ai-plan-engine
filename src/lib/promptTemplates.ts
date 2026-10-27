export interface PromptTemplate {
  id: string;
  title: string;
  desc: string;
  icon: string;
  build: (userText: string) => string;
}

export const GRILL_ME_PREAMBLE = `Kamu adalah Staff Software Engineer & Technical Product Manager yang teliti dan kritis.
Wawancarai aku secara mendalam untuk membedah ide, kebutuhan, dan arsitektur sistem.
Ajukan pertanyaan SATU PER SATU secara interaktif. Tunggu jawabanku sebelum mengajukan pertanyaan berikutnya.
Untuk setiap pertanyaan, berikan konteks singkat mengapa pertanyaan itu penting dan 2-3 contoh opsi rekomendasi jawaban yang realistis agar aku mudah memilih.
Jangan membuat asumsi tanpa bertanya. Gali kelemahan dan edge-case yang mungkin aku lewatkan.`;

export const TEMPLATES: PromptTemplate[] = [
  {
    id: 'grill-me',
    title: 'Grill Me',
    desc: 'Wawancarai ide saya secara mendalam satu per satu dengan rekomendasi jawaban',
    icon: '🔥',
    build: (userText: string) =>
      `${GRILL_ME_PREAMBLE}\n\n---\nTopik / ide yang ingin dibahas:\n${userText.trim() || ''}`,
  },
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);
