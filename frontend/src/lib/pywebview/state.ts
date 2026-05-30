type StateEventType = "change" | "delete";

type StateListener = (
  eventType: StateEventType,
  key: string,
  value: unknown,
) => void;

export function getSharedState(): Record<string, unknown> {
  return (window.pywebview?.state ?? {}) as Record<string, unknown>;
}

export function onStateChange(listener: StateListener): () => void {
  const w = window as Window & {
    pywebview?: { state?: { "+="?: (cb: StateListener) => void } };
  };
  const state = w.pywebview?.state;
  if (state && typeof state["+="] === "function") {
    state["+="](listener);
    return () => {
      /* pywebview does not document unsubscribe */
    };
  }
  return () => undefined;
}
