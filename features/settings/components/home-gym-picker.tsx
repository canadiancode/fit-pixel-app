import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PixelPanel, PixelPressablePanel } from "@/components/pixel-panel";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { SettingsSingleLineTextField } from "@/features/settings/components/settings-text-field";
import { listGyms, type GymListItem } from "@/lib/api/chat";

const MAX_RESULTS = 8;

type Props = {
  homeGymId: string | null;
  homeGymName: string | null;
  disabled?: boolean;
  onChange: (gym: { id: string; name: string } | null) => void;
};

/**
 * Home gym from the gyms Fit Pixel knows about: tap to search the list,
 * pick one, or clear it. Picking a real gym keeps the id, so the profile can
 * link to that gym's chat.
 */
export function HomeGymPicker({
  homeGymId,
  homeGymName,
  disabled = false,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gyms, setGyms] = useState<GymListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || gyms != null) return;
    let cancelled = false;
    void listGyms()
      .then((rows) => {
        if (!cancelled) setGyms(rows);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load gyms. Check your connection.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, gyms]);

  const results = useMemo(() => {
    if (gyms == null) return [];
    const needle = query.trim().toLowerCase();
    const sorted = [...gyms].sort((a, b) => a.name.localeCompare(b.name));
    return (
      needle === ""
        ? sorted
        : sorted.filter((gym) => gym.name.toLowerCase().includes(needle))
    ).slice(0, MAX_RESULTS);
  }, [gyms, query]);

  const choose = (gym: { id: string; name: string } | null) => {
    void Haptics.selectionAsync();
    onChange(gym);
    setOpen(false);
    setQuery("");
    Keyboard.dismiss();
  };

  if (!open) {
    return (
      <PixelPressablePanel
        frame="well"
        pressedFrame="blue"
        accessibilityRole="button"
        accessibilityLabel={`Home gym: ${homeGymName ?? "none"}. Tap to change.`}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={styles.current}
      >
        <Text
          numberOfLines={1}
          style={[styles.currentLabel, homeGymName == null && styles.placeholder]}
        >
          {homeGymName ?? "No gym selected"}
        </Text>
        <Text style={styles.change}>{homeGymName == null ? "Choose" : "Change"}</Text>
      </PixelPressablePanel>
    );
  }

  return (
    <View style={styles.panel}>
      <SettingsSingleLineTextField
        accessibilityLabel="Search gyms"
        value={query}
        onChangeText={setQuery}
        placeholder="Search gyms"
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
      />
      {error != null ? (
        <Text style={styles.message}>{error}</Text>
      ) : gyms == null ? (
        <ActivityIndicator color={APP_SHELL_MAIN_TEXT_COLOR} style={styles.loading} />
      ) : (
        <PixelPanel style={styles.list} accessibilityRole="list">
          {results.length === 0 ? (
            <Text style={styles.message}>{`No gyms match "${query.trim()}".`}</Text>
          ) : (
            results.map((gym) => {
              const selected = gym.id === homeGymId;
              return (
                <Pressable
                  key={gym.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={gym.name}
                  onPress={() => choose({ id: gym.id, name: gym.name })}
                  style={({ pressed }) => [
                    styles.row,
                    selected && styles.rowSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text numberOfLines={2} style={styles.rowLabel}>
                    {gym.name}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {gym.memberCount} {gym.memberCount === 1 ? "member" : "members"}
                  </Text>
                </Pressable>
              );
            })
          )}
        </PixelPanel>
      )}
      <View style={styles.footer}>
        {homeGymName != null ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => choose(null)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.footerAction}>Remove home gym</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setOpen(false);
            setQuery("");
            Keyboard.dismiss();
          }}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.footerAction}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  current: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  currentLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  placeholder: {
    color: APP_SHELL_LABEL_COLOR,
  },
  change: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 13,
    color: APP_SHELL_LABEL_COLOR,
  },
  pressed: {
    opacity: 0.8,
  },
  panel: {
    gap: 10,
  },
  loading: {
    paddingVertical: 12,
  },
  list: {
    padding: 4,
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
    /** 2 pt pixel rule, the frames' rim blue. */
    borderBottomWidth: 2,
    borderBottomColor: "#0b4f96",
  },
  rowSelected: {
    backgroundColor: "#0b4f96",
  },
  rowLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 15,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  rowMeta: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 11,
    color: APP_SHELL_LABEL_COLOR,
  },
  message: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
    color: APP_SHELL_LABEL_COLOR,
    paddingVertical: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerAction: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
    color: APP_SHELL_MAIN_TEXT_COLOR,
    textDecorationLine: "underline",
  },
});
