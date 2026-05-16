# Persistence Decision Record

## Context
Feature 1 needs to persist `TranscriptRow[]` sessions across app restarts and
list them in a History screen. Must ship via OTA (no new native module).

## Dependency audit (package.json)
- `@react-native-async-storage/async-storage`: **NOT present**
- `expo-file-system`: **NOT present**
- `expo-secure-store ~15.0.8`: **present**, already used by `src/lib/secure-keys.ts`

## Options

| Option | OTA? | Verdict |
|--------|------|---------|
| Add AsyncStorage | NO — new native module → rebuild + `expo.version` bump | Rejected (breaks OTA constraint) |
| Add expo-file-system | NO — new native module → rebuild | Rejected (breaks OTA constraint) |
| Reuse expo-secure-store (chunked) | YES — module already linked, pure JS usage | **Chosen** |

## Why secure-store works despite the size limit
iOS SecureStore is Keychain-backed; Apple recommends keeping items small. There
is no hard documented byte limit, but large blobs are unreliable. We therefore
**shard**: one key per session + a small index key, and cap sizes.

Size math (worst case):
- Row ≈ `{id, source, translation, timestamp}` JSON ≈ 250 chars typical, cap a
  row's `source+translation` at 600 chars on persist.
- 120 rows × ~650 chars ≈ ~78 KB per session value. Within practical Keychain
  tolerance on iOS/Android. Index value (20 × ~120 char meta) ≈ ~2.4 KB.
- Caps: ≤20 sessions (oldest evicted), ≤120 rows/session (head-truncate, keep
  newest). On any SecureStore set failure: retry once with rows halved, then
  drop oldest session and retry; if still failing, skip persist (log only).

## Consequences
- Zero new deps → fully OTA-deliverable.
- DRY: same storage layer/pattern as `secure-keys.ts`.
- Trade-off accepted: not designed for unbounded history (YAGNI — users review
  recent sessions, not months of archive). If future need arises, migrate to
  expo-file-system in a *rebuild* release with a one-time import.

## Unresolved
- Exact Keychain per-item ceiling is undocumented; caps are conservative. If
  device testing shows failures below cap, lower `MAX_ROWS_PERSIST` to 80.
