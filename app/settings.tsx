import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSettings } from "@/src/state/settings-context";

export default function SettingsScreen() {
  const { sonioxKey, openaiKey, setSonioxKey, setOpenaiKey } = useSettings();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950" edges={["bottom"]}>
      <ScrollView className="flex-1 px-4 py-4" contentContainerClassName="gap-4">
        <View>
          <Text className="text-zinc-900 dark:text-zinc-100 font-semibold mb-1">
            Soniox API key
          </Text>
          <TextInput
            value={sonioxKey}
            onChangeText={setSonioxKey}
            placeholder="paste here"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            className="border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100"
          />
        </View>
        <View>
          <Text className="text-zinc-900 dark:text-zinc-100 font-semibold mb-1">
            OpenAI API key
          </Text>
          <TextInput
            value={openaiKey}
            onChangeText={setOpenaiKey}
            placeholder="sk-…"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            className="border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100"
          />
          <Text className="text-zinc-500 text-xs mt-1">
            OpenAI Realtime ≈ $4/hr — billed to your key.
          </Text>
        </View>
        <Text className="text-zinc-500 text-xs">
          More settings (engine, languages, font size) coming in phase 4.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
