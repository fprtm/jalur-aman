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

    console.log(
      `[AI] Status updated to VALIDATING for ${reportId}. Calling Gemini...`,
    );

    // Call Gemini via Vercel AI SDK
    const { object } = await generateObject({
      model: google("gemini-2.5-flash-lite"),
      schema: validationSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
Kamu adalah sistem AI validasi laporan bencana.

Tugas:
Evaluasi apakah foto yang diberikan benar-benar merepresentasikan laporan berikut.

Data Laporan:
- Jenis Bencana: ${report.disasterType}
- Deskripsi: ${report.description || "Tidak ada deskripsi"}

Instruksi Analisis:
1. Identifikasi objek, kondisi lingkungan, dan indikasi visual utama pada gambar.
2. Cocokkan elemen visual dengan jenis bencana yang dilaporkan.
3. Periksa konsistensi antara foto dan deskripsi.
4. Deteksi kemungkinan:
   - Foto tidak relevan
   - Foto lama / generik
   - Foto tidak menunjukkan kejadian bencana
5. Jika bukti visual tidak cukup jelas, turunkan skor kepercayaan.

Output yang diminta:
- confidenceScore: angka 0.0 – 1.0
- isValid: boolean (true jika kemungkinan besar sesuai)
- reasoning: penjelasan singkat berbasis observasi visual (bukan asumsi)

Aturan penting:
- Jangan menebak di luar bukti visual.
- Jangan mengarang detail yang tidak terlihat.
- Jika gambar ambigu, beri skor rendah.
`,
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

    // Update with REJECTED status and provide the error as reasoning so user knows why
    await db
      .update(disasterReports)
      .set({
        status: "REJECTED",
        aiReasoning: `Gagal validasi AI: ${error.message || "Kesalahan teknis pada engine AI."}`,
      })
      .where(eq(disasterReports.id, reportId));

    return { error: `Gagal melakukan validasi AI: ${error.message}` };
  }
}
