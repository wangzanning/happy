# Disconnect without archiving

The mobile action uses the distinct encrypted `releaseToDesktop` RPC with a unique request ID. It never calls kill/archive as a compatibility fallback. Older CLI versions therefore fail explicitly instead of archiving a conversation.

The Codex runner stops its current task, waits for the native writer process to exit, then records `lifecycleState: disconnected` with that request ID, clears archive markers, sends inactive presence, flushes, and closes. Mobile requires both inactive presence and the matching request marker before reporting completion; stale disconnect markers cannot confirm a new request. Files, native thread ID and Happy history remain intact. The existing resume action can reconnect later; desktop and mobile still cannot write the same native thread simultaneously.

Explicit Archive retains its existing kill/archive behavior. Disconnected CLI sessions are exempt from the legacy offline-means-archived list rule. This change requires matching mobile and Mac CLI builds; rebuilding an APK does not replace an already running Mac worker.

Validation: lifecycle tests cover release-after-writer-exit, shutdown failure, preserving thread identity, ordinary archive, matching request acknowledgements, and the real store retaining a disconnected chat outside the archive.
