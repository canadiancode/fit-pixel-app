import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { APP_SHELL_SECONDARY_BACKGROUND } from "@/constants/app-colors";
import { PixelLayerAssetPicker } from "@/features/pixel/components/pixel-layer-asset-picker";
import { PixelSubScreenToolbar } from "@/features/pixel/components/pixel-sub-screen-toolbar";
import { isPixelLayerId } from "@/features/pixel/data";
import { usePixelLoadout } from "@/features/pixel/pixel-loadout-context";

export default function PixelLayerScreen() {
  const router = useRouter();
  const { layerId: layerIdParam } = useLocalSearchParams<{ layerId: string }>();
  const { loadout, inventory, selectItem, gender, bodySize } = usePixelLoadout();

  const layerId = typeof layerIdParam === "string" ? layerIdParam : "";
  if (!isPixelLayerId(layerId)) {
    return <Redirect href="/(tabs)/pixel/customize" />;
  }

  return (
    <View style={styles.root}>
      <PixelSubScreenToolbar
        accessibilityLabel="Back to layer categories"
        onBack={() => router.back()}
      />
      <View style={styles.body}>
        <PixelLayerAssetPicker
          layerId={layerId}
          inventory={inventory}
          selectedItemId={loadout[layerId]}
          onSelectItem={(itemId) => selectItem(layerId, itemId)}
          gender={gender}
          bodySize={bodySize}
          wearer={loadout}
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
