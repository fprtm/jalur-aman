import { MapClient } from "@/components/map/MapClient";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getReports } from "@/lib/actions/report-actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const reports = await getReports();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b px-6 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          Jalur Aman
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:inline-block">
            {user.email}
          </span>
          <form action="/auth/signout" method="post">
            <Button variant="ghost" size="sm">
              Sign Out
            </Button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 md:p-6 gap-4 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
          {/* Stats / Feed Sidebar */}
          <div className="md:col-span-1 flex flex-col gap-4 overflow-y-auto border-r pr-4">
            <h2 className="text-lg font-semibold px-1">Laporan Terkini</h2>
            <div className="flex flex-col gap-3">
              {reports.length === 0 ? (
                <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                  <p className="text-sm text-muted-foreground text-center">
                    Belum ada laporan bencana.
                  </p>
                </div>
              ) : (
                reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3 rounded-xl border bg-card text-card-foreground shadow-sm hover:border-primary/50 transition-colors"
                  >
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
                    <div className="mt-2 text-[9px] text-muted-foreground">
                      {new Date(report.createdAt!).toLocaleString("id-ID")}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-auto p-3 bg-zinc-50 rounded-lg border border-dashed text-center">
              <p className="text-[11px] text-zinc-500 font-medium">
                Klik kanan atau tahan pada peta untuk melapor
              </p>
            </div>
          </div>

          {/* Map Area */}
          <div className="md:col-span-3 h-full min-h-[400px]">
            <MapClient initialReports={reports} />
          </div>
        </div>
      </main>
    </div>
  );
}
