import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  try {
    const result = await sql`SELECT count(*) FROM shelters;`;
    console.log("Shelter count:", result[0].count);
  } catch (e: any) {
    console.error("Error:", e.message);
  } finally {
    await sql.end();
  }
}

main();
