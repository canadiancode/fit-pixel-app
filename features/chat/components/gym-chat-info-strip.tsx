import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";

import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { CHAT_CARD_FILL, CHAT_CARD_RIM } from "@/features/chat/constants";

const EMPTY_FAVOURITE = require("@/assets/icons/empty-favourite.png");
const FILLED_FAVOURITE = require("@/assets/icons/favourite.png");
const LEAVE_BUTTON = require("@/assets/backgrounds/remove-action.png");

const STRIP_HEIGHT = 64;

type Props = {
  image: ImageSourcePropType;
  favorite: boolean;
  /** Disables the star while a favourite change is in flight. */
  favoriteBusy?: boolean;
  onToggleFavorite: () => void;
  onLeave: () => void;
  leaving?: boolean;
};

/** Hides the strip while the keyboard is up so typing gets the room. */
function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const animate = () =>
      LayoutAnimation.configureNext(
        LayoutAnimation.create(220, "easeInEaseOut", "opacity"),
      );
    const show = Keyboard.addListener(showEvent, () => {
      animate();
      setVisible(true);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      animate();
      setVisible(false);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/**
 * Compact gym banner under the header: the gym art behind a dark scrim and the
 * two things you do to a gym (star it, leave it). Member / live counts live in
 * the header subtitle so they stay visible while the keyboard hides this.
 */
export function GymChatInfoStrip({
  image,
  favorite,
  favoriteBusy = false,
  onToggleFavorite,
  onLeave,
  leaving = false,
}: Props) {
  const keyboardVisible = useKeyboardVisible();
  if (keyboardVisible) return null;

  return (
    <View style={styles.strip}>
      <Image
        source={image}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        accessibilityIgnoresInvertColors
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.scrim} pointerEvents="none" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          favorite ? "Remove from favourites" : "Add to favourites"
        }
        accessibilityState={{ selected: favorite, disabled: favoriteBusy }}
        disabled={favoriteBusy}
        hitSlop={6}
        onPress={onToggleFavorite}
        style={({ pressed }) => [
          styles.favouriteChip,
          favorite && styles.favouriteChipOn,
          pressed && styles.pressed,
        ]}
      >
        <Image
          source={favorite ? FILLED_FAVOURITE : EMPTY_FAVOURITE}
          style={styles.starIcon}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <Text style={styles.chipLabel}>
          {favorite ? "Favourited" : "Favourite"}
        </Text>
      </Pressable>
      <View style={styles.spacer} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Leave this gym"
        accessibilityState={{ disabled: leaving, busy: leaving }}
        disabled={leaving}
        onPress={onLeave}
        style={({ pressed }) => [
          styles.leaveButton,
          (pressed || leaving) && styles.pressed,
        ]}
      >
        <Image
          source={LEAVE_BUTTON}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
          accessibilityIgnoresInvertColors
        />
        <Text style={styles.leaveLabel}>{leaving ? "..." : "Leave"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    height: STRIP_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    overflow: "hidden",
    borderBottomWidth: 2,
    borderBottomColor: CHAT_CARD_RIM,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(1, 26, 58, 0.74)",
  },
  favouriteChip: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: CHAT_CARD_RIM,
    backgroundColor: CHAT_CARD_FILL,
  },
  favouriteChipOn: {
    borderColor: "#f4c430",
  },
  starIcon: {
    width: 22,
    height: 22,
  },
  chipLabel: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
  },
  spacer: {
    flex: 1,
  },
  leaveButton: {
    width: 84,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  leaveLabel: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.75,
  },
});
