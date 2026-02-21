"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback, useRef } from "react";
import { ReportDialog } from "./ReportDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Fix for default marker icons
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Report {
  id: string;
  disasterType: string;
  severityLevel: number;
  description: string | null;
  location: { lat: number; lng: number };
  status: string;
  createdAt: string | Date | null;
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  initialReports?: Report[];
}

function MapEvents({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const handleEvent = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng);
    };

    map.on("click", handleEvent);
    map.on("contextmenu", handleEvent);

    return () => {
      map.off("click", handleEvent);
      map.off("contextmenu", handleEvent);
    };
  }, [map, onMapClick]);

  return null;
}

export default function MapView({
  center = [-6.2088, 106.8456], // Jakarta
  zoom = 13,
  initialReports = [],
}: MapViewProps) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // State for the confirmation popup on map click
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const popupMarkerRef = useRef<L.Marker>(null);

  const supabase = createClient();

  useEffect(() => {
    setReports(initialReports);
  }, [initialReports]);

  useEffect(() => {
    const channel = supabase
      .channel("disaster_reports_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "disaster_reports",
        },
        (payload) => {
          setReports((prev) => [payload.new as Report, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleMapAction = useCallback((latlng: L.LatLng) => {
    setSelectedCoords({ lat: latlng.lat, lng: latlng.lng });
    setShowConfirmPopup(true);
    // Explicitly open the popup after state update is usually handled by Leaflet's Marker system
  }, []);

  const confirmReport = () => {
    setShowConfirmPopup(false);
    setIsReportOpen(true);
  };

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden border group">
      {/* Floating Action Button */}
      <div className="absolute top-4 right-4 z-1000">
        <Button
          variant="secondary"
          size="sm"
          className="shadow-md border font-bold bg-white hover:bg-zinc-50 text-primary"
          onClick={() => {
            handleMapAction(L.latLng(center[0], center[1]));
            toast.info("Tentukan lokasi laporan pada peta.");
          }}
        >
          Lapor Bahaya
        </Button>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEvents onMapClick={handleMapAction} />

        {/* Existing Reports */}
        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.location.lat, report.location.lng]}
          >
            <Popup>
              <div className="flex flex-col gap-1 min-w-[150px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-primary">
                    {report.disasterType}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      report.severityLevel >= 4
                        ? "bg-red-100 text-red-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    Lv. {report.severityLevel}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground m-0 leading-tight">
                  {report.description || "Tidak ada deskripsi."}
                </p>
                <div className="mt-2 pt-2 border-t text-[9px] text-zinc-400 flex justify-between items-center">
                  <span className="capitalize">
                    {report.status.toLowerCase().replace("_", " ")}
                  </span>
                  <span>
                    {new Date(report.createdAt!).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 2-Step Confirmation Marker */}
        {showConfirmPopup && selectedCoords && (
          <Marker
            position={[selectedCoords.lat, selectedCoords.lng]}
            ref={popupMarkerRef}
            eventHandlers={{
              add: (e) => {
                e.target.openPopup();
              },
            }}
          >
            <Popup className="report-confirm-popup">
              <div className="flex flex-col gap-2 p-1">
                <div className="text-xs font-bold text-zinc-700">
                  Lapor bencana di titik ini?
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {selectedCoords.lat.toFixed(5)},{" "}
                  {selectedCoords.lng.toFixed(5)}
                </div>
                <Button
                  size="sm"
                  className="h-7 text-[11px] w-full"
                  onClick={confirmReport}
                >
                  Ya, Lapor Sekarang
                </Button>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <ReportDialog
        isOpen={isReportOpen}
        onOpenChange={setIsReportOpen}
        coords={selectedCoords}
      />
    </div>
  );
}
