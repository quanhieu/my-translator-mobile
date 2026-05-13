import * as SecureStore from "expo-secure-store";

const KEYS = {
  soniox: "apikey.soniox",
  openai: "apikey.openai",
} as const;

export type SecureKeyName = keyof typeof KEYS;

export async function getSecureKey(name: SecureKeyName): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS[name]);
}

export async function setSecureKey(
  name: SecureKeyName,
  value: string,
): Promise<void> {
  if (!value) {
    await SecureStore.deleteItemAsync(KEYS[name]);
    return;
  }
  await SecureStore.setItemAsync(KEYS[name], value);
}

export async function clearSecureKey(name: SecureKeyName): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS[name]);
}

export async function clearAllSecureKeys(): Promise<void> {
  await Promise.all(
    (Object.keys(KEYS) as SecureKeyName[]).map((k) => clearSecureKey(k)),
  );
}
