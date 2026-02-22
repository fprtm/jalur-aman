"use server";

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { disasterReports } from "@/db/schemas";
import { eq, and, ne, sql, count } from "drizzle-orm";

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

// Helper: Get user report history stats
async function getUserStats(userId: string) {
  const totalReports = await db
    .select({ count: count() })
    .from(disasterReports)
    .where(eq(disasterReports.userId, userId));

  const rejectedReports = await db
    .select({ count: count() })
    .from(disasterReports)
    .where(
      and(
        eq(disasterReports.userId, userId),
        eq(disasterReports.status, "REJECTED"),
      ),
    );

  const verifiedReports = await db
    .select({ count: count() })
    .from(disasterReports)
    .where(
      and(
        eq(disasterReports.userId, userId),
        eq(disasterReports.status, "VERIFIED"),
      ),
    );

  const total = totalReports[0]?.count ?? 0;
  const rejected = rejectedReports[0]?.count ?? 0;
  const verified = verifiedReports[0]?.count ?? 0;
  const hoaxRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

  return { total, rejected, verified, hoaxRate };
}

// Helper: Find nearby reports (within ~5km) in last 24 hours
async function getNearbyReports(
  lat: number,
  lng: number,
  excludeReportId: string,
) {
  const nearbyReports = await db.execute(
    sql`SELECT id, disaster_type, status, created_at
        FROM disaster_reports 
        WHERE id != ${excludeReportId}
        AND created_at > NOW() - INTERVAL '24 hours'
        AND ST_DWithin(
          location, 
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, 
          5000
        )
        ORDER BY created_at DESC
        LIMIT 10`,
  );
  return nearbyReports;
}

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
      `[AI] Status updated to VALIDATING for ${reportId}. Gathering context...`,
    );

    // --- Gather enrichment context ---
    const [userStats, nearbyReports] = await Promise.all([
      getUserStats(report.userId),
      getNearbyReports(report.location.lat, report.location.lng, reportId),
    ]);

    const nearbyContext =
      (nearbyReports as any[]).length > 0
        ? (nearbyReports as any[])
            .map(
              (r: any) =>
                `  - ${r.disaster_type} (${r.status}) pada ${new Date(r.created_at).toLocaleString("id-ID")}`,
            )
            .join("\n")
        : "  Tidak ada laporan lain dalam radius 5km dalam 24 jam terakhir.";

    const reportTime = report.createdAt
      ? new Date(report.createdAt).toLocaleString("id-ID", {
          weekday: "long",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        })
      : "Tidak diketahui";

    console.log(
      `[AI] Context gathered. User stats: ${JSON.stringify(userStats)}, Nearby: ${(nearbyReports as any[]).length} reports. Calling Gemini...`,
    );

    // --- Build enriched prompt ---
    const enrichedPrompt = `
Kamu adalah sistem AI validasi laporan bencana.

Tugas:
Evaluasi apakah foto-foto yang diberikan benar-benar merepresentasikan laporan berikut. Gunakan SEMUA konteks di bawah ini untuk menentukan keputusan.

═══════════════════════════════════
 DATA LAPORAN
═══════════════════════════════════
- Jenis Bencana: ${report.disasterType}
- Deskripsi: ${report.description || "Tidak ada deskripsi"}
- Tingkat Keparahan (1-5): ${report.severityLevel ?? "Tidak diset"}

═══════════════════════════════════
 DATA GEOGRAFIS
═══════════════════════════════════
- Latitude: ${report.location.lat}
- Longitude: ${report.location.lng}
- Waktu Laporan: ${reportTime}

═══════════════════════════════════
 PROFIL PELAPOR
═══════════════════════════════════
- Total Laporan yang Pernah Dibuat: ${userStats.total}
- Laporan Terverifikasi: ${userStats.verified}
- Laporan Ditolak (Hoax): ${userStats.rejected}
- Tingkat Hoax: ${userStats.hoaxRate}%

═══════════════════════════════════
 LAPORAN TERDEKAT (radius 5km, 24 jam terakhir)
═══════════════════════════════════
${nearbyContext}

═══════════════════════════════════
 INSTRUKSI ANALISIS
═══════════════════════════════════
1. Identifikasi objek, kondisi lingkungan, dan indikasi visual utama pada semua gambar yang disediakan.
2. Cocokkan elemen visual dengan jenis bencana yang dilaporkan.
3. Periksa konsistensi antara foto-foto tersebut dan deskripsi.
4. Pertimbangkan tingkat keparahan yang dilaporkan vs yang terlihat di foto.
5. Pertimbangkan profil pelapor:
   - Jika tingkat hoax tinggi (>30%), lebih skeptis terhadap laporan ini.
   - Jika pelapor memiliki rekam jejak baik, beri sedikit kelonggaran.
6. Pertimbangkan laporan terdekat:
   - Jika ada laporan bencana serupa di area yang sama, ini bisa jadi korroborasi (mendukung keaslian).
   - Jika tidak ada laporan lain di area tersebut, tidak langsung berarti palsu, tapi perlu bukti visual yang lebih meyakinkan.
7. Deteksi kemungkinan:
   - Foto tidak relevan atau diambil dari internet
   - Foto lama / generik / screenshot
   - Foto tidak menunjukkan kejadian bencana aktif
8. Jika bukti visual tidak cukup jelas, turunkan skor kepercayaan.

Output yang diminta:
- confidenceScore: angka 0.0 – 1.0
- isValid: boolean (true jika kemungkinan besar sesuai)
- reasoning: penjelasan singkat berbasis observasi visual DAN konteks data di atas (bukan asumsi)

Aturan penting:
- Jangan menebak di luar bukti visual.
- Jangan mengarang detail yang tidak terlihat.
- Jika gambar ambigu, beri skor rendah.
- Sertakan faktor kontekstual (profil pelapor, laporan terdekat) dalam reasoning.
`;

    // Prepare image parts for Gemini
    const imagesToSend =
      report.imageUrls && report.imageUrls.length > 0
        ? report.imageUrls
        : report.imageUrl
          ? [report.imageUrl]
          : [];

    if (imagesToSend.length === 0) {
      throw new Error("Tidak ada gambar untuk divalidasi.");
    }

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
              text: enrichedPrompt,
            },
            ...imagesToSend.map((url) => ({
              type: "image" as const,
              image: url,
            })),
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
