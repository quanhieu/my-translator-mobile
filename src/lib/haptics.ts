import * as Haptics from "expo-haptics";

// Thin, never-throwing wrappers. Haptics are a non-essential nicety: any
// failure (unsupported device, permission) must stay silent and never affect
// the translation flow.
export function hapticStart(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function hapticStop(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
}

export function hapticError(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
    () => {},
  );
}
