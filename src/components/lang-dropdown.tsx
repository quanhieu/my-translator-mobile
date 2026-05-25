import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import type { Language } from "@/src/lib/languages";
import type { LangCode } from "@/src/types";

/**
 * Dropdown picker for language selection.
 *
 * Renders as a single-row Pressable showing the current selection; tapping
 * opens a fullscreen modal with a search box and scrollable list. Replaces
 * the old Row-of-chips picker which doesn't scale past ~15 languages
 * (Qwen has 60).
 */
export function LangDropdown({
  value,
  onChange,
  langs,
  placeholder,
}: {
  value: LangCode;
  onChange: (v: LangCode) => void;
  langs: Language[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const current = langs.find((l) => l.code === value);
  const filtered = query.trim()
    ? langs.filter(
        (l) =>
          l.name.toLowerCase().includes(query.toLowerCase()) ||
          l.code.toLowerCase().includes(query.toLowerCase()),
      )
    : langs;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2.5 active:opacity-70"
      >
        <Text
          className={
            current
              ? "text-zinc-900 dark:text-zinc-100"
              : "text-zinc-400 dark:text-zinc-500"
          }
        >
          {current?.name ?? placeholder ?? "Select…"}
        </Text>
        <Text className="text-zinc-400 dark:text-zinc-500">▾</Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 bg-white dark:bg-zinc-950">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <Text className="text-zinc-900 dark:text-zinc-100 text-lg font-semibold">
              Select language
            </Text>
            <Pressable
              onPress={() => {
                setOpen(false);
                setQuery("");
              }}
              className="px-3 py-1 active:opacity-70"
            >
              <Text className="text-blue-600 dark:text-blue-400 font-medium">
                Close
              </Text>
            </Pressable>
          </View>

          <View className="px-4 py-3">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search language or code"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              className="border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(l) => l.code}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item.code);
                  setOpen(false);
                  setQuery("");
                }}
                className={
                  item.code === value
                    ? "px-4 py-3 bg-zinc-100 dark:bg-zinc-900 flex-row justify-between items-center"
                    : "px-4 py-3 flex-row justify-between items-center active:bg-zinc-50 active:dark:bg-zinc-900"
                }
              >
                <Text className="text-zinc-900 dark:text-zinc-100">
                  {item.name}
                </Text>
                <Text className="text-zinc-400 dark:text-zinc-600 text-xs">
                  {item.code}
                </Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View className="h-px bg-zinc-100 dark:bg-zinc-900" />
            )}
            ListEmptyComponent={
              <Text className="text-zinc-500 text-center mt-8">
                No matches
              </Text>
            }
          />
        </View>
      </Modal>
    </>
  );
}
