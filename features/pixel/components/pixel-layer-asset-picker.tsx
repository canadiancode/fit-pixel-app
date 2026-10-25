import * as Haptics from "expo-haptics";
import { ScrollView, StyleSheet, View } from "react-native";

import { PixelPanel, PixelPressablePanel } from "@/components/pixel-panel";
import { PopFlashView, usePopFlash } from "@/components/pop-flash";
import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import { parseBodyId } from "../character-catalog";
import { getItemOrigin } from "../item-origin";
import { getOwnedItemsForLayer } from "../layer-assets";
import { PixelItemThumb } from "./pixel-item-thumb";
import type {
  PixelBodySize,
  PixelGender,
  PixelItem,
  PixelItemId,
  PixelLayerId,
  PixelLoadout,
} from "../types";

const THUMB_SIZE = 72;
const LABEL_FONT_SIZE = 12;
const UNLOCK_FONT_SIZE = 10;

type Props = {
  layerId: PixelLayerId;
  /** Owned item ids — picker only lists inventory for this layer. */
  inventory: readonly PixelItemId[];
  selectedItemId: PixelItemId | undefined;
  onSelectItem: (itemId: PixelItemId) => void;
  /** Only items this body can wear; skin tones for the current body size. */
  gender: PixelGender | null;
  bodySize: PixelBodySize;
  /** Your look: thumbnails show each option worn. */
  wearer: PixelLoadout;
};

/**
 * Layer asset list: one pixel-frame card per item (thumb + wrapping label),
 * the equipped one on the brighter frame.
 */
export function PixelLayerAssetPicker({
  layerId,
  inventory,
  selectedItemId,
  onSelectItem,
  gender,
  bodySize,
  wearer,
}: Props) {
  const options = getOwnedItemsForLayer(layerId, inventory, gender).filter(
    (item) => layerId !== "skin" || parseBodyId(item.id)?.size === bodySize,
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.list} accessibilityRole="list">
        {options.map((option) => (
          <PixelLayerAssetRow
            key={option.id}
            option={option}
            isSelected={option.id === selectedItemId}
            wearer={wearer}
            onSelect={() => onSelectItem(option.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function PixelLayerAssetRow({
  option,
  isSelected,
  wearer,
  onSelect,
}: {
  option: PixelItem;
  isSelected: boolean;
  wearer: PixelLoadout;
  onSelect: () => void;
}) {
  const popFlash = usePopFlash();
  const origin = getItemOrigin(option.id);
  const unlockLabel =
    origin.unlockLevel != null ? `LV ${origin.unlockLevel}` : origin.badge;

  return (
    <PixelPressablePanel
      frame={isSelected ? "button" : "blue"}
      accessibilityRole="button"
        accessibilityLabel={`${option.label}. ${origin.description}${isSelected ? ", selected" : ""}`}
        accessibilityState={{ selected: isSelected }}
      onPress={() => {
        if (!isSelected) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          popFlash.play();
        }
        onSelect();
      }}
      style={styles.row}
    >
      <PopFlashView popFlash={popFlash} flashRadius={0} style={styles.thumbShell}>
        <PixelPanel frame="well" style={styles.thumbWell}>
          <PixelItemThumb item={option} size={THUMB_SIZE - 8} wearer={wearer} />
        </PixelPanel>
      </PopFlashView>
      <View style={styles.textColumn}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.label}
        >
          {option.label}
        </ThemedText>
        <View style={styles.metaLine}>
          {isSelected ? <ThemedText style={styles.equipped}>EQUIPPED</ThemedText> : <View />}
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.unlock}
          >
            {unlockLabel}
          </ThemedText>
        </View>
      </View>
    </PixelPressablePanel>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 18,
  },
  list: {
    alignSelf: "stretch",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    alignSelf: "stretch",
    padding: 10,
  },
  thumbShell: {
    flexShrink: 0,
  },
  thumbWell: {
    padding: 4,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
    alignSelf: "stretch",
    justifyContent: "space-between",
    paddingVertical: 4,
    gap: 8,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: LABEL_FONT_SIZE,
    lineHeight: 18,
  },
  metaLine: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  equipped: {
    color: "#FFD23F",
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 12,
  },
  unlock: {
    fontFamily: FONT_FAMILY,
    fontSize: UNLOCK_FONT_SIZE,
    lineHeight: 14,
  },
});
