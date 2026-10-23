import type { ImageSource } from "expo-image";

import { CHARACTER_ART } from "./character-art.generated";
import type {
  PixelBodySize,
  PixelClothingTier,
  PixelFigureLayerId,
  PixelGender,
  PixelItem,
  PixelItemId,
  PixelSkinTone,
} from "./types";

/**
 * The character: bodies, faces, hair and clothing from the FitPixel art set.
 * Item ids are the generated file names, minus the tone suffix for face parts
 * (the face is drawn in the body's skin tone):
 *
 *   body-{m|f}-{small|medium|big}-{tone}   top-{m|f}-{beg|cas}-{style}-{colour}
 *   eyes-{shape}-{colour}                  bottom-{m|f}-{beg|cas}-{style}-{colour}
 *   nose-{shape}   mouth-{shape}           shoes-{beg|cas}-{a|b}-{colour}
 *   hair-{short|med|long}-{n}-{colour}
 */

export const SKIN_TONES: readonly PixelSkinTone[] = ["a", "b", "c", "d"];
export const BODY_SIZES: readonly PixelBodySize[] = ["small", "medium", "big"];

/** Bodies grow with level: Small from day 1, Medium at 5, Big at 15. */
export const BODY_SIZE_LEVELS: Readonly<Record<PixelBodySize, number>> = {
  small: 0,
  medium: 5,
  big: 15,
};

/** The casual clothing tier (clothes and sneakers) unlocks at this level. */
export const CASUAL_TIER_LEVEL = 3;

const GENDER_CODE: Record<PixelGender, string> = { male: "m", female: "f" };
const GENDER_BY_CODE: Record<string, PixelGender> = { m: "male", f: "female" };

const STYLE_LABELS: Record<string, string> = {
  "beg-tee": "Tee",
  "beg-tank": "Tank",
  "cas-hood": "Hoodie",
  "cas-tank": "Sport Tank",
  "beg-shorts": "Shorts",
  "beg-sweats": "Sweats",
  "cas-shorts": "Gym Shorts",
  "cas-tight": "Tights",
  "beg-a": "Runners",
  "beg-b": "Trainers",
  "cas-a": "Stripes",
  "cas-b": "High-tops",
};
const HAIR_LENGTH_LABELS: Record<string, string> = {
  short: "Short",
  med: "Medium",
  long: "Long",
};

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function tierOf(style: string): PixelClothingTier {
  return style.startsWith("cas") ? "casual" : "beginner";
}

/** Body item id for a gender, size and tone. */
export function bodyId(
  gender: PixelGender,
  size: PixelBodySize,
  tone: PixelSkinTone,
): PixelItemId {
  return `body-${GENDER_CODE[gender]}-${size}-${tone}`;
}

export type ParsedBody = {
  gender: PixelGender;
  size: PixelBodySize;
  tone: PixelSkinTone;
};

/** Gender, size and tone of a body item id (`null` for anything else). */
export function parseBodyId(itemId: PixelItemId | undefined): ParsedBody | null {
  const match = itemId?.match(/^body-([mf])-(small|medium|big)-([a-d])$/);
  if (match == null) return null;
  return {
    gender: GENDER_BY_CODE[match[1]!]!,
    size: match[2] as PixelBodySize,
    tone: match[3] as PixelSkinTone,
  };
}

export function bodySizeForLevel(level: number): PixelBodySize {
  if (level >= BODY_SIZE_LEVELS.big) return "big";
  if (level >= BODY_SIZE_LEVELS.medium) return "medium";
  return "small";
}

/** The same garment cut for the other gender (`top-m-beg-tee-red` ↔ `top-f-…`). */
export function garmentForGender(
  itemId: PixelItemId,
  gender: PixelGender,
): PixelItemId | null {
  const match = itemId.match(/^(top|bottom)-[mf]-(.+)$/);
  if (match == null) return null;
  return `${match[1]}-${GENDER_CODE[gender]}-${match[2]}`;
}

function art(layer: keyof typeof CHARACTER_ART): Record<string, ImageSource> {
  return CHARACTER_ART[layer];
}

/** Group `<id>-<tone>` files into one item with a source per tone. */
function toneItems(
  layer: "eyes" | "nose" | "mouth",
  label: (base: string) => string,
): PixelItem[] {
  const files = art(layer);
  const bases = [
    ...new Set(Object.keys(files).map((name) => name.replace(/-[a-d]$/, ""))),
  ];
  return bases.map((base) => {
    const sourceByTone = Object.fromEntries(
      SKIN_TONES.map((tone) => [tone, files[`${base}-${tone}`]!]),
    ) as Record<PixelSkinTone, ImageSource>;
    return {
      id: base,
      layer,
      label: label(base),
      source: sourceByTone.b,
      sourceByTone,
    };
  });
}

function bodyItems(): PixelItem[] {
  return Object.entries(art("body")).map(([id, source]) => {
    const body = parseBodyId(id)!;
    return {
      id,
      layer: "skin",
      label: `Tone ${SKIN_TONES.indexOf(body.tone) + 1}`,
      source,
      gender: body.gender,
    };
  });
}

function garmentItems(layer: "top" | "bottom"): PixelItem[] {
  return Object.entries(art(layer)).map(([id, source]) => {
    const [, gender, tier, style, colour] = id.match(
      /^\w+-([mf])-(beg|cas)-(\w+)-(\w+)$/,
    )!;
    return {
      id,
      layer,
      label: `${STYLE_LABELS[`${tier}-${style}`]} · ${capitalize(colour!)}`,
      source,
      gender: GENDER_BY_CODE[gender!],
      tier: tierOf(tier!),
    };
  });
}

function shoeItems(): PixelItem[] {
  return Object.entries(art("shoes")).map(([id, source]) => {
    const [, style, colour] = id.match(/^shoes-(\w+-\w)-(\w+)$/)!;
    return {
      id,
      layer: "shoes",
      label: `${STYLE_LABELS[style!]} · ${capitalize(colour!)}`,
      source,
      tier: tierOf(style!),
    };
  });
}

function hairItems(): PixelItem[] {
  return Object.entries(art("hair")).map(([id, source]) => {
    const [, length, n, colour] = id.match(/^hair-(\w+)-(\d)-(\w+)$/)!;
    return {
      id,
      layer: "hair",
      label: `${HAIR_LENGTH_LABELS[length!]} ${n} · ${capitalize(colour!)}`,
      source,
    };
  });
}

/** Every character item per layer, in display order. */
export const CHARACTER_ITEMS: Record<PixelFigureLayerId, PixelItem[]> = {
  skin: bodyItems(),
  eyes: toneItems("eyes", (base) => {
    const [, shape, colour] = base.split("-");
    return `Eyes ${shape} · ${capitalize(colour!)}`;
  }),
  nose: toneItems("nose", (base) => `Nose ${base.split("-")[1]}`),
  mouth: toneItems("mouth", (base) => `Mouth ${base.split("-")[1]}`),
  hair: hairItems(),
  top: garmentItems("top"),
  bottom: garmentItems("bottom"),
  shoes: shoeItems(),
};

/** Level-gated character items: the casual tier of clothes and sneakers. */
export const CASUAL_TIER_ITEMS: readonly PixelItem[] = [
  ...CHARACTER_ITEMS.top,
  ...CHARACTER_ITEMS.bottom,
  ...CHARACTER_ITEMS.shoes,
].filter((item) => item.tier === "casual");

/** True when `item` can be worn by `gender` (unisex items always can). */
export function fitsGender(item: PixelItem, gender: PixelGender | null): boolean {
  return item.gender == null || gender == null || item.gender === gender;
}
