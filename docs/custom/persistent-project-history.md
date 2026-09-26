# Persistent project history and incremental loading

Project mode keeps regular sessions under their original project after they go offline, are archived, or release the Codex writer to the desktop. A project with only archived sessions remains visible once its metadata is loaded. Explicit session deletion still removes it. This is list membership, not a background process keep-alive.

The initial history request and each scroll request use `/v2/sessions?limit=40` with the server cursor. Loaded metadata is merged by session ID. Project cards and individual chat rows are virtualized in one FlatList; no nested unbounded chat list is mounted. Pagination does not fetch chat message history. A loading indicator and manual retry/load-more button remain available at the bottom, including when a page contains only hidden records. Concurrent scroll callbacks share a request; failed pages retain their cursor; changing credentials invalidates pending catalog results.

Real-time/reconnect refreshes retain the existing bounded `/v1/sessions` recent-activity request (at most 150 metadata records). This lets an older session with new activity appear even before the user scrolls to its history page, without resetting the history cursor. This is not a full account-history download. Previously loaded projects are kept through refreshes; cold launches discover older projects progressively, rather than keeping a separate complete project index on the phone.

Project mode is the default for new settings. An existing explicitly saved flat layout is respected; select project grouping in the session list settings to use the new presentation. Flat mode also gains cursor pagination, while preserving its existing archive filter. Regular archived chats are intentionally always included inside their projects in project mode; retired bots retain the separate archive tail.

## Validation

- Pager tests cover bounded first-page loading, concurrent scroll coalescing, retry cursors, refresh cursor preservation, account reset, and non-advancing cursors.
- Integration coverage checks metadata-only pagination, retaining older records, and discovering an older recently active session without reopening exhausted history pagination.
- Grouping coverage checks stable project membership after the last active session is archived and 80 independently addressable chat rows across worktrees.
- App typecheck and full Vitest suite are run before merging. The upstream `sessionPresentation.test.ts` initialization failure (`__DEV__ is not defined`) is a known baseline failure, unrelated to these changes.
- Android physical-device scrolling/crash behavior still requires installing the custom build; no APK or installed Mac service is changed by this source merge.
