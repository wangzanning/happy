# Android long-chat performance patch

Base: upstream main 8517ab232528a6046271d6010aaed663e1187dfc.

## Problem and changes

Opening a cached session whose single turn has thousands of messages defeats the existing 60-message window: `windowEndForTurn` scans to the user prompt and admits the entire turn. On Android, cap turn-boundary lookahead to 60 additional messages (at most 120 on entry). Preserve nearby ordinary boundaries and retain the oldest admitted ID as new messages arrive. Align that boundary only when explicitly requesting a larger window, not on unrelated store updates.

Cached window growth previously re-used stale near-edge layout metrics from an effect. This can synchronously drain the whole cache in a render/effect loop. On Android, grow cached windows on layout/scroll or explicit Load more instead. Keep Load more available for collapsed or invisible history whose height does not change. No messages are deleted; continued paging reaches the original prompt and older messages.

Pause Android speculative history prefetch between requests when the app is not active or a different session is being viewed. Returning resumes the existing five-attempt lifetime budget. Explicit history loading and live message synchronization remain available. An in-flight request may complete before the pause takes effect.

## Validation

- New regression tests on unmodified upstream: entry admitted 10,001 messages instead of 120; both navigation/background tests issued six requests instead of stopping at two (initial + one in-flight page).
- Patched targeted suites: 58 tests passed, including cached-history traversal, live-message anchor preservation, nearby turn boundaries, background pause/resume and on-demand older-history recovery.
- Full happy-app suite: 169 files passed, 1 file failed to initialize; 1,922 tests passed, 1 skipped. `sessionPresentation.test.ts` fails with `ReferenceError: __DEV__ is not defined`; reproduced with original upstream production files as well.
- TypeScript typecheck passes.
- No Android device was attached. These are React/transport regression tests with native boundaries mocked, not measured frame-time, peak-memory or ANR results.

## Remaining acceptance

Build a separately signed, separately identified Android APK before phone acceptance. Verify pairing and existing encrypted history, 100/1,000/10,000-message sessions, long single tool turns, collapsed groups, history paging, live arrivals while reading older content, back navigation, background/resume, approvals and notifications.

This patch bounds entry work and avoids unnecessary speculative loading. It is not a universal crash fix, does not cap the total store after extensive manual history browsing, and does not yet bound rendering of a single enormous Markdown/tool-output message. Device logs are still needed to identify any remaining OOM/ANR/native crash.
