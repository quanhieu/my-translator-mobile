import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { formatTranscript } from "@/src/lib/transcript-format";
import type { SavedSession } from "@/src/types";

// Filesystem-safe slug from a session name (or a stable fallback).
function fileSlug(s: SavedSession): string {
  const base = (s.meta.name || `session-${s.meta.id}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `session-${s.meta.id}`;
}

// Renders a session as a Markdown document: title, metadata, optional summary,
// then the full transcript. Shared formatting with the in-app transcript view.
export function renderSessionMarkdown(s: SavedSession): string {
  const date = new Date(s.meta.createdAt).toLocaleString();
  const lines = [
    `# ${s.meta.name || "Session"}`,
    "",
    `- Date: ${date}`,
    `- Engine: ${s.meta.engine}`,
    `- Target language: ${s.meta.targetLang}`,
    `- Lines: ${s.meta.rowCount}`,
    "",
  ];
  if (s.summary && s.summary.trim()) {
    lines.push("## Summary", "", s.summary.trim(), "");
  }
  lines.push("## Transcript", "", formatTranscript(s.rows), "");
  return lines.join("\n");
}

// Writes the session to a temp .md file and opens the OS share sheet so the
// user can Save to Files / AirDrop / Mail. Returns false on any failure
// (sharing unavailable, write error) — never throws.
export async function exportSessionMarkdown(
  s: SavedSession,
): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    const file = new File(Paths.cache, `${fileSlug(s)}.md`);
    if (file.exists) file.delete();
    file.create();
    file.write(renderSessionMarkdown(s));
    await Sharing.shareAsync(file.uri, {
      mimeType: "text/markdown",
      UTI: "net.daringfireball.markdown",
      dialogTitle: "Export session",
    });
    return true;
  } catch {
    return false;
  }
}

// Persistent export folder under app Documents. Files here survive app
// restarts (cache dir does not) and back the in-app "Saved files" browser.
function exportsDir(): Directory {
  const dir = new Directory(Paths.document, "exports");
  if (!dir.exists) dir.create();
  return dir;
}

export interface SavedExport {
  name: string;
  uri: string;
  size: number;
  modifiedAt: number;
}

// Writes the session markdown into the persistent exports folder, overwriting
// any same-named file. Returns the saved file's uri, or null on failure.
export async function saveSessionToDocuments(
  s: SavedSession,
): Promise<string | null> {
  try {
    const file = new File(exportsDir(), `${fileSlug(s)}.md`);
    if (file.exists) file.delete();
    file.create();
    file.write(renderSessionMarkdown(s));
    return file.uri;
  } catch {
    return null;
  }
}

// Lists previously saved exports, newest first. Never throws.
export function listSavedExports(): SavedExport[] {
  try {
    const dir = exportsDir();
    return dir
      .list()
      .filter((e): e is File => e instanceof File && e.name.endsWith(".md"))
      .map((f) => ({
        name: f.name,
        uri: f.uri,
        size: f.size ?? 0,
        modifiedAt: f.modificationTime ?? 0,
      }))
      .sort((a, b) => b.modifiedAt - a.modifiedAt);
  } catch {
    return [];
  }
}

export async function shareSavedExport(uri: string): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(uri, {
      mimeType: "text/markdown",
      UTI: "net.daringfireball.markdown",
      dialogTitle: "Share export",
    });
    return true;
  } catch {
    return false;
  }
}

export function deleteSavedExport(uri: string): boolean {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
    return true;
  } catch {
    return false;
  }
}
