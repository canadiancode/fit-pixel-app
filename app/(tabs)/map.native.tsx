import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import {
  TAB_SCREEN_ROOT_ABOVE_TAB_BAR,
  TAB_SCREEN_STACK_CHROME_LAYOUT,
} from "@/constants/app-shell";
import { FIT_PIXEL_GOOGLE_MAP_STYLE } from "@/constants/google-map-style";
import { FONT_FAMILY } from "@/constants/fonts";
import { useAuth } from "@/features/auth/auth-context";
import { MapHeader } from "@/features/map/components/map-header";
import {
  FALLBACK_GYMS,
  gymHeroSource,
  type GymCatalogItem,
} from "@/features/map/gym-catalog";
import { joinGymChat, listGyms, type GymListItem } from "@/lib/api/chat";
import { FitPixelApiError } from "@/lib/api/client";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  type TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "react-native-maps";

type MapGym = GymCatalogItem & {
  memberCount: number;
  joined: boolean;
};

function toMapGym(item: GymCatalogItem | GymListItem): MapGym {
  if ("memberCount" in item) {
    return {
      id: item.id,
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      imageKey: item.imageKey ?? undefined,
      memberCount: item.memberCount,
      joined: item.joined,
    };
  }
  return {
    id: item.id,
    name: item.name,
    latitude: item.latitude,
    longitude: item.longitude,
    imageKey: item.imageKey,
    memberCount: 0,
    joined: false,
  };
}

/** Default camera (Vancouver, BC) until user location drives the region. */
const INITIAL_REGION = {
  latitude: 49.2827,
  longitude: -123.1207,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const GYM_MARKER_IMAGE = require("@/assets/icons/marker.png");
const USER_ICON_MAP_CARD = require("@/assets/icons/user.png");
const USER_CAR_ICON = require("@/assets/icons/car.png");
const LOCATE_ME_ICON = require("@/assets/icons/locate-me.png");
/** Popup card behind gym name, hero image, distance, etc. */
const MAP_GYM_SHEET_CARD_BACKGROUND = require("@/assets/backgrounds/blue-square-card.png");

const LOCATE_FAB_SIZE = 48;
const LOCATE_ICON_SIZE = 24;
/** Extra space below the status bar / notch; increase to move the locate FAB down. */
const LOCATE_FAB_TOP_OFFSET = 25;
/** Inset from the trailing screen edge (right in LTR); increase to move the locate FAB inward. */
const LOCATE_FAB_RIGHT_OFFSET = 25;
/** Zoom span when centering on the user from the locate FAB. */
const USER_REGION_LATITUDE_DELTA = 0.02;
const USER_REGION_LONGITUDE_DELTA = 0.02;

type LatLng = { latitude: number; longitude: number };

/** Great-circle distance in kilometres. */
function haversineKm(from: LatLng, to: LatLng): number {
  const R = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Rough driving minutes from straight-line km (no routing API).
 * Replace with Google Directions / Distance Matrix when available.
 */
function estimateDriveMinutes(straightLineKm: number): number {
  const effectiveUrbanKmh = 30;
  const detourFactor = 1.4;
  const roadKm = straightLineKm * detourFactor;
  return Math.max(1, Math.round((roadKm / effectiveUrbanKmh) * 60));
}

/** Hair space between hours and minutes (narrower than a normal space). */
const DRIVE_DURATION_HM_GAP = "\u200A";

/** Display drive time: `45m` under an hour, otherwise `1h 8m` or `2h` when minutes are zero. */
function formatDriveDurationMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h${DRIVE_DURATION_HM_GAP}${minutes}m`;
}

/** Street-level zoom when focusing a gym (portrait map ~ 9:16 span). */
const FOCUSED_LATITUDE_DELTA = 0.004;
const FOCUSED_LONGITUDE_DELTA = 0.006;
const FOCUS_ANIMATION_MS = 650;

export default function MapScreen() {
  const mapRef = useRef<InstanceType<typeof MapView>>(null);
  const gymFilterInputRef = useRef<TextInput>(null);
  const { session } = useAuth();
  const [gyms, setGyms] = useState<MapGym[]>(() =>
    FALLBACK_GYMS.map(toMapGym),
  );
  const [selectedGym, setSelectedGym] = useState<MapGym | null>(null);
  const [joining, setJoining] = useState(false);
  const [userLocationVisible, setUserLocationVisible] = useState(false);
  const [userCoords, setUserCoords] = useState<LatLng | null>(null);
  /** Map `onPress` often fires after a marker tap (esp. Android); skip one clear. */
  const skipNextMapDismiss = useRef(false);
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.max(300, Math.round(windowHeight * 0.34));

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    void listGyms()
      .then((rows) => {
        if (cancelled) return;
        const next = rows.map(toMapGym);
        setGyms(next);
        setSelectedGym((current) =>
          current ? (next.find((gym) => gym.id === current.id) ?? current) : current,
        );
      })
      .catch(() => {
        /* keep fallback pins */
      });
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== Location.PermissionStatus.GRANTED) {
        return;
      }
      setUserLocationVisible(true);
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      } catch {
        /* location unavailable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userLocationVisible || !selectedGym) return;
    let cancelled = false;
    (async () => {
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      } catch {
        /* keep previous coords */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedGym, userLocationVisible]);

  const driveEta = useMemo(() => {
    if (!selectedGym || !userCoords) return null;
    const km = haversineKm(userCoords, selectedGym);
    const minutes = estimateDriveMinutes(km);
    return { minutes, km };
  }, [selectedGym, userCoords]);

  const focusGym = useCallback((gym: MapGym) => {
    mapRef.current?.animateToRegion(
      {
        latitude: gym.latitude,
        longitude: gym.longitude,
        latitudeDelta: FOCUSED_LATITUDE_DELTA,
        longitudeDelta: FOCUSED_LONGITUDE_DELTA,
      },
      FOCUS_ANIMATION_MS,
    );
  }, []);

  const dismissGymFilterKeyboard = useCallback(() => {
    gymFilterInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  const handleSelectGym = useCallback(
    (gym: MapGym) => {
      dismissGymFilterKeyboard();
      skipNextMapDismiss.current = true;
      setSelectedGym(gym);
      focusGym(gym);
      setTimeout(() => {
        skipNextMapDismiss.current = false;
      }, 400);
    },
    [dismissGymFilterKeyboard, focusGym],
  );

  const handleOpenGymChat = useCallback(async () => {
    if (!selectedGym || joining) return;
    const open = (gymId: string) => {
      router.push({
        pathname: "/(tabs)/chat/gym-chat/[gymId]",
        params: { gymId },
      });
    };
    if (selectedGym.joined) {
      open(selectedGym.id);
      return;
    }
    if (!session?.access_token) {
      router.push("/(tabs)/settings");
      return;
    }
    setJoining(true);
    try {
      const gym = toMapGym(await joinGymChat(selectedGym.id));
      setGyms((current) =>
        current.map((item) => (item.id === gym.id ? gym : item)),
      );
      setSelectedGym(gym);
      open(gym.id);
    } catch (err) {
      if (err instanceof FitPixelApiError && err.status === 401) {
        router.push("/(tabs)/settings");
      }
    } finally {
      setJoining(false);
    }
  }, [joining, selectedGym, session?.access_token]);

  const handleMapPress = useCallback(() => {
    dismissGymFilterKeyboard();
    if (skipNextMapDismiss.current) {
      skipNextMapDismiss.current = false;
      return;
    }
    setSelectedGym(null);
  }, [dismissGymFilterKeyboard]);

  const handleMapPanDrag = useCallback(() => {
    dismissGymFilterKeyboard();
  }, [dismissGymFilterKeyboard]);

  const handleLocateMePress = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      const req = await Location.requestForegroundPermissionsAsync();
      if (req.status !== Location.PermissionStatus.GRANTED) {
        return;
      }
    }
    setUserLocationVisible(true);
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setUserCoords(coords);
      mapRef.current?.animateToRegion(
        {
          ...coords,
          latitudeDelta: USER_REGION_LATITUDE_DELTA,
          longitudeDelta: USER_REGION_LONGITUDE_DELTA,
        },
        FOCUS_ANIMATION_MS,
      );
    } catch {
      /* location unavailable */
    }
  }, []);

  return (
    <ThemedView
      lightColor={APP_SHELL_PRIMARY_BACKGROUND}
      darkColor={APP_SHELL_PRIMARY_BACKGROUND}
      style={styles.screenRoot}
    >
      <MapHeader ref={gymFilterInputRef} />
      <View style={styles.mapChrome}>
        <View style={styles.mapStack}>
          <MapView
            ref={mapRef}
            provider={
              Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
            }
            customMapStyle={
              Platform.OS === "android"
                ? [...FIT_PIXEL_GOOGLE_MAP_STYLE]
                : undefined
            }
            style={styles.map}
            initialRegion={INITIAL_REGION}
            showsUserLocation={userLocationVisible}
            showsMyLocationButton={false}
            onPress={handleMapPress}
            onPanDrag={handleMapPanDrag}
          >
            {gyms.map((gym) => (
              <Marker
                key={gym.id}
                coordinate={{
                  latitude: gym.latitude,
                  longitude: gym.longitude,
                }}
                image={GYM_MARKER_IMAGE}
                anchor={{ x: 0.5, y: 1 }}
                tracksViewChanges={false}
                accessibilityLabel={gym.name}
                onPress={() => handleSelectGym(gym)}
              />
            ))}
          </MapView>

          <View
            collapsable={false}
            style={[
              styles.locateFabOverlay,
              {
                paddingTop: LOCATE_FAB_TOP_OFFSET,
                paddingEnd: LOCATE_FAB_RIGHT_OFFSET,
              },
            ]}
            pointerEvents="box-none"
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Center map on my location"
              onPress={handleLocateMePress}
              style={({ pressed }) =>
                pressed ? styles.locateFabPressed : undefined
              }
            >
              <View style={styles.locateFabDisk} collapsable={false}>
                <Image
                  source={LOCATE_ME_ICON}
                  style={styles.locateFabIcon}
                  contentFit="contain"
                  accessibilityIgnoresInvertColors
                />
              </View>
            </Pressable>
          </View>

          {selectedGym ? (
            <View style={styles.sheetOverlay} pointerEvents="box-none">
              <View
                accessibilityLabel={`${selectedGym.name} details`}
                style={[styles.sheetCard, { height: sheetHeight }]}
              >
                <Image
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  source={MAP_GYM_SHEET_CARD_BACKGROUND}
                  style={styles.sheetCardBackground}
                  contentFit="fill"
                />
                <View style={styles.sheetCardForeground}>
                  <View style={styles.sheetInner}>
                    <Image
                      source={gymHeroSource(selectedGym.imageKey)}
                      style={styles.sheetHeroImage}
                      contentFit="cover"
                      accessibilityIgnoresInvertColors
                    />
                    <View style={styles.sheetBottomBlock}>
                      <ThemedText
                        type="title"
                        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                        style={styles.sheetGymName}
                        numberOfLines={2}
                      >
                        {selectedGym.name}
                      </ThemedText>
                      <View style={styles.sheetFooterMeta}>
                        <View style={styles.sheetFooterLeft}>
                          <Image
                            source={USER_ICON_MAP_CARD}
                            style={styles.sheetUserIcon}
                            contentFit="contain"
                          />
                          <ThemedText
                            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                            style={styles.sheetChatterCount}
                          >
                            {selectedGym.memberCount}
                          </ThemedText>
                        </View>
                        {userLocationVisible && driveEta ? (
                          <View style={styles.sheetDriveRow}>
                            <Image
                              source={USER_CAR_ICON}
                              style={styles.sheetCarIcon}
                              contentFit="contain"
                            />
                            <View style={styles.sheetDriveMetrics}>
                              <ThemedText
                                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                                style={styles.sheetDriveText}
                                numberOfLines={1}
                              >
                                {driveEta.km.toFixed(1)}km
                              </ThemedText>
                              <ThemedText
                                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                                style={styles.sheetDriveSep}
                                accessibilityElementsHidden
                                importantForAccessibility="no"
                              >
                                ·
                              </ThemedText>
                              <ThemedText
                                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                                style={styles.sheetDriveText}
                                numberOfLines={1}
                              >
                                {formatDriveDurationMinutes(driveEta.minutes)}
                              </ThemedText>
                            </View>
                          </View>
                        ) : null}
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          selectedGym.joined
                            ? `Open ${selectedGym.name} chat`
                            : `Join ${selectedGym.name} chat`
                        }
                        onPress={() => {
                          void handleOpenGymChat();
                        }}
                        style={({ pressed }) => [
                          styles.sheetChatButton,
                          pressed && styles.sheetChatButtonPressed,
                        ]}
                      >
                        <ThemedText
                          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                          style={styles.sheetChatButtonLabel}
                        >
                          {joining
                            ? "Joining..."
                            : selectedGym.joined
                              ? "Open chat"
                              : "Join chat"}
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    ...TAB_SCREEN_ROOT_ABOVE_TAB_BAR,
  },
  mapChrome: {
    ...TAB_SCREEN_STACK_CHROME_LAYOUT,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  mapStack: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  locateFabOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "flex-end",
    zIndex: 20,
    elevation: 20,
  },
  /**
   * Opaque disk on a plain `View` (not `Pressable` bg): Google / Apple map
   * surfaces often composite above sibling `Pressable` fills while leaving
   * nested `Image` visible — this structure keeps the button plate on top.
   */
  locateFabDisk: {
    width: LOCATE_FAB_SIZE,
    height: LOCATE_FAB_SIZE,
    borderRadius: LOCATE_FAB_SIZE / 2,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
    borderWidth: 3,
    borderColor: APP_SHELL_PRIMARY_BACKGROUND,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 21,
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  locateFabPressed: {
    opacity: 0.85,
  },
  locateFabIcon: {
    width: LOCATE_ICON_SIZE,
    height: LOCATE_ICON_SIZE,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  sheetCard: {
    flexDirection: "column",
    borderRadius: 14,
    overflow: "hidden",
  },
  sheetCardBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetCardForeground: {
    flex: 1,
    flexDirection: "column",
    minHeight: 0,
    paddingHorizontal: 12,
    paddingTop: 12,
    /** Slightly more than top so title / footer breathe above the card edge. */
    paddingBottom: 18,
  },
  sheetInner: {
    flex: 1,
    flexDirection: "column",
    minHeight: 0,
  },
  /** ~2/3 of card inner height (flex 2 vs bottom block flex 1), minus card padding. */
  sheetHeroImage: {
    flex: 2,
    minHeight: 0,
    width: "100%",
    alignSelf: "stretch",
    borderRadius: 10,
  },
  /** ~1/3 for title + actions; content pinned toward bottom of this band. */
  sheetBottomBlock: {
    flex: 1,
    minHeight: 0,
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 8,
    paddingRight: 8,
  },
  sheetGymName: {
    textAlign: "left",
    fontSize: 14,
    lineHeight: 20,
  },
  sheetFooterMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    minWidth: 0,
  },
  sheetFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
    marginInlineEnd: 8,
  },
  sheetDriveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  sheetDriveMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  sheetDriveSep: {
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
  },
  sheetUserIcon: {
    width: 22,
    height: 22,
  },
  sheetCarIcon: {
    width: 24,
    height: 24,
  },
  sheetChatterCount: {
    fontSize: 14,
    lineHeight: 20,
  },
  sheetDriveText: {
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  sheetChatButton: {
    alignSelf: "stretch",
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetChatButtonPressed: {
    opacity: 0.85,
  },
  sheetChatButtonLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 16,
  },
});
