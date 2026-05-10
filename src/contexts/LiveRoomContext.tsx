"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";

type LiveRoomContextValue = {
  drawerAvailable: boolean;
  setDrawerAvailable: (v: boolean) => void;
  openDrawer: () => void;
  registerOpenDrawer: (fn: () => void) => void;
  matchTitle: string | null;
  setMatchTitle: (title: string | null) => void;
};

const LiveRoomContext = createContext<LiveRoomContextValue>({
  drawerAvailable: false,
  setDrawerAvailable: () => undefined,
  openDrawer: () => undefined,
  registerOpenDrawer: () => undefined,
  matchTitle: null,
  setMatchTitle: () => undefined,
});

export function LiveRoomProvider({ children }: { children: ReactNode }) {
  const [drawerAvailable, setDrawerAvailable] = useState(false);
  const [matchTitle, setMatchTitle] = useState<string | null>(null);
  const openFnRef = useRef<() => void>(() => undefined);

  const registerOpenDrawer = useCallback((fn: () => void) => {
    openFnRef.current = fn;
  }, []);

  const openDrawer = useCallback(() => {
    openFnRef.current();
  }, []);

  return (
    <LiveRoomContext.Provider
      value={{
        drawerAvailable,
        setDrawerAvailable,
        openDrawer,
        registerOpenDrawer,
        matchTitle,
        setMatchTitle,
      }}
    >
      {children}
    </LiveRoomContext.Provider>
  );
}

export function useLiveRoom() {
  return useContext(LiveRoomContext);
}
