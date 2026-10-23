import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import {
  TAB_SCREEN_ROOT_ABOVE_TAB_BAR,
  TAB_SCREEN_STACK_CHROME_LAYOUT,
} from "@/constants/app-shell";
import { FONT_FAMILY } from "@/constants/fonts";
import { FIT_PIXEL_GOOGLE_MAP_STYLE } from "@/constants/google-map-style";
import { useAuth } from "@/features/auth/auth-context";
import { AddGymSheet } from "@/features/map/components/add-gym-sheet";
import { MapFilterSheet } from "@/features/map/components/map-filter-sheet";
import { MapHeader } from "@/features/map/components/map-header";
import {
  FALLBACK_GYMS,
  gymHeroSource,
  searchGyms,
  type GymCatalogItem,
} from "@/features/map/gym-catalog";
import {
  DEFAULT_GYM_FILTERS,
  activeFilterCount,
  applyGymFilters,
  availableGymKinds,
  type GymFilters,
} from "@/features/map/gym-filters";
import { joinGymChat, listGyms, type GymListItem } from "@/lib/api/chat";
import { FitPixelApiError } from "@/lib/api/client";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
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
  favorite: boolean;
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
      favorite: item.favorite ?? false,
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
    favorite: false,
  };
}

/** Default camera (Vancouver, BC) until user location drives the region. */
const INITIAL_REGION = {
  latitude: 49.2827,
  longitude: -123.1207,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

function androidGoogleMapsApiKey(): string {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const fromConfig =
    Constants.expoConfig?.android?.config?.googleMaps?.apiKey ?? "";
  return fromEnv.trim() || fromConfig.trim();
}

const GYM_MARKER_IMAGE = require("@/assets/icons/marker.png");
const USER_ICON_MAP_CARD = require("@/assets/icons/user.png");
const USER_CAR_ICON = require("@/assets/icons/car.png");
const LOCATE_ME_ICON = require("@/assets/icons/locate-me.png");
const ADD_GYM_ICON = require("@/assets/icons/add.png");
const PRIMARY_BUTTON_BACKGROUND = require("@/assets/backgrounds/add-action.png");
/** Popup card behind gym name, hero image, distance, etc. */
const MAP_GYM_SHEET_CARD_BACKGROUND = require("@/assets/backgrounds/blue-square-card.png");

/**
 * Point size for gym pins (keeps the 93×105 marker.png aspect). Using a child
 * `Image` instead of Marker `image` so release/TestFlight does not treat the
 * PNG as 1x.
 */
const GYM_MARKER_WIDTH = 31;
const GYM_MARKER_HEIGHT = 35;

/** Smaller pin beside each gym search result row. */
const SEARCH_RESULT_PIN_WIDTH = 18;
const SEARCH_RESULT_PIN_HEIGHT = 20;

/** Max rows in the gym search dropdown. */
const GYM_SEARCH_RESULT_LIMIT = 8;

const LOCATE_FAB_SIZE = 48;
const LOCATE_ICON_SIZE = 24;
/** Extra space below the status bar / notch; increase to move the locate FAB down. */
const LOCATE_FAB_TOP_OFFSET = 25;
/** Inset from the trailing screen edge (right in LTR); increase to move the locate FAB inward. */
const LOCATE_FAB_RIGHT_OFFSET = 25;
/** Space between the locate and add-a-gym buttons. */
const FAB_GAP = 12;
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

/** Placing a new gym: zoom in at least this far so the pin lands on the right building. */
const ADD_GYM_MAX_LATITUDE_DELTA = 0.012;
/** Placement pin is a bit bigger than gym pins so it reads as "the one you're moving". */
const ADD_PIN_WIDTH = Math.round(GYM_MARKER_WIDTH * 1.3);
const ADD_PIN_HEIGHT = Math.round(GYM_MARKER_HEIGHT * 1.3);

/** Re-check the gym list when the tab is shown again, at most this often. */
const GYMS_REFRESH_MS = 60_000;

/** Gap under the gym sheet; keep in step with `sheetOverlay.paddingBottom`. */
const SHEET_BOTTOM_GAP = 10;

type GymMapMarkerProps = {
  gym: MapGym;
  onPress: (gym: MapGym) => void;
};

/**
 * Custom marker via styled child Image (not Marker `image`) so pin size is
 * consistent between Metro/dev-client and release/TestFlight builds.
 */
function GymMapMarker({ gym, onPress }: GymMapMarkerProps) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  return (
    <Marker
      coordinate={{
        latitude: gym.latitude,
        longitude: gym.longitude,
      }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracksViewChanges}
      accessibilityLabel={gym.name}
      onPress={() => onPress(gym)}
    >
      <Image
        source={GYM_MARKER_IMAGE}
        style={styles.gymMarkerImage}
        contentFit="contain"
        accessibilityIgnoresInvertColors
        onLoad={() => setTracksViewChanges(false)}
      />
    </Marker>
  );
}

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
  const [gymQuery, setGymQuery] = useState("");
  const [filters, setFilters] = useState<GymFilters>(DEFAULT_GYM_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  /** Map `onPress` often fires after a marker tap (esp. Android); skip one clear. */
  const skipNextMapDismiss = useRef(false);
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.max(300, Math.round(windowHeight * 0.34));

  const [addingGym, setAddingGym] = useState(false);
  const [addGymSheet, setAddGymSheet] = useState<"form" | "mine" | null>(null);
  const [newGymPin, setNewGymPin] = useState<LatLng | null>(null);
  const gymsLoadedAt = useRef(0);

  const loadGyms = useCallback(() => {
    gymsLoadedAt.current = Date.now();
    return listGyms()
      .then((rows) => {
        const next = rows.map(toMapGym);
        setGyms(next);
        setSelectedGym((current) =>
          current ? (next.find((gym) => gym.id === current.id) ?? current) : current,
        );
      })
      .catch(() => {
        /* keep fallback pins */
      });
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    void loadGyms();
  }, [session?.access_token, loadGyms]);

  // Newly approved gyms appear without restarting the app.
  useFocusEffect(
    useCallback(() => {
      if (!session?.access_token) return;
      if (Date.now() - gymsLoadedAt.current < GYMS_REFRESH_MS) return;
      void loadGyms();
    }, [session?.access_token, loadGyms]),
  );

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

  /**
   * Where distance is measured from, rounded to ~1 km so small location
   * updates don't change the pin set (each change remounts the map, below).
   */
  const filterLat = userCoords ? Math.round(userCoords.latitude * 100) / 100 : null;
  const filterLon = userCoords ? Math.round(userCoords.longitude * 100) / 100 : null;
  const filterOrigin = useMemo(
    () =>
      filters.maxKm != null && filterLat != null && filterLon != null
        ? { latitude: filterLat, longitude: filterLon }
        : null,
    [filters.maxKm, filterLat, filterLon],
  );

  /** Pins and search both use the filtered set. */
  const visibleGyms = useMemo(
    () => applyGymFilters(gyms, filters, filterOrigin),
    [filters, gyms, filterOrigin],
  );
  /**
   * react-native-maps (iOS, new architecture interop) crashes in
   * AIRMap insertReactSubview when many markers are added, removed or
   * re-propped at once. Filtering therefore remounts the map with the new pin
   * set, starting from the camera the user was looking at.
   */
  const mapKey = useMemo(
    () => JSON.stringify([filters, filterOrigin, gyms.length]),
    [filters, filterOrigin, gyms.length],
  );
  const lastRegionRef = useRef(INITIAL_REGION);
  const gymKinds = useMemo(() => availableGymKinds(gyms), [gyms]);
  const filterCount = activeFilterCount(filters);

  const gymSearchResults = useMemo(
    () =>
      searchGyms(visibleGyms, gymQuery, userCoords).slice(
        0,
        GYM_SEARCH_RESULT_LIMIT,
      ),
    [visibleGyms, gymQuery, userCoords],
  );
  const showGymSearchResults = gymQuery.trim().length > 0;

  const driveEta = useMemo(() => {
    if (!selectedGym || !userCoords) return null;
    const km = haversineKm(userCoords, selectedGym);
    const minutes = estimateDriveMinutes(km);
    return { minutes, km };
  }, [selectedGym, userCoords]);

  /**
   * Centre the pin in the strip of map above the gym sheet, not behind it.
   * The map widens whichever span is short for its aspect ratio, so the
   * shift uses the latitude span it will really show.
   */
  const focusGym = useCallback(
    (gym: MapGym) => {
      const { width, height } = mapSize;
      let latitude = gym.latitude;
      if (width > 0 && height > 0) {
        const shownLatitudeDelta = Math.max(
          FOCUSED_LATITUDE_DELTA,
          FOCUSED_LONGITUDE_DELTA *
            Math.cos((gym.latitude * Math.PI) / 180) *
            (height / width),
        );
        const visibleHeight = height - sheetHeight - SHEET_BOTTOM_GAP;
        const pinBottomY = visibleHeight / 2 + GYM_MARKER_HEIGHT / 2;
        latitude -= ((height / 2 - pinBottomY) / height) * shownLatitudeDelta;
      }
      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude: gym.longitude,
          latitudeDelta: FOCUSED_LATITUDE_DELTA,
          longitudeDelta: FOCUSED_LONGITUDE_DELTA,
        },
        FOCUS_ANIMATION_MS,
      );
    },
    [mapSize, sheetHeight],
  );

  const dismissGymFilterKeyboard = useCallback(() => {
    gymFilterInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  const handleSelectGym = useCallback(
    (gym: MapGym) => {
      if (addingGym) return;
      dismissGymFilterKeyboard();
      setGymQuery("");
      skipNextMapDismiss.current = true;
      setSelectedGym(gym);
      focusGym(gym);
      setTimeout(() => {
        skipNextMapDismiss.current = false;
      }, 400);
    },
    [addingGym, dismissGymFilterKeyboard, focusGym],
  );

  const handleSubmitGymQuery = useCallback(() => {
    const first = gymSearchResults[0];
    if (first) handleSelectGym(first);
  }, [gymSearchResults, handleSelectGym]);

  const handleOpenGymChat = useCallback(async () => {
    if (!selectedGym || joining) return;
    const open = (gymId: string) => {
      router.push(
        {
          pathname: "/(tabs)/chat/gym-chat/[gymId]",
          params: { gymId },
        },
        { withAnchor: true },
      );
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

  // Picking a distance frames that radius around you.
  const maxKm = filters.maxKm;
  useEffect(() => {
    if (maxKm == null || userCoords == null) return;
    const latitudeDelta = ((maxKm * 2) / 111) * 1.15;
    mapRef.current?.animateToRegion(
      {
        ...userCoords,
        latitudeDelta,
        longitudeDelta:
          latitudeDelta / Math.cos((userCoords.latitude * Math.PI) / 180),
      },
      FOCUS_ANIMATION_MS,
    );
    // Only when the radius changes, not on every location update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxKm]);

  const handleMapPress = useCallback(() => {
    dismissGymFilterKeyboard();
    if (addingGym) return;
    if (skipNextMapDismiss.current) {
      skipNextMapDismiss.current = false;
      return;
    }
    setSelectedGym(null);
  }, [addingGym, dismissGymFilterKeyboard]);

  const handleMapPanDrag = useCallback(() => {
    dismissGymFilterKeyboard();
  }, [dismissGymFilterKeyboard]);

  /** Enter placement: the pin sits mid-map and the map moves under it. */
  const handleStartAddGym = useCallback(() => {
    dismissGymFilterKeyboard();
    setGymQuery("");
    setSelectedGym(null);
    setAddingGym(true);
    const region = lastRegionRef.current;
    if (region.latitudeDelta > ADD_GYM_MAX_LATITUDE_DELTA) {
      const latitudeDelta = ADD_GYM_MAX_LATITUDE_DELTA / 2;
      mapRef.current?.animateToRegion(
        {
          latitude: region.latitude,
          longitude: region.longitude,
          latitudeDelta,
          longitudeDelta:
            region.longitudeDelta * (latitudeDelta / region.latitudeDelta),
        },
        FOCUS_ANIMATION_MS,
      );
    }
  }, [dismissGymFilterKeyboard]);

  /** Long-press drops the pin there (the map slides that spot under it). */
  const handleMapLongPress = useCallback(
    (coordinate: LatLng) => {
      if (!addingGym) return;
      const { latitudeDelta, longitudeDelta } = lastRegionRef.current;
      mapRef.current?.animateToRegion(
        { ...coordinate, latitudeDelta, longitudeDelta },
        FOCUS_ANIMATION_MS,
      );
    },
    [addingGym],
  );

  const handleUseThisSpot = useCallback(() => {
    const { latitude, longitude } = lastRegionRef.current;
    setNewGymPin({ latitude, longitude });
    setAddGymSheet("form");
  }, []);

  const handleCancelAddGym = useCallback(() => {
    setAddingGym(false);
    setAddGymSheet(null);
    setNewGymPin(null);
  }, []);

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
      <MapHeader
        ref={gymFilterInputRef}
        query={gymQuery}
        onChangeQuery={setGymQuery}
        onSubmitQuery={handleSubmitGymQuery}
        onPressFilter={() => {
          dismissGymFilterKeyboard();
          setFiltersOpen(true);
        }}
        activeFilterCount={filterCount}
      />
      <MapFilterSheet
        visible={filtersOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFiltersOpen(false)}
        matchCount={visibleGyms.length}
        kinds={gymKinds}
        hasLocation={userCoords != null}
        onEnableLocation={() => void handleLocateMePress()}
      />
      <AddGymSheet
        visible={addGymSheet != null}
        mode={addGymSheet ?? "form"}
        coordinate={newGymPin}
        onMovePin={() => setAddGymSheet(null)}
        onSubmitted={() => setAddingGym(false)}
        onClose={() =>
          addGymSheet === "form" ? handleCancelAddGym() : setAddGymSheet(null)
        }
      />
      <View style={styles.mapChrome}>
        <View
          style={styles.mapStack}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setMapSize({ width, height });
          }}
        >
          <MapView
            key={mapKey}
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
            initialRegion={lastRegionRef.current}
            onRegionChangeComplete={(region) => {
              lastRegionRef.current = region;
            }}
            showsUserLocation={userLocationVisible}
            showsMyLocationButton={false}
            onPress={handleMapPress}
            onLongPress={(e) => handleMapLongPress(e.nativeEvent.coordinate)}
            onPanDrag={handleMapPanDrag}
          >
            {visibleGyms.map((gym) => (
              <GymMapMarker
                key={gym.id}
                gym={gym}
                onPress={handleSelectGym}
              />
            ))}
          </MapView>
          {Platform.OS === "android" && !androidGoogleMapsApiKey() ? (
            <View style={styles.mapsKeyOverlay} pointerEvents="none">
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.mapsKeyOverlayText}
              >
                Google Maps needs EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env,
                then a native rebuild (`npm run android`).
              </ThemedText>
            </View>
          ) : null}

          {filterCount > 0 && visibleGyms.length === 0 ? (
            <View
              collapsable={false}
              style={styles.noMatchOverlay}
              pointerEvents="box-none"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="No gyms match your filters. Reset filters"
                onPress={() => setFilters(DEFAULT_GYM_FILTERS)}
                style={({ pressed }) => [
                  styles.noMatchPill,
                  pressed && styles.noMatchPillPressed,
                ]}
              >
                <ThemedText
                  lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                  darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                  style={styles.noMatchText}
                >
                  No gyms match · Reset filters
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
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
            {!addingGym ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add a gym"
                accessibilityHint="Drop a pin on a gym that's missing from the map"
                onPress={handleStartAddGym}
                style={({ pressed }) => [
                  styles.addGymFab,
                  pressed && styles.locateFabPressed,
                ]}
              >
                <Image
                  source={ADD_GYM_ICON}
                  style={styles.addGymFabIcon}
                  contentFit="contain"
                  accessibilityIgnoresInvertColors
                />
              </Pressable>
            ) : null}
          </View>

          {addingGym ? (
            <>
              <View style={styles.addPinOverlay} pointerEvents="none">
                <View style={styles.addPinTarget} />
                <Image
                  source={GYM_MARKER_IMAGE}
                  style={styles.addPinImage}
                  contentFit="contain"
                  accessibilityIgnoresInvertColors
                />
              </View>
              <View style={styles.addHintCard} pointerEvents="none">
                <ThemedText
                  lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                  darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                  style={styles.addHintTitle}
                >
                  Add a gym
                </ThemedText>
                <ThemedText
                  lightColor={APP_SHELL_LABEL_COLOR}
                  darkColor={APP_SHELL_LABEL_COLOR}
                  style={styles.addHintBody}
                >
                  Drag the map until the pin sits on the gym, or long-press to
                  drop it there.
                </ThemedText>
              </View>
              <View style={styles.addBarOverlay} pointerEvents="box-none">
                <View style={styles.addBar}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="See the gyms you've added"
                    hitSlop={8}
                    onPress={() => setAddGymSheet("mine")}
                    style={({ pressed }) => pressed && styles.locateFabPressed}
                  >
                    <ThemedText
                      lightColor={APP_SHELL_LABEL_COLOR}
                      darkColor={APP_SHELL_LABEL_COLOR}
                      style={styles.addBarLink}
                    >
                      Your gyms
                    </ThemedText>
                  </Pressable>
                  <View style={styles.addBarButtons}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Cancel adding a gym"
                      onPress={handleCancelAddGym}
                      style={({ pressed }) => [
                        styles.addBarSecondary,
                        pressed && styles.locateFabPressed,
                      ]}
                    >
                      <ThemedText
                        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                        style={styles.addBarButtonText}
                      >
                        Cancel
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Use this spot for the new gym"
                      onPress={handleUseThisSpot}
                      style={({ pressed }) => [
                        styles.addBarPrimary,
                        pressed && styles.locateFabPressed,
                      ]}
                    >
                      <Image
                        source={PRIMARY_BUTTON_BACKGROUND}
                        style={StyleSheet.absoluteFillObject}
                        contentFit="fill"
                        accessibilityIgnoresInvertColors
                      />
                      <ThemedText
                        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                        style={styles.addBarButtonText}
                      >
                        Use this spot
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            </>
          ) : null}

          {showGymSearchResults && !addingGym ? (
            <View style={styles.searchResultsCard}>
              {gymSearchResults.length === 0 ? (
                <ThemedText
                  lightColor={APP_SHELL_LABEL_COLOR}
                  darkColor={APP_SHELL_LABEL_COLOR}
                  style={styles.searchResultEmpty}
                >
                  No gyms match “{gymQuery.trim()}”
                </ThemedText>
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  accessibilityRole="list"
                  accessibilityLabel="Gym search results"
                >
                  {gymSearchResults.map((gym, index) => (
                    <Pressable
                      key={gym.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Show ${gym.name} on the map`}
                      onPress={() => handleSelectGym(gym)}
                      style={({ pressed }) =>
                        pressed ? styles.searchResultRowPressed : undefined
                      }
                    >
                      <View
                        style={[
                          styles.searchResultRow,
                          index < gymSearchResults.length - 1 &&
                            styles.searchResultRowDivider,
                        ]}
                      >
                        <Image
                          source={GYM_MARKER_IMAGE}
                          style={styles.searchResultPin}
                          contentFit="contain"
                          accessibilityIgnoresInvertColors
                        />
                        <View style={styles.searchResultText}>
                          <ThemedText
                            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                            style={styles.searchResultName}
                            numberOfLines={1}
                          >
                            {gym.name}
                          </ThemedText>
                          {userCoords ? (
                            <ThemedText
                              lightColor={APP_SHELL_LABEL_COLOR}
                              darkColor={APP_SHELL_LABEL_COLOR}
                              style={styles.searchResultMeta}
                            >
                              {haversineKm(userCoords, gym).toFixed(1)}km away
                            </ThemedText>
                          ) : null}
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}

          {selectedGym && !showGymSearchResults && !addingGym ? (
            <View style={styles.sheetOverlay} pointerEvents="box-none">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  joining
                    ? `Joining ${selectedGym.name} chat`
                    : selectedGym.joined
                      ? `Open ${selectedGym.name} chat`
                      : `Join ${selectedGym.name} chat`
                }
                accessibilityState={{ busy: joining, disabled: joining }}
                disabled={joining}
                onPress={() => {
                  void handleOpenGymChat();
                }}
                style={({ pressed }) => [
                  styles.sheetCard,
                  { height: sheetHeight },
                  pressed && styles.sheetCardPressed,
                ]}
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
                    </View>
                  </View>
                </View>
              </Pressable>
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
  gymMarkerImage: {
    width: GYM_MARKER_WIDTH,
    height: GYM_MARKER_HEIGHT,
  },
  mapsKeyOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    elevation: 5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  mapsKeyOverlayText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  noMatchOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: "center",
    zIndex: 21,
    elevation: 21,
  },
  noMatchPill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2f86e8",
    backgroundColor: "#01224e",
  },
  noMatchPillPressed: {
    opacity: 0.85,
  },
  noMatchText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
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
  addGymFab: {
    marginTop: FAB_GAP,
    width: LOCATE_FAB_SIZE,
    height: LOCATE_FAB_SIZE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  addGymFabIcon: {
    width: LOCATE_FAB_SIZE,
    height: LOCATE_FAB_SIZE,
  },
  /** Pin tip sits on the map's centre, which is the spot that gets submitted. */
  addPinOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 15,
    elevation: 15,
  },
  addPinImage: {
    position: "absolute",
    width: ADD_PIN_WIDTH,
    height: ADD_PIN_HEIGHT,
    transform: [{ translateY: -ADD_PIN_HEIGHT / 2 }],
  },
  addPinTarget: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#2f86e8",
  },
  addHintCard: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12 + LOCATE_FAB_SIZE + LOCATE_FAB_RIGHT_OFFSET - 12,
    zIndex: 25,
    elevation: 25,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2f86e8",
    backgroundColor: "#01224e",
  },
  addHintTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 15,
  },
  addHintBody: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 13,
  },
  addBarOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: SHEET_BOTTOM_GAP,
    zIndex: 25,
    elevation: 25,
  },
  addBar: {
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#0b4f96",
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  addBarLink: {
    alignSelf: "flex-start",
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
    textDecorationLine: "underline",
  },
  addBarButtons: {
    flexDirection: "row",
    gap: 10,
  },
  addBarSecondary: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#0b4f96",
    backgroundColor: "#011a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  addBarPrimary: {
    flex: 1.6,
    height: 48,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  addBarButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
  },
  searchResultsCard: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    maxHeight: "60%",
    zIndex: 30,
    elevation: 30,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: APP_SHELL_PRIMARY_BACKGROUND,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
    overflow: "hidden",
  },
  searchResultEmpty: {
    fontSize: 12,
    lineHeight: 18,
    padding: 14,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  searchResultRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_SHELL_INPUT_BOARDER_COLOR,
  },
  searchResultRowPressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  searchResultPin: {
    width: SEARCH_RESULT_PIN_WIDTH,
    height: SEARCH_RESULT_PIN_HEIGHT,
  },
  searchResultText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  searchResultName: {
    fontSize: 12,
    lineHeight: 17,
  },
  searchResultMeta: {
    fontSize: 10,
    lineHeight: 14,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: SHEET_BOTTOM_GAP,
  },
  sheetCard: {
    flexDirection: "column",
    borderRadius: 14,
    overflow: "hidden",
  },
  sheetCardPressed: {
    opacity: 0.9,
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
    overflow: "hidden",
  },
  /** Fills leftover space after title / meta / CTA size themselves. */
  sheetHeroImage: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignSelf: "stretch",
    borderRadius: 10,
  },
  /**
   * Intrinsic height for name + footer + button so a 2-line title cannot
   * overflow upward onto the hero (previous flex:1 + flex-end did that).
   */
  sheetBottomBlock: {
    flexGrow: 0,
    flexShrink: 0,
    gap: 10,
    paddingTop: 10,
    paddingBottom: 0,
    paddingLeft: 8,
    paddingRight: 8,
  },
  sheetGymName: {
    textAlign: "left",
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 0,
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
});
