import { useFocusEffect } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Title for the Chat tab's header band while a thread (gym chat / DM) is open.
 * The band swaps its search field for a back button + this title, because a
 * thread has nothing to search and needs the room for messages.
 */
export type ChatThreadHeader = {
  title: string;
  subtitle?: string | null;
  /** Tapping the title (e.g. open the peer's Pixel card). */
  onTitlePress?: () => void;
  titleA11yHint?: string;
};

type ContextValue = {
  header: ChatThreadHeader | null;
  setHeader: (header: ChatThreadHeader | null) => void;
};

const ChatThreadHeaderContext = createContext<ContextValue | null>(null);

export function ChatThreadHeaderProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [header, setHeader] = useState<ChatThreadHeader | null>(null);
  const value = useMemo(() => ({ header, setHeader }), [header]);
  return (
    <ChatThreadHeaderContext.Provider value={value}>
      {children}
    </ChatThreadHeaderContext.Provider>
  );
}

export function useChatThreadHeaderState(): ChatThreadHeader | null {
  return useContext(ChatThreadHeaderContext)?.header ?? null;
}

/** Thread screens: publish the header while focused, clear it on blur. */
export function useChatThreadHeader(header: ChatThreadHeader): void {
  const setHeader = useContext(ChatThreadHeaderContext)?.setHeader;
  const { title, subtitle, onTitlePress, titleA11yHint } = header;
  useFocusEffect(
    useCallback(() => {
      setHeader?.({ title, subtitle, onTitlePress, titleA11yHint });
      return () => setHeader?.(null);
    }, [setHeader, title, subtitle, onTitlePress, titleA11yHint]),
  );
}
