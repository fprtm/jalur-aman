"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamically import MapView with SSR disabled
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-zinc-100 rounded-lg">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-full w-full absolute inset-0" />
        <span className="text-zinc-500 font-medium z-10">Memuat Peta...</span>
      </div>
    </div>
  ),
});

export function MapClient({ initialReports }: { initialReports: any[] }) {
  return <MapView initialReports={initialReports} />;
}
