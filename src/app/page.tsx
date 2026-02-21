import { MapClient } from "@/components/map/MapClient";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
          <div className="md:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
            <h2 className="text-lg font-semibold px-1">Laporan Terkini</h2>
            <div className="flex flex-col gap-3">
              <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                <p className="text-sm text-muted-foreground">
                  Pilih lokasi pada peta untuk melihat detail atau melaporkan
                  kejadian.
                </p>
              </div>
            </div>
            <Button className="w-full mt-auto" variant="default">
              Lapor Bahaya
            </Button>
          </div>

          {/* Map Area */}
          <div className="md:col-span-3 h-full min-h-[400px]">
            <MapClient />
          </div>
        </div>
      </main>
    </div>
  );
}
