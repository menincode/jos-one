import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { MixSheetImportPanel } from "@/features/video-merge/mix-sheet-import-panel";

describe("MixSheetImportPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders dialog when open without crashing", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <MixSheetImportPanel
          open
          videos={[]}
          existingMixCount={0}
          onClose={() => undefined}
          onImport={() => undefined}
        />,
      );
    });

    expect(container.textContent).toContain("Import mix từ Google Sheet");
    expect(container.textContent).toContain("Xóa toàn bộ mix hiện có");
    expect(container.textContent).toContain("Hủy");
  });

  it("renders nothing when closed", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <MixSheetImportPanel
          open={false}
          videos={[]}
          existingMixCount={0}
          onClose={() => undefined}
          onImport={() => undefined}
        />,
      );
    });

    expect(container.textContent).toBe("");
  });
});
