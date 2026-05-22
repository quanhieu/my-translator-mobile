import { Pressable, Text, View } from "react-native";

import { ENGINE_LABELS, type SessionMeta } from "@/src/types";

function formatWhen(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function HistoryListItem({
  meta,
  onOpen,
  onDelete,
}: {
  meta: SessionMeta;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      className="flex-row items-center px-4 py-3 border-b border-zinc-100 dark:border-zinc-900 active:bg-zinc-50 dark:active:bg-zinc-900"
    >
      <View className="flex-1 pr-3">
        <Text
          numberOfLines={1}
          className="text-zinc-900 dark:text-zinc-100 text-base"
        >
          {meta.name || meta.preview || "(no text)"}
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
          {formatWhen(meta.createdAt)} · {ENGINE_LABELS[meta.engine]} ·{" "}
          {meta.rowCount} lines
        </Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={10} className="px-2 py-1">
        <Text className="text-lg">🗑</Text>
      </Pressable>
    </Pressable>
  );
}
