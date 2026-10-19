import type { Router } from "expo-router";

/**
 * Back out of a Chat sub-screen. Prefer dismissing the stack so Map → gym chat
 * → Back stays on Chat (router.back() can jump to the tabs' initial route).
 */
export function goBackInChat(router: Router): void {
  if (router.canDismiss()) {
    router.dismiss();
  } else {
    router.replace("/(tabs)/chat");
  }
}
