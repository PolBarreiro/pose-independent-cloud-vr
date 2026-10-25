# Scene-streaming protocol experiment

Original prototype code and tests are MIT licensed; see ../LICENSE-CODE.
Requires Node.js 20 or later. No packages or services are needed.

Run from repository root:

    node --test prototype/snapshot.test.mjs prototype/scene.test.mjs prototype/input.test.mjs prototype/transport.test.mjs prototype/delay.test.mjs prototype/desktop.test.mjs prototype/client.test.mjs
    node prototype/simulate.mjs

snapshot.mjs validates full JSON snapshots and maintains the latest scene.
Call connect() when a transport connection is established and retain its token
with every queued receive/disconnect callback. Feed receive() UTF-8 decoded
JSON, that token, and client monotonic milliseconds. Handle reconnect-required
by closing/reopening the transport. Catch validation errors at the transport
boundary. view() returns a copy of the scene, connection state and stale status.

scene.mjs supplies a single-client scene authority with caller-driven monotonic
time, a moving cube, toggle-motion inputs, deduplication and acknowledgments.
Each new authority requires a unique server session ID. connect() resets only
connection input tracking, preserving the simulated world. Do not automatically
replay unacknowledged inputs after reconnect. InputTracker enforces one pending action and detects unknown outcomes. UI handling is not implemented.

Verified 2026-10-16 on Windows, Node v24.19.0: all 12 tests passed.
The deterministic simulation delivered 55 snapshots, deliberately skipped 6,
and recovered final sequence 60 with lastAppliedInput 0. It uses virtual time
at 30 Hz; this is not a real-time scheduler, loss-rate benchmark or WAN test.

Coverage: malformed/oversized snapshots, reordered/skipped updates, reconnect
isolation, stale boundary, invalid input rejection, scene isolation, cube motion,
action deduplication, acknowledgment and reset across reconnects.

No WebSocket transport, renderer, headset controller or scheduled reconnect is
implemented. No bandwidth, display latency or comfort measurements are claimed.
Local TCP transport is now available below; desktop rendering remains pending.

## Input tracking — verified 2026-10-18

All 17 tests passed on Node v24.19.0. InputTracker enforces one pending action,
blocks retry after an unknown outcome and resolves a late matching acknowledgment.
Connect it only after the new connection baseline is accepted; pass acknowledgments
only from snapshots actually applied by SnapshotReceiver. Ignore old transport
callbacks using the receiver generation token. Call status() each UI update to
evaluate timeouts. Disconnect discards pending data without replay; a fresh
connection resets numbering. Store the unknown outcome in the UI if a persistent
history is needed. Response duration uses the client clock; it is not a hardware
latency measurement. Browser transport, rendering and headset tests remain pending.

## Local TCP adapter — verified 2026-10-19

transport.mjs exports createSceneServer(). Await listen() for an ephemeral port
on 127.0.0.1 only, then await close() to stop it. It accepts one TCP client,
sends complete newline-delimited JSON snapshots at a requested 30 Hz timer
cadence, and accepts newline-delimited toggle input. This is not WebSocket
and cannot be used directly by browser/headset clients. No authentication or
encryption is provided: do not expose or forward this adapter outside loopback.

All 19 tests passed on Windows, Node v24.19.0. The integration suite uses real
loopback sockets, SnapshotReceiver and InputTracker, and checks fragmented
input acknowledgment plus recovery after malformed/oversized client input.
Input buffering and queued output are bounded; slow output clients disconnect.
No actual 30 Hz performance guarantee or WAN/hardware latency is claimed.
No persistent service is started by the test suite. Desktop rendering,
WebSocket transport, automated reconnect and headset testing remain pending.

## Delivery delay simulation — verified 2026-10-20

SnapshotDelay in delay.mjs queues UTF-8 snapshot strings with configurable delayMs,
jitterMs, dropRate and seed. Enqueue after parsing/validation; drain with client
monotonic time, then apply through SnapshotReceiver. Clear at disconnect and
retain transport generation checks. Default queue capacity is 16 snapshots;
overflow discards oldest arrivals. stats() separates random drops from superseded
updates. deliveryDelayMs includes time until the caller drains the queue.

All 24 tests passed on Node v24.19.0, including 0/50/100 ms boundaries, seeded
reproducibility, bounded queues, disconnect clearing and receiver integration.
This is application delivery simulation, not TCP packet loss or WAN emulation.
It does not schedule or delay local rendering. Browser adapter, visible desktop
scene and hardware tests remain pending.

## Desktop scene page — 2026-10-21

From the repository root run:

    node prototype/serve.mjs

Open the printed 127.0.0.1 URL manually. Stop with Ctrl+C. This server serves
only the allowlisted demo assets and binds only to loopback. No dependencies.
The page draws an identity-rotation wireframe cube, supports local pointer yaw,
pause/resume, and 0/50/100 ms scene-delivery delay. Status shows snapshot sequence,
stale state and simulated action response. SceneAuthority runs INSIDE the browser;
this is not a remote scene server or a WebSocket integration. This code is an
experimental review branch, not a published playable release.

Validation: 26 Node tests passed; projection and static HTTP routes checked;
desktop.mjs syntax checked. Actual browser visual appearance, pointer/button
behavior, frame timing and headset operation have NOT been verified. No graphical
control was used. Next: manual browser QA when allowed, then remote browser
transport integration. Original prototype code is MIT licensed.

## Server-side HTTP scene — verified 2026-10-22

This section supersedes the browser-only architecture described above. The same
serve.mjs command now hosts SceneAuthority in Node. The browser connects through
POST /api/connect, polls GET /api/snapshot without overlapping requests, and sends
POST /api/input. A new connection invalidates the previous token. Failures stop
the client with a reload instruction; unknown inputs are never replayed.

This remains a loopback-only, single-client experiment using ordinary HTTP polling,
not WebSocket or a cloud service. Requests must use the printed 127.0.0.1 host.
Custom client headers and same-origin checks protect the local experimental API;
no production authentication or TLS is provided. Do not expose/forward the port.

All 27 tests passed on Node v24.19.0, including real HTTP snapshots, input
deduplication/acknowledgment, oversized/malformed requests and superseded clients.
Browser script syntax checked. Actual browser visuals/interactions and headset
behavior remain unverified. No graphical control used or persistent service left
running. HTTP polling frequency is not a guaranteed display/scene frame rate.

## Client failure regression — verified 2026-10-23

Malformed snapshot handling previously sampled a later clock inside fail() and
then resumed the frame with its earlier timestamp. InputTracker rejected that
time reversal, stopping the render loop. Failure handling now shares the current
frame time; stopped clients also refuse action clicks. A Node DOM/clock harness
reproduced the old failure (Invalid monotonic time), then passed with the fix.

All 28 tests pass. The harness checks disconnect status, a disabled action,
continued frame scheduling and no action request after failure. It is not an
actual browser/visual test; those checks and headset support remain pending.

## Page disposal — verified 2026-10-25

Leaving the page now aborts HTTP requests, clears delayed snapshots, disconnects
input/receiver state and stops future render scheduling. The Node harness checks
that request signals abort and no UI updates or input requests happen afterward.
All 28 tests passed. This is logical lifecycle coverage, not browser visual QA.
A page restored from browser history may need a manual reload to reconnect.
