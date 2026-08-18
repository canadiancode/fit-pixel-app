import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ChatSearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
};

const ChatSearchContext = createContext<ChatSearchContextValue | null>(null);

export function ChatSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const value = useMemo(() => ({ query, setQuery }), [query]);
  return (
    <ChatSearchContext.Provider value={value}>
      {children}
    </ChatSearchContext.Provider>
  );
}

export function useChatSearch(): ChatSearchContextValue {
  const ctx = useContext(ChatSearchContext);
  if (ctx == null) {
    return { query: "", setQuery: () => {} };
  }
  return ctx;
}
