"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// Fix for routing icon error
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface RoutingEngineProps {
  waypoints: [number, number][]; // [[lat, lng], [lat, lng]]
  onRouteFound?: (route: any) => void;
}

export function RoutingEngine({ waypoints, onRouteFound }: RoutingEngineProps) {
  const map = useMap();
  const routingControlRef = useRef<any>(null);

  useEffect(() => {
    if (!map || waypoints.length < 2) return;

    // Remove existing routing control if any
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    const control = L.Routing.control({
      waypoints: waypoints.map((wp) => L.latLng(wp[0], wp[1])),
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      lineOptions: {
        styles: [{ color: "#2563eb", weight: 6, opacity: 0.8 }],
        extendToWaypoints: true,
        missingRouteTolerance: 100,
      },
      // @ts-ignore - plugin types might be outdated
      show: false,
      // @ts-ignore
      plan: L.Routing.plan(
        waypoints.map((wp) => L.latLng(wp[0], wp[1])),
        {
          createMarker: () => false,
        },
      ),
    }).addTo(map);

    control.on("routesfound", (e) => {
      const routes = e.routes;
      if (onRouteFound && routes.length > 0) {
        onRouteFound(routes[0]);
      }
    });

    routingControlRef.current = control;

    return () => {
      if (routingControlRef.current && map) {
        map.removeControl(routingControlRef.current);
      }
    };
  }, [map, waypoints, onRouteFound]);

  return null;
}
