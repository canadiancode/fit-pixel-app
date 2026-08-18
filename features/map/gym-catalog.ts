import type { ImageSourcePropType } from "react-native";

const DEFAULT_GYM_IMAGE = require("@/assets/backgrounds/map-gym-default-background.png");

export type GymCatalogItem = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  imageKey?: string;
};

/** Local fallback when GET /v1/gyms is unavailable. Ids match the Supabase seed. */
export const FALLBACK_GYMS: readonly GymCatalogItem[] = [
  { id: "gym-1", name: "Fitness World (Howe St, Vancouver)", latitude: 49.2775605, longitude: -123.12733209999998 },
  { id: "gym-2", name: "Fitness World (W Georgia St, Vancouver)", latitude: 49.2872573, longitude: -123.1247192 },
  { id: "gym-3", name: "Evolve Strength Post", latitude: 49.280815399999994, longitude: -123.11450789999999 },
  { id: "gym-4", name: "Equinox West Georgia Street", latitude: 49.286273099999995, longitude: -123.1235959 },
  { id: "gym-5", name: "Kommunity Fitness", latitude: 49.2742341, longitude: -123.1245598 },
  { id: "gym-6", name: "YWCA Health + Fitness Centre", latitude: 49.2855157, longitude: -123.11780759999999 },
  { id: "gym-7", name: "Creekside Community Recreation Centre", latitude: 49.2717357, longitude: -123.10538419999999 },
  { id: "gym-8", name: "Olympus Fitness Centre", latitude: 49.2699098, longitude: -123.07123209999999 },
  { id: "gym-9", name: "Hillcrest Community Centre", latitude: 49.2437477, longitude: -123.1078644 },
  { id: "gym-10", name: "Fitness World (Cambie/Broadway, Vancouver)", latitude: 49.260723399999996, longitude: -123.117342 },
  { id: "gym-11", name: "24 HR Flex Fitness Club + Personal Training (Surrey/Delta)", latitude: 49.1326433, longitude: -122.88921979999999 },
  { id: "gym-12", name: "Fitness World (South Surrey)", latitude: 49.048427100000005, longitude: -122.78251979999999 },
  { id: "gym-13", name: "Level Up Fitness Club (Surrey)", latitude: 49.154289899999995, longitude: -122.863237 },
  { id: "gym-14", name: "Fitness World (Central Ave, Surrey)", latitude: 49.190436, longitude: -122.8395627 },
  { id: "gym-15", name: "24HR Sandcastle Fitness Club + Personal Training", latitude: 49.03729070000001, longitude: -122.8004378 },
  { id: "gym-16", name: "Platinum Athletic Club (Surrey)", latitude: 49.1416259, longitude: -122.84783099999999 },
  { id: "gym-17", name: "Guildford Recreation Centre", latitude: 49.193605899999994, longitude: -122.802882 },
  { id: "gym-18", name: "Fitness World (152 St, Surrey)", latitude: 49.0333136, longitude: -122.80379239999999 },
  { id: "gym-19", name: "Planet Fitness (King George Blvd, Surrey)", latitude: 49.13071, longitude: -122.84623999999998 },
  { id: "gym-20", name: "Planet Fitness (10642 King George Blvd, Surrey)", latitude: 49.19591, longitude: -122.84376999999999 },
  { id: "gym-21", name: "Vitality Fitness (Burnaby)", latitude: 49.219223899999996, longitude: -122.94980590000002 },
  { id: "gym-22", name: "Fitness World (Lougheed, Burnaby)", latitude: 49.2514295, longitude: -122.89649790000001 },
  { id: "gym-23", name: "Fitness 2000 Athletic Club (Burnaby)", latitude: 49.251753199999996, longitude: -122.9015933 },
  { id: "gym-24", name: "SFU Fitness Centre", latitude: 49.279284499999996, longitude: -122.92273060000001 },
  { id: "gym-25", name: "Fitness World (Kingsway, Burnaby)", latitude: 49.223107899999995, longitude: -122.9851946 },
  { id: "gym-26", name: "Evolve Strength Brentwood (Burnaby)", latitude: 49.267862699999995, longitude: -123.00281899999999 },
  { id: "gym-27", name: "Anytime Fitness (Hastings St, Burnaby)", latitude: 49.2813814, longitude: -123.02168340000001 },
  { id: "gym-28", name: "Anytime Fitness (Royal Oak Ave, Burnaby)", latitude: 49.214317799999996, longitude: -122.98914990000002 },
  { id: "gym-29", name: "Foundation Fitness Studio (Burnaby)", latitude: 49.280841099999996, longitude: -123.0179141 },
  { id: "gym-30", name: "GoodLife Fitness Burnaby Metrotown", latitude: 49.230216999999996, longitude: -123.004014 },
  { id: "gym-31", name: "Richmond Sports and Fitness", latitude: 49.1955604, longitude: -123.09218589999999 },
  { id: "gym-32", name: "Fittopia Fitness Center (Richmond)", latitude: 49.1784581, longitude: -123.13826939999998 },
  { id: "gym-33", name: "Minoru Centre for Active Living (Richmond)", latitude: 49.1635397, longitude: -123.1458103 },
  { id: "gym-34", name: "Fitness World (Lansdowne, Richmond)", latitude: 49.1736192, longitude: -123.14631489999998 },
  { id: "gym-35", name: "Anytime Fitness (No 3 Rd, Richmond)", latitude: 49.139649299999995, longitude: -123.13790009999998 },
  { id: "gym-36", name: "South Arm Community Fitness Centre (Richmond)", latitude: 49.1400797, longitude: -123.1275965 },
  { id: "gym-37", name: "Anytime Fitness (No 5 Rd, Richmond)", latitude: 49.1337091, longitude: -123.0915977 },
  { id: "gym-38", name: "Sunset HQ (Richmond)", latitude: 49.1282959, longitude: -123.09736509999999 },
  { id: "gym-39", name: "Club16 Trevor Linden Fitness (Richmond)", latitude: 49.1873027, longitude: -123.110077 },
  { id: "gym-40", name: "Fit4Less (Richmond)", latitude: 49.154593000000006, longitude: -123.12392399999999 },
  { id: "gym-41", name: "Fitness Unlimited Athletic Club (Langley)", latitude: 49.1065873, longitude: -122.6538671 },
  { id: "gym-42", name: "Fitness World (Willowbrook, Langley)", latitude: 49.1173286, longitude: -122.67031089999999 },
  { id: "gym-43", name: "24HR Lionheart Fitness Langley", latitude: 49.1776979, longitude: -122.67107730000001 },
  { id: "gym-44", name: "Planet Fitness (Langley)", latitude: 49.10219, longitude: -122.65786999999997 },
  { id: "gym-45", name: "Total Fitness (Langley)", latitude: 49.169822599999996, longitude: -122.664215 },
  { id: "gym-46", name: "Gold's Gym Langley", latitude: 49.151384099999994, longitude: -122.668916, imageKey: "golds-gym-langley" },
  { id: "gym-47", name: "Club16 Trevor Linden Fitness (Langley)", latitude: 49.1146817, longitude: -122.66383479999998 },
  { id: "gym-48", name: "Anytime Fitness (Fraser Hwy, Langley)", latitude: 49.088681799999996, longitude: -122.5980881 },
  { id: "gym-49", name: "Fit4Less (Langley)", latitude: 49.116808999999996, longitude: -122.66869399999997 },
  { id: "gym-50", name: "Timms Community Centre (Langley)", latitude: 49.1039993, longitude: -122.65743180000001 },
  { id: "gym-51", name: "Anytime Fitness Burquitlam (Coquitlam)", latitude: 49.259095099999996, longitude: -122.8925089 },
  { id: "gym-52", name: "Poirier Sport & Leisure Complex (Coquitlam)", latitude: 49.2549668, longitude: -122.84549489999999 },
  { id: "gym-53", name: "Planet Fitness (Lougheed Hwy, Coquitlam)", latitude: 49.27319, longitude: -122.79309 },
  { id: "gym-54", name: "Anytime Fitness (Austin Ave, Coquitlam)", latitude: 49.248816299999994, longitude: -122.8170954 },
  { id: "gym-55", name: "Gold's Gym Port Coquitlam", latitude: 49.2638858, longitude: -122.769435 },
  { id: "gym-56", name: "Game Ready Fitness (Coquitlam)", latitude: 49.2771925, longitude: -122.8123136 },
  { id: "gym-57", name: "Rocky Point Fitness And Health Club (Coquitlam)", latitude: 49.2389546, longitude: -122.85078899999998 },
  { id: "gym-58", name: "Club16 Trevor Linden Fitness (Coquitlam)", latitude: 49.2783606, longitude: -122.8131893 },
  { id: "gym-59", name: "Pinetree Community Centre (Coquitlam)", latitude: 49.289399599999996, longitude: -122.79152 },
  { id: "gym-60", name: "Lagree West — Coquitlam", latitude: 49.2839543, longitude: -122.8098779 },
  { id: "gym-61", name: "GoodLife Fitness Abbotsford South Fraser", latitude: 49.050534999999996, longitude: -122.32468899999999 },
  { id: "gym-62", name: "Anytime Fitness High Street (Abbotsford)", latitude: 49.058817999999995, longitude: -122.3782026 },
  { id: "gym-63", name: "Bolt Fitness (Abbotsford)", latitude: 49.0683947, longitude: -122.3586203 },
  { id: "gym-64", name: "Art of Fitness (Abbotsford)", latitude: 49.0461242, longitude: -122.29201710000001 },
  { id: "gym-65", name: "Club16 Trevor Linden Fitness (Abbotsford)", latitude: 49.053146299999995, longitude: -122.32188660000001 },
  { id: "gym-66", name: "Great West Fitness & Tennis (Abbotsford)", latitude: 49.047073399999995, longitude: -122.2691892 },
  { id: "gym-67", name: "Anytime Fitness (N Parallel Rd, Abbotsford)", latitude: 49.0370371, longitude: -122.23077039999998 },
  { id: "gym-68", name: "The Fitness Lab (Abbotsford)", latitude: 49.044522699999995, longitude: -122.2812596 },
  { id: "gym-69", name: "Abbotsford Recreation Centre", latitude: 49.047961199999996, longitude: -122.26236949999999 },
  { id: "gym-70", name: "Planet Fitness (Abbotsford)", latitude: 49.044399999999996, longitude: -122.29478999999999 },
  { id: "gym-71", name: "təməsew̓txʷ Aquatic and Community Centre (New Westminster)", latitude: 49.221286299999996, longitude: -122.90812129999998 },
  { id: "gym-72", name: "Planet Fitness (New Westminster)", latitude: 49.21257, longitude: -122.91918999999999 },
  { id: "gym-73", name: "Dynamic Health and Fitness (New Westminster)", latitude: 49.200939, longitude: -122.91301929999999 },
  { id: "gym-74", name: "Anytime Fitness (6th St, New Westminster)", latitude: 49.2115831, longitude: -122.9239127 },
  { id: "gym-75", name: "Snap Fitness New Westminster", latitude: 49.224990399999996, longitude: -122.89123979999998 },
  { id: "gym-76", name: "EZ Fit (New Westminster)", latitude: 49.204263700000006, longitude: -122.9094798 },
  { id: "gym-77", name: "Steel House Fitness (New Westminster)", latitude: 49.193518700000006, longitude: -122.94945440000001 },
  { id: "gym-78", name: "Queen's Park Sportsplex (New Westminster)", latitude: 49.213536100000006, longitude: -122.90377689999998 },
  { id: "gym-79", name: "Queensborough Community Centre (New Westminster)", latitude: 49.1859007, longitude: -122.9435704 },
  { id: "gym-80", name: "Anytime Fitness (Ewen Ave, New Westminster)", latitude: 49.1845451, longitude: -122.9495103 }
];

const GYM_IMAGE_ASSETS: Record<string, ImageSourcePropType> = {
  "golds-gym-langley": require("@/assets/backgrounds/gyms/golds-gym-langley-23467832765234785.jpg"),
};

export function gymHeroSource(
  imageKey?: string | null,
): ImageSourcePropType {
  if (imageKey && GYM_IMAGE_ASSETS[imageKey]) {
    return GYM_IMAGE_ASSETS[imageKey];
  }
  return DEFAULT_GYM_IMAGE;
}
