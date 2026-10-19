import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { TextInput } from "react-native";

/** Top-level sections of the Chat tab index. */
export type ChatSection = "gyms" | "messages" | "friends";

type ChatSearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
  section: ChatSection;
  /** Switches section and clears the search (each section searches different things). */
  setSection: (value: ChatSection) => void;
  /** Header search input; lets empty states focus it ("Find Pixels"). */
  searchInputRef: React.RefObject<TextInput | null>;
  focusSearch: () => void;
};

const ChatSearchContext = createContext<ChatSearchContextValue | null>(null);

export function ChatSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [section, setSectionState] = useState<ChatSection>("gyms");
  const searchInputRef = useRef<TextInput | null>(null);

  const setSection = useCallback((value: ChatSection) => {
    setSectionState(value);
    setQuery("");
  }, []);

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const value = useMemo(
    () => ({
      query,
      setQuery,
      section,
      setSection,
      searchInputRef,
      focusSearch,
    }),
    [query, section, setSection, focusSearch],
  );
  return (
    <ChatSearchContext.Provider value={value}>
      {children}
    </ChatSearchContext.Provider>
  );
}

const FALLBACK_REF: React.RefObject<TextInput | null> = { current: null };

export function useChatSearch(): ChatSearchContextValue {
  const ctx = useContext(ChatSearchContext);
  if (ctx == null) {
    return {
      query: "",
      setQuery: () => {},
      section: "gyms",
      setSection: () => {},
      searchInputRef: FALLBACK_REF,
      focusSearch: () => {},
    };
  }
  return ctx;
}
