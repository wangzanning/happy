# Explicit Codex desktop handoff

The mobile Abort action only cancels a turn; Happy's Codex app-server remains alive and can retain the original thread's writer lock. Add **Disconnect and return to desktop** to the active Codex session action menu and session details. Confirmation explains that the running task stops and the Happy session is archived. Native Codex history and project files remain; the action never calls worktree cleanup or deletion.

The client requests `killSession`, then waits for inactive + archived + `archiveReason: Codex writer released`. A successful RPC acknowledgement, missing data, mere offline presence or legacy CLI archive metadata is not confirmation. A 15-second timeout explains that the matching custom Mac CLI is required. There is no server-only archive fallback that could hide a still-running writer.

The Mac CLI makes termination idempotent, stops keepalives, prevents the main loop from starting another turn, aborts current work, then waits for the app-server child to actually exit before publishing the archive/death marker. Existing disconnect force-kill behavior still applies; the exit wait itself has a five-second limit. The main-loop cleanup cannot close the session socket ahead of explicit termination.

## Validation

- 34 mobile tests: confirmation/cancel path, eligible actions, no worktree cleanup, delayed completion, legacy/offline/missing-state handling, timeout and keyboard action mapping.
- 30 CLI tests: existing app-server behavior plus real child-process termination, delayed exit, timeout and disconnectAndWait integration.
- App typecheck and CLI build/typecheck passed.
- Full app suite: 1,929 tests passed, 1 skipped. The known baseline `sessionPresentation.test.ts` suite initialization failure (`__DEV__` missing) remains.
- No physical phone or real desktop Codex thread was stopped during testing. No currently installed client/daemon was replaced.

## Deployment and acceptance

Both the custom APK and matching custom Happy CLI must be installed. Existing Happy sessions run the old code until restarted; do not treat updating files alone as upgrading a running session. With a disposable thread, verify: desktop -> Happy resume -> mobile Disconnect -> confirmation -> reopen same thread in desktop. Repeat while idle, while a task runs, during approval, and with the Mac offline. Confirm history/project files remain and check that a different concurrent session is unaffected.
