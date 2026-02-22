"use server";

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { disasterReports } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const validationSchema = z.object({
  isValid: z
    .boolean()
    .describe("Whether the photo matches the disaster report"),
  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence level from 0 to 1"),
  reasoning: z.string().describe("Short explanation for the validation result"),
});

export async function validateReportWithAI(reportId: string) {
  console.log(`[AI] Starting validation for report: ${reportId}`);

  try {
    const report = await db.query.disasterReports.findFirst({
      where: eq(disasterReports.id, reportId),
    });

    if (!report || !report.imageUrl) {
      console.warn(`[AI] Report ${reportId} not found or has no image.`);
      return { error: "Laporan atau gambar tidak ditemukan." };
    }

    // Update status to VALIDATING to show progress in UI
    await db
      .update(disasterReports)
      .set({ status: "VALIDATING" })
      .where(eq(disasterReports.id, reportId));

    revalidatePath("/");
    console.log(
      `[AI] Status updated to VALIDATING for ${reportId}. Calling Gemini...`,
    );

    // Call Gemini via Vercel AI SDK
    const { object } = await generateObject({
      model: google("gemini-1.5-flash-latest"),
      schema: validationSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Validasi laporan bencana berikut:
              Jenis Bencana: ${report.disasterType}
              Deskripsi: ${report.description || "Tidak ada deskripsi"}
              
              Apakah foto ini benar-benar menunjukkan kejadian tersebut? Berikan skor kepercayaan (0.0 - 1.0) dan tentukan isValid.`,
            },
            {
              type: "image",
              image: report.imageUrl,
            },
          ],
        },
      ],
    });

    console.log(`[AI] Gemini result for ${reportId}:`, object);

    // Update database with AI results
    await db
      .update(disasterReports)
      .set({
        status: object.isValid ? "VERIFIED" : "REJECTED",
        aiConfidenceScore: object.confidenceScore,
        aiReasoning: object.reasoning,
      })
      .where(eq(disasterReports.id, reportId));

    console.log(
      `[AI] Validation complete for ${reportId}. Status: ${object.isValid ? "VERIFIED" : "REJECTED"}`,
    );
    return { success: true, validation: object };
  } catch (error: any) {
    console.error("[AI] Fatal Validation Error:", error);

    // Reset to PENDING_AI if it failed so we can try again later, or mark as REJECTED
    await db
      .update(disasterReports)
      .set({ status: "REJECTED" }) // Or keep as PENDING_AI
      .where(eq(disasterReports.id, reportId));

    return { error: `Gagal melakukan validasi AI: ${error.message}` };
  }
}
