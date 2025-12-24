import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HierarchyConfig } from "../HierarchyConfig";
import type {
  HierarchyConfig as HierarchyConfigType,
  CampaignConfig as CampaignConfigType,
  DataSourceColumn,
  ValidationResult
} from "../../types";
import { generateId, createDefaultAdGroup } from "../../types";

const mockColumns: DataSourceColumn[] = [
  { name: "brand", type: "string", sampleValues: ["Nike", "Adidas", "Puma"] },
  { name: "product", type: "string", sampleValues: ["Air Max", "Ultraboost", "Suede"] },
  { name: "headline", type: "string", sampleValues: ["Run Fast", "Speed Up", "Jump High"] },
  { name: "description", type: "string", sampleValues: ["Best shoe ever", "Top rated", "Classic"] },
  { name: "display_url", type: "string", sampleValues: ["nike.com", "adidas.com"] },
  { name: "final_url", type: "string", sampleValues: ["https://nike.com/shoes", "https://adidas.com/shoes"] },
];

// Helper to create a default hierarchy config with the new structure
const createDefaultHierarchyConfig = (): HierarchyConfigType => ({
  adGroups: [createDefaultAdGroup()],
});

// Helper to create a populated hierarchy config
const createPopulatedHierarchyConfig = (): HierarchyConfigType => ({
  adGroups: [{
    id: "test-ag-1",
    namePattern: "{product}",
    ads: [{
      id: "test-ad-1",
      headline: "{headline}",
      description: "{description}",
    }],
  }],
});

const defaultCampaignConfig: CampaignConfigType = {
  namePattern: "{brand}-performance",
};

const mockSampleData: Record<string, unknown>[] = [
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

describe("HierarchyConfig", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  // ==========================================================================
  // Ad Group Builder Tests
  // ==========================================================================

  describe("Ad Group Builder", () => {
    it("renders at least one ad group by default", () => {
      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByText("Ad Group 1")).toBeInTheDocument();
    });

    it("renders add ad group button", () => {
      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("add-ad-group")).toBeInTheDocument();
    });

    it("adds a new ad group when add button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      await user.click(screen.getByTestId("add-ad-group"));

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroups).toHaveLength(2);
    });

    it("removes an ad group when remove button is clicked", async () => {
      const user = userEvent.setup();
      const configWithTwoAdGroups: HierarchyConfigType = {
        adGroups: [
          { id: "ag-1", namePattern: "{product}", ads: [{ id: "ad-1", headline: "{headline}", description: "{description}" }] },
          { id: "ag-2", namePattern: "{brand}", ads: [{ id: "ad-2", headline: "{headline}", description: "{description}" }] },
        ],
      };

      render(
        <HierarchyConfig
          config={configWithTwoAdGroups}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Find and click the remove button for the second ad group
      const removeButton = screen.getByTestId("remove-ad-group-ag-2");
      await user.click(removeButton);

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroups).toHaveLength(1);
      expect(lastCall[0].adGroups[0].id).toBe("ag-1");
    });

    it("does not show remove button when only one ad group exists", () => {
      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Should not find any remove-ad-group buttons
      const removeButtons = screen.queryAllByTestId(/^remove-ad-group-/);
      expect(removeButtons).toHaveLength(0);
    });

    it("expands and collapses ad groups", async () => {
      const user = userEvent.setup();
      const config = createPopulatedHierarchyConfig();

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Find the toggle button
      const toggleButton = screen.getByTestId("toggle-ad-group-test-ag-1");
      expect(toggleButton).toHaveAttribute("aria-expanded", "true");

      // Click to collapse
      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute("aria-expanded", "false");

      // Click to expand again
      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    });
  });

  // ==========================================================================
  // Ad Group Name Pattern Tests
  // ==========================================================================

  describe("Ad Group Name Pattern", () => {
    it("displays current ad group name pattern value", () => {
      const config = createPopulatedHierarchyConfig();

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i) as HTMLInputElement;
      expect(input.value).toBe("{product}");
    });

    it("calls onChange when ad group pattern is typed", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      await user.type(input, "test");

      expect(onChange).toHaveBeenCalled();
    });

    it("shows variable autocomplete dropdown when { is typed", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      expect(screen.getByText("brand")).toBeInTheDocument();
      expect(screen.getByText("product")).toBeInTheDocument();
    });

    it("shows columns in dropdown when opened", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      const dropdown = screen.getByTestId("variable-dropdown");
      // Should show all columns
      expect(within(dropdown).getByText("brand")).toBeInTheDocument();
      expect(within(dropdown).getByText("product")).toBeInTheDocument();
      expect(within(dropdown).getByText("headline")).toBeInTheDocument();
      expect(within(dropdown).getByText("description")).toBeInTheDocument();
    });

    it("selects variable from dropdown and completes syntax", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      await user.click(screen.getByText("product"));

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroups[0].namePattern).toBe("{product}");
    });
  });

  // ==========================================================================
  // Ad Field Mapping Tests
  // ==========================================================================

  describe("Ad Field Mapping", () => {
    it("renders headline mapping input", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/headline/i)).toBeInTheDocument();
    });

    it("renders description mapping input", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it("displays current ad mapping values", () => {
      const config: HierarchyConfigType = {
        adGroups: [{
          id: "ag-1",
          namePattern: "{product}",
          ads: [{
            id: "ad-1",
            headline: "{headline}",
            description: "{description}",
            displayUrl: "{display_url}",
            finalUrl: "{final_url}",
          }],
        }],
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect((screen.getByLabelText(/headline/i) as HTMLInputElement).value).toBe("{headline}");
      expect((screen.getByLabelText(/description/i) as HTMLInputElement).value).toBe("{description}");
    });

    it("calls onChange when headline is updated", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const headlineInput = screen.getByLabelText(/headline/i);
      await user.type(headlineInput, "test");

      expect(onChange).toHaveBeenCalled();
    });

    it("calls onChange when description is updated", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const descInput = screen.getByLabelText(/description/i);
      await user.type(descInput, "test");

      expect(onChange).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Multiple Ads Per Ad Group Tests
  // ==========================================================================

  describe("Multiple Ads Per Ad Group", () => {
    it("can add multiple ads to an ad group", async () => {
      const user = userEvent.setup();
      const config: HierarchyConfigType = {
        adGroups: [{
          id: "ag-1",
          namePattern: "{product}",
          ads: [{
            id: "ad-1",
            headline: "{headline}",
            description: "{description}",
          }],
        }],
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Click add ad button
      await user.click(screen.getByTestId("add-ad-ag-1"));

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroups[0].ads).toHaveLength(2);
    });

    it("can remove an ad from an ad group when multiple ads exist", async () => {
      const user = userEvent.setup();
      const config: HierarchyConfigType = {
        adGroups: [{
          id: "ag-1",
          namePattern: "{product}",
          ads: [
            { id: "ad-1", headline: "{headline}", description: "{description}" },
            { id: "ad-2", headline: "{headline} 2", description: "{description} 2" },
          ],
        }],
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Click remove ad button
      await user.click(screen.getByTestId("remove-ad-ad-2"));

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroups[0].ads).toHaveLength(1);
      expect(lastCall[0].adGroups[0].ads[0].id).toBe("ad-1");
    });

    it("does not show remove button for single ad", () => {
      const config = createPopulatedHierarchyConfig();

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Should not find any remove-ad buttons
      const removeButtons = screen.queryAllByTestId(/^remove-ad-/);
      expect(removeButtons).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Hierarchy Preview Tests
  // ==========================================================================

  describe("Hierarchy Preview (Real-time)", () => {
    it("renders hierarchy preview section", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("hierarchy-preview")).toBeInTheDocument();
    });

    it("shows campaign level in tree from campaignConfig", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      const preview = screen.getByTestId("hierarchy-preview");
      expect(within(preview).getByText(/Nike-performance/)).toBeInTheDocument();
    });

    it("shows ad groups grouped by pattern", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      const preview = screen.getByTestId("hierarchy-preview");
      // Should show ad groups from different products - use getAllByText since there may be multiple matches
      const airMaxMatches = within(preview).getAllByText(/Air Max/);
      expect(airMaxMatches.length).toBeGreaterThan(0);
      const jordanMatches = within(preview).getAllByText(/Jordan/);
      expect(jordanMatches.length).toBeGreaterThan(0);
    });

    it("shows ads within ad groups", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      const preview = screen.getByTestId("hierarchy-preview");
      // Should show ad headlines from the sample data - use getAllByText since there may be multiple
      const runFastMatches = within(preview).getAllByText("Run Fast");
      expect(runFastMatches.length).toBeGreaterThan(0);
    });

    it("displays campaign count estimate", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      const statsElement = screen.getByTestId("stats-campaigns");
      expect(statsElement).toBeInTheDocument();
      // Multiple brands = multiple campaigns (Nike, Adidas, Puma, Under Armour, etc.)
      // The count should be > 0 based on unique brand-performance patterns
      const countText = statsElement.textContent;
      expect(countText).toBeTruthy();
      const campaignCount = parseInt(countText?.match(/\d+/)?.[0] || "0", 10);
      expect(campaignCount).toBeGreaterThan(0);
    });

    it("displays ad group count estimate", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      const statsElement = screen.getByTestId("stats-ad-groups");
      expect(statsElement).toBeInTheDocument();
      // Many products across brands = many ad groups
      const countText = statsElement.textContent;
      expect(countText).toBeTruthy();
      const adGroupCount = parseInt(countText?.match(/\d+/)?.[0] || "0", 10);
      expect(adGroupCount).toBeGreaterThan(0);
    });

    it("displays ad count estimate", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      const statsElement = screen.getByTestId("stats-ads");
      expect(statsElement).toBeInTheDocument();
      // ~120 rows = ~120 ads
      const countText = statsElement.textContent;
      expect(countText).toBeTruthy();
      const adCount = parseInt(countText?.match(/\d+/)?.[0] || "0", 10);
      expect(adCount).toBeGreaterThan(0);
    });

    it("shows placeholder when no sample data is provided", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/no sample data/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Validation Display Tests
  // ==========================================================================

  describe("Validation Display", () => {
    it("displays validation errors", () => {
      const validation: ValidationResult = {
        valid: false,
        errors: ['Ad Group 1 name pattern: Variable "{invalid_var}" not found in data source columns'],
        warnings: [],
      };

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      expect(screen.getByTestId("validation-errors")).toBeInTheDocument();
      expect(screen.getByText(/invalid_var.*not found/i)).toBeInTheDocument();
    });

    it("displays validation warnings", () => {
      const validation: ValidationResult = {
        valid: true,
        errors: [],
        warnings: ["Ad Group 1, Ad 1 display URL: Variable \"{missing}\" not found"],
      };

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      expect(screen.getByTestId("validation-warnings")).toBeInTheDocument();
      expect(screen.getByText(/missing.*not found/i)).toBeInTheDocument();
    });

    it("does not show validation section when valid with no warnings", () => {
      const validation: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
      };

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      expect(screen.queryByTestId("validation-errors")).not.toBeInTheDocument();
      expect(screen.queryByTestId("validation-warnings")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper ARIA labels for inputs", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/ad group name pattern/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/headline/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it("has descriptive help text for ad group pattern", () => {
      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // The text includes "{variable}" which creates multiple text nodes,
      // so we need to look for the hint element directly
      const hintElements = screen.getAllByText(/syntax/i);
      expect(hintElements.length).toBeGreaterThan(0);
    });

    it("announces dropdown options to screen readers", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      const dropdown = screen.getByTestId("variable-dropdown");
      expect(dropdown).toHaveAttribute("role", "listbox");
    });
  });

  // ==========================================================================
  // Keywords at Ad Group Level Tests
  // ==========================================================================

  describe("Keywords at Ad Group Level", () => {
    it("renders keywords section within each ad group", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("keywords-section-test-ag-1")).toBeInTheDocument();
    });

    it("displays keywords section with three columns", () => {
      const config: HierarchyConfigType = {
        adGroups: [{
          id: "ag-1",
          namePattern: "{product}",
          ads: [{ id: "ad-1", headline: "{headline}", description: "{description}" }],
          keywords: ["buy shoes", "running shoes", "athletic footwear"],
        }],
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // KeywordCombinator has three columns: Prefixes, Core Terms, Suffixes
      expect(screen.getByText("Prefixes")).toBeInTheDocument();
      expect(screen.getByText("Core Terms")).toBeInTheDocument();
      expect(screen.getByText("Suffixes")).toBeInTheDocument();
    });

    it("calls onChange when core terms are typed", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Find the Core Terms textarea by its aria-label
      const coreTermsTextareas = screen.getAllByLabelText("Core Terms");
      // Get the first Core Terms textarea (for the first ad group)
      const coreTermsTextarea = coreTermsTextareas[0];
      if (!coreTermsTextarea) throw new Error("No Core Terms textarea found");

      await user.clear(coreTermsTextarea);
      await user.type(coreTermsTextarea, "shoes");

      // Verify onChange was called
      expect(onChange).toHaveBeenCalled();
    });

    it("shows keywords section label as optional", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/keywords \(optional\)/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles empty columns list", () => {
      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={[]}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/no variables available/i)).toBeInTheDocument();
    });

    it("handles empty sample data array", () => {
      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={[]}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/no sample data/i)).toBeInTheDocument();
    });

    it("handles missing columns in sample data gracefully", () => {
      const config: HierarchyConfigType = {
        adGroups: [{
          id: "ag-1",
          namePattern: "{missing_column}",
          ads: [{
            id: "ad-1",
            headline: "{headline}",
            description: "{description}",
          }],
        }],
      };

      // Should not crash even if pattern references non-existent column
      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("hierarchy-preview")).toBeInTheDocument();
    });

    it("handles rapid typing without crashing", async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      await user.type(input, "{{brand}}-{{product}}-{{headline}}");

      expect(onChange).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Variable Search Functionality Tests
  // ==========================================================================

  describe("Variable Search in Dropdown", () => {
    it("shows dropdown when typing opening brace", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      // Use double brace to escape for userEvent: {{ outputs literal {
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      // All columns should be visible in dropdown
      expect(screen.getByTestId("variable-option-brand")).toBeInTheDocument();
      expect(screen.getByTestId("variable-option-headline")).toBeInTheDocument();
    });

    it("filters variables when typing after opening brace", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      // Type opening brace followed by filter text - use {{ to escape the brace
      await user.type(input, "{{bra");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      // Should filter to only show "brand"
      expect(screen.getByTestId("variable-option-brand")).toBeInTheDocument();
      // Other variables should not be visible
      expect(screen.queryByTestId("variable-option-headline")).not.toBeInTheDocument();
    });

    it("shows 'No matching variables' when filter has no results", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      // Type opening brace followed by non-matching text
      await user.type(input, "{{nonexistent");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      expect(screen.getByText(/no matching variables/i)).toBeInTheDocument();
    });

    it("shows dropdown with few columns", async () => {
      const user = userEvent.setup();
      const fewColumns: DataSourceColumn[] = [
        { name: "col1", type: "string" },
        { name: "col2", type: "string" },
        { name: "col3", type: "string" },
      ];

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={fewColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      // All columns should be shown
      expect(screen.getByTestId("variable-option-col1")).toBeInTheDocument();
      expect(screen.getByTestId("variable-option-col2")).toBeInTheDocument();
      expect(screen.getByTestId("variable-option-col3")).toBeInTheDocument();
    });

    it("allows selecting variable with arrow keys", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      // Type opening brace followed by filter to get a single option
      await user.type(input, "{{bra");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
        expect(screen.getByTestId("variable-option-brand")).toBeInTheDocument();
      });

      // Use arrow down and enter to select
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Enter}");

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroups[0].namePattern).toBe("{brand}");
    });
  });

  // ==========================================================================
  // Input Field Typing Tests (Verifying Fix)
  // ==========================================================================

  describe("Input Field Typing", () => {
    it("accepts all characters in ad group name pattern", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      await user.type(input, "Test-Pattern_123");

      expect(onChange).toHaveBeenCalled();
      // Verify the last call contains the typed text
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroups[0].namePattern).toContain("Test-Pattern_123");
    });

    it("accepts all characters in headline field", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const headlineInput = screen.getByLabelText(/headline/i);
      await user.type(headlineInput, "Amazing Product!");

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroups[0].ads[0].headline).toContain("Amazing Product!");
    });

    it("accepts all characters in description field", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, "Best deal ever!");

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroups[0].ads[0].description).toContain("Best deal ever!");
    });

    it("maintains input value after state update", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i) as HTMLInputElement;
      await user.type(input, "test");

      // Check that the input still has the value after React re-renders
      await waitFor(() => {
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
        expect(lastCall[0].adGroups[0].namePattern).toContain("test");
      });
    });
  });
});
