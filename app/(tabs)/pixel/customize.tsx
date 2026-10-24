import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { APP_SHELL_SECONDARY_BACKGROUND } from "@/constants/app-colors";
import { PixelCollection } from "@/features/pixel/components/pixel-collection";
import { PixelSubScreenToolbar } from "@/features/pixel/components/pixel-sub-screen-toolbar";

export default function PixelCustomizeScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <PixelSubScreenToolbar
        accessibilityLabel="Back to dashboard"
        onBack={() => router.back()}
        trailingAction={{
          label: "Enter shop",
          accessibilityLabel: "Enter shop",
          onPress: () => router.push("/(tabs)/pixel/shop"),
        }}
      />
      <View style={styles.body}>
        <PixelCollection
          onSelectCategory={(category) => {
            router.push(`/(tabs)/pixel/${category.id}`);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});
