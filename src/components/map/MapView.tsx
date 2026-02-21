"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet when using Next.js/Webpack
// See: https://github.com/Leaflet/Leaflet/issues/4968#issuecomment-483402699
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
}

export default function MapView({
  center = [-6.2088, 106.8456], // Default to Jakarta
  zoom = 13,
}: MapViewProps) {
  return (
    <div className="h-full w-full rounded-lg overflow-hidden border">
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
        <Marker position={center}>
          <Popup>Lokasi kamu / Posko terdekat.</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
