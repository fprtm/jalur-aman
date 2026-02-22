import {
  customType,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const reportStatusEnum = pgEnum("report_status", [
  "PENDING_AI",
  "VERIFIED",
  "REJECTED",
]);

const geographyPoint = customType<{
  data: { lat: number; lng: number };
  driverData: string;
}>({
  dataType() {
    return "geography(Point, 4326)";
  },
  toDriver(value) {
    return `POINT(${value.lng} ${value.lat})`;
  },
  fromDriver(value) {
    if (!value) return { lat: 0, lng: 0 };

    // Handle WKT: POINT(lng lat)
    const wktMatches = value.match(/POINT\(([-\d.]+) ([-\d.]+)\)/i);
    if (wktMatches) {
      return { lng: parseFloat(wktMatches[1]), lat: parseFloat(wktMatches[2]) };
    }

    // Handle WKB (Hex): Starts with Little Endian 01, Point type 01, SRID 4326 (E6100000)
    // Common pattern for SRID 4326 Point: 0101000020E6100000...
    if (
      typeof value === "string" &&
      value.length >= 50 &&
      value.toUpperCase().includes("E610")
    ) {
      try {
        const hex = value.toUpperCase();
        const coordsHex = hex.includes("0101000020E6100000")
          ? hex.split("0101000020E6100000")[1]
          : hex.substring(hex.length - 32);

        const bytes = new Uint8Array(
          coordsHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
        );
        const view = new DataView(bytes.buffer);

        const lng = view.getFloat64(0, true);
        const lat = view.getFloat64(8, true);

        return { lat, lng };
      } catch (e) {
        console.error("WKB Parse error:", e);
      }
    }

    return { lat: 0, lng: 0 };
  },
});

export const disasterReports = pgTable("disaster_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),

  location: geographyPoint("location").notNull(),

  disasterType: varchar("disaster_type", { length: 50 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),

  severityLevel: integer("severity_level"),
  status: reportStatusEnum("status").default("PENDING_AI"),
  aiConfidenceScore: doublePrecision("ai_confidence_score"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
