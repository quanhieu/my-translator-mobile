import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RenameSessionModal } from "@/src/components/rename-session-modal";
import { SummaryPanel } from "@/src/components/session-summary";
import { TranscriptStream } from "@/src/components/transcript-stream";
import { renameSession, saveSummary } from "@/src/lib/history-store";
import { useSettings } from "@/src/state/settings-context";
import type { SavedSession } from "@/src/types";

export function SessionDetailView({
  session,
  onBack,
  onChanged,
}: {
  session: SavedSession;
  onBack: () => void;
  onChanged: () => void;
}) {
  const { fontSize } = useSettings();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(session.meta.name);
  const [summary, setSummary] = useState(session.summary);

  const submitRename = async (next: string) => {
    setRenaming(false);
    await renameSession(session.meta.id, next);
    setName(next.trim() || undefined);
    onChanged();
  };

  const onSummarySaved = async (text: string) => {
    setSummary(text);
    const ok = await saveSummary(session.meta.id, text);
    // Keep the displayed summary in sync with what actually persisted: if the
    // write failed, drop it so a reopen doesn't silently lose it without notice.
    if (!ok) setSummary(session.summary);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-zinc-950"
      edges={["bottom"]}
    >
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <Pressable onPress={onBack} hitSlop={8}>
          <Text className="text-zinc-900 dark:text-zinc-100 text-base">
            ‹ Back
          </Text>
        </Pressable>
        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => setRenaming(true)} hitSlop={8}>
            <Text className="text-zinc-900 dark:text-zinc-100 text-sm">
              Rename
            </Text>
          </Pressable>
          <Text className="text-zinc-500 dark:text-zinc-400 text-xs">
            {session.meta.rowCount} lines
          </Text>
        </View>
      </View>
      {name ? (
        <Text className="px-4 pt-2 text-zinc-900 dark:text-zinc-100 font-medium">
          {name}
        </Text>
      ) : null}
      <TranscriptStream
        rows={session.rows}
        fontSize={fontSize}
        panelMode="single"
      />
      <SummaryPanel
        rows={session.rows}
        initialSummary={summary}
        onSaved={onSummarySaved}
      />
      <RenameSessionModal
        visible={renaming}
        initialName={name ?? ""}
        onCancel={() => setRenaming(false)}
        onSubmit={submitRename}
      />
    </SafeAreaView>
  );
}
