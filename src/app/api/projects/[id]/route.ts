import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, documents, stageRuns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.id),
      with: {
        documents: {
          orderBy: desc(documents.version),
        },
        stageRuns: {
          orderBy: desc(stageRuns.startedAt),
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: `Proyek ${params.id} tidak ditemukan` },
        { status: 404 }
      );
    }

    // Keep only latest version per document type
    const latestDocsMap = new Map<string, typeof project.documents[0]>();
    for (const doc of project.documents) {
      if (!latestDocsMap.has(doc.type)) {
        latestDocsMap.set(doc.type, doc);
      }
    }

    const latestDocuments = Array.from(latestDocsMap.values());

    return NextResponse.json({
      project,
      documents: latestDocuments,
      allDocumentVersions: project.documents,
      stageRuns: project.stageRuns,
    });
  } catch (error: any) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memuat proyek" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await db.delete(projects).where(eq(projects.id, params.id));
    return NextResponse.json({ success: true, deletedId: params.id });
  } catch (error: any) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghapus proyek" },
      { status: 500 }
    );
  }
}
