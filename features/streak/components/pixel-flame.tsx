import { memo, useEffect, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

/**
 * The streak flame, drawn as pixel art from a grid so it stays crisp at any
 * size without new image assets. Two frames flicker while lit.
 */
const FRAMES = [
  [
    "...y....",
    "...yo...",
    "..yoo.y.",
    ".yooo.o.",
    ".oorroo.",
    "oorrrroo",
    "orryyrro",
    "orywwyro",
    ".oywwyo.",
    "..oooo..",
  ],
  [
    "....y...",
    "...oy...",
    ".y.ooy..",
    ".o.ooo..",
    ".oorroo.",
    "oorrrroo",
    "orryyrro",
    "orywwyro",
    ".oywwyo.",
    "..oooo..",
  ],
] as const;

export const PIXEL_FLAME_COLUMNS = 8;
export const PIXEL_FLAME_ROWS = 10;

export type FlamePalette = "lit" | "gold" | "out";

const PALETTES: Record<FlamePalette, Record<string, string>> = {
  lit: { r: "#E8412C", o: "#FF8A1F", y: "#FFD23F", w: "#FFF6C2" },
  gold: { r: "#FF8A1F", o: "#FFD23F", y: "#FFF1A6", w: "#FFFFFF" },
  out: { r: "#5B6B80", o: "#7D8DA3", y: "#A3B1C4", w: "#C9D3E0" },
};

const FLICKER_MS = 170;

type Props = {
  /** Size of one art pixel, in points. */
  pixel: number;
  palette?: FlamePalette;
  style?: StyleProp<ViewStyle>;
};

export const PixelFlame = memo(function PixelFlame({
  pixel,
  palette = "lit",
  style,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [frame, setFrame] = useState(0);
  const flickers = palette !== "out" && !reduceMotion;

  useEffect(() => {
    if (!flickers) {
      setFrame(0);
      return;
    }
    const id = setInterval(() => setFrame((f) => 1 - f), FLICKER_MS);
    return () => clearInterval(id);
  }, [flickers]);

  const colors = PALETTES[palette];
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width: pixel * PIXEL_FLAME_COLUMNS, height: pixel * PIXEL_FLAME_ROWS },
        style,
      ]}
    >
      {FRAMES[frame].map((row, y) =>
        Array.from(row).map((cell, x) =>
          cell === "." ? null : (
            <View
              key={`${x}-${y}`}
              style={[
                styles.cell,
                {
                  left: x * pixel,
                  top: y * pixel,
                  // Overlap by a hair so no seams show between cells.
                  width: pixel + 0.5,
                  height: pixel + 0.5,
                  backgroundColor: colors[cell],
                },
              ]}
            />
          ),
        ),
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  cell: {
    position: "absolute",
  },
});
