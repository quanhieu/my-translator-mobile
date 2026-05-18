import { Pressable, Text } from "react-native";

// Circular soft-fill tappable disc matching BackButton's visual language.
// Icon is a single glyph (emoji or unicode); ~36pt target with hitSlop.
export function IconButton({
  glyph,
  onPress,
  label,
}: {
  glyph: string;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="w-9 h-9 rounded-full items-center justify-center bg-zinc-100 dark:bg-zinc-800 active:opacity-60"
    >
      <Text className="text-zinc-900 dark:text-zinc-100 text-base leading-none">
        {glyph}
      </Text>
    </Pressable>
  );
}
