import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schemas";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL!;

// Singleton pattern for Next.js HMR
const globalForDb = global as unknown as {
  client: ReturnType<typeof postgres> | undefined;
};

export const client =
  globalForDb.client ??
  postgres(connectionString, {
    prepare: false,
    max: 1, // Supabase pooling is sensitive; keep this low for serverless/dev
  });

if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });
