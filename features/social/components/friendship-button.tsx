import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import type { useFriendshipActions } from "@/features/social/use-friendship-actions";
import type { FriendshipStatus } from "@/lib/api/chat";

type Actions = ReturnType<typeof useFriendshipActions>;

type Props = {
  target: { userId: string; displayName: string };
  status: FriendshipStatus;
  actions: Actions;
  onChange: (next: FriendshipStatus) => void;
  /** Compact pills for list rows; default is the profile-size button. */
  compact?: boolean;
};

/** Add / Requested / Accept+Decline / Friends control for one Pixel. */
export function FriendshipButton({
  target,
  status,
  actions,
  onChange,
  compact = false,
}: Props) {
  const busy = actions.busyUserId === target.userId;
  const apply = (promise: Promise<FriendshipStatus | null>) => {
    void promise.then((next) => {
      if (next) onChange(next);
    });
  };

  if (status === "self") return null;

  if (status === "pending_incoming") {
    return (
      <View style={styles.row}>
        <Pill
          label="Accept"
          primary
          compact={compact}
          disabled={busy}
          accessibilityLabel={`Accept friend request from ${target.displayName}`}
          onPress={() => apply(actions.accept(target))}
        />
        <Pill
          label="Decline"
          compact={compact}
          disabled={busy}
          accessibilityLabel={`Decline friend request from ${target.displayName}`}
          onPress={() => apply(actions.decline(target))}
        />
      </View>
    );
  }

  if (status === "pending_outgoing") {
    return (
      <Pill
        label={busy ? "..." : "Requested"}
        compact={compact}
        disabled={busy}
        accessibilityLabel={`Cancel friend request to ${target.displayName}`}
        onPress={() => apply(actions.cancel(target))}
      />
    );
  }

  if (status === "friends") {
    return (
      <Pill
        label={busy ? "..." : "Friends ✓"}
        compact={compact}
        disabled={busy}
        accessibilityLabel={`Friends with ${target.displayName}. Remove friend`}
        onPress={() => apply(actions.remove(target))}
      />
    );
  }

  return (
    <Pill
      label={busy ? "..." : "Add friend"}
      primary
      compact={compact}
      disabled={busy}
      accessibilityLabel={`Add ${target.displayName} as a friend`}
      onPress={() => apply(actions.add(target))}
    />
  );
}

type PillProps = {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  primary?: boolean;
  compact?: boolean;
  disabled?: boolean;
};

export function Pill({
  label,
  onPress,
  accessibilityLabel,
  primary = false,
  compact = false,
  disabled = false,
}: PillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.hit,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View
        style={[
          styles.pill,
          compact && styles.pillCompact,
          primary ? styles.pillPrimary : styles.pillOutline,
        ]}
      >
        <ThemedText
          lightColor={
            primary ? APP_SHELL_MAIN_TEXT_COLOR : APP_SHELL_LABEL_COLOR
          }
          darkColor={
            primary ? APP_SHELL_MAIN_TEXT_COLOR : APP_SHELL_LABEL_COLOR
          }
          style={[styles.label, compact && styles.labelCompact]}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  hit: {
    alignSelf: "flex-start",
  },
  pill: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pillCompact: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pillPrimary: {
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
  },
  pillOutline: {
    borderWidth: 1,
    borderColor: APP_SHELL_INPUT_BOARDER_COLOR,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
  },
  labelCompact: {
    fontSize: 9,
    lineHeight: 12,
  },
});
