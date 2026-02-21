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
    const matches = value.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (!matches) return { lat: 0, lng: 0 };
    return { lng: parseFloat(matches[1]), lat: parseFloat(matches[2]) };
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
