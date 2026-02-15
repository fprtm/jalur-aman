import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth";

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .references(() => authUsers.id, { onDelete: "cascade" })
    .primaryKey(),
  email: text("email"),
  metadata: jsonb("metadata"),
  trustScore: integer("trust_score").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
