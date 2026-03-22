"use server";

import { db } from "@/db";
import { shelters } from "@/db/schemas/shelters";
import { sql } from "drizzle-orm";

export async function getShelters() {
  try {
    const allShelters = await db.query.shelters.findMany();
    return allShelters;
  } catch (error) {
    console.error("Error fetching shelters:", error);
    return [];
  }
}

export async function getNearestShelter(lat: number, lng: number) {
  try {
    // Using ST_Distance to find the nearest shelter
    // We cast the location to geography for accurate meter-based distancing
    const nearest = await db.execute(
      sql`SELECT id, name, description, type, 
                 ST_X(location::geometry) as lng, 
                 ST_Y(location::geometry) as lat,
                 ST_Distance(location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) as distance_meters
          FROM shelters
          ORDER BY location <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          LIMIT 1`,
    );

    return nearest[0] || null;
  } catch (error) {
    console.error("Error finding nearest shelter:", error);
    return null;
  }
}
