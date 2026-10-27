'use client';

import { useEffect, useRef, useState } from 'react';
import { SKILLS, Skill } from '@/lib/skills';

export default function SkillsMenu({ onPick }: { onPick: (s: Skill) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // tutup saat klik di luar atau tekan Escape
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', click);
      document.removeEventListener('keydown', key);
    };
  }, []);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1d1d1f] hover:bg-[#272729] border border-[#333336] text-xs font-medium text-gray-200 hover:text-white transition shadow-sm cursor-pointer"
        title="Pilih paket instruksi / skill siap pakai"
      >
        <span>🧩 Skills</span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-80 rounded-2xl border border-[#333336] bg-[#161618] p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
          <div className="px-2 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-[#272729] mb-1">
            Paket Skill AI
          </div>
          {SKILLS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="block w-full rounded-xl p-2.5 text-left hover:bg-[#272729] transition group cursor-pointer"
              onClick={() => {
                onPick(s);
                setOpen(false);
              }}
            >
              <div className="text-xs font-semibold text-white group-hover:text-[#2997ff] flex items-center gap-1.5">
                <span>{s.icon}</span>
                <span>{s.title}</span>
              </div>
              <small className="block text-[11px] text-gray-400 mt-0.5 leading-snug">
                {s.desc}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
