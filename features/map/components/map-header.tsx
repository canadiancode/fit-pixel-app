import { Image } from "expo-image";
import { forwardRef, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import {
  APP_SHELL_INPUT_PLACEHOLDER_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
} from "@/constants/app-colors";
import {
  TAB_HEADER_CONTENT_HEIGHT,
  TAB_HEADER_ROW_LAYOUT,
} from "@/constants/app-shell";
import { FONT_FAMILY } from "@/constants/fonts";

const SEARCH_INPUT_BACKGROUND = require("@/assets/backgrounds/search-input.png");
const FILTER_ICON = require("@/assets/icons/filter.png");

const FILTER_BUTTON_SIZE = 52;
const FILTER_ICON_SIZE = 30;

const SINGLE_LINE_ANDROID = Platform.select({
  android: {
    includeFontPadding: false,
    textAlignVertical: "center" as const,
  },
  default: {},
});

type MapHeaderProps = {
  /** Controlled search text; falls back to local state when omitted (web stub). */
  query?: string;
  onChangeQuery?: (next: string) => void;
  onSubmitQuery?: () => void;
  onFocus?: () => void;
};

export const MapHeader = forwardRef<TextInput, MapHeaderProps>(function MapHeader(
  { query: controlledQuery, onChangeQuery, onSubmitQuery, onFocus },
  ref,
) {
  const [localQuery, setLocalQuery] = useState("");
  const query = controlledQuery ?? localQuery;
  const setQuery = onChangeQuery ?? setLocalQuery;

  return (
    <View style={styles.headerRow}>
      <View style={styles.contentBlock}>
        <View style={styles.searchRow}>
          <View style={styles.inputShell}>
            <Image
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              source={SEARCH_INPUT_BACKGROUND}
              style={StyleSheet.absoluteFillObject}
              contentFit="fill"
            />
            <TextInput
              ref={ref}
              accessibilityLabel="Search gyms by name"
              value={query}
              onChangeText={setQuery}
              placeholder="Search gyms…"
              placeholderTextColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
              onSubmitEditing={onSubmitQuery}
              onFocus={onFocus}
              blurOnSubmit
              underlineColorAndroid="transparent"
              {...SINGLE_LINE_ANDROID}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter gyms"
            style={({ pressed }) => [
              styles.filterButton,
              pressed && styles.filterButtonPressed,
            ]}
          >
            <Image
              source={FILTER_ICON}
              style={styles.filterIcon}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerRow: {
    ...TAB_HEADER_ROW_LAYOUT,
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
  },
  contentBlock: {
    height: TAB_HEADER_CONTENT_HEIGHT,
    justifyContent: "flex-end",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputShell: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
  },
  input: {
    width: "100%",
    height: 52,
    /** Extra space on the left for the search icon baked into the background asset. */
    paddingLeft: 55,
    /** Room for the iOS clear (“×”) control while editing. */
    paddingRight: 50,
    paddingVertical: 0,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    color: APP_SHELL_MAIN_TEXT_COLOR,
    backgroundColor: "transparent",
  },
  filterButton: {
    width: FILTER_BUTTON_SIZE,
    height: FILTER_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  filterButtonPressed: {
    opacity: 0.85,
  },
  filterIcon: {
    width: FILTER_ICON_SIZE,
    height: FILTER_ICON_SIZE,
  },
});
