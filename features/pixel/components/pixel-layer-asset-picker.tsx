import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { PopFlashView, usePopFlash } from "@/components/pop-flash";
import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import { parseBodyId } from "../character-catalog";
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
 * Layer asset list styled like gym chats (`GymChatListRow`):
 * thumb + wrapping label on one row, hairline bottom dividers.
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
        {options.map((option, index) => {
          const isSelected = option.id === selectedItemId;
          const showBottomBorder = index < options.length - 1;

          return (
            <PixelLayerAssetRow
              key={option.id}
              option={option}
              isSelected={isSelected}
              wearer={wearer}
              showBottomBorder={showBottomBorder}
              onSelect={() => onSelectItem(option.id)}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

function PixelLayerAssetRow({
  option,
  isSelected,
  wearer,
  showBottomBorder,
  onSelect,
}: {
  option: PixelItem;
  isSelected: boolean;
  wearer: PixelLoadout;
  showBottomBorder: boolean;
  onSelect: () => void;
}) {
  const popFlash = usePopFlash();

  return (
    <View style={[styles.cell, showBottomBorder && styles.cellBorderBottom]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${option.label}${isSelected ? ", selected" : ""}`}
        accessibilityState={{ selected: isSelected }}
        onPress={() => {
          if (!isSelected) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            popFlash.play();
          }
          onSelect();
        }}
        style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
      >
        <View style={styles.row}>
          <PopFlashView
            popFlash={popFlash}
            flashRadius={10}
            style={[styles.thumbShell, isSelected && styles.thumbSelected]}
          >
            <PixelItemThumb
              item={option}
              size={THUMB_SIZE - 4}
              wearer={wearer}
            />
          </PopFlashView>
          <View style={styles.textColumn}>
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.label}
            >
              {option.label}
            </ThemedText>
          </View>
        </View>
      </Pressable>
    </View>
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
    borderRadius: 12,
    overflow: "hidden",
  },
  cell: {
    alignSelf: "stretch",
    paddingVertical: 10,
  },
  cellBorderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_SHELL_INPUT_BOARDER_COLOR,
  },
  hit: {
    alignSelf: "stretch",
  },
  hitPressed: {
    opacity: 0.85,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    alignSelf: "stretch",
  },
  thumbShell: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    flexShrink: 0,
    alignSelf: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbSelected: {
    borderColor: APP_SHELL_MAIN_TEXT_COLOR,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: LABEL_FONT_SIZE,
    lineHeight: 18,
    fontWeight: "600",
  },
});
