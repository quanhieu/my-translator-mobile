import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

export function RenameSessionModal({
  visible,
  initialName,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  initialName: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const [value, setValue] = useState(initialName);

  useEffect(() => {
    if (visible) setValue(initialName);
  }, [visible, initialName]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        onPress={onCancel}
        className="flex-1 items-center justify-center bg-black/50 px-8"
      >
        <Pressable
          onPress={() => {}}
          className="w-full rounded-2xl bg-white dark:bg-zinc-900 p-5"
        >
          <Text className="text-zinc-900 dark:text-zinc-100 font-semibold mb-3">
            Name this session
          </Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="e.g. Keynote — AI safety"
            placeholderTextColor="#9ca3af"
            autoFocus
            className="border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100"
          />
          <View className="flex-row justify-end gap-2 mt-4">
            <Pressable
              onPress={onCancel}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700"
            >
              <Text className="text-zinc-700 dark:text-zinc-300">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSubmit(value)}
              className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white"
            >
              <Text className="text-white dark:text-zinc-900 font-medium">
                Save
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
