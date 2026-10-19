import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { APP_SHELL_PRIMARY_BACKGROUND } from "@/constants/app-colors";
import { PixelCharacter } from "@/features/pixel/components/pixel-character";
import { DEFAULT_PIXEL_LOADOUT } from "@/features/pixel/default-loadout";
import type { PixelLoadout } from "@/features/pixel/types";
import type { EquippedLook } from "@/lib/api/chat";

type Props = {
  /** Server loadout; empty / missing falls back to the starter look. */
  equipped?: EquippedLook | null;
  size: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Another Pixel's composed character in a rounded tile (lists, profile). */
export function PixelAvatar({
  equipped,
  size,
  style,
  accessibilityLabel,
}: Props) {
  const loadout: PixelLoadout =
    equipped && Object.keys(equipped).length > 0
      ? (equipped as PixelLoadout)
      : DEFAULT_PIXEL_LOADOUT;

  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: Math.round(size * 0.22) },
        style,
      ]}
    >
      <PixelCharacter
        loadout={loadout}
        accessibilityLabel={accessibilityLabel}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    overflow: "hidden",
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
  },
});
