import GatewayModelPicker from '@/components/GatewayModelPicker';
import { Sidebar } from '@/components/chat/sidebar';
import { Settings } from 'lucide-react';

export const metadata = {
  title: 'Pengaturan Gateway & Model - ngopai',
  description: 'Konfigurasi multi-provider AI router dan pemilihan model dinamis.',
};

export default function SettingsPage() {
  return (
    <div className="flex h-screen bg-[#000000] text-[#f5f5f7] overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-4 md:px-12 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div className="border-b border-[#272729] pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#2997ff]/10 border border-[#2997ff]/20 text-[#2997ff]">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Gateway & Model Picker
                </h1>
                <p className="text-xs text-[#86868b] mt-0.5">
                  Pilih provider → isi key → validasi → model muncul → tes koneksi nyata.
                </p>
              </div>
            </div>
          </div>

          <GatewayModelPicker />
        </div>
      </main>
    </div>
  );
}
