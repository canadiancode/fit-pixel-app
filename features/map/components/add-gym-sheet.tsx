import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
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
  SettingsBioTextField,
  SettingsSingleLineTextField,
} from "@/features/settings/components/settings-text-field";
import { FitPixelApiError } from "@/lib/api/client";
import {
  GYM_SUBMISSION_LIMITS,
  listMyGymSubmissions,
  submitGym,
  type GymSubmission,
} from "@/lib/api/gym-submissions";

import { GYM_KIND_LABELS, gymKind, type GymKind } from "../gym-filters";

const PRIMARY_BUTTON_BACKGROUND = require("@/assets/backgrounds/add-action.png");

/** Same pixel-card palette as the filter sheet. */
const CARD_FILL = "#01224e";
const CARD_RIM = "#0b4f96";
const CARD_RIM_ACTIVE = "#2f86e8";
const TRACK_FILL = "#011a3a";
const ON_COLOR = "#5fd35f";
const PENDING_COLOR = "#fab219";
const ERROR_COLOR = "#ff8a80";

const KIND_ORDER = Object.keys(GYM_KIND_LABELS) as GymKind[];

type LatLng = { latitude: number; longitude: number };

type Props = {
  visible: boolean;
  /**
   * "form": add a gym at `coordinate`, then show the submitted state.
   * "mine": just your submissions.
   */
  mode: "form" | "mine";
  coordinate: LatLng | null;
  /** Cancel / Done / Close: the form is cleared for next time. */
  onClose: () => void;
  /** Back to the map to move the pin, keeping what's typed (form only). */
  onMovePin: () => void;
  /** Sent for review; the map leaves add mode when the sheet closes. */
  onSubmitted: (submission: GymSubmission) => void;
};

function tap() {
  if (process.env.EXPO_OS === "ios") void Haptics.selectionAsync();
}

function formatCoordinate({ latitude, longitude }: LatLng): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

/** "123 Main St, Vancouver" from the pin, when the OS can tell us. */
async function addressFor(coordinate: LatLng): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync(coordinate);
    if (!place) return "";
    const street = [place.streetNumber, place.street].filter(Boolean).join(" ");
    return [street || place.name, place.city]
      .filter(Boolean)
      .join(", ")
      .slice(0, GYM_SUBMISSION_LIMITS.addressMax);
  } catch {
    return "";
  }
}

const STATUS_LABELS: Record<GymSubmission["status"], string> = {
  pending: "Pending review",
  approved: "On the map",
  rejected: "Not added",
};

function SubmissionRow({ submission }: { submission: GymSubmission }) {
  const color =
    submission.status === "pending"
      ? PENDING_COLOR
      : submission.status === "approved"
        ? ON_COLOR
        : APP_SHELL_LABEL_COLOR;
  return (
    <View
      style={styles.submissionRow}
      accessible
      accessibilityLabel={`${submission.name}, ${STATUS_LABELS[submission.status]}`}
    >
      <View style={styles.submissionHead}>
        <Text style={styles.submissionName} numberOfLines={2}>
          {submission.name}
        </Text>
        <View style={[styles.statusPill, { borderColor: color }]}>
          <Text style={[styles.statusText, { color }]}>
            {STATUS_LABELS[submission.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.submissionMeta} numberOfLines={1}>
        {submission.address ?? formatCoordinate(submission)}
      </Text>
      {submission.reviewerNotes ? (
        <Text style={styles.submissionNote}>“{submission.reviewerNotes}”</Text>
      ) : null}
    </View>
  );
}

function SubmissionList({
  submissions,
  loading,
}: {
  submissions: GymSubmission[] | null;
  loading: boolean;
}) {
  if (loading && submissions == null) {
    return <ActivityIndicator color={APP_SHELL_MAIN_TEXT_COLOR} />;
  }
  if (!submissions || submissions.length === 0) {
    return (
      <Text style={styles.hint}>
        Nothing yet. Gyms you add show up here while they&apos;re reviewed.
      </Text>
    );
  }
  return (
    <View style={styles.card}>
      {submissions.map((submission, index) => (
        <View
          key={submission.id}
          style={index > 0 ? styles.submissionDivider : undefined}
        >
          <SubmissionRow submission={submission} />
        </View>
      ))}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Bottom sheet: name the gym at the dropped pin and send it for review. */
export function AddGymSheet({
  visible,
  mode,
  coordinate,
  onClose,
  onMovePin,
  onSubmitted,
}: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  /** Typed by the user: a moved pin no longer refills it. */
  const [addressEdited, setAddressEdited] = useState(false);
  /** null: follow the type the name reads as. */
  const [pickedKind, setPickedKind] = useState<GymKind | null>(null);
  const [notes, setNotes] = useState("");
  /**
   * Name and notes are uncontrolled (defaultValue): writing `value` back on
   * every keystroke re-rendered the whole sheet and dropped fast typing.
   * Bumping this remounts them empty after a reset.
   */
  const [fieldsKey, setFieldsKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<GymSubmission | null>(null);
  const [mine, setMine] = useState<GymSubmission[] | null>(null);
  const [mineLoading, setMineLoading] = useState(false);

  const showList = mode === "mine" || submitted != null;
  const kind = pickedKind ?? (name.trim() ? gymKind(name) : null);
  const trimmedName = name.trim();
  const canSubmit =
    coordinate != null &&
    trimmedName.length >= GYM_SUBMISSION_LIMITS.nameMin &&
    !submitting;

  const loadMine = useCallback(async () => {
    setMineLoading(true);
    try {
      setMine(await listMyGymSubmissions());
    } catch {
      /* keep what we had */
    } finally {
      setMineLoading(false);
    }
  }, []);

  // A fresh pin starts a fresh form.
  useEffect(() => {
    if (!visible || mode !== "form" || !coordinate) return;
    setSubmitted(null);
    setError(null);
    let cancelled = false;
    void addressFor(coordinate).then((found) => {
      if (!cancelled && found && !addressEdited) setAddress(found);
    });
    return () => {
      cancelled = true;
    };
    // Refill only when the pin moves, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mode, coordinate]);

  useEffect(() => {
    if (visible && showList) void loadMine();
  }, [visible, showList, loadMine]);

  const reset = () => {
    setName("");
    setAddress("");
    setAddressEdited(false);
    setPickedKind(null);
    setNotes("");
    setFieldsKey((key) => key + 1);
    setError(null);
    setSubmitted(null);
  };

  const close = () => {
    if (mode === "form") reset();
    onClose();
  };

  /** Backdrop / swipe: keep a half-filled form and go back to the pin. */
  const dismiss = mode === "form" && !submitted ? onMovePin : close;

  const handleSubmit = async () => {
    if (!canSubmit || !coordinate) return;
    setSubmitting(true);
    setError(null);
    try {
      const submission = await submitGym({
        name: trimmedName,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        address: address.trim() || undefined,
        kind: kind ?? undefined,
        notes: notes.trim() || undefined,
      });
      if (process.env.EXPO_OS === "ios") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSubmitted(submission);
      setMine((current) => [submission, ...(current ?? [])]);
      onSubmitted(submission);
    } catch (err) {
      setError(
        err instanceof FitPixelApiError
          ? err.message
          : "Couldn't send it. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === "mine" ? "Your gyms" : submitted ? "Submitted!" : "Add a gym";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={dismiss === onMovePin ? "Back to the pin" : "Close"}
          onPress={dismiss}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.grabber} />
          <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={close}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.link}>{submitted || mode === "mine" ? "Close" : "Cancel"}</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {submitted ? (
              <View style={[styles.card, styles.doneCard]} accessibilityLiveRegion="polite">
                <Text style={styles.doneTitle}>Sent for review</Text>
                <Text style={styles.doneBody}>
                  Thanks! We&apos;ll check {submitted.name} and put it on the map
                  for everyone once it&apos;s approved.
                </Text>
              </View>
            ) : null}

            {mode === "form" && !submitted ? (
              <>
                <View style={styles.section}>
                  <SectionTitle>location</SectionTitle>
                  <View style={[styles.card, styles.locationRow]}>
                    <Text style={styles.locationText}>
                      {coordinate ? formatCoordinate(coordinate) : "Drop a pin first"}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Move the pin"
                      hitSlop={8}
                      onPress={onMovePin}
                      style={({ pressed }) => pressed && styles.pressed}
                    >
                      <Text style={styles.link}>Move pin</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.section}>
                  <SectionTitle>gym name</SectionTitle>
                  <SettingsSingleLineTextField
                    accessibilityLabel="Gym name"
                    key={`name-${fieldsKey}`}
                    defaultValue={name}
                    onChangeText={setName}
                    placeholder="e.g. Iron Den Fitness"
                    maxLength={GYM_SUBMISSION_LIMITS.nameMax}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                    style={styles.inputText}
                  />
                </View>

                <View style={styles.section}>
                  <SectionTitle>address</SectionTitle>
                  <SettingsSingleLineTextField
                    accessibilityLabel="Address"
                    value={address}
                    onChangeText={(next) => {
                      setAddress(next);
                      setAddressEdited(true);
                    }}
                    placeholder="Street and city"
                    maxLength={GYM_SUBMISSION_LIMITS.addressMax}
                    autoCorrect={false}
                    style={styles.inputText}
                  />
                </View>

                <View style={styles.section}>
                  <SectionTitle>gym type</SectionTitle>
                  <View style={styles.chips}>
                    {KIND_ORDER.map((option) => {
                      const selected = kind === option;
                      return (
                        <Pressable
                          key={option}
                          accessibilityRole="radio"
                          accessibilityLabel={GYM_KIND_LABELS[option]}
                          accessibilityState={{ selected }}
                          onPress={() => {
                            tap();
                            setPickedKind(option);
                          }}
                          style={({ pressed }) => [
                            styles.chip,
                            selected && styles.chipSelected,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipLabel,
                              selected && styles.chipLabelSelected,
                            ]}
                          >
                            {GYM_KIND_LABELS[option]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.section}>
                  <SectionTitle>anything else? (optional)</SectionTitle>
                  <SettingsBioTextField
                    accessibilityLabel="Notes for the reviewer"
                    key={`notes-${fieldsKey}`}
                    defaultValue={notes}
                    onChangeText={setNotes}
                    placeholder="Hours, website, what's inside…"
                    maxLength={GYM_SUBMISSION_LIMITS.notesMax}
                    shellStyle={styles.notesShell}
                    style={[styles.inputText, styles.notesInput]}
                  />
                </View>

                <Text style={styles.hint}>
                  We review every gym before it shows up on the map.
                </Text>
              </>
            ) : null}

            {showList ? (
              <View style={styles.section}>
                <SectionTitle>your submissions</SectionTitle>
                <SubmissionList submissions={mine} loading={mineLoading} />
              </View>
            ) : null}
          </ScrollView>

          {mode === "form" && !submitted && error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          {mode === "form" && !submitted ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Submit gym for review"
              accessibilityState={{ disabled: !canSubmit, busy: submitting }}
              disabled={!canSubmit}
              onPress={() => void handleSubmit()}
              style={({ pressed }) => [
                styles.primary,
                !canSubmit && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Image
                source={PRIMARY_BUTTON_BACKGROUND}
                style={StyleSheet.absoluteFillObject}
                contentFit="fill"
                accessibilityIgnoresInvertColors
              />
              <Text style={styles.primaryLabel}>
                {submitting ? "Sending…" : "Submit for review"}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={close}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Image
                source={PRIMARY_BUTTON_BACKGROUND}
                style={StyleSheet.absoluteFillObject}
                contentFit="fill"
                accessibilityIgnoresInvertColors
              />
              <Text style={styles.primaryLabel}>Done</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: "90%",
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
  link: {
    color: APP_SHELL_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
    textDecorationLine: "underline",
  },
  /** Shrinks so the error and button below it stay on screen. */
  body: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    gap: 20,
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
  card: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: CARD_RIM,
    backgroundColor: CARD_FILL,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  locationText: {
    flexShrink: 1,
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
  },
  inputText: {
    fontSize: 12,
  },
  notesShell: {
    minHeight: 96,
  },
  notesInput: {
    minHeight: 96,
    lineHeight: 18,
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
  hint: {
    color: APP_SHELL_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  error: {
    color: ERROR_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 14,
    paddingHorizontal: 2,
  },
  doneCard: {
    gap: 10,
    padding: 16,
    borderColor: ON_COLOR,
  },
  doneTitle: {
    color: ON_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 18,
  },
  doneBody: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 15,
  },
  submissionRow: {
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  submissionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CARD_RIM,
  },
  submissionHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  submissionName: {
    flex: 1,
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 15,
  },
  statusPill: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  statusText: {
    fontFamily: FONT_FAMILY,
    fontSize: 7,
    lineHeight: 10,
  },
  submissionMeta: {
    color: APP_SHELL_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 12,
  },
  submissionNote: {
    color: APP_SHELL_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 13,
  },
  primary: {
    height: 52,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: {
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
