"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback, useRef } from "react";
import { ReportDialog } from "./ReportDialog";
import { MapSearch } from "./MapSearch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RoutingEngine } from "./RoutingEngine";
import { Crosshair, Navigation, Shield, MapPin, Loader2 } from "lucide-react";
import { getNearestShelter } from "@/lib/actions/shelter-actions";

// Fix for default marker icons
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

import { Report } from "@/types/report";

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  initialReports?: Report[];
  initialShelters?: any[];
  selectedReportId?: string | null;
}

// Controller component to move map programmatically
function MapController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), {
        animate: true,
        duration: 1,
      });
    }
  }, [center, zoom, map]);
  return null;
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
  center: initialCenter = [-6.2088, 106.8456], // Jakarta
  zoom: initialZoom = 13,
  initialReports = [],
  initialShelters = [],
  selectedReportId,
}: MapViewProps) {
  // Use reports from props (managed by DashboardContainer)
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [routeWaypoints, setRouteWaypoints] = useState<[number, number][]>([]);

  // Refs to markers to open popups programmatically
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const mapRef = useRef<L.Map | null>(null);

  // Current view state for programmatic control
  const [viewState, setViewState] = useState({
    center: initialCenter,
    zoom: initialZoom,
  });

  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const popupMarkerRef = useRef<L.Marker>(null);

  // Fix for "blue map" / blank tiles on load
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, []);

  // Handle selected report change from sidebar
  useEffect(() => {
    if (selectedReportId) {
      const report = initialReports.find((r) => r.id === selectedReportId);
      if (report && mapRef.current) {
        const targetCoords: [number, number] = [
          report.location.lat,
          report.location.lng,
        ];

        // Sync viewState so MapController doesn't snap us back
        setViewState({
          center: targetCoords,
          zoom: 16,
        });

        // Pan to location
        mapRef.current.flyTo(targetCoords, 16, {
          duration: 1.5,
        });

        // Open popup after a short delay to allow move to finish
        setTimeout(() => {
          const marker = markerRefs.current[selectedReportId];
          if (marker) {
            marker.openPopup();
          }
        }, 1600);
      }
    }
  }, [selectedReportId, initialReports]);

  const handleMapAction = useCallback((latlng: L.LatLng) => {
    setSelectedCoords({ lat: latlng.lat, lng: latlng.lng });
    setShowConfirmPopup(true);
  }, []);

  const confirmReport = () => {
    setShowConfirmPopup(false);
    setIsReportOpen(true);
  };

  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung oleh browser Anda.");
      return;
    }

    toast.info("Mencari lokasi akurat Anda...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log("High accuracy position found:", {
          latitude,
          longitude,
          accuracy,
        });

        setViewState({
          center: [latitude, longitude],
          zoom: 17,
        });
        setLocationAccuracy(accuracy);

        if (accuracy > 100) {
          toast.warning(
            `Lokasi ditemukan, tapi kurang akurat (±${Math.round(accuracy)}m).`,
          );
        } else {
          toast.success("Lokasi akurat ditemukan!");
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        let message = "Gagal mendapatkan lokasi.";
        if (error.code === 1) message = "Akses lokasi ditolak.";
        else if (error.code === 3) message = "Waktu pencarian lokasi habis.";
        toast.error(`${message} Pastikan GPS aktif.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const handleSearchResult = (lat: number, lng: number) => {
    setViewState({
      center: [lat, lng],
      zoom: 16,
    });
  };

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden border group">
      {/* Search Header Overlay */}
      <div className="absolute top-4 left-14 right-4 z-1000 flex flex-col sm:flex-row gap-2 pointer-events-none">
        <MapSearch
          onLocationSelect={handleSearchResult}
          className="pointer-events-auto shadow-md"
        />

        <div className="flex gap-2 pointer-events-auto ml-auto sm:ml-0">
          <Button
            variant="secondary"
            size="icon"
            className="bg-white hover:bg-zinc-50 shadow-md h-9 w-9"
            onClick={handleLocateMe}
            title="Lokasi Saya"
          >
            <Navigation className="h-4 w-4 text-primary" />
          </Button>

          <Button
            variant="default"
            size="sm"
            className="shadow-md border font-bold bg-primary hover:bg-primary/90 text-white h-9 px-4 hidden sm:flex items-center gap-2"
            onClick={async () => {
              if (!viewState.center) return;
              toast.promise(
                getNearestShelter(viewState.center[0], viewState.center[1]),
                {
                  loading: "Mencari jalur aman...",
                  success: (shelter: any) => {
                    if (shelter) {
                      setRouteWaypoints([
                        [viewState.center[0], viewState.center[1]],
                        [shelter.lat, shelter.lng],
                      ]);
                      return `Ditemukan: ${shelter.name}`;
                    }
                    return "Tidak ada tempat aman terdekat.";
                  },
                  error: "Gagal mencari jalur.",
                },
              );
            }}
          >
            <Shield className="h-4 w-4" />
            Cari Jalur Aman
          </Button>
        </div>
      </div>

      <MapContainer
        center={viewState.center}
        zoom={viewState.zoom}
        scrollWheelZoom={true}
        className="h-full w-full"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController center={viewState.center} zoom={viewState.zoom} />
        <MapEvents onMapClick={handleMapAction} />

        {routeWaypoints.length >= 2 && (
          <RoutingEngine waypoints={routeWaypoints} />
        )}

        {/* User Location Accuracy Circle */}
        {locationAccuracy && (
          <Circle
            center={viewState.center}
            radius={locationAccuracy}
            pathOptions={{
              fillColor: "blue",
              fillOpacity: 0.1,
              color: "blue",
              weight: 1,
              dashArray: "5, 5",
            }}
          />
        )}

        {/* Existing Reports */}
        {initialReports.map((report) => (
          <Marker
            key={report.id}
            position={[report.location.lat, report.location.lng]}
            ref={(el) => {
              markerRefs.current[report.id] = el;
            }}
          >
            <Popup>
              <div className="flex flex-col gap-1 min-w-[180px]">
                {/* Multi-image display */}
                {report.imageUrls && report.imageUrls.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1 mb-1">
                    {report.imageUrls.map((url, i) => (
                      <div
                        key={i}
                        className={`relative aspect-square rounded overflow-hidden border bg-zinc-50 ${i === 0 && report.imageUrls!.length % 2 !== 0 ? "col-span-2 aspect-video" : ""}`}
                      >
                        <img
                          src={url}
                          alt={`${report.disasterType} ${i + 1}`}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ))}
                  </div>
                ) : report.imageUrl ? (
                  <div className="relative aspect-video w-full mb-1 rounded overflow-hidden border bg-zinc-50">
                    <img
                      src={report.imageUrl}
                      alt={report.disasterType}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-primary">
                    {report.disasterType}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        report.status === "VERIFIED"
                          ? "bg-green-500"
                          : report.status === "REJECTED"
                            ? "bg-red-500"
                            : "bg-yellow-500 animate-pulse"
                      }`}
                    />
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
                </div>
                <p className="text-xs text-muted-foreground m-0 leading-tight">
                  {report.description || "Tidak ada deskripsi."}
                </p>
                {report.aiReasoning && (
                  <div className="mt-2 p-1.5 bg-zinc-50 rounded border border-zinc-100 text-[9px] italic text-zinc-500 leading-tight">
                    AI: {report.aiReasoning}
                  </div>
                )}
                <div className="mt-2 pt-2 border-t text-[9px] text-zinc-400 flex justify-between items-center">
                  <span className="capitalize">
                    {report.status.toLowerCase().replace("_", " ")}
                  </span>
                  <span>
                    {report.createdAt
                      ? new Date(report.createdAt).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Shelters / Safe Zones */}
        {initialShelters.map((shelter) => {
          // Determine color/icon based on type
          const isHospital = shelter.type === "HOSPITAL";

          return (
            <Marker
              key={shelter.id}
              position={[
                shelter.lat || shelter.location.lat,
                shelter.lng || shelter.location.lng,
              ]}
              icon={L.divIcon({
                className: "custom-div-icon",
                html: `<div class="p-1 px-2 rounded-full border-2 border-white shadow-lg flex items-center gap-1.5 ${isHospital ? "bg-blue-600" : "bg-green-600"} text-white font-bold text-[10px]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        <span>${isHospital ? "RS" : "SAFE"}</span>
                      </div>`,
                iconSize: [50, 24],
                iconAnchor: [25, 12],
              })}
            >
              <Popup>
                <div className="flex flex-col gap-1 min-w-[150px]">
                  <span className="font-bold text-sm text-green-700 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {shelter.name}
                  </span>
                  <p className="text-xs text-muted-foreground m-0">
                    {shelter.description || "Tempat aman evakuasi."}
                  </p>
                  <div className="mt-2 pt-2 border-t text-[10px] flex justify-between items-center text-zinc-500">
                    <span>Kapasitas: {shelter.capacity || "-"}</span>
                    <span className="bg-green-100 text-green-700 px-1.5 rounded">
                      Buka
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
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
