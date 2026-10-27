import { db } from "@/lib/db";
import { projects, documents, stageRuns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { runIntake } from "./stages/intake";
import { runPrd } from "./stages/prd";
import { runBlueprint } from "./stages/blueprint";
import { runMvc } from "./stages/mvc";
import { runReview } from "./stages/review";
import { recordTokenUsage } from "@/lib/budget";

export type StageName = "intake" | "prd" | "blueprint" | "mvc" | "review";

export interface PipelineOptions {
  idea: string;
  language?: string;
  projectId?: string; // Resume existing project
  startFromStage?: StageName; // Resume from specific stage
  onStageStart?: (stage: StageName) => void;
  onStageComplete?: (stage: StageName, result: StageOutput) => void;
  onError?: (stage: StageName, error: Error) => void;
}

export interface StageOutput {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface PipelineResult {
  projectId: string;
  title: string;
  brief: string;
  prd: string;
  blueprint: string;
  mvc: string;
  review: string;
  totalInputTokens: number;
  totalOutputTokens: number;
}

const STAGE_ORDER: StageName[] = ["intake", "prd", "blueprint", "mvc", "review"];

/**
 * Run the full document generation pipeline.
 * Each stage saves results to DB so it can be resumed on failure.
 */
export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const { idea, language = "Indonesia", onStageStart, onStageComplete, onError } = options;

  let projectId = options.projectId;
  let title = idea.slice(0, 80);
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Documents accumulated through the pipeline
  let briefJson = "";
  let prdContent = "";
  let blueprintContent = "";
  let mvcContent = "";
  let reviewContent = "";

  // 1. Create or load project
  if (!projectId) {
    const [newProject] = await db
      .insert(projects)
      .values({ title, idea, language, status: "running" })
      .returning();
    projectId = newProject.id;
  } else {
    // Load existing documents for resume
    const existingDocs = await db.query.documents.findMany({
      where: eq(documents.projectId, projectId),
    });

    for (const doc of existingDocs) {
      switch (doc.type) {
        case "brief":
          briefJson = doc.content;
          break;
        case "prd":
          prdContent = doc.content;
          break;
        case "blueprint":
          blueprintContent = doc.content;
          break;
        case "mvc":
          mvcContent = doc.content;
          break;
        case "review":
          reviewContent = doc.content;
          break;
      }
    }
  }

  // Determine starting stage
  const startIdx = options.startFromStage
    ? STAGE_ORDER.indexOf(options.startFromStage)
    : 0;

  // 2. Run each stage
  for (let i = startIdx; i < STAGE_ORDER.length; i++) {
    const stage = STAGE_ORDER[i];

    onStageStart?.(stage);

    // Create stage run record
    const [stageRun] = await db
      .insert(stageRuns)
      .values({
        projectId: projectId!,
        stage,
        status: "running",
      })
      .returning();

    try {
      let output: StageOutput;

      switch (stage) {
        case "intake": {
          const result = await runIntake({ idea, language });
          briefJson = JSON.stringify(result.brief, null, 2);
          output = {
            content: briefJson,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            model: result.model,
          };

          // Update project title with product name
          title = result.brief.namaProduk || title;
          await db
            .update(projects)
            .set({ title })
            .where(eq(projects.id, projectId!));
          break;
        }

        case "prd": {
          if (!briefJson) throw new Error("Brief belum ada, jalankan intake terlebih dahulu");
          const result = await runPrd({ briefJson, language });
          prdContent = result.content;
          output = {
            content: prdContent,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            model: result.model,
          };
          break;
        }

        case "blueprint": {
          if (!briefJson || !prdContent) throw new Error("Brief dan PRD belum ada");
          const result = await runBlueprint({ briefJson, prdContent, language });
          blueprintContent = result.content;
          output = {
            content: blueprintContent,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            model: result.model,
          };
          break;
        }

        case "mvc": {
          if (!briefJson || !prdContent || !blueprintContent)
            throw new Error("Brief, PRD, dan Blueprint belum ada");
          const result = await runMvc({
            briefJson,
            prdContent,
            blueprintContent,
            language,
          });
          mvcContent = result.content;
          output = {
            content: mvcContent,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            model: result.model,
          };
          break;
        }

        case "review": {
          if (!briefJson || !prdContent || !blueprintContent || !mvcContent)
            throw new Error("Semua dokumen sebelumnya harus ada untuk review");
          const result = await runReview({
            briefJson,
            prdContent,
            blueprintContent,
            mvcContent,
            language,
          });
          reviewContent = JSON.stringify(result.review, null, 2);
          output = {
            content: reviewContent,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            model: result.model,
          };
          break;
        }
      }

      // Save document to DB
      const docType = stageToDocType(stage);
      await saveDocument(projectId!, docType, output!.content);

      // Update stage run as done
      await db
        .update(stageRuns)
        .set({
          status: "done",
          model: output!.model,
          inputTokens: output!.inputTokens,
          outputTokens: output!.outputTokens,
          finishedAt: new Date(),
        })
        .where(eq(stageRuns.id, stageRun.id));

      // Record token usage
      await recordTokenUsage(output!.inputTokens, output!.outputTokens);

      totalInputTokens += output!.inputTokens;
      totalOutputTokens += output!.outputTokens;

      onStageComplete?.(stage, output!);
    } catch (error: any) {
      // Update stage run as failed
      await db
        .update(stageRuns)
        .set({
          status: "failed",
          error: error.message,
          finishedAt: new Date(),
        })
        .where(eq(stageRuns.id, stageRun.id));

      // Update project status
      await db
        .update(projects)
        .set({ status: "failed" })
        .where(eq(projects.id, projectId!));

      onError?.(stage, error);
      throw error;
    }
  }

  // 3. Mark project as done
  await db
    .update(projects)
    .set({ status: "done" })
    .where(eq(projects.id, projectId!));

  return {
    projectId: projectId!,
    title,
    brief: briefJson,
    prd: prdContent,
    blueprint: blueprintContent,
    mvc: mvcContent,
    review: reviewContent,
    totalInputTokens,
    totalOutputTokens,
  };
}

/**
 * Run a single stage (for re-generation)
 */
export async function runSingleStage(
  projectId: string,
  stage: StageName,
  language: string = "Indonesia"
): Promise<StageOutput> {
  // Load existing documents
  const existingDocs = await db.query.documents.findMany({
    where: eq(documents.projectId, projectId),
  });

  const docMap: Record<string, string> = {};
  for (const doc of existingDocs) {
    docMap[doc.type] = doc.content;
  }

  // Load project idea
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) throw new Error(`Project ${projectId} tidak ditemukan`);

  let output: StageOutput;

  switch (stage) {
    case "intake": {
      const result = await runIntake({ idea: project.idea, language });
      output = {
        content: JSON.stringify(result.brief, null, 2),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        model: result.model,
      };
      break;
    }
    case "prd": {
      const result = await runPrd({
        briefJson: docMap["brief"] || "",
        language,
      });
      output = {
        content: result.content,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        model: result.model,
      };
      break;
    }
    case "blueprint": {
      const result = await runBlueprint({
        briefJson: docMap["brief"] || "",
        prdContent: docMap["prd"] || "",
        language,
      });
      output = {
        content: result.content,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        model: result.model,
      };
      break;
    }
    case "mvc": {
      const result = await runMvc({
        briefJson: docMap["brief"] || "",
        prdContent: docMap["prd"] || "",
        blueprintContent: docMap["blueprint"] || "",
        language,
      });
      output = {
        content: result.content,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        model: result.model,
      };
      break;
    }
    case "review": {
      const result = await runReview({
        briefJson: docMap["brief"] || "",
        prdContent: docMap["prd"] || "",
        blueprintContent: docMap["blueprint"] || "",
        mvcContent: docMap["mvc"] || "",
        language,
      });
      output = {
        content: JSON.stringify(result.review, null, 2),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        model: result.model,
      };
      break;
    }
  }

  // Save/update document
  await saveDocument(projectId, stageToDocType(stage), output!.content);

  // Record token usage
  await recordTokenUsage(output!.inputTokens, output!.outputTokens);

  return output!;
}

export function stageToDocType(stage: StageName): "brief" | "prd" | "blueprint" | "mvc" | "review" {
  return stage === "intake" ? "brief" : stage;
}

/**
 * Save or update a document in the database
 */
async function saveDocument(
  projectId: string,
  type: string,
  content: string
): Promise<void> {
  const existing = await db.query.documents.findFirst({
    where: and(
      eq(documents.projectId, projectId),
      eq(documents.type, type as any)
    ),
  });

  if (existing) {
    // Increment version
    await db.insert(documents).values({
      projectId,
      type: type as any,
      version: existing.version + 1,
      content,
    });
  } else {
    await db.insert(documents).values({
      projectId,
      type: type as any,
      version: 1,
      content,
    });
  }

  // If PRD, also save to tasks/prd-[feature-name].md
  if (type === "prd") {
    try {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
      });
      const rawTitle = project?.title || "feature";
      const slug = rawTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 50) || "feature";

      const tasksDir = path.join(process.cwd(), "tasks");
      await fs.promises.mkdir(tasksDir, { recursive: true });
      const filePath = path.join(tasksDir, `prd-${slug}.md`);
      await fs.promises.writeFile(filePath, content, "utf8");
    } catch (fsErr) {
      console.warn("Could not save PRD to tasks directory:", fsErr);
    }
  }
}

/**
 * Assemble all documents into a single markdown export
 */
export function assembleExport(result: PipelineResult): string {
  const sections: string[] = [
    `# ${result.title}`,
    "",
    `> Dibuat otomatis oleh AI Plan Engine`,
    `> Token: Input ${result.totalInputTokens} / Output ${result.totalOutputTokens}`,
    "",
    "---",
    "",
    "## Product Brief",
    "",
    "```json",
    result.brief,
    "```",
    "",
    "---",
    "",
    "## PRD (Product Requirements Document)",
    "",
    result.prd,
    "",
    "---",
    "",
    "## Blueprint Arsitektur",
    "",
    result.blueprint,
    "",
    "---",
    "",
    "## Desain MVC",
    "",
    result.mvc,
    "",
    "---",
    "",
    "## Laporan Review",
    "",
    "```json",
    result.review,
    "```",
  ];

  return sections.join("\n");
}
