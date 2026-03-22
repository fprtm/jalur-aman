import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  console.log("--- Shelter Debug ---");
  try {
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'shelters'
      );
    `;
    console.log("Table 'shelters' exists:", tableExists[0].exists);

    const count = await sql`SELECT count(*) FROM shelters;`;
    console.log("Shelter count:", count[0].count);

    if (count[0].count > 0) {
      const samples =
        await sql`SELECT name, ST_AsText(location::geometry) as loc FROM shelters LIMIT 5;`;
      console.log("Sample shelters:", samples);
    } else {
      console.log("NO SHELTERS FOUND. Re-seeding...");
    }
  } catch (e: any) {
    console.error("Error during debug:", e.message);
  } finally {
    await sql.end();
  }
}

main();
