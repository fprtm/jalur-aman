import { getNearestShelter, getShelters } from "../lib/actions/shelter-actions";

async function main() {
  console.log("--- Testing Shelter Actions ---");

  const all = await getShelters();
  console.log("All shelters (raw):", all.length, all[0]);

  // Jakarta center coords
  const lat = -6.2088;
  const lng = 106.8456;

  console.log(`Searching nearest to: ${lat}, ${lng}...`);
  const nearest = await getNearestShelter(lat, lng);
  console.log("Nearest shelter result:", nearest);

  process.exit(0);
}

main();
