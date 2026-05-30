import { BridgeNotReadyError } from "@/lib/pywebview/errors";

const POLL_INTERVAL_MS = 50;

export function isPywebviewShell(): boolean {
  return typeof window !== "undefined" && window.pywebview != null;
}

/** True when `pywebview.api` is callable (source of truth for bridge readiness). */
export function isPywebviewApiReady(): boolean {
  return typeof window !== "undefined" && Boolean(window.pywebview?.api);
}

/** @deprecated Prefer {@link isPywebviewShell} + {@link isPywebviewApiReady}. */
export function isPywebview(): boolean {
  return isPywebviewShell();
}

function markReadyFlag(): void {
  if (typeof window !== "undefined") {
    window.pywebviewready = true;
  }
}

export function waitForPywebviewReady(timeoutMs = 15_000): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new BridgeNotReadyError("No window"));
  }

  if (isPywebviewApiReady()) {
    markReadyFlag();
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (pollTimer !== undefined) {
        clearTimeout(pollTimer);
        pollTimer = undefined;
      }
      if (timeoutTimer !== undefined) {
        clearTimeout(timeoutTimer);
        timeoutTimer = undefined;
      }
      window.removeEventListener("pywebviewready", onReady);
    };

    const tryResolve = () => {
      if (!isPywebviewApiReady()) {
        return false;
      }
      cleanup();
      markReadyFlag();
      resolve();
      return true;
    };

    const onReady = () => {
      if (!tryResolve()) {
        cleanup();
        reject(new BridgeNotReadyError("pywebviewready fired but api missing"));
      }
    };

    const poll = () => {
      if (tryResolve()) {
        return;
      }
      pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    timeoutTimer = setTimeout(() => {
      cleanup();
      reject(new BridgeNotReadyError("Timed out waiting for pywebviewready"));
    }, timeoutMs);

    window.addEventListener("pywebviewready", onReady);
    poll();
  });
}
