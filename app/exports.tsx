import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackButton } from "@/src/components/back-button";
import {
  type SavedExport,
  deleteSavedExport,
  listSavedExports,
  shareSavedExport,
} from "@/src/lib/session-export";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ExportsScreen() {
  const [items, setItems] = useState<SavedExport[]>([]);

  const refresh = useCallback(() => {
    setItems(listSavedExports());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const confirmDelete = (e: SavedExport) => {
    Alert.alert("Delete file", `Remove "${e.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteSavedExport(e.uri);
          refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-zinc-950"
      edges={["top", "bottom"]}
    >
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <BackButton onPress={() => router.back()} />
        <Text className="text-zinc-900 dark:text-zinc-100 text-lg font-semibold">
          Saved files
        </Text>
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-zinc-500 text-center">
            No saved files yet. Use Export on a session to save a Markdown copy
            here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(e) => e.uri}
          renderItem={({ item }) => (
            <View className="flex-row items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-900">
              <Pressable
                onPress={() => shareSavedExport(item.uri)}
                className="flex-1 active:opacity-60"
              >
                <Text
                  numberOfLines={1}
                  className="text-zinc-900 dark:text-zinc-100"
                >
                  {item.name}
                </Text>
                <Text className="text-zinc-500 text-xs">
                  {formatSize(item.size)}
                  {item.modifiedAt
                    ? ` · ${new Date(item.modifiedAt).toLocaleDateString()}`
                    : ""}
                </Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} hitSlop={8}>
                <Text className="text-red-600 dark:text-red-400 text-sm">
                  Delete
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
