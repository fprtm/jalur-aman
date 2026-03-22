export interface Shelter {
  id: string;
  name: string;
  description: string | null;
  type:
    | "SHELTER"
    | "HOSPITAL"
    | "POLICE_STATION"
    | "FIRE_STATION"
    | "SAFE_ZONE";
  location: { lat: number; lng: number };
  capacity: number | null;
  currentOccupancy: number | null;
  createdAt: Date;
  updatedAt: Date;
}
