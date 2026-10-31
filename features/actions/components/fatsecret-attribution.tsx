import { Image } from "expo-image";
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import { Pressable, StyleSheet } from "react-native";

/**
 * FatSecret's official "Powered by" badge (dark horizontal variant). Their
 * attribution policy requires it wherever FatSecret nutrition data is shown,
 * linked to the platform site, with the image left unmodified.
 */
const FATSECRET_BADGE = require("@/assets/images/attribution/powered-by-fatsecret.png");
const FATSECRET_PLATFORM_URL = "https://platform.fatsecret.com";

/** Source badge is 212×40; keep that ratio. */
const BADGE_HEIGHT = 32;
const BADGE_WIDTH = (212 / 40) * BADGE_HEIGHT;

export function FatSecretAttribution() {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Nutrition information provided by fatsecret Platform API"
      hitSlop={8}
      onPress={() => {
        void openBrowserAsync(FATSECRET_PLATFORM_URL, {
          presentationStyle: WebBrowserPresentationStyle.PAGE_SHEET,
        });
      }}
      style={({ pressed }) => [styles.badge, pressed && styles.pressed]}
    >
      <Image
        source={FATSECRET_BADGE}
        style={styles.image}
        contentFit="contain"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "center",
    marginTop: 20,
  },
  pressed: {
    opacity: 0.7,
  },
  image: {
    width: BADGE_WIDTH,
    height: BADGE_HEIGHT,
  },
});
