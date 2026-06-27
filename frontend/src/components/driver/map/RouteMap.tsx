import { useEffect } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { CongestionZone, GeoPoint } from "@/features/driver/types";

export type MapMarkerKind = "pickup" | "dropoff" | "driver" | "origin" | "target";

export interface MapMarker {
  position: GeoPoint;
  kind: MapMarkerKind;
  label?: string;
  order?: number;
}

interface RouteMapProps {
  markers: MapMarker[];
  route?: GeoPoint[];
  congestionZones?: CongestionZone[];
  /** Tailwind height class for the map wrapper. */
  heightClass?: string;
}

const MARKER_COLORS: Record<MapMarkerKind, string> = {
  pickup: "#10b981",
  dropoff: "#3b82f6",
  driver: "#f59e0b",
  origin: "#6366f1",
  target: "#ef4444",
};

const SEVERITY_COLORS: Record<CongestionZone["severity"], string> = {
  low: "#facc15",
  medium: "#fb923c",
  high: "#ef4444",
};

function makeIcon(kind: MapMarkerKind, order?: number): L.DivIcon {
  const bg = MARKER_COLORS[kind];
  const inner = kind === "driver" ? "🚗" : order != null ? String(order) : "";
  const size = kind === "driver" || kind === "target" ? 34 : 26;
  let ring = "box-shadow:0 1px 3px rgba(0,0,0,.3);";
  if (kind === "driver") ring = "box-shadow:0 0 0 4px rgba(245,158,11,.3);";
  if (kind === "target") ring = "box-shadow:0 0 0 5px rgba(239,68,68,.35);";
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;${ring}">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function toLatLng(p: GeoPoint): [number, number] {
  return [p.lat, p.lng];
}

function FitBounds({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(toLatLng(points[0]), 14);
      return;
    }
    const bounds = L.latLngBounds(points.map(toLatLng));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export function RouteMap({
  markers,
  route = [],
  congestionZones = [],
  heightClass = "h-80",
}: RouteMapProps) {
  const allPoints: GeoPoint[] = [
    ...markers.map((m) => m.position),
    ...route,
  ];
  const center = allPoints[0] ?? { lat: 10.7769, lng: 106.7009 };

  return (
    <div className={`${heightClass} w-full overflow-hidden rounded-lg border`}>
      <MapContainer
        center={toLatLng(center)}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {congestionZones.map((zone, i) => (
          <Circle
            key={`zone-${i}`}
            center={[zone.lat, zone.lng]}
            radius={zone.radiusM}
            pathOptions={{
              color: SEVERITY_COLORS[zone.severity],
              fillColor: SEVERITY_COLORS[zone.severity],
              fillOpacity: 0.2,
              weight: 1,
            }}
          >
            {zone.label ? <Popup>{zone.label}</Popup> : null}
          </Circle>
        ))}

        {route.length >= 2 ? (
          <Polyline
            positions={route.map(toLatLng)}
            pathOptions={{ color: "#6366f1", weight: 4, opacity: 0.8 }}
          />
        ) : null}

        {markers.map((m, i) => (
          <Marker key={`marker-${i}`} position={toLatLng(m.position)} icon={makeIcon(m.kind, m.order)}>
            {m.label ? <Popup>{m.label}</Popup> : null}
          </Marker>
        ))}

        <FitBounds points={allPoints} />
      </MapContainer>
    </div>
  );
}
