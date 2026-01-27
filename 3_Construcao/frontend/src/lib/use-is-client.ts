import { useSyncExternalStore } from "react";

export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {
      // no-op
    },
    () => true,
    () => false,
  );
}
