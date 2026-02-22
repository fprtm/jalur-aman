import { MapClient } from "@/components/map/MapClient";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getReports } from "@/lib/actions/report-actions";
import { DashboardContainer } from "@/components/dashboard/DashboardContainer";

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
      <DashboardContainer initialReports={reports} />
    </div>
  );
}
