import { useCallback, useEffect, useState } from "react";

import { BridgeNotReadyError } from "@/lib/pywebview/errors";
import {
  isPywebviewApiReady,
  isPywebviewShell,
  waitForPywebviewReady,
} from "@/lib/pywebview/readiness";

const POLL_INTERVAL_MS = 200;

export function usePywebviewReady() {
  const [ready, setReady] = useState(() => isPywebviewShell() && isPywebviewApiReady());
  const [error, setError] = useState<Error | null>(null);

  const syncReady = useCallback((): boolean => {
    if (!isPywebviewShell()) {
      setReady(false);
      setError(null);
      return false;
    }
    if (isPywebviewApiReady()) {
      setReady(true);
      setError(null);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!isPywebviewShell()) {
      setReady(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const trySync = () => {
      if (cancelled) {
        return;
      }
      syncReady();
    };

    if (syncReady()) {
      return;
    }

    const onReady = () => trySync();
    window.addEventListener("pywebviewready", onReady);
    const pollId = window.setInterval(trySync, POLL_INTERVAL_MS);

    void waitForPywebviewReady().catch((err: unknown) => {
      if (cancelled || isPywebviewApiReady()) {
        return;
      }
      setReady(false);
      setError(err instanceof Error ? err : new BridgeNotReadyError(String(err)));
    });

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.removeEventListener("pywebviewready", onReady);
    };
  }, [syncReady]);

  return { ready, error, isDesktop: isPywebviewShell() };
}
