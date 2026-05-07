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
};

const LiveRoomContext = createContext<LiveRoomContextValue>({
  drawerAvailable: false,
  setDrawerAvailable: () => undefined,
  openDrawer: () => undefined,
  registerOpenDrawer: () => undefined,
});

export function LiveRoomProvider({ children }: { children: ReactNode }) {
  const [drawerAvailable, setDrawerAvailable] = useState(false);
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
      }}
    >
      {children}
    </LiveRoomContext.Provider>
  );
}

export function useLiveRoom() {
  return useContext(LiveRoomContext);
}
