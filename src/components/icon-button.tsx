import { Ionicons } from "@expo/vector-icons";
import { Pressable, useColorScheme } from "react-native";

type IoniconsName = keyof typeof Ionicons.glyphMap;

export function IconButton({
  icon,
  onPress,
  label,
}: {
  icon: IoniconsName;
  onPress: () => void;
  label: string;
}) {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#f4f4f5" : "#18181b";

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="w-9 h-9 rounded-full items-center justify-center bg-zinc-100 dark:bg-zinc-800 active:opacity-60"
    >
      <Ionicons name={icon} size={18} color={iconColor} />
    </Pressable>
  );
}
