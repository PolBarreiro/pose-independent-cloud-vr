# Scene-streaming protocol experiment

Original prototype code and tests are MIT licensed; see ../LICENSE-CODE.
Requires Node.js 20 or later. No packages or services are needed.

Run from repository root:

    node --test prototype/snapshot.test.mjs prototype/scene.test.mjs prototype/input.test.mjs prototype/transport.test.mjs
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
Next step: connect these components to a local transport and desktop rendering.

## Input tracking — verified 2026-10-18

All 17 tests passed on Node v24.19.0. InputTracker enforces one pending action,
blocks retry after an unknown outcome and resolves a late matching acknowledgment.
Connect it only after the new connection baseline is accepted; pass acknowledgments
only from snapshots actually applied by SnapshotReceiver. Ignore old transport
callbacks using the receiver generation token. Call status() each UI update to
evaluate timeouts. Disconnect discards pending data without replay; a fresh
connection resets numbering. Store the unknown outcome in the UI if a persistent
history is needed. Response duration uses the client clock; it is not a hardware
latency measurement. Transport, rendering and headset tests remain pending.

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
