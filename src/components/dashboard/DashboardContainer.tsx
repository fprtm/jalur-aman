"use client";

import { useEffect, useState } from "react";
import { MapClient } from "@/components/map/MapClient";
import { Report } from "@/types/report";
import { createClient } from "@/lib/supabase/client";

interface DashboardContainerProps {
  initialReports: any[];
}

export function DashboardContainer({
  initialReports: serverReports,
}: DashboardContainerProps) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>(() =>
    serverReports.map((r) => ({
      ...r,
      imageUrl: r.imageUrl || r.image_url,
      aiReasoning: r.aiReasoning || r.ai_reasoning,
      createdAt: r.createdAt || r.created_at,
    })),
  );

  const supabase = createClient();

  // Helper to parse WKB Hex from PostGIS to {lat, lng}
  const parseWKB = (wkb: string) => {
    if (typeof wkb !== "string" || wkb.length < 50) return null;
    try {
      const hex = wkb.toUpperCase();
      const coordsHex = hex.includes("0101000020E6100000")
        ? hex.split("0101000020E6100000")[1]
        : hex.substring(hex.length - 32);

      const bytes = new Uint8Array(
        coordsHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
      );
      const view = new DataView(bytes.buffer);
      return {
        lng: view.getFloat64(0, true),
        lat: view.getFloat64(8, true),
      };
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("dashboard_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "disaster_reports" },
        (payload) => {
          const newReport = payload.new as any;
          let location = newReport.location;
          if (typeof location === "string") {
            location = parseWKB(location) || { lat: 0, lng: 0 };
          }
          const mapped: Report = {
            ...newReport,
            location,
            imageUrl: newReport.image_url,
            aiReasoning: newReport.ai_reasoning,
            createdAt: newReport.created_at,
          };
          setReports((prev) => [mapped, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "disaster_reports" },
        (payload) => {
          const updated = payload.new as any;
          let location = updated.location;
          if (typeof location === "string") {
            location = parseWKB(location) || { lat: 0, lng: 0 };
          }
          const mapped: Report = {
            ...updated,
            location,
            imageUrl: updated.image_url,
            aiReasoning: updated.ai_reasoning,
            createdAt: updated.created_at,
          };
          setReports((prev) =>
            prev.map((r) => (r.id === mapped.id ? mapped : r)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <main className="flex-1 flex flex-col p-4 md:p-6 gap-4 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
        {/* Stats / Feed Sidebar */}
        <div className="md:col-span-1 flex flex-col gap-4 overflow-y-auto border-r pr-4">
          <h2 className="text-lg font-semibold px-1 text-zinc-800">
            Laporan Terkini
          </h2>
          <div className="flex flex-col gap-3 pb-20">
            {reports.length === 0 ? (
              <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                <p className="text-sm text-muted-foreground text-center">
                  Belum ada laporan bencana.
                </p>
              </div>
            ) : (
              reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReportId(report.id)}
                  className={`text-left p-3 rounded-xl border transition-all group overflow-hidden ${
                    selectedReportId === report.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-md"
                      : "bg-card hover:border-primary/50 shadow-sm"
                  }`}
                >
                  {report.imageUrl && (
                    <div className="relative aspect-video w-full mb-3 rounded-lg overflow-hidden border bg-zinc-50">
                      <img
                        src={report.imageUrl}
                        alt={report.disasterType}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">
                      {report.disasterType}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full ${
                        (report.severityLevel ?? 0) >= 4
                          ? "bg-red-100 text-red-700"
                          : (report.severityLevel ?? 0) >= 2
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      Lv. {report.severityLevel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {report.description || "Tidak ada deskripsi."}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground border-t pt-2 border-zinc-100">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          report.status === "VERIFIED"
                            ? "bg-green-500"
                            : report.status === "REJECTED"
                              ? "bg-red-500"
                              : report.status === "VALIDATING"
                                ? "bg-blue-500 animate-pulse"
                                : "bg-yellow-500 animate-pulse"
                        }`}
                      />
                      <span className="capitalize">
                        {report.status?.toLowerCase().replace("_", " ")}
                      </span>
                    </div>
                    <span>
                      {report.createdAt
                        ? new Date(report.createdAt).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </span>
                  </div>
                  {report.aiReasoning && (
                    <div className="mt-2 p-2 rounded bg-zinc-50 border border-zinc-100 text-[10px] italic text-zinc-600">
                      AI: {report.aiReasoning}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="mt-auto p-3 bg-zinc-50 rounded-lg border border-dashed text-center">
            <p className="text-[11px] text-zinc-500 font-medium">
              Klik kartu untuk fokus lokasi, atau klik kanan peta untuk melapor
            </p>
          </div>
        </div>

        {/* Map Area */}
        <div className="md:col-span-3 h-full min-h-[400px]">
          <MapClient
            initialReports={reports}
            selectedReportId={selectedReportId}
          />
        </div>
      </div>
    </main>
  );
}
