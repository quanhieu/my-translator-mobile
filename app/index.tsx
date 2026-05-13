import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/src/state/session-context";
import { useSettings } from "@/src/state/settings-context";

export default function TranslateScreen() {
  const { status, rows, start, stop } = useSession();
  const { engine, sourceLang, targetLang, fontSize, loaded } = useSettings();

  const isLive = status === "streaming" || status === "connecting";

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <View className="flex-row items-center gap-2">
          <View
            className={
              status === "streaming"
                ? "w-2 h-2 rounded-full bg-green-500"
                : status === "connecting"
                  ? "w-2 h-2 rounded-full bg-yellow-500"
                  : status === "error"
                    ? "w-2 h-2 rounded-full bg-red-500"
                    : "w-2 h-2 rounded-full bg-zinc-400"
            }
          />
          <Text className="text-zinc-900 dark:text-zinc-100 font-medium">
            {engine === "soniox" ? "Soniox" : "OpenAI"} · {sourceLang} → {targetLang}
          </Text>
        </View>
        <Link href="/settings" asChild>
          <Pressable hitSlop={8}>
            <Text className="text-zinc-900 dark:text-zinc-100 text-2xl">⚙️</Text>
          </Pressable>
        </Link>
      </View>

      <ScrollView className="flex-1 px-4 py-3">
        {!loaded ? (
          <Text className="text-zinc-500">Loading…</Text>
        ) : rows.length === 0 ? (
          <Text className="text-zinc-500">
            Tap Start to begin translating.
          </Text>
        ) : (
          rows.map((r) => (
            <View key={r.id} className="mb-3">
              {r.source ? (
                <Text
                  className="text-zinc-500 dark:text-zinc-400 mb-1"
                  style={{ fontSize: Math.max(12, fontSize - 4) }}
                >
                  {r.source}
                </Text>
              ) : null}
              <Text
                className="text-zinc-900 dark:text-zinc-100"
                style={{ fontSize }}
              >
                {r.translation}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <View className="px-4 py-4 border-t border-zinc-200 dark:border-zinc-800">
        <Pressable
          onPress={() => (isLive ? stop() : start())}
          className={
            isLive
              ? "h-16 rounded-2xl items-center justify-center bg-red-600 active:bg-red-700"
              : "h-16 rounded-2xl items-center justify-center bg-zinc-900 dark:bg-white active:opacity-80"
          }
        >
          <Text
            className={
              isLive
                ? "text-white text-lg font-semibold"
                : "text-white dark:text-zinc-900 text-lg font-semibold"
            }
          >
            {isLive ? "Stop" : "Start"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
