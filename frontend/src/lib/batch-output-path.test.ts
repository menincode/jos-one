import { describe, expect, it } from "vitest";

import { resolveBatchOutputDir } from "./batch-output-path";

describe("resolveBatchOutputDir", () => {
  it("appends sanitized input folder leaf under output root", () => {
    expect(resolveBatchOutputDir("D:\\Videos\\clips", "D:\\Out")).toBe(
      "D:\\Out\\clips",
    );
  });

  it("returns output root when input folder is empty", () => {
    expect(resolveBatchOutputDir("", "D:\\Out")).toBe("D:\\Out");
  });
});

describe("remove watermark open output folder", () => {
  it("opens configured output root, not the batch subfolder", () => {
    const outputFolder = "D:\\Out";
    const inputFolder = "D:\\Videos\\clips";
    const batchSubfolder = resolveBatchOutputDir(inputFolder, outputFolder);

    expect(batchSubfolder).toBe("D:\\Out\\clips");
    expect(outputFolder.trim()).toBe("D:\\Out");
    expect(outputFolder.trim()).not.toBe(batchSubfolder);
  });
});
