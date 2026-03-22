import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { geographyPoint } from "./disasterReports";

export const shelterTypeEnum = pgEnum("shelter_type", [
  "SHELTER",
  "HOSPITAL",
  "POLICE_STATION",
  "FIRE_STATION",
  "SAFE_ZONE",
]);

export const shelters = pgTable("shelters", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: shelterTypeEnum("type").default("SHELTER").notNull(),

  location: geographyPoint("location").notNull(),

  capacity: integer("capacity"),
  currentOccupancy: integer("current_occupancy").default(0),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
