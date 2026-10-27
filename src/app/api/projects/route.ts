import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, documents, stageRuns } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const allProjects = await db.query.projects.findMany({
      orderBy: desc(projects.createdAt),
      with: {
        documents: {
          columns: {
            id: true,
            type: true,
            version: true,
            createdAt: true,
          },
        },
        stageRuns: {
          columns: {
            id: true,
            stage: true,
            status: true,
            inputTokens: true,
            outputTokens: true,
            error: true,
          },
        },
      },
    });

    const formatted = allProjects.map((p) => {
      const totalInputTokens = p.stageRuns.reduce((acc, sr) => acc + (sr.inputTokens || 0), 0);
      const totalOutputTokens = p.stageRuns.reduce((acc, sr) => acc + (sr.outputTokens || 0), 0);

      return {
        id: p.id,
        title: p.title,
        idea: p.idea,
        language: p.language,
        status: p.status,
        createdAt: p.createdAt,
        documentsCount: p.documents.length,
        documentTypes: p.documents.map((d) => d.type),
        totalTokens: totalInputTokens + totalOutputTokens,
      };
    });

    return NextResponse.json({ projects: formatted });
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memuat daftar proyek" },
      { status: 500 }
    );
  }
}
