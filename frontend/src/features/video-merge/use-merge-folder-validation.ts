import { useEffect, useRef, useState } from "react";

import {
  EMPTY_MERGE_FOLDER_VALIDATION,
  type MergeFolderValidationState,
} from "@/features/video-merge/merge-folder-validation";
import { createBridgeClient } from "@/lib/pywebview/api-client";

const VALIDATE_DEBOUNCE_MS = 300;

export function useMergeFolderValidation(
  inputFolder: string,
  outputFolder: string,
  enabled: boolean,
) {
  const [state, setState] = useState<MergeFolderValidationState>(
    EMPTY_MERGE_FOLDER_VALIDATION,
  );
  const generationRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      generationRef.current += 1;
      setState(EMPTY_MERGE_FOLDER_VALIDATION);
      return;
    }

    const inputFilled = Boolean(inputFolder.trim());
    const outputFilled = Boolean(outputFolder.trim());
    if (!inputFilled) {
      generationRef.current += 1;
      setState({
        checking: false,
        inputFilled: false,
        outputFilled,
        inputExists: false,
        outputExists: false,
      });
      return;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const isStale = () => generationRef.current !== generation;

    setState({
      checking: true,
      inputFilled: true,
      outputFilled,
      inputExists: false,
      outputExists: false,
    });

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const client = await createBridgeClient();
          const result = await client.validateMergeFolders(
            inputFolder,
            outputFolder,
          );
          if (isStale()) {
            return;
          }
          setState({
            checking: false,
            inputFilled: true,
            outputFilled,
            inputExists: Boolean(result.input_ok),
            outputExists: outputFilled ? Boolean(result.output_ok) : false,
          });
        } catch {
          if (isStale()) {
            return;
          }
          setState({
            checking: false,
            inputFilled: true,
            outputFilled,
            inputExists: false,
            outputExists: false,
          });
        }
      })();
    }, VALIDATE_DEBOUNCE_MS);

    return () => {
      generationRef.current += 1;
      window.clearTimeout(timer);
    };
  }, [enabled, inputFolder, outputFolder]);

  return state;
}
