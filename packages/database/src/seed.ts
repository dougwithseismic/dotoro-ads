/**
 * Database seed script
 *
 * Seeds the database with sample data that matches the UI mock data patterns.
 * Run with: pnpm db:seed
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";
import { sql } from "drizzle-orm";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/dotoro";

console.log("Connecting to database...");
const client = postgres(connectionString);
const db = drizzle(client, { schema });

// Helper to generate UUIDs consistently for foreign key relationships
const uuids = {
  // Data sources
  dataSource1: "11111111-1111-1111-1111-111111111111",
  dataSource2: "22222222-2222-2222-2222-222222222222",
  dataSource3: "33333333-3333-3333-3333-333333333333",

  // Campaign templates
  template1: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  template2: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  template3: "cccccccc-cccc-cccc-cccc-cccccccccccc",

  // Ad group templates
  adGroup1: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  adGroup2: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  adGroup3: "ffffffff-ffff-ffff-ffff-ffffffffffff",
  adGroup4: "00000000-0001-0000-0000-000000000001",

  // Ad templates
  adTemplate1: "00000000-0002-0000-0000-000000000001",
  adTemplate2: "00000000-0002-0000-0000-000000000002",
  adTemplate3: "00000000-0002-0000-0000-000000000003",
  adTemplate4: "00000000-0002-0000-0000-000000000004",

  // Rules
  rule1: "00000000-0004-0000-0000-000000000001",
  rule2: "00000000-0004-0000-0000-000000000002",
  rule3: "00000000-0004-0000-0000-000000000003",

  // Generated campaigns
  campaign1: "00000000-0005-0000-0000-000000000001",
  campaign2: "00000000-0005-0000-0000-000000000002",
  campaign3: "00000000-0005-0000-0000-000000000003",
  campaign4: "00000000-0005-0000-0000-000000000004",
  campaign5: "00000000-0005-0000-0000-000000000005",
  campaign6: "00000000-0005-0000-0000-000000000006",

  // Ad accounts
  account1: "00000000-0006-0000-0000-000000000001",
  account2: "00000000-0006-0000-0000-000000000002",

  // Creatives
  creative1: "00000000-0007-0000-0000-000000000001",
  creative2: "00000000-0007-0000-0000-000000000002",
  creative3: "00000000-0007-0000-0000-000000000003",
};

// Helper to generate data row UUID from index
const dataRowUuid = (index: number) =>
  `00000000-0003-0000-0000-${String(index + 1).padStart(12, "0")}`;

// Sample product data matching the UI test mock data
// 120 rows across 11 brands with varied products and ad copy
const sampleProductData = [
  // Nike - Running (10 rows)
  { brand: "Nike", product: "Air Max 90", headline: "Run Fast", description: "Best shoe ever", display_url: "nike.com/airmax", final_url: "https://nike.com/shoes/air-max-90" },
  { brand: "Nike", product: "Air Max 90", headline: "Speed Up Your Run", description: "Top rated running shoe", display_url: "nike.com/airmax", final_url: "https://nike.com/shoes/air-max-90" },
  { brand: "Nike", product: "Air Max 90", headline: "Classic Comfort", description: "Iconic design meets modern tech", display_url: "nike.com/airmax", final_url: "https://nike.com/shoes/air-max-90" },
  { brand: "Nike", product: "Air Max 270", headline: "Max Air Cushioning", description: "Feel the difference", display_url: "nike.com/270", final_url: "https://nike.com/shoes/air-max-270" },
  { brand: "Nike", product: "Air Max 270", headline: "All Day Comfort", description: "Walk in clouds", display_url: "nike.com/270", final_url: "https://nike.com/shoes/air-max-270" },
  { brand: "Nike", product: "Free Run", headline: "Natural Movement", description: "Like running barefoot", display_url: "nike.com/free", final_url: "https://nike.com/shoes/free-run" },
  { brand: "Nike", product: "Free Run", headline: "Flexible Freedom", description: "Move without limits", display_url: "nike.com/free", final_url: "https://nike.com/shoes/free-run" },
  { brand: "Nike", product: "Pegasus 40", headline: "Trusted by Runners", description: "40 years of excellence", display_url: "nike.com/pegasus", final_url: "https://nike.com/shoes/pegasus-40" },
  { brand: "Nike", product: "Pegasus 40", headline: "Your Daily Trainer", description: "Mile after mile", display_url: "nike.com/pegasus", final_url: "https://nike.com/shoes/pegasus-40" },
  { brand: "Nike", product: "Pegasus 40", headline: "Responsive Cushion", description: "Spring in every step", display_url: "nike.com/pegasus", final_url: "https://nike.com/shoes/pegasus-40" },
  // Nike - Basketball (6 rows)
  { brand: "Nike", product: "Jordan 1", headline: "Jump High", description: "Classic basketball icon", display_url: "nike.com/jordan", final_url: "https://nike.com/shoes/jordan-1" },
  { brand: "Nike", product: "Jordan 1", headline: "Legendary Style", description: "Since 1985", display_url: "nike.com/jordan", final_url: "https://nike.com/shoes/jordan-1" },
  { brand: "Nike", product: "Jordan 1", headline: "Street Meets Court", description: "Versatile classics", display_url: "nike.com/jordan", final_url: "https://nike.com/shoes/jordan-1" },
  { brand: "Nike", product: "LeBron 21", headline: "King of the Court", description: "Dominate every game", display_url: "nike.com/lebron", final_url: "https://nike.com/shoes/lebron-21" },
  { brand: "Nike", product: "LeBron 21", headline: "Built for Champions", description: "Elite performance", display_url: "nike.com/lebron", final_url: "https://nike.com/shoes/lebron-21" },
  { brand: "Nike", product: "KD 16", headline: "Smooth Operator", description: "Precision on court", display_url: "nike.com/kd", final_url: "https://nike.com/shoes/kd-16" },
  // Nike - Training (3 rows)
  { brand: "Nike", product: "Metcon 9", headline: "Train Harder", description: "Built for CrossFit", display_url: "nike.com/metcon", final_url: "https://nike.com/shoes/metcon-9" },
  { brand: "Nike", product: "Metcon 9", headline: "Stability First", description: "Lift with confidence", display_url: "nike.com/metcon", final_url: "https://nike.com/shoes/metcon-9" },
  { brand: "Nike", product: "SuperRep", headline: "HIIT Ready", description: "Move in any direction", display_url: "nike.com/superrep", final_url: "https://nike.com/shoes/superrep" },
  // Adidas - Running (8 rows)
  { brand: "Adidas", product: "Ultraboost 23", headline: "Run Faster", description: "Premium comfort boost", display_url: "adidas.com/ultra", final_url: "https://adidas.com/shoes/ultraboost-23" },
  { brand: "Adidas", product: "Ultraboost 23", headline: "Energy Returns", description: "Boost technology", display_url: "adidas.com/ultra", final_url: "https://adidas.com/shoes/ultraboost-23" },
  { brand: "Adidas", product: "Ultraboost 23", headline: "Endless Energy", description: "Run longer, recover faster", display_url: "adidas.com/ultra", final_url: "https://adidas.com/shoes/ultraboost-23" },
  { brand: "Adidas", product: "Ultraboost Light", headline: "Lighter Than Ever", description: "Same boost, less weight", display_url: "adidas.com/ultra", final_url: "https://adidas.com/shoes/ultraboost-light" },
  { brand: "Adidas", product: "Adizero SL", headline: "Speed Training", description: "Race day ready", display_url: "adidas.com/adizero", final_url: "https://adidas.com/shoes/adizero-sl" },
  { brand: "Adidas", product: "Adizero SL", headline: "Fast Gets Faster", description: "Break your PR", display_url: "adidas.com/adizero", final_url: "https://adidas.com/shoes/adizero-sl" },
  { brand: "Adidas", product: "Supernova", headline: "Dream Runner", description: "Comfort for every mile", display_url: "adidas.com/supernova", final_url: "https://adidas.com/shoes/supernova" },
  { brand: "Adidas", product: "Supernova", headline: "Supportive Ride", description: "Perfect for beginners", display_url: "adidas.com/supernova", final_url: "https://adidas.com/shoes/supernova" },
  // Adidas - Lifestyle (7 rows)
  { brand: "Adidas", product: "Stan Smith", headline: "Timeless Style", description: "Since 1971", display_url: "adidas.com/stan", final_url: "https://adidas.com/shoes/stan-smith" },
  { brand: "Adidas", product: "Stan Smith", headline: "Clean & Classic", description: "Goes with everything", display_url: "adidas.com/stan", final_url: "https://adidas.com/shoes/stan-smith" },
  { brand: "Adidas", product: "Samba", headline: "Street Icon", description: "From pitch to pavement", display_url: "adidas.com/samba", final_url: "https://adidas.com/shoes/samba" },
  { brand: "Adidas", product: "Samba", headline: "Retro Vibes", description: "Classic never fades", display_url: "adidas.com/samba", final_url: "https://adidas.com/shoes/samba" },
  { brand: "Adidas", product: "Samba", headline: "Cult Favorite", description: "The shoe everyone wants", display_url: "adidas.com/samba", final_url: "https://adidas.com/shoes/samba" },
  { brand: "Adidas", product: "Gazelle", headline: "70s Revival", description: "Vintage aesthetic", display_url: "adidas.com/gazelle", final_url: "https://adidas.com/shoes/gazelle" },
  { brand: "Adidas", product: "Gazelle", headline: "Suede Classic", description: "Soft touch luxury", display_url: "adidas.com/gazelle", final_url: "https://adidas.com/shoes/gazelle" },
  // Puma - Running (5 rows)
  { brand: "Puma", product: "Deviate Nitro", headline: "Nitro Powered", description: "Maximum propulsion", display_url: "puma.com/nitro", final_url: "https://puma.com/shoes/deviate-nitro" },
  { brand: "Puma", product: "Deviate Nitro", headline: "Race to Win", description: "Elite carbon plate", display_url: "puma.com/nitro", final_url: "https://puma.com/shoes/deviate-nitro" },
  { brand: "Puma", product: "Velocity Nitro", headline: "Daily Speed", description: "Train fast every day", display_url: "puma.com/velocity", final_url: "https://puma.com/shoes/velocity-nitro" },
  { brand: "Puma", product: "Velocity Nitro", headline: "Grip & Go", description: "All surface traction", display_url: "puma.com/velocity", final_url: "https://puma.com/shoes/velocity-nitro" },
  { brand: "Puma", product: "Magnify Nitro", headline: "Plush Ride", description: "Maximum cushion", display_url: "puma.com/magnify", final_url: "https://puma.com/shoes/magnify-nitro" },
  // Puma - Lifestyle (5 rows)
  { brand: "Puma", product: "Suede Classic", headline: "Iconic Since 68", description: "Hip-hop heritage", display_url: "puma.com/suede", final_url: "https://puma.com/shoes/suede-classic" },
  { brand: "Puma", product: "Suede Classic", headline: "Street Legend", description: "Culture classic", display_url: "puma.com/suede", final_url: "https://puma.com/shoes/suede-classic" },
  { brand: "Puma", product: "RS-X", headline: "Chunky Cool", description: "Bold design statement", display_url: "puma.com/rsx", final_url: "https://puma.com/shoes/rs-x" },
  { brand: "Puma", product: "RS-X", headline: "Reinvention", description: "Running system reimagined", display_url: "puma.com/rsx", final_url: "https://puma.com/shoes/rs-x" },
  { brand: "Puma", product: "Palermo", headline: "Italian Flair", description: "Soccer meets street", display_url: "puma.com/palermo", final_url: "https://puma.com/shoes/palermo" },
  // Under Armour - Running & Training (8 rows)
  { brand: "Under Armour", product: "HOVR Machina", headline: "Zero Gravity Feel", description: "Energy return technology", display_url: "ua.com/hovr", final_url: "https://ua.com/shoes/hovr-machina" },
  { brand: "Under Armour", product: "HOVR Machina", headline: "Connected Running", description: "Track every step", display_url: "ua.com/hovr", final_url: "https://ua.com/shoes/hovr-machina" },
  { brand: "Under Armour", product: "HOVR Phantom", headline: "Plush Performance", description: "Soft yet responsive", display_url: "ua.com/phantom", final_url: "https://ua.com/shoes/hovr-phantom" },
  { brand: "Under Armour", product: "HOVR Phantom", headline: "All Day Runner", description: "Comfort for miles", display_url: "ua.com/phantom", final_url: "https://ua.com/shoes/hovr-phantom" },
  { brand: "Under Armour", product: "Charged Assert", headline: "Budget Champion", description: "Great value performer", display_url: "ua.com/charged", final_url: "https://ua.com/shoes/charged-assert" },
  { brand: "Under Armour", product: "Project Rock", headline: "Dwayne's Pick", description: "Train like The Rock", display_url: "ua.com/rock", final_url: "https://ua.com/shoes/project-rock" },
  { brand: "Under Armour", product: "Project Rock", headline: "Built Different", description: "Heavy lifting ready", display_url: "ua.com/rock", final_url: "https://ua.com/shoes/project-rock" },
  { brand: "Under Armour", product: "TriBase Reign", headline: "Ground Contact", description: "Feel the floor", display_url: "ua.com/tribase", final_url: "https://ua.com/shoes/tribase-reign" },
  // New Balance - Running (8 rows)
  { brand: "New Balance", product: "Fresh Foam 1080", headline: "Plush Perfection", description: "Premium daily trainer", display_url: "nb.com/1080", final_url: "https://nb.com/shoes/fresh-foam-1080" },
  { brand: "New Balance", product: "Fresh Foam 1080", headline: "Cloud-Like Comfort", description: "Ultra soft ride", display_url: "nb.com/1080", final_url: "https://nb.com/shoes/fresh-foam-1080" },
  { brand: "New Balance", product: "Fresh Foam 1080", headline: "Editor's Choice", description: "Award winning cushion", display_url: "nb.com/1080", final_url: "https://nb.com/shoes/fresh-foam-1080" },
  { brand: "New Balance", product: "FuelCell Rebel", headline: "Light & Fast", description: "Springy propulsion", display_url: "nb.com/rebel", final_url: "https://nb.com/shoes/fuelcell-rebel" },
  { brand: "New Balance", product: "FuelCell Rebel", headline: "Speed Machine", description: "Built for fast", display_url: "nb.com/rebel", final_url: "https://nb.com/shoes/fuelcell-rebel" },
  { brand: "New Balance", product: "FuelCell SC Elite", headline: "Race Day Carbon", description: "Elite performance", display_url: "nb.com/sc-elite", final_url: "https://nb.com/shoes/fuelcell-sc-elite" },
  { brand: "New Balance", product: "880v14", headline: "Reliable Runner", description: "Trusted classic", display_url: "nb.com/880", final_url: "https://nb.com/shoes/880v14" },
  { brand: "New Balance", product: "880v14", headline: "Everyday Excellence", description: "Never lets you down", display_url: "nb.com/880", final_url: "https://nb.com/shoes/880v14" },
  // New Balance - Lifestyle (7 rows)
  { brand: "New Balance", product: "550", headline: "Basketball Heritage", description: "80s court style", display_url: "nb.com/550", final_url: "https://nb.com/shoes/550" },
  { brand: "New Balance", product: "550", headline: "Streetwear Essential", description: "Clean silhouette", display_url: "nb.com/550", final_url: "https://nb.com/shoes/550" },
  { brand: "New Balance", product: "550", headline: "Hype Worthy", description: "Everyone wants these", display_url: "nb.com/550", final_url: "https://nb.com/shoes/550" },
  { brand: "New Balance", product: "574", headline: "Original Classic", description: "Everyday icon", display_url: "nb.com/574", final_url: "https://nb.com/shoes/574" },
  { brand: "New Balance", product: "574", headline: "Timeless Design", description: "Never out of style", display_url: "nb.com/574", final_url: "https://nb.com/shoes/574" },
  { brand: "New Balance", product: "2002R", headline: "Y2K Revival", description: "Retro future style", display_url: "nb.com/2002r", final_url: "https://nb.com/shoes/2002r" },
  { brand: "New Balance", product: "2002R", headline: "Premium Materials", description: "Suede & mesh", display_url: "nb.com/2002r", final_url: "https://nb.com/shoes/2002r" },
  // Reebok - Running/Training (5 rows)
  { brand: "Reebok", product: "Nano X4", headline: "CrossFit Ready", description: "Official CF shoe", display_url: "reebok.com/nano", final_url: "https://reebok.com/shoes/nano-x4" },
  { brand: "Reebok", product: "Nano X4", headline: "WOD Warrior", description: "Do it all trainer", display_url: "reebok.com/nano", final_url: "https://reebok.com/shoes/nano-x4" },
  { brand: "Reebok", product: "Nano X4", headline: "Box Jump Stable", description: "Land with confidence", display_url: "reebok.com/nano", final_url: "https://reebok.com/shoes/nano-x4" },
  { brand: "Reebok", product: "Floatride Energy", headline: "Lightweight Run", description: "Fast & comfortable", display_url: "reebok.com/float", final_url: "https://reebok.com/shoes/floatride-energy" },
  { brand: "Reebok", product: "Floatride Energy", headline: "Tempo Trainer", description: "Speed work ready", display_url: "reebok.com/float", final_url: "https://reebok.com/shoes/floatride-energy" },
  // Reebok - Lifestyle (5 rows)
  { brand: "Reebok", product: "Classic Leather", headline: "80s Original", description: "Retro running style", display_url: "reebok.com/classic", final_url: "https://reebok.com/shoes/classic-leather" },
  { brand: "Reebok", product: "Classic Leather", headline: "Heritage Style", description: "Clean & simple", display_url: "reebok.com/classic", final_url: "https://reebok.com/shoes/classic-leather" },
  { brand: "Reebok", product: "Club C", headline: "Tennis Heritage", description: "Court classic", display_url: "reebok.com/clubc", final_url: "https://reebok.com/shoes/club-c" },
  { brand: "Reebok", product: "Club C", headline: "Clean White", description: "Goes with anything", display_url: "reebok.com/clubc", final_url: "https://reebok.com/shoes/club-c" },
  { brand: "Reebok", product: "Pump Omni", headline: "Pump It Up", description: "Iconic tech returns", display_url: "reebok.com/pump", final_url: "https://reebok.com/shoes/pump-omni" },
  // ASICS - Running (9 rows)
  { brand: "ASICS", product: "Gel-Kayano 30", headline: "Stability King", description: "30 years of support", display_url: "asics.com/kayano", final_url: "https://asics.com/shoes/gel-kayano-30" },
  { brand: "ASICS", product: "Gel-Kayano 30", headline: "Overpronation Fix", description: "Guided gait support", display_url: "asics.com/kayano", final_url: "https://asics.com/shoes/gel-kayano-30" },
  { brand: "ASICS", product: "Gel-Nimbus 25", headline: "Cloud Nine Run", description: "Maximum cushion", display_url: "asics.com/nimbus", final_url: "https://asics.com/shoes/gel-nimbus-25" },
  { brand: "ASICS", product: "Gel-Nimbus 25", headline: "Plush Landing", description: "Soft impact absorption", display_url: "asics.com/nimbus", final_url: "https://asics.com/shoes/gel-nimbus-25" },
  { brand: "ASICS", product: "Gel-Nimbus 25", headline: "Long Run Ready", description: "Marathon favorite", display_url: "asics.com/nimbus", final_url: "https://asics.com/shoes/gel-nimbus-25" },
  { brand: "ASICS", product: "Novablast 4", headline: "Bouncy Fun", description: "Trampoline feel", display_url: "asics.com/nova", final_url: "https://asics.com/shoes/novablast-4" },
  { brand: "ASICS", product: "Novablast 4", headline: "Energy Return", description: "FF Blast Plus foam", display_url: "asics.com/nova", final_url: "https://asics.com/shoes/novablast-4" },
  { brand: "ASICS", product: "GT-2000 12", headline: "Reliable Support", description: "Everyday stability", display_url: "asics.com/gt2000", final_url: "https://asics.com/shoes/gt-2000-12" },
  { brand: "ASICS", product: "Metaspeed Sky+", headline: "Carbon Racer", description: "Sub-2 hour tech", display_url: "asics.com/meta", final_url: "https://asics.com/shoes/metaspeed-sky" },
  // Saucony - Running (7 rows)
  { brand: "Saucony", product: "Endorphin Speed", headline: "Daily Speedster", description: "Nylon plate power", display_url: "saucony.com/endo", final_url: "https://saucony.com/shoes/endorphin-speed" },
  { brand: "Saucony", product: "Endorphin Speed", headline: "Tempo King", description: "Fast day favorite", display_url: "saucony.com/endo", final_url: "https://saucony.com/shoes/endorphin-speed" },
  { brand: "Saucony", product: "Endorphin Pro", headline: "Race Day Elite", description: "Carbon plate racer", display_url: "saucony.com/pro", final_url: "https://saucony.com/shoes/endorphin-pro" },
  { brand: "Saucony", product: "Triumph 21", headline: "Plush Comfort", description: "Max cushion trainer", display_url: "saucony.com/triumph", final_url: "https://saucony.com/shoes/triumph-21" },
  { brand: "Saucony", product: "Triumph 21", headline: "PWRRUN+ Cloud", description: "Softest Saucony ever", display_url: "saucony.com/triumph", final_url: "https://saucony.com/shoes/triumph-21" },
  { brand: "Saucony", product: "Guide 16", headline: "Guided Ride", description: "Light stability", display_url: "saucony.com/guide", final_url: "https://saucony.com/shoes/guide-16" },
  { brand: "Saucony", product: "Kinvara 14", headline: "Minimal & Fast", description: "Natural feel runner", display_url: "saucony.com/kinvara", final_url: "https://saucony.com/shoes/kinvara-14" },
  // Brooks - Running (8 rows)
  { brand: "Brooks", product: "Ghost 15", headline: "Smooth Operator", description: "Neutral daily trainer", display_url: "brooks.com/ghost", final_url: "https://brooks.com/shoes/ghost-15" },
  { brand: "Brooks", product: "Ghost 15", headline: "DNA Loft Comfort", description: "Soft transitions", display_url: "brooks.com/ghost", final_url: "https://brooks.com/shoes/ghost-15" },
  { brand: "Brooks", product: "Ghost 15", headline: "Best Seller", description: "Fan favorite shoe", display_url: "brooks.com/ghost", final_url: "https://brooks.com/shoes/ghost-15" },
  { brand: "Brooks", product: "Glycerin 20", headline: "Premium Plush", description: "Luxury cushioning", display_url: "brooks.com/glycerin", final_url: "https://brooks.com/shoes/glycerin-20" },
  { brand: "Brooks", product: "Glycerin 20", headline: "Super Soft", description: "Pillow-like ride", display_url: "brooks.com/glycerin", final_url: "https://brooks.com/shoes/glycerin-20" },
  { brand: "Brooks", product: "Adrenaline GTS 23", headline: "GuideRails Support", description: "Motion control", display_url: "brooks.com/adrenaline", final_url: "https://brooks.com/shoes/adrenaline-gts-23" },
  { brand: "Brooks", product: "Adrenaline GTS 23", headline: "Podiatrist Pick", description: "Doctor recommended", display_url: "brooks.com/adrenaline", final_url: "https://brooks.com/shoes/adrenaline-gts-23" },
  { brand: "Brooks", product: "Hyperion Tempo", headline: "Speed Session", description: "Tempo day essential", display_url: "brooks.com/hyperion", final_url: "https://brooks.com/shoes/hyperion-tempo" },
  // Hoka - Running (11 rows)
  { brand: "Hoka", product: "Clifton 9", headline: "Marshmallow Run", description: "Light & cushioned", display_url: "hoka.com/clifton", final_url: "https://hoka.com/shoes/clifton-9" },
  { brand: "Hoka", product: "Clifton 9", headline: "Cloud Walking", description: "Maximalist comfort", display_url: "hoka.com/clifton", final_url: "https://hoka.com/shoes/clifton-9" },
  { brand: "Hoka", product: "Clifton 9", headline: "Nurse Favorite", description: "All day on feet", display_url: "hoka.com/clifton", final_url: "https://hoka.com/shoes/clifton-9" },
  { brand: "Hoka", product: "Bondi 8", headline: "Max Cushion", description: "Ultra plush ride", display_url: "hoka.com/bondi", final_url: "https://hoka.com/shoes/bondi-8" },
  { brand: "Hoka", product: "Bondi 8", headline: "Standing Support", description: "Perfect for workers", display_url: "hoka.com/bondi", final_url: "https://hoka.com/shoes/bondi-8" },
  { brand: "Hoka", product: "Bondi 8", headline: "Thick & Comfy", description: "Signature Hoka stack", display_url: "hoka.com/bondi", final_url: "https://hoka.com/shoes/bondi-8" },
  { brand: "Hoka", product: "Mach 5", headline: "Light Speed", description: "Fast but cushioned", display_url: "hoka.com/mach", final_url: "https://hoka.com/shoes/mach-5" },
  { brand: "Hoka", product: "Mach 5", headline: "Daily Racer", description: "Speed meets comfort", display_url: "hoka.com/mach", final_url: "https://hoka.com/shoes/mach-5" },
  { brand: "Hoka", product: "Speedgoat 5", headline: "Trail Beast", description: "Off-road champion", display_url: "hoka.com/speedgoat", final_url: "https://hoka.com/shoes/speedgoat-5" },
  { brand: "Hoka", product: "Speedgoat 5", headline: "Mountain Ready", description: "Vibram grip traction", display_url: "hoka.com/speedgoat", final_url: "https://hoka.com/shoes/speedgoat-5" },
  { brand: "Hoka", product: "Arahi 6", headline: "Stable & Light", description: "J-Frame support", display_url: "hoka.com/arahi", final_url: "https://hoka.com/shoes/arahi-6" },
  // On - Running (7 rows)
  { brand: "On", product: "Cloudmonster", headline: "Monster Cushion", description: "Maximum CloudTec", display_url: "on.com/monster", final_url: "https://on.com/shoes/cloudmonster" },
  { brand: "On", product: "Cloudmonster", headline: "Big Stack Energy", description: "Bouncy cloud pods", display_url: "on.com/monster", final_url: "https://on.com/shoes/cloudmonster" },
  { brand: "On", product: "Cloudsurfer", headline: "Swiss Engineering", description: "Helion foam tech", display_url: "on.com/surfer", final_url: "https://on.com/shoes/cloudsurfer" },
  { brand: "On", product: "Cloudsurfer", headline: "Smooth Ride", description: "Seamless transition", display_url: "on.com/surfer", final_url: "https://on.com/shoes/cloudsurfer" },
  { brand: "On", product: "Cloud 5", headline: "Everyday Essential", description: "Light & versatile", display_url: "on.com/cloud5", final_url: "https://on.com/shoes/cloud-5" },
  { brand: "On", product: "Cloud 5", headline: "Travel Companion", description: "Pack light, go far", display_url: "on.com/cloud5", final_url: "https://on.com/shoes/cloud-5" },
  { brand: "On", product: "Cloudflow 4", headline: "Race Ready", description: "Fast & responsive", display_url: "on.com/flow", final_url: "https://on.com/shoes/cloudflow-4" },
];

async function seed() {
  console.log("Seeding database...\n");

  // Clear existing data (in reverse order of dependencies)
  console.log("Clearing existing data...");
  await db.delete(schema.creativeTemplateLinks);
  await db.delete(schema.creativeTags);
  await db.delete(schema.creatives);
  await db.delete(schema.syncRecords);
  await db.delete(schema.generatedCampaigns);
  await db.delete(schema.templateRules);
  await db.delete(schema.rules);
  await db.delete(schema.adTemplates);
  await db.delete(schema.adGroupTemplates);
  await db.delete(schema.campaignTemplates);
  await db.delete(schema.columnMappings);
  await db.delete(schema.dataRows);
  await db.delete(schema.dataSources);
  await db.delete(schema.oauthTokens);
  await db.delete(schema.adAccounts);

  // ============================================
  // 1. DATA SOURCES
  // ============================================
  console.log("Seeding data sources...");
  await db.insert(schema.dataSources).values([
    {
      id: uuids.dataSource1,
      name: "Athletic Footwear Catalog",
      type: "csv",
      config: {
        originalFileName: "athletic_footwear_2025.csv",
        encoding: "utf-8",
        delimiter: ",",
        hasHeader: true,
        // Note: 120 rows across 11 brands (Nike, Adidas, Puma, Under Armour,
        // New Balance, Reebok, ASICS, Saucony, Brooks, Hoka, On)
      },
      createdAt: new Date("2025-01-10T09:00:00Z"),
      updatedAt: new Date("2025-01-15T14:30:00Z"),
    },
    {
      id: uuids.dataSource2,
      name: "Store Locations",
      type: "csv",
      config: {
        originalFileName: "store_locations.csv",
        encoding: "utf-8",
        delimiter: ",",
        hasHeader: true,
        // Note: No rows seeded for this data source
      },
      createdAt: new Date("2025-01-08T10:00:00Z"),
      updatedAt: new Date("2025-01-08T10:00:00Z"),
    },
    {
      id: uuids.dataSource3,
      name: "Holiday Promotions",
      type: "manual",
      config: {
        description: "Manual entry for holiday campaign data",
        // Note: No rows seeded for this data source
      },
      createdAt: new Date("2025-01-05T16:00:00Z"),
      updatedAt: new Date("2025-01-12T09:00:00Z"),
    },
  ]);

  // ============================================
  // 2. DATA ROWS (120 rows of sample product data)
  // ============================================
  console.log("Seeding data rows (120 rows)...");
  const dataRowValues = sampleProductData.map((data, index) => ({
    id: dataRowUuid(index),
    dataSourceId: uuids.dataSource1,
    rowIndex: index,
    rowData: data,
  }));
  await db.insert(schema.dataRows).values(dataRowValues);

  // ============================================
  // 3. COLUMN MAPPINGS
  // ============================================
  console.log("Seeding column mappings...");
  await db.insert(schema.columnMappings).values([
    {
      dataSourceId: uuids.dataSource1,
      sourceColumn: "Brand",
      normalizedName: "brand",
      dataType: "string",
    },
    {
      dataSourceId: uuids.dataSource1,
      sourceColumn: "Product",
      normalizedName: "product",
      dataType: "string",
    },
    {
      dataSourceId: uuids.dataSource1,
      sourceColumn: "Headline",
      normalizedName: "headline",
      dataType: "string",
    },
    {
      dataSourceId: uuids.dataSource1,
      sourceColumn: "Description",
      normalizedName: "description",
      dataType: "string",
    },
    {
      dataSourceId: uuids.dataSource1,
      sourceColumn: "Display URL",
      normalizedName: "display_url",
      dataType: "string",
    },
    {
      dataSourceId: uuids.dataSource1,
      sourceColumn: "Final URL",
      normalizedName: "final_url",
      dataType: "string",
    },
  ]);

  // ============================================
  // 4. CAMPAIGN TEMPLATES
  // ============================================
  console.log("Seeding campaign templates...");
  await db.insert(schema.campaignTemplates).values([
    {
      id: uuids.template1,
      name: "Summer Sale Template",
      platform: "reddit",
      structure: {
        objective: "CONVERSIONS",
        budget: {
          type: "daily",
          amount: 50,
          currency: "USD",
        },
        targeting: {
          subreddits: ["{target_subreddit}"],
          interests: ["shopping", "deals"],
        },
        schedule: {
          startDate: "2025-01-01",
          endDate: "2025-03-31",
        },
      },
      createdAt: new Date("2025-01-05T10:00:00Z"),
      updatedAt: new Date("2025-01-10T14:00:00Z"),
    },
    {
      id: uuids.template2,
      name: "Winter Campaign",
      platform: "google",
      structure: {
        objective: "AWARENESS",
        budget: {
          type: "daily",
          amount: 100,
          currency: "USD",
        },
        targeting: {
          keywords: ["{brand}", "{category}"],
          demographics: { ageRange: "25-54" },
        },
      },
      createdAt: new Date("2025-01-08T11:00:00Z"),
      updatedAt: new Date("2025-01-08T11:00:00Z"),
    },
    {
      id: uuids.template3,
      name: "Holiday Promo",
      platform: "facebook",
      structure: {
        objective: "CONVERSIONS",
        budget: {
          type: "lifetime",
          amount: 5000,
          currency: "USD",
        },
        targeting: {
          interests: ["holiday shopping", "gifts"],
          lookalike: true,
        },
      },
      createdAt: new Date("2025-01-12T09:00:00Z"),
      updatedAt: new Date("2025-01-14T16:00:00Z"),
    },
  ]);

  // ============================================
  // 5. AD GROUP TEMPLATES
  // ============================================
  console.log("Seeding ad group templates...");
  await db.insert(schema.adGroupTemplates).values([
    {
      id: uuids.adGroup1,
      campaignTemplateId: uuids.template1,
      name: "Interest Targeting",
      settings: {
        bidStrategy: "AUTO",
        placement: ["feed", "sidebar"],
      },
    },
    {
      id: uuids.adGroup2,
      campaignTemplateId: uuids.template1,
      name: "Retargeting",
      settings: {
        bidStrategy: "MANUAL",
        bidAmount: 0.75,
        placement: ["feed"],
      },
    },
    {
      id: uuids.adGroup3,
      campaignTemplateId: uuids.template2,
      name: "Search Ads",
      settings: {
        bidStrategy: "TARGET_CPA",
        targetCpa: 25,
      },
    },
    {
      id: uuids.adGroup4,
      campaignTemplateId: uuids.template2,
      name: "Display Ads",
      settings: {
        bidStrategy: "TARGET_ROAS",
        targetRoas: 400,
      },
    },
  ]);

  // ============================================
  // 6. AD TEMPLATES
  // ============================================
  console.log("Seeding ad templates...");
  await db.insert(schema.adTemplates).values([
    {
      id: uuids.adTemplate1,
      adGroupTemplateId: uuids.adGroup1,
      headline: "{headline}",
      description: "{description}",
      variables: {
        placeholders: [
          { name: "headline", type: "text", sourceColumn: "headline" },
          { name: "description", type: "text", sourceColumn: "description" },
        ],
      },
    },
    {
      id: uuids.adTemplate2,
      adGroupTemplateId: uuids.adGroup1,
      headline: "Shop {brand} - {product}",
      description: "{description}. Visit {display_url}",
      variables: {
        placeholders: [
          { name: "brand", type: "text", sourceColumn: "brand" },
          { name: "product", type: "text", sourceColumn: "product" },
          { name: "description", type: "text", sourceColumn: "description" },
          { name: "display_url", type: "text", sourceColumn: "display_url" },
        ],
      },
    },
    {
      id: uuids.adTemplate3,
      adGroupTemplateId: uuids.adGroup2,
      headline: "Still thinking about {product}?",
      description: "Come back and get it before it's gone!",
      variables: {
        placeholders: [
          { name: "product", type: "text", sourceColumn: "product" },
        ],
      },
    },
    {
      id: uuids.adTemplate4,
      adGroupTemplateId: uuids.adGroup3,
      headline: "{brand} - {headline}",
      description: "{description}",
      variables: {
        placeholders: [
          { name: "brand", type: "text", sourceColumn: "brand" },
          { name: "headline", type: "text", sourceColumn: "headline" },
          { name: "description", type: "text", sourceColumn: "description" },
        ],
      },
    },
  ]);

  // ============================================
  // 7. RULES
  // ============================================
  console.log("Seeding rules...");
  await db.insert(schema.rules).values([
    {
      id: uuids.rule1,
      name: "Skip Nike Jordan Products",
      type: "filter",
      priority: 10,
      enabled: true,
      conditions: [
        {
          field: "brand",
          operator: "equals",
          value: "Nike",
        },
        {
          field: "product",
          operator: "contains",
          value: "Jordan",
          logicalOperator: "AND",
        },
      ],
      actions: [
        {
          type: "set",
          target: "_skip",
          value: true,
        },
      ],
      createdAt: new Date("2025-01-10T10:00:00Z"),
      updatedAt: new Date("2025-01-10T10:00:00Z"),
    },
    {
      id: uuids.rule2,
      name: "Premium Brand Targeting",
      type: "conditional",
      priority: 5,
      enabled: true,
      conditions: [
        {
          field: "brand",
          operator: "in",
          value: ["Hoka", "On", "Brooks"],
        },
      ],
      actions: [
        {
          type: "set",
          target: "ad_group",
          value: "Premium Running",
        },
      ],
      createdAt: new Date("2025-01-11T09:00:00Z"),
      updatedAt: new Date("2025-01-11T09:00:00Z"),
    },
    {
      id: uuids.rule3,
      name: "Lifestyle Product Headlines",
      type: "transform",
      priority: 1,
      enabled: true,
      conditions: [
        {
          field: "product",
          operator: "contains",
          value: "Classic",
        },
      ],
      actions: [
        {
          type: "set",
          target: "headline_prefix",
          value: "Timeless Style: ",
        },
      ],
      createdAt: new Date("2025-01-12T14:00:00Z"),
      updatedAt: new Date("2025-01-12T14:00:00Z"),
    },
  ]);

  // ============================================
  // 8. TEMPLATE RULES (Link rules to templates)
  // ============================================
  console.log("Seeding template rules...");
  await db.insert(schema.templateRules).values([
    {
      templateId: uuids.template1,
      ruleId: uuids.rule1,
      executionOrder: 1,
    },
    {
      templateId: uuids.template1,
      ruleId: uuids.rule2,
      executionOrder: 2,
    },
    {
      templateId: uuids.template1,
      ruleId: uuids.rule3,
      executionOrder: 3,
    },
    {
      templateId: uuids.template2,
      ruleId: uuids.rule1,
      executionOrder: 1,
    },
  ]);

  // ============================================
  // 9. AD ACCOUNTS (Matching UI mock data)
  // ============================================
  console.log("Seeding ad accounts...");
  await db.insert(schema.adAccounts).values([
    {
      id: uuids.account1,
      platform: "reddit",
      accountId: "t2_abc123",
      accountName: "Reddit Ads - Main",
      status: "active",
      credentials: null, // Encrypted in production
      createdAt: new Date("2024-11-15T10:00:00Z"),
      updatedAt: new Date("2025-01-15T08:30:00Z"),
    },
    {
      id: uuids.account2,
      platform: "reddit",
      accountId: "t2_xyz789",
      accountName: "Reddit Ads - Secondary",
      status: "error", // Token expired scenario
      credentials: null,
      createdAt: new Date("2024-10-01T14:00:00Z"),
      updatedAt: new Date("2025-01-10T16:00:00Z"),
    },
  ]);

  // ============================================
  // 10. OAUTH TOKENS
  // ============================================
  console.log("Seeding OAuth tokens...");
  await db.insert(schema.oauthTokens).values([
    {
      adAccountId: uuids.account1,
      accessToken: "encrypted_access_token_placeholder",
      refreshToken: "encrypted_refresh_token_placeholder",
      expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      scopes: "ads_read,ads_write,account",
    },
    {
      adAccountId: uuids.account2,
      accessToken: "expired_access_token_placeholder",
      refreshToken: "expired_refresh_token_placeholder",
      expiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago (expired)
      scopes: "ads_read,ads_write,account",
    },
  ]);

  // ============================================
  // 11. GENERATED CAMPAIGNS (Matching UI mock data)
  // ============================================
  console.log("Seeding generated campaigns...");
  await db.insert(schema.generatedCampaigns).values([
    {
      id: uuids.campaign1,
      templateId: uuids.template1,
      dataRowId: dataRowUuid(0), // Nike Air Max 90 - "Run Fast"
      status: "active",
      campaignData: {
        name: "Summer Sale - Nike Air Max 90",
        objective: "CONVERSIONS",
        budget: { type: "daily", amount: 50, currency: "USD" },
        adGroups: [
          {
            name: "Interest Targeting",
            ads: [
              {
                headline: "Run Fast",
                description: "Best shoe ever",
              },
            ],
          },
          {
            name: "Retargeting",
            ads: [
              {
                headline: "Still thinking about Air Max 90?",
                description: "Come back and get it before it's gone!",
              },
            ],
          },
        ],
      },
      createdAt: new Date("2025-01-10T09:00:00Z"),
      updatedAt: new Date("2025-01-15T08:30:00Z"),
    },
    {
      id: uuids.campaign2,
      templateId: uuids.template1,
      dataRowId: dataRowUuid(19), // Adidas Ultraboost 23 - "Run Faster"
      status: "pending",
      campaignData: {
        name: "Summer Sale - Adidas Ultraboost 23",
        objective: "CONVERSIONS",
        budget: { type: "daily", amount: 50, currency: "USD" },
        adGroups: [
          {
            name: "Interest Targeting",
            ads: [
              {
                headline: "Run Faster",
                description: "Premium comfort boost",
              },
            ],
          },
        ],
      },
      createdAt: new Date("2025-01-11T09:00:00Z"),
      updatedAt: new Date("2025-01-11T09:00:00Z"),
    },
    {
      id: uuids.campaign3,
      templateId: uuids.template2,
      dataRowId: dataRowUuid(80), // ASICS Gel-Kayano 30
      status: "error",
      campaignData: {
        name: "Winter Campaign - ASICS Gel-Kayano 30",
        objective: "AWARENESS",
        budget: { type: "daily", amount: 100, currency: "USD" },
      },
      createdAt: new Date("2025-01-12T09:00:00Z"),
      updatedAt: new Date("2025-01-12T10:00:00Z"),
    },
    {
      id: uuids.campaign4,
      templateId: uuids.template2,
      dataRowId: dataRowUuid(100), // Hoka Clifton 9
      status: "draft",
      campaignData: {
        name: "Draft Campaign - Hoka Clifton 9",
        objective: "AWARENESS",
        budget: { type: "daily", amount: 100, currency: "USD" },
      },
      createdAt: new Date("2025-01-13T09:00:00Z"),
      updatedAt: new Date("2025-01-13T09:00:00Z"),
    },
    {
      id: uuids.campaign5,
      templateId: uuids.template1,
      dataRowId: dataRowUuid(35), // Puma Deviate Nitro
      status: "paused",
      campaignData: {
        name: "Summer Sale - Puma Deviate Nitro",
        objective: "CONVERSIONS",
        budget: { type: "daily", amount: 50, currency: "USD" },
      },
      createdAt: new Date("2025-01-08T09:00:00Z"),
      updatedAt: new Date("2025-01-13T14:00:00Z"),
    },
    {
      id: uuids.campaign6,
      templateId: uuids.template3,
      dataRowId: dataRowUuid(113), // On Cloudmonster
      status: "pending",
      campaignData: {
        name: "Holiday Promo - On Cloudmonster",
        objective: "CONVERSIONS",
        budget: { type: "lifetime", amount: 5000, currency: "USD" },
        adGroups: [
          { name: "Lookalike Audience", ads: [] },
          { name: "Custom Audience", ads: [] },
        ],
      },
      createdAt: new Date("2025-01-14T09:00:00Z"),
      updatedAt: new Date("2025-01-14T09:00:00Z"),
    },
  ]);

  // ============================================
  // 12. SYNC RECORDS
  // ============================================
  console.log("Seeding sync records...");
  await db.insert(schema.syncRecords).values([
    {
      generatedCampaignId: uuids.campaign1,
      platform: "reddit",
      platformId: "ext-123",
      syncStatus: "synced",
      lastSyncedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    },
    {
      generatedCampaignId: uuids.campaign3,
      platform: "google",
      platformId: null,
      syncStatus: "failed",
      errorLog: "API rate limit exceeded. Please wait 5 minutes before retrying.",
      lastSyncedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    },
    {
      generatedCampaignId: uuids.campaign5,
      platform: "reddit",
      platformId: "ext-456",
      syncStatus: "synced",
      lastSyncedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
  ]);

  // ============================================
  // 13. CREATIVES
  // ============================================
  console.log("Seeding creatives...");
  await db.insert(schema.creatives).values([
    {
      id: uuids.creative1,
      accountId: "t2_abc123",
      name: "Summer Sale Banner",
      type: "IMAGE",
      mimeType: "image/jpeg",
      fileSize: 245000,
      dimensions: { width: 1200, height: 628 },
      storageKey: "creatives/summer-sale-banner.jpg",
      cdnUrl: "https://cdn.example.com/creatives/summer-sale-banner.jpg",
      status: "READY",
      metadata: {
        originalFilename: "summer_banner_v2.jpg",
        uploadedBy: "marketing@mycompany.com",
      },
      createdAt: new Date("2025-01-05T10:00:00Z"),
      updatedAt: new Date("2025-01-05T10:00:00Z"),
    },
    {
      id: uuids.creative2,
      accountId: "t2_abc123",
      name: "Product Showcase Video",
      type: "VIDEO",
      mimeType: "video/mp4",
      fileSize: 15000000,
      dimensions: { width: 1920, height: 1080 },
      storageKey: "creatives/product-showcase.mp4",
      cdnUrl: "https://cdn.example.com/creatives/product-showcase.mp4",
      thumbnailKey: "creatives/product-showcase-thumb.jpg",
      status: "READY",
      metadata: {
        durationSeconds: 30,
        frameRate: 30,
        codec: "h264",
        originalFilename: "showcase_final.mp4",
      },
      createdAt: new Date("2025-01-08T14:00:00Z"),
      updatedAt: new Date("2025-01-08T14:00:00Z"),
    },
    {
      id: uuids.creative3,
      accountId: "t2_abc123",
      name: "Holiday Theme",
      type: "IMAGE",
      mimeType: "image/png",
      fileSize: 380000,
      dimensions: { width: 1080, height: 1080 },
      storageKey: "creatives/holiday-theme.png",
      status: "PENDING",
      metadata: {
        originalFilename: "holiday_v1.png",
      },
      createdAt: new Date("2025-01-12T16:00:00Z"),
      updatedAt: new Date("2025-01-12T16:00:00Z"),
    },
  ]);

  // ============================================
  // 14. CREATIVE TAGS
  // ============================================
  console.log("Seeding creative tags...");
  await db.insert(schema.creativeTags).values([
    { creativeId: uuids.creative1, tag: "summer" },
    { creativeId: uuids.creative1, tag: "sale" },
    { creativeId: uuids.creative1, tag: "banner" },
    { creativeId: uuids.creative2, tag: "video" },
    { creativeId: uuids.creative2, tag: "product" },
    { creativeId: uuids.creative3, tag: "holiday" },
    { creativeId: uuids.creative3, tag: "seasonal" },
  ]);

  // ============================================
  // 15. CREATIVE TEMPLATE LINKS
  // ============================================
  console.log("Seeding creative template links...");
  await db.insert(schema.creativeTemplateLinks).values([
    {
      templateId: uuids.template1,
      slotName: "main_banner",
      creativeId: uuids.creative1,
      priority: 0,
      conditions: [
        {
          field: "brand",
          operator: "equals",
          value: "Nike",
        },
      ],
    },
    {
      templateId: uuids.template1,
      slotName: "video_ad",
      creativeId: uuids.creative2,
      priority: 0,
    },
    {
      templateId: uuids.template3,
      slotName: "main_banner",
      creativeId: uuids.creative3,
      priority: 0,
    },
  ]);

  console.log("\nSeed completed successfully!");
  console.log("\nSeeded data summary:");
  console.log("  - 3 data sources");
  console.log(`  - ${sampleProductData.length} data rows (11 brands, multiple products)`);
  console.log("  - 6 column mappings");
  console.log("  - 3 campaign templates");
  console.log("  - 4 ad group templates");
  console.log("  - 4 ad templates");
  console.log("  - 3 rules");
  console.log("  - 4 template rules");
  console.log("  - 2 ad accounts");
  console.log("  - 2 OAuth tokens");
  console.log("  - 6 generated campaigns");
  console.log("  - 3 sync records");
  console.log("  - 3 creatives");
  console.log("  - 7 creative tags");
  console.log("  - 3 creative template links");

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
