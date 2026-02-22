export interface Report {
  id: string;
  disasterType: string;
  severityLevel: number;
  description: string | null;
  imageUrl: string | null;
  location: { lat: number; lng: number };
  status: string;
  aiReasoning?: string | null;
  createdAt: string | Date | null;
}
