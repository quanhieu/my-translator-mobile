import { useFocusEffect, router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HistoryListItem } from "@/src/components/history-list-item";
import { TranscriptStream } from "@/src/components/transcript-stream";
import {
  clearAllHistory,
  deleteSession,
  getSession,
  listSessions,
} from "@/src/lib/history-store";
import { useSettings } from "@/src/state/settings-context";
import type { SavedSession, SessionMeta } from "@/src/types";

export default function HistoryScreen() {
  const { fontSize } = useSettings();
  const [metas, setMetas] = useState<SessionMeta[]>([]);
  const [selected, setSelected] = useState<SavedSession | null>(null);

  const refresh = useCallback(() => {
    listSessions().then(setMetas);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const open = async (id: string) => {
    const s = await getSession(id);
    if (s) setSelected(s);
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Delete session", "Remove this saved session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteSession(id);
          refresh();
        },
      },
    ]);
  };

  const confirmClearAll = () => {
    Alert.alert("Clear all history", "Delete every saved session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear all",
        style: "destructive",
        onPress: async () => {
          await clearAllHistory();
          setMetas([]);
        },
      },
    ]);
  };

  if (selected) {
    return (
      <SafeAreaView
        className="flex-1 bg-white dark:bg-zinc-950"
        edges={["bottom"]}
      >
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <Pressable onPress={() => setSelected(null)} hitSlop={8}>
            <Text className="text-zinc-900 dark:text-zinc-100 text-base">
              ‹ Back
            </Text>
          </Pressable>
          <Text className="text-zinc-500 dark:text-zinc-400 text-xs">
            {selected.meta.rowCount} lines
          </Text>
        </View>
        <TranscriptStream
          rows={selected.rows}
          fontSize={fontSize}
          panelMode="single"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950" edges={["bottom"]}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-zinc-900 dark:text-zinc-100 text-base">
            ‹ Back
          </Text>
        </Pressable>
        {metas.length > 0 ? (
          <Pressable onPress={confirmClearAll} hitSlop={8}>
            <Text className="text-red-600 dark:text-red-400 text-sm">
              Clear all
            </Text>
          </Pressable>
        ) : null}
      </View>

      {metas.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-zinc-500 text-center">
            No saved sessions yet. Finished translations are saved here
            automatically.
          </Text>
        </View>
      ) : (
        <FlatList
          data={metas}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <HistoryListItem
              meta={item}
              onOpen={() => open(item.id)}
              onDelete={() => confirmDelete(item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
