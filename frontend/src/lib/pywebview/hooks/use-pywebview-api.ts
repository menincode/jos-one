import { useEffect, useState } from "react";

import { createBridgeClient } from "@/lib/pywebview/api-client";
import type { BridgeClient } from "@/lib/pywebview/types";

export function usePywebviewApi() {
  const [client, setClient] = useState<BridgeClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    createBridgeClient()
      .then((bridge) => {
        if (!cancelled) {
          setClient(bridge);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setClient(null);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { client, loading, error };
}
