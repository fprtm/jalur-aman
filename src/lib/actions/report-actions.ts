"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { disasterReports } from "@/db/schemas";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const reportSchema = z.object({
  disasterType: z.string().min(1, "Jenis bencana harus diisi"),
  description: z.string().optional(),
  imageUrl: z
    .string()
    .url("Format URL gambar tidak valid")
    .optional()
    .or(z.literal("")),
  imageUrls: z.array(z.string().url()).optional(),
  severityLevel: z.number().min(1).max(5),
  lat: z.number(),
  lng: z.number(),
});

export async function createReport(formData: z.infer<typeof reportSchema>) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Silakan login terlebih dahulu." };
    }

    const validatedData = reportSchema.parse(formData);

    const [newReport] = await db
      .insert(disasterReports)
      .values({
        userId: user.id,
        disasterType: validatedData.disasterType,
        description: validatedData.description,
        imageUrl:
          validatedData.imageUrl || (validatedData.imageUrls?.[0] ?? null),
        imageUrls: validatedData.imageUrls || null,
        severityLevel: validatedData.severityLevel,
        location: { lat: validatedData.lat, lng: validatedData.lng },
        status: "PENDING_AI", // Default
      })
      .returning({ id: disasterReports.id });

    // Trigger AI validation in the background (no await to keep UI fast)
    // Or await it if you want the user to see the result immediately.
    // Let's await for now so the user sees the 'Verified' status quickly.
    if (newReport.id) {
      const { validateReportWithAI } = await import("./ai-actions");
      validateReportWithAI(newReport.id).catch(console.error);
    }

    revalidatePath("/");
    return { success: true, id: newReport.id };
  } catch (error) {
    console.error("Error creating report:", error);
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: "Gagal mengirim laporan. Silakan coba lagi." };
  }
}

export async function getReports() {
  try {
    const reports = await db.query.disasterReports.findMany({
      orderBy: (reports, { desc }) => [desc(reports.createdAt)],
    });
    return reports;
  } catch (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
}
