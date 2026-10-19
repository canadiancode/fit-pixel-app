import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import {
  DEFAULT_GYM_FILTERS,
  GYM_DISTANCE_OPTIONS,
  GYM_KIND_LABELS,
  type GymFilters,
  type GymKind,
  type GymShowFilter,
} from "../gym-filters";

const PRIMARY_BUTTON_BACKGROUND = require("@/assets/backgrounds/add-action.png");

/** Same pixel-card palette as the Chat and Settings tabs. */
const CARD_FILL = "#01224e";
const CARD_RIM = "#0b4f96";
const CARD_RIM_ACTIVE = "#2f86e8";
const TRACK_FILL = "#011a3a";
const ON_COLOR = "#5fd35f";

const SHOW_OPTIONS: { value: GymShowFilter; label: string }[] = [
  { value: "all", label: "All gyms" },
  { value: "joined", label: "Joined" },
  { value: "favourites", label: "Favourites" },
];

type Props = {
  visible: boolean;
  filters: GymFilters;
  onChange: (next: GymFilters) => void;
  onClose: () => void;
  /** Gyms that match the current filters (for the "Show N gyms" button). */
  matchCount: number;
  kinds: { kind: GymKind; count: number }[];
  /** Distance needs your location; the options are disabled without it. */
  hasLocation: boolean;
  onEnableLocation: () => void;
};

function tap() {
  if (process.env.EXPO_OS === "ios") void Haptics.selectionAsync();
}

function Chip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Bottom sheet of map filters; changes apply live, "Show N gyms" closes. */
export function MapFilterSheet({
  visible,
  filters,
  onChange,
  onClose,
  matchCount,
  kinds,
  hasLocation,
  onEnableLocation,
}: Props) {
  const insets = useSafeAreaInsets();
  const set = (patch: Partial<GymFilters>) => onChange({ ...filters, ...patch });

  const toggleKind = (kind: GymKind) => {
    const has = filters.kinds.includes(kind);
    set({
      kinds: has
        ? filters.kinds.filter((k) => k !== kind)
        : [...filters.kinds, kind],
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          onPress={onClose}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.grabber} />
          <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">
              Filter gyms
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset filters"
              hitSlop={10}
              onPress={() => {
                tap();
                onChange(DEFAULT_GYM_FILTERS);
              }}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.reset}>Reset</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <SectionTitle>show</SectionTitle>
              <View style={styles.segTrack} accessibilityRole="radiogroup">
                {SHOW_OPTIONS.map((option) => {
                  const selected = filters.show === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityLabel={option.label}
                      accessibilityState={{ selected }}
                      onPress={() => {
                        tap();
                        set({ show: option.value });
                      }}
                      style={[styles.segItem, selected && styles.segItemSelected]}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          selected && styles.chipLabelSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <SectionTitle>distance from you</SectionTitle>
              <View style={styles.chips}>
                {GYM_DISTANCE_OPTIONS.map((km) => (
                  <Chip
                    key={String(km)}
                    label={km == null ? "Any" : `${km} km`}
                    selected={filters.maxKm === km}
                    disabled={km != null && !hasLocation}
                    onPress={() => set({ maxKm: km })}
                  />
                ))}
              </View>
              {!hasLocation ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onEnableLocation}
                  hitSlop={6}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={styles.hintLink}>
                    Turn on location to filter by distance
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.section}>
              <SectionTitle>activity</SectionTitle>
              <View style={styles.card}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleTitle}>Active chats only</Text>
                    <Text style={styles.toggleBody}>
                      Gyms with at least one Pixel in their chat.
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel="Active chats only"
                    value={filters.activeOnly}
                    onValueChange={(activeOnly) => {
                      tap();
                      set({ activeOnly });
                    }}
                    ios_backgroundColor={TRACK_FILL}
                    trackColor={{ false: TRACK_FILL, true: ON_COLOR }}
                    thumbColor={APP_SHELL_MAIN_TEXT_COLOR}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <SectionTitle>gym type</SectionTitle>
              <View style={styles.chips}>
                {kinds.map(({ kind, count }) => (
                  <Chip
                    key={kind}
                    label={`${GYM_KIND_LABELS[kind]} ${count}`}
                    selected={filters.kinds.includes(kind)}
                    onPress={() => toggleKind(kind)}
                  />
                ))}
              </View>
              <Text style={styles.hint}>
                Pick any number. None picked shows every type.
              </Text>
            </View>
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Show ${matchCount} gyms`}
            onPress={onClose}
            style={({ pressed }) => [styles.apply, pressed && styles.pressed]}
          >
            <Image
              source={PRIMARY_BUTTON_BACKGROUND}
              style={StyleSheet.absoluteFillObject}
              contentFit="fill"
              accessibilityIgnoresInvertColors
            />
            <Text style={styles.applyLabel}>
              {matchCount === 0
                ? "No gyms match"
                : `Show ${matchCount} gym${matchCount === 1 ? "" : "s"}`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,8,20,0.55)",
  },
  sheet: {
    maxHeight: "86%",
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: CARD_RIM,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: CARD_RIM,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  title: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    lineHeight: 20,
  },
  reset: {
    color: APP_SHELL_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
    textDecorationLine: "underline",
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    gap: 24,
    paddingBottom: 8,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: APP_SHELL_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
    paddingHorizontal: 2,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: CARD_RIM,
    backgroundColor: TRACK_FILL,
    justifyContent: "center",
  },
  chipSelected: {
    borderColor: CARD_RIM_ACTIVE,
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
  },
  chipLabel: {
    color: APP_SHELL_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
  },
  chipLabelSelected: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  segTrack: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: CARD_RIM,
    backgroundColor: TRACK_FILL,
  },
  segItem: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  segItemSelected: {
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
    borderColor: CARD_RIM_ACTIVE,
  },
  card: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: CARD_RIM,
    backgroundColor: CARD_FILL,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  toggleText: {
    flex: 1,
    gap: 8,
  },
  toggleTitle: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 15,
  },
  toggleBody: {
    color: APP_SHELL_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 13,
  },
  hint: {
    color: APP_SHELL_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  hintLink: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 13,
    paddingHorizontal: 2,
    textDecorationLine: "underline",
  },
  apply: {
    height: 52,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  applyLabel: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
});
