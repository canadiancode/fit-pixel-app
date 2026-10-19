import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { APP_SHELL_PRIMARY_BACKGROUND } from "@/constants/app-colors";
import { PixelCharacter } from "@/features/pixel/components/pixel-character";
import {
  DEFAULT_PIXEL_LOADOUT,
  portraitLoadout,
} from "@/features/pixel/default-loadout";
import type { PixelLoadout } from "@/features/pixel/types";
import type { EquippedLook } from "@/lib/api/chat";

/** Layer canvas size (every pixel asset shares it). */
const CANVAS_WIDTH = 1484;
const CANVAS_HEIGHT = 1060;
/**
 * Square on the canvas framing hair, face and the top of the outfit
 * (measured from the hair / eyes / mouth / top layer bounds).
 */
const HEAD_CROP = { x: 545, y: 215, size: 400 } as const;

type Props = {
  /** Server look; `undefined` loading / `null` unavailable (blank circle), empty = starter look. */
  equipped?: EquippedLook | null;
  /** Use a local loadout directly (your own pixel). */
  loadout?: PixelLoadout;
  size: number;
  style?: StyleProp<ViewStyle>;
};

/** Circular head-and-shoulders crop of a Pixel (chat sender bubbles). */
export function PixelHeadAvatar({ equipped, loadout, size, style }: Props) {
  const source: PixelLoadout | null =
    loadout ??
    (equipped == null
      ? null
      : equipped && Object.keys(equipped).length > 0
        ? (equipped as PixelLoadout)
        : DEFAULT_PIXEL_LOADOUT);

  const scale = size / HEAD_CROP.size;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {source ? (
        <PixelCharacter
          loadout={portraitLoadout(source)}
          style={{
            position: "absolute",
            width: CANVAS_WIDTH * scale,
            height: CANVAS_HEIGHT * scale,
            left: -HEAD_CROP.x * scale,
            top: -HEAD_CROP.y * scale,
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: "hidden",
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
});
