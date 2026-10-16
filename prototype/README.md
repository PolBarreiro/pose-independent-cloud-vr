# Scene-streaming protocol experiment

Original prototype code and tests are MIT licensed; see ../LICENSE-CODE.
Requires Node.js 20 or later. No packages or services are needed.

Run from repository root:

    node --test prototype/snapshot.test.mjs prototype/scene.test.mjs
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
replay unacknowledged inputs after reconnect. The caller must enforce one pending
input at a time; client-side input timeout/UI handling is not implemented.

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
