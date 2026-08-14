import { Image } from "expo-image";
import { useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { WATER_RIGHT_ARROW_ICON } from "@/features/actions/constants";
import {
  HISTORY_LOOKBACK_OPTIONS,
  historyLookbackLabel,
  type HistoryLookbackId,
} from "@/features/actions/history-lookback";

type Props = {
  value: HistoryLookbackId;
  onChange: (next: HistoryLookbackId) => void;
};

export function HistoryLookbackDropdown({ value, onChange }: Props) {
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const label = historyLookbackLabel(value);

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const windowWidth = Dimensions.get("window").width;
      setMenuPos({
        top: y + height + 4,
        right: Math.max(12, windowWidth - (x + width)),
      });
      setOpen(true);
    });
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Lookback, ${label}`}
          accessibilityState={{ expanded: open }}
          hitSlop={8}
          onPress={openMenu}
          style={({ pressed }) => [
            styles.trigger,
            pressed && styles.triggerPressed,
          ]}
        >
          <View style={styles.triggerRow}>
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              numberOfLines={1}
              style={styles.triggerLabel}
            >
              {label}
            </ThemedText>
            <Image
              accessibilityIgnoresInvertColors
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              source={WATER_RIGHT_ARROW_ICON}
              style={[
                styles.triggerArrow,
                open ? styles.triggerArrowOpen : styles.triggerArrowClosed,
              ]}
              contentFit="contain"
            />
          </View>
        </Pressable>
      </View>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityLabel="Dismiss lookback menu"
          onPress={() => setOpen(false)}
          style={styles.backdrop}
        >
          <Pressable
            accessibilityRole="menu"
            accessibilityLabel="Lookback range"
            onPress={() => undefined}
            style={[
              styles.menu,
              { top: menuPos.top, right: menuPos.right },
            ]}
          >
            {HISTORY_LOOKBACK_OPTIONS.map((option) => {
              const selected = option.id === value;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.label}
                  onPress={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    selected && styles.menuItemSelected,
                    pressed && styles.menuItemPressed,
                  ]}
                >
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={[
                      styles.menuItemLabel,
                      selected && styles.menuItemLabelSelected,
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignSelf: "flex-end",
  },
  triggerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    alignSelf: "flex-end",
    flexWrap: "nowrap",
    gap: 5,
    padding: 5,
  },
  triggerPressed: {
    opacity: 0.85,
  },
  triggerLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
    flexShrink: 0,
  },
  triggerArrow: {
    width: 32,
    height: 32,
    flexShrink: 0,
  },
  /** Right-arrow asset rotated to point down (dropdown). */
  triggerArrowClosed: {
    transform: [{ rotate: "90deg" }],
  },
  /** Point up while the menu is open. */
  triggerArrowOpen: {
    transform: [{ rotate: "-90deg" }],
  },
  backdrop: {
    flex: 1,
  },
  menu: {
    position: "absolute",
    minWidth: 140,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: APP_SHELL_INPUT_BOARDER_COLOR,
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
    overflow: "hidden",
    paddingVertical: 8,
    gap: 12,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuItemSelected: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  menuItemPressed: {
    opacity: 0.88,
  },
  menuItemLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
  },
  menuItemLabelSelected: {
    fontWeight: "700",
  },
});
