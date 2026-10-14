# Snapshot receiver experiment

Original prototype code and tests are MIT licensed; see ../LICENSE-CODE.
Requires Node.js 20 or later. No packages or services are needed.

Run from repository root:

    node --test prototype/snapshot.test.mjs

snapshot.mjs validates full JSON snapshots and maintains the latest scene.
Call connect() when a transport connection is established and retain its token
with every queued receive/disconnect callback. Feed receive() UTF-8 decoded
JSON, that token, and client monotonic milliseconds. Handle reconnect-required
by closing/reopening the transport. Catch validation errors at the transport
boundary. view() returns a copy of the scene, connection state and stale status.

Verified 2026-10-14 on Windows with Node v24.19.0: 7 tests passed.
Coverage includes reordered/skipped updates, reconnect isolation, unexpected
session changes, stale boundary, invalid input rejection and scene isolation.

This is an in-memory receiver only: no WebSocket server/client, renderer,
action acknowledgments or scheduled reconnect transport is implemented here.
The suite does not measure bandwidth, WAN behavior, display latency or comfort.
Next step: connect this receiver to a small transport/scene simulation.
