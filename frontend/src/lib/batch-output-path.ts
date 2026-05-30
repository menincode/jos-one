/**
 * Mirrors Python ``resolve_batch_output_dir``: ``<outputRoot>/<inputFolderLeaf>/``.
 */
export function resolveBatchOutputDir(inputFolder: string, outputRoot: string): string {
  const root = outputRoot.trim().replace(/[/\\]+$/, "");
  if (!root) {
    return "";
  }
  const input = inputFolder.trim();
  if (!input) {
    return root;
  }
  const parts = input.split(/[/\\]/).filter(Boolean);
  const rawLeaf = parts.at(-1) ?? "batch";
  const leaf =
    rawLeaf
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/\.+$/, "")
      .trim() || "batch";
  const sep = root.includes("\\") ? "\\" : "/";
  return `${root}${sep}${leaf}`;
}
