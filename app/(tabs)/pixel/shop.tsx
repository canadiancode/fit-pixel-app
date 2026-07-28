import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { PixelSubScreenToolbar } from "@/features/pixel/components/pixel-sub-screen-toolbar";
import { usePixelLoadout } from "@/features/pixel/pixel-loadout-context";
import {
  PIXEL_SHOP_OFFERS,
  type PixelShopOffer,
} from "@/features/pixel/shop-catalog";
import { useXpState } from "@/features/xp/xp-state-context";

type OfferStatus = "owned" | "unlockable" | "locked";

function offerStatus(
  offer: PixelShopOffer,
  ownsItem: (id: string) => boolean,
  level: number,
): OfferStatus {
  if (ownsItem(offer.itemId)) return "owned";
  if (level >= offer.requiredLevel) return "unlockable";
  return "locked";
}

/** Level-gated pixel shop — unlocks append inventory + untrusted_client queue ops. */
export default function PixelShopScreen() {
  const router = useRouter();
  const { xp } = useXpState();
  const { ownsItem, unlockItem } = usePixelLoadout();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const onUnlock = useCallback(
    async (itemId: string) => {
      if (unlockingId != null) return;
      setUnlockingId(itemId);
      try {
        await unlockItem(itemId);
      } finally {
        setUnlockingId(null);
      }
    },
    [unlockItem, unlockingId],
  );

  return (
    <View style={styles.root}>
      <PixelSubScreenToolbar
        accessibilityLabel="Back to customize"
        onBack={() => router.back()}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.title}
          accessibilityRole="header"
        >
          Shop
        </ThemedText>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.levelLine}
        >
          Level {xp.level}
        </ThemedText>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.hint}
        >
          Unlock cosmetics with your level. Local unlocks are honor-system until
          the server is authoritative.
        </ThemedText>

        <View style={styles.list}>
          {PIXEL_SHOP_OFFERS.map((offer) => {
            const status = offerStatus(offer, ownsItem, xp.level);
            const isBusy = unlockingId === offer.itemId;
            return (
              <View key={offer.itemId} style={styles.row}>
                <View style={styles.rowText}>
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.itemLabel}
                    numberOfLines={1}
                  >
                    {offer.label}
                  </ThemedText>
                  <ThemedText
                    lightColor={APP_SHELL_LABEL_COLOR}
                    darkColor={APP_SHELL_LABEL_COLOR}
                    style={styles.itemMeta}
                  >
                    {status === "owned"
                      ? "Owned"
                      : status === "unlockable"
                        ? `Unlock · Level ${offer.requiredLevel}`
                        : `Locked · Level ${offer.requiredLevel}`}
                  </ThemedText>
                </View>
                {status === "owned" ? (
                  <View style={[styles.badge, styles.badgeOwned]}>
                    <ThemedText
                      lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                      darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                      style={styles.badgeText}
                    >
                      Owned
                    </ThemedText>
                  </View>
                ) : status === "unlockable" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Unlock ${offer.label}`}
                    disabled={isBusy}
                    onPress={() => void onUnlock(offer.itemId)}
                    style={({ pressed }) => [
                      styles.badge,
                      styles.badgeUnlock,
                      (pressed || isBusy) && styles.badgePressed,
                    ]}
                  >
                    {isBusy ? (
                      <ActivityIndicator
                        color={APP_SHELL_MAIN_TEXT_COLOR}
                        size="small"
                      />
                    ) : (
                      <ThemedText
                        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                        style={styles.badgeText}
                      >
                        Unlock
                      </ThemedText>
                    )}
                  </Pressable>
                ) : (
                  <View style={[styles.badge, styles.badgeLocked]}>
                    <ThemedText
                      lightColor={APP_SHELL_LABEL_COLOR}
                      darkColor={APP_SHELL_LABEL_COLOR}
                      style={styles.badgeText}
                    >
                      Lv {offer.requiredLevel}
                    </ThemedText>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
  },
  levelLine: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    marginTop: 4,
  },
  hint: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 20,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: APP_SHELL_INPUT_BOARDER_COLOR,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  itemMeta: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
  },
  badge: {
    minWidth: 72,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeOwned: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  badgeUnlock: {
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
  },
  badgeLocked: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: APP_SHELL_INPUT_BOARDER_COLOR,
  },
  badgePressed: {
    opacity: 0.75,
  },
  badgeText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
});
