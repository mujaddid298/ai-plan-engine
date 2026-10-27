import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, stageRuns, documents } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { runSingleStage, StageName } from "@/services/generator/pipeline";
import { checkDailyBudget } from "@/lib/budget";

const STAGE_ORDER: StageName[] = ["intake", "prd", "blueprint", "mvc", "review"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, stage } = body as { projectId: string; stage: StageName };

    if (!projectId || !stage || !STAGE_ORDER.includes(stage)) {
      return NextResponse.json(
        { error: "Parameter projectId dan stage valid wajib diisi" },
        { status: 400 }
      );
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return NextResponse.json(
        { error: `Proyek ${projectId} tidak ditemukan` },
        { status: 404 }
      );
    }

    // Check budget
    const budgetCheck = await checkDailyBudget();
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          error: `Anggaran harian terlampaui. Tahap ${stage} dihentikan.`,
        },
        { status: 429 }
      );
    }

    // Record stage run starting
    const [stageRun] = await db
      .insert(stageRuns)
      .values({
        projectId,
        stage,
        status: "running",
        startedAt: new Date(),
      })
      .returning();

    try {
      const output = await runSingleStage(projectId, stage, project.language);

      // Mark stage run as done
      await db
        .update(stageRuns)
        .set({
          status: "done",
          model: output.model,
          inputTokens: output.inputTokens,
          outputTokens: output.outputTokens,
          finishedAt: new Date(),
        })
        .where(eq(stageRuns.id, stageRun.id));

      // Calculate next stage
      const currentIdx = STAGE_ORDER.indexOf(stage);
      const nextStage = currentIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIdx + 1] : null;

      // If review stage done, update project status to done and save review score
      if (stage === "review") {
        await db
          .update(projects)
          .set({ status: "done" })
          .where(eq(projects.id, projectId));
      }

      return NextResponse.json({
        success: true,
        stage,
        nextStage,
        isCompleted: stage === "review",
        output: {
          content: output.content,
          inputTokens: output.inputTokens,
          outputTokens: output.outputTokens,
          model: output.model,
        },
      });
    } catch (stageError: any) {
      // Mark stage run as failed
      await db
        .update(stageRuns)
        .set({
          status: "failed",
          error: stageError.message || "Gagal menjalankan tahap",
          finishedAt: new Date(),
        })
        .where(eq(stageRuns.id, stageRun.id));

      await db
        .update(projects)
        .set({ status: "failed" })
        .where(eq(projects.id, projectId));

      return NextResponse.json(
        {
          error: `Gagal di tahap ${stage}: ${stageError.message}`,
          stage,
          canRetry: true,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in generate stage route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
