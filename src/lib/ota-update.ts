import * as Updates from "expo-updates";

export type UpdateResult =
  | "checking"
  | "downloading"
  | "up-to-date"
  | "unsupported"
  | "error";

// Manually check the OTA channel for a new JS bundle and apply it. In dev /
// Expo Go, Updates.isEnabled is false — report "unsupported" instead of
// throwing. On a fresh update this reloads the app; otherwise resolves with
// the terminal state. Never throws.
export async function checkAndApplyUpdate(
  onState?: (s: UpdateResult) => void,
): Promise<UpdateResult> {
  if (!Updates.isEnabled) {
    onState?.("unsupported");
    return "unsupported";
  }
  try {
    onState?.("checking");
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) {
      onState?.("up-to-date");
      return "up-to-date";
    }
    onState?.("downloading");
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return "downloading";
  } catch {
    onState?.("error");
    return "error";
  }
}
