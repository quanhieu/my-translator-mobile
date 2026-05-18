import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { HistorySearchBar } from "@/src/components/history-search-bar";
import { TranscriptStream } from "@/src/components/transcript-stream";
import { useSettings } from "@/src/state/settings-context";
import type { TranscriptRow } from "@/src/types";

export function DetailTranscriptTab({ rows }: { rows: TranscriptRow[] }) {
  const { fontSize } = useSettings();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.source ?? "").toLowerCase().includes(q) ||
        r.translation.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <View className="flex-1">
      <HistorySearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search in transcript"
      />
      {filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-zinc-500 text-center">No matches.</Text>
        </View>
      ) : (
        <TranscriptStream
          rows={filtered}
          fontSize={fontSize}
          panelMode="single"
        />
      )}
    </View>
  );
}
