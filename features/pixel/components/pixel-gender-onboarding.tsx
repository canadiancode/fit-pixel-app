import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import {
  SETTINGS_CARD_FILL,
  SETTINGS_CARD_RIM,
  SETTINGS_CARD_RIM_ACTIVE,
  SettingsButton,
} from "@/features/settings/components/settings-ui";

import { createStarterLook } from "../default-loadout";
import { PIXEL_FIGURE_ASPECT_RATIO } from "../figure-geometry";
import { usePixelLoadout } from "../pixel-loadout-context";
import type { PixelGender, PixelLoadout } from "../types";
import { PixelFigure } from "./pixel-character";

const OPTIONS: readonly { gender: PixelGender; label: string }[] = [
  { gender: "male", label: "Male" },
  { gender: "female", label: "Female" },
];

/**
 * First launch (and after the character art reset): pick male or female.
 * Each card shows the random beginner look you'll start in; Shuffle re-rolls.
 */
export function PixelGenderOnboarding() {
  const { isHydrated, gender, bodySize, loadout, chooseStarterLook } =
    usePixelLoadout();
  const insets = useSafeAreaInsets();
  const [looks, setLooks] = useState<Record<PixelGender, PixelLoadout>>(() => ({
    male: createStarterLook("male", bodySize, loadout),
    female: createStarterLook("female", bodySize, loadout),
  }));

  const visible = isHydrated && gender == null;

  const shuffle = () => {
    void Haptics.selectionAsync();
    setLooks({
      male: createStarterLook("male", bodySize, loadout),
      female: createStarterLook("female", bodySize, loadout),
    });
  };

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          type="title"
          style={styles.title}
          accessibilityRole="header"
        >
          Pick your Pixel
        </ThemedText>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.subtitle}
        >
          You start in beginner gear. Level up to unlock new clothes and a
          stronger build. You can switch this later in Settings → Profile.
        </ThemedText>

        <View style={styles.cards}>
          {OPTIONS.map((option) => (
            <Pressable
              key={option.gender}
              accessibilityRole="button"
              accessibilityLabel={`Start as ${option.label}`}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                chooseStarterLook(option.gender, looks[option.gender]);
              }}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <PixelFigure
                loadout={looks[option.gender]}
                accessibilityLabel={`${option.label} Pixel`}
                style={styles.figure}
              />
              <Text style={styles.cardLabel}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <SettingsButton label="Shuffle looks" onPress={shuffle} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 16,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 20,
  },
  cards: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 0,
    marginTop: 8,
  },
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: SETTINGS_CARD_RIM,
    backgroundColor: SETTINGS_CARD_FILL,
  },
  cardPressed: {
    borderColor: SETTINGS_CARD_RIM_ACTIVE,
    opacity: 0.9,
  },
  /** Height fills the card; width follows the character canvas. */
  figure: {
    flex: 1,
    aspectRatio: PIXEL_FIGURE_ASPECT_RATIO,
    maxWidth: "100%",
  },
  cardLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    lineHeight: 22,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
});
