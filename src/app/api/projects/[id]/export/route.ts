import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, documents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import JSZip from "jszip";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "zip";

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.id),
      with: {
        documents: {
          orderBy: desc(documents.version),
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: `Proyek ${params.id} tidak ditemukan` },
        { status: 404 }
      );
    }

    // Get latest version per document type
    const docMap = new Map<string, string>();
    for (const doc of project.documents) {
      if (!docMap.has(doc.type)) {
        docMap.set(doc.type, doc.content);
      }
    }

    const safeSlug = (project.title || "dokumen")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);

    const brief = docMap.get("brief") || "";
    const prd = docMap.get("prd") || "";
    const blueprint = docMap.get("blueprint") || "";
    const mvc = docMap.get("mvc") || "";
    const review = docMap.get("review") || "";

    // Combined Markdown export
    const combinedMarkdown = [
      `# ${project.title}`,
      "",
      `> Dibuat otomatis oleh ngopai (AI Plan Engine)`,
      `> Bahasa: ${project.language || "Indonesia"}`,
      `> Tanggal: ${new Date().toISOString().split("T")[0]}`,
      "",
      "---",
      "",
      "## 1. Product Brief",
      "",
      "```json",
      brief,
      "```",
      "",
      "---",
      "",
      "## 2. Product Requirements Document (PRD)",
      "",
      prd,
      "",
      "---",
      "",
      "## 3. Blueprint Arsitektur",
      "",
      blueprint,
      "",
      "---",
      "",
      "## 4. Desain MVC",
      "",
      mvc,
      "",
      "---",
      "",
      "## 5. Laporan Review & Konsistensi",
      "",
      "```json",
      review,
      "```",
    ].join("\n");

    if (format === "md") {
      return new Response(combinedMarkdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeSlug}-full-plan.md"`,
        },
      });
    }

    // ZIP export with individual files
    const zip = new JSZip();
    zip.file("brief.json", brief);
    zip.file("prd.md", prd);
    zip.file("blueprint.md", blueprint);
    zip.file("mvc.md", mvc);
    zip.file("review.json", review);
    zip.file("PLAN.md", combinedMarkdown);
    zip.file("README.md", `# ${project.title}\n\nPaket dokumen rekayasa perangkat lunak lengkap siap pakai untuk tim engineering dan coding agent (Antigravity/Cursor/Claude Code).\n\n### Daftar Dokumen:\n1. \`brief.json\`: Ringkasan produk dan asumsi awal\n2. \`prd.md\`: Product Requirements Document lengkap dengan FR & NFR\n3. \`blueprint.md\`: Blueprint arsitektur sistem dan keputusan desain (ADR)\n4. \`mvc.md\`: Desain Model, View, Controller dan struktur folder\n5. \`review.json\`: Audit konsistensi lintas dokumen\n6. \`PLAN.md\`: Master plan gabungan untuk AI agent\n`);

    const zipBytes = await zip.generateAsync({ type: "uint8array" });

    return new Response(new Blob([zipBytes as any]), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeSlug}-documents.zip"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating export:", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat paket ekspor" },
      { status: 500 }
    );
  }
}
