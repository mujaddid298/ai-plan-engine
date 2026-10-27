"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  HelpCircle,
  Flame,
  ArrowRight,
  Layers,
  MessageSquare,
  Edit3,
} from "lucide-react";
import type { GrillMeQuestion, GrillMeOption } from "@/app/api/generate/grill-me/route";

export interface UserAnswer {
  questionId: string;
  category: string;
  question: string;
  selectedOptionKey: string;
  selectedOptionLabel: string;
  details: string[];
  customNote?: string;
}

interface GrillMeInterviewProps {
  questions: GrillMeQuestion[];
  onFinish: (answers: UserAnswer[]) => void;
  onSkip: () => void;
  ideaText: string;
}

export function GrillMeInterview({
  questions,
  onFinish,
  onSkip,
  ideaText,
}: GrillMeInterviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const [customNotes, setCustomNotes] = useState<Record<string, string>>({});

  const currentQ = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;

  const handleSelectOption = (option: GrillMeOption) => {
    if (!currentQ) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        questionId: currentQ.id,
        category: currentQ.category,
        question: currentQ.question,
        selectedOptionKey: option.key,
        selectedOptionLabel: option.label,
        details: option.details,
        customNote: customNotes[currentQ.id] || "",
      },
    }));
  };

  const handleCustomNoteChange = (text: string) => {
    if (!currentQ) return;
    setCustomNotes((prev) => ({ ...prev, [currentQ.id]: text }));
    if (answers[currentQ.id]) {
      setAnswers((prev) => ({
        ...prev,
        [currentQ.id]: {
          ...prev[currentQ.id],
          customNote: text,
        },
      }));
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Gather all answers and finish
      const finalAnswers = Object.values(answers);
      onFinish(finalAnswers);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!currentQ) {
    return null;
  }

  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="bg-[#1d1d1f] rounded-appleCard border border-[#333336] shadow-appleCard p-6 md:p-8 space-y-6">
      {/* Top Header & Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#272729]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-500/30">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-orange-400 tracking-wide uppercase">
              Wawancara Spesifikasi (Grill Me)
            </div>
            <div className="text-sm font-semibold text-white">
              {currentQ.category || "Klarifikasi Kebutuhan"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono">
            Pertanyaan <strong className="text-white">{currentIndex + 1}</strong> dari{" "}
            <strong className="text-white">{questions.length}</strong>
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-gray-400 hover:text-white underline cursor-pointer transition"
          >
            Lewati Wawancara
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#161618] rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-orange-500 to-[#2997ff] h-full transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Question Title */}
      <div className="space-y-1">
        <h2 className="text-base md:text-lg font-bold text-white tracking-tight leading-snug">
          Pertanyaan: {currentQ.question}
        </h2>
        <p className="text-xs text-[#86868b]">
          Pilihlah salah satu opsi rekomendasi di bawah dengan mengkliknya, atau ketik kombinasi khusus Anda.
        </p>
      </div>

      {/* Options List (Clickable Option Cards) */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          Pilihan Rekomendasi:
        </div>

        <div className="grid grid-cols-1 gap-3">
          {currentQ.options.map((option) => {
            const isSelected = currentAnswer?.selectedOptionKey === option.key;

            return (
              <div
                key={option.key}
                onClick={() => handleSelectOption(option)}
                className={`relative p-4 md:p-5 rounded-appleMd border text-left cursor-pointer transition-all ${
                  isSelected
                    ? "bg-[#2997ff]/15 border-[#2997ff] ring-1 ring-[#2997ff] shadow-md shadow-[#2997ff]/10"
                    : "bg-[#161618] border-[#333336] hover:border-[#424245] hover:bg-[#1a1a1d]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold font-mono transition-colors ${
                          isSelected
                            ? "bg-[#2997ff] text-white"
                            : "bg-[#272729] text-gray-300"
                        }`}
                      >
                        {option.key}
                      </span>
                      <span className="text-sm font-semibold text-white">
                        Opsi {option.key} ({option.label})
                      </span>
                    </div>

                    {/* Details list */}
                    {option.details && option.details.length > 0 && (
                      <ul className="space-y-1 pl-8 text-xs text-gray-300 list-disc list-outside">
                        {option.details.map((detail, dIdx) => (
                          <li key={dIdx} className="leading-relaxed">
                            {detail}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Radio Indicator */}
                  <div className="pt-0.5">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? "border-[#2997ff] bg-[#2997ff] text-white"
                          : "border-[#424245] bg-transparent"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Note Input */}
      <div className="pt-2 space-y-1.5 border-t border-[#272729]">
        <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
          <Edit3 className="w-3.5 h-3.5 text-gray-400" />
          <span>Mana opsi yang paling sesuai dengan target Anda (atau ada kombinasi khusus)?</span>
        </label>
        <input
          type="text"
          value={customNotes[currentQ.id] || ""}
          onChange={(e) => handleCustomNoteChange(e.target.value)}
          placeholder="Opsional: Tulis tambahan, kombinasi opsi A+B, atau batasan spesifik..."
          className="w-full bg-[#161618] border border-[#333336] focus:border-[#2997ff] rounded-appleMd px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-colors"
        />
      </div>

      {/* Navigation Footer */}
      <div className="pt-4 flex items-center justify-between border-t border-[#272729]">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-4 py-2.5 rounded-xl bg-[#272729] hover:bg-[#333336] border border-[#333336] text-xs font-medium text-gray-300 hover:text-white flex items-center gap-1.5 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Sebelumnya</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleNext}
            className={`px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg ${
              isLastQuestion
                ? "bg-gradient-to-r from-orange-500 to-[#2997ff] hover:opacity-90 text-white shadow-[#2997ff]/20"
                : "bg-[#2997ff] hover:bg-[#1a85ee] text-white shadow-[#2997ff]/20"
            }`}
          >
            {isLastQuestion ? (
              <>
                <span>Selesai & Buat Dokumen</span>
                <Sparkles className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Lanjut</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
