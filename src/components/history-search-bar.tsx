import { TextInput, View } from "react-native";

export function HistorySearchBar({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-900">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search sessions"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        className="border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100"
      />
    </View>
  );
}
