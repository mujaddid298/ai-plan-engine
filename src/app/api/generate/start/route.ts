import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { checkDailyBudget } from "@/lib/budget";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { idea, language = "Indonesia", interviewAnswers } = body;

    if (!idea || typeof idea !== "string" || idea.trim().length < 5) {
      return NextResponse.json(
        { error: "Ide proyek minimal 5 karakter" },
        { status: 400 }
      );
    }

    // Build enriched idea if interview answers were provided
    let enrichedIdea = idea.trim();
    if (Array.isArray(interviewAnswers) && interviewAnswers.length > 0) {
      enrichedIdea += "\n\n### Hasil Wawancara Klarifikasi (Grill Me):\n";
      interviewAnswers.forEach((ans: any, idx: number) => {
        enrichedIdea += `\n${idx + 1}. **Pertanyaan (${ans.category || "Spesifikasi"}):** ${ans.question}\n`;
        if (ans.selectedOptionLabel) {
          enrichedIdea += `   • **Jawaban Rekomendasi Terpilih (Opsi ${ans.selectedOptionKey}):** ${ans.selectedOptionLabel}\n`;
        }
        if (Array.isArray(ans.details) && ans.details.length > 0) {
          ans.details.forEach((d: string) => {
            enrichedIdea += `     - ${d}\n`;
          });
        }
        if (ans.customNote && ans.customNote.trim()) {
          enrichedIdea += `     - **Tambahan / Penjelasan Pengguna:** ${ans.customNote.trim()}\n`;
        }
      });
    }

    if (enrichedIdea.length > 8000) {
      enrichedIdea = enrichedIdea.slice(0, 8000);
    }

    // Check budget before starting
    const budgetCheck = await checkDailyBudget();
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          error: `Anggaran harian terlampaui ($${budgetCheck.currentCostUsd.toFixed(3)} / $${budgetCheck.maxBudgetUsd.toFixed(2)}). Reset besok atau ubah batas di Pengaturan.`,
        },
        { status: 429 }
      );
    }

    // Clean title from first line of original idea
    const firstLine = idea.split("\n")[0].trim();
    const title = firstLine.length > 70 ? firstLine.slice(0, 67) + "..." : firstLine;

    const [project] = await db
      .insert(projects)
      .values({
        title,
        idea: enrichedIdea,
        language,
        status: "running",
      })
      .returning();

    return NextResponse.json({
      success: true,
      projectId: project.id,
      project,
    });
  } catch (error: any) {
    console.error("Error starting generation project:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memulai proyek" },
      { status: 500 }
    );
  }
}
