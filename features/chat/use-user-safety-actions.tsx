import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { useBlockedUsers } from "@/features/chat/blocked-users-store";
import { OptionsSheet, type SheetOption } from "@/features/chat/components/options-sheet";
import { reportUser, type ChatMessage, type ReportReason } from "@/lib/api/chat";

export type SafetyTarget = {
  userId: string;
  displayName: string;
  /** Set when reporting a specific chat message. */
  messageId?: string;
};

type SheetState =
  | { kind: "message"; message: ChatMessage }
  | { kind: "report"; target: SafetyTarget }
  | null;

const REPORT_REASONS: { reason: ReportReason; label: string }[] = [
  { reason: "spam", label: "Spam" },
  { reason: "harassment", label: "Harassment or bullying" },
  { reason: "hate", label: "Hate speech" },
  { reason: "sexual", label: "Sexual content" },
  { reason: "violence", label: "Violence or threats" },
  { reason: "other", label: "Something else" },
];

/** iOS drops an Alert presented while a Modal is still animating out. */
const SHEET_CLOSE_MS = 350;

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Report / block flows shared by chat threads and Pixel profiles.
 * Render `sheet` once in the screen that uses the hook.
 */
export function useUserSafetyActions() {
  const { block, blockedIds } = useBlockedUsers();
  const [sheet, setSheet] = useState<SheetState>(null);

  const closeThen = useCallback((fn: () => void) => {
    setSheet(null);
    setTimeout(fn, SHEET_CLOSE_MS);
  }, []);

  const confirmBlock = useCallback(
    (target: SafetyTarget, onBlocked?: () => void) => {
      Alert.alert(
        `Block ${target.displayName}?`,
        "You won't see their messages, and neither of you can send direct " +
          "messages. You can unblock them in Settings → Blocked Pixels.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Block",
            style: "destructive",
            onPress: () => {
              void block(target)
                .then(() => onBlocked?.())
                .catch((err) => {
                  Alert.alert(
                    "Could not block",
                    errorMessage(err, "Please try again."),
                  );
                });
            },
          },
        ],
      );
    },
    [block],
  );

  const openReport = useCallback((target: SafetyTarget) => {
    setSheet({ kind: "report", target });
  }, []);

  const openMessageActions = useCallback((message: ChatMessage) => {
    setSheet({ kind: "message", message });
  }, []);

  const submitReport = useCallback(
    (target: SafetyTarget, reason: ReportReason) => {
      closeThen(() => {
        void reportUser({
          reportedUserId: target.userId,
          messageId: target.messageId,
          reason,
        })
          .then(() => {
            const buttons: Parameters<typeof Alert.alert>[2] = [
              { text: "Done", style: "cancel" },
            ];
            if (!blockedIds.has(target.userId)) {
              buttons.push({
                text: `Block ${target.displayName}`,
                style: "destructive",
                onPress: () => confirmBlock(target),
              });
            }
            Alert.alert(
              "Report sent",
              "Thanks for letting us know. Our team will review it.",
              buttons,
            );
          })
          .catch((err) => {
            Alert.alert(
              "Could not send report",
              errorMessage(err, "Please try again."),
            );
          });
      });
    },
    [blockedIds, closeThen, confirmBlock],
  );

  let sheetTitle = "";
  let sheetMessage: string | undefined;
  let options: SheetOption[] = [];

  if (sheet?.kind === "message") {
    const { message } = sheet;
    const target: SafetyTarget = {
      userId: message.senderId,
      displayName: message.senderDisplayName,
      messageId: message.id,
    };
    sheetTitle = message.senderDisplayName;
    options = [
      {
        label: "View Pixel",
        onPress: () => {
          setSheet(null);
          router.push({
            pathname: "/(tabs)/chat/pixel/[userId]",
            params: { userId: message.senderId },
          });
        },
      },
      {
        label: "Report message",
        onPress: () => setSheet({ kind: "report", target }),
      },
      {
        label: `Block ${message.senderDisplayName}`,
        destructive: true,
        onPress: () => closeThen(() => confirmBlock(target)),
      },
    ];
  } else if (sheet?.kind === "report") {
    const { target } = sheet;
    sheetTitle = target.messageId
      ? "Report message"
      : `Report ${target.displayName}`;
    sheetMessage = "Why are you reporting this?";
    options = REPORT_REASONS.map(({ reason, label }) => ({
      label,
      onPress: () => submitReport(target, reason),
    }));
  }

  const sheetElement = (
    <OptionsSheet
      visible={sheet != null}
      title={sheetTitle}
      message={sheetMessage}
      options={options}
      onClose={() => setSheet(null)}
    />
  );

  return {
    openMessageActions,
    openReport,
    confirmBlock,
    sheet: sheetElement,
  };
}
