# First prototype: scene protocol and verification plan

Status: design specification, 14 October 2026. Not implemented or benchmarked.
Tracks [issue 1](https://github.com/PolBarreiro/pose-independent-cloud-vr/issues/1).
The existing proposal license is unchanged. This document does not select a code license.

## Scope

Use one authoritative server, one client and a fixed small scene with stable object IDs.
The server simulates a moving cube and publishes complete snapshots at 30 Hz.
Full snapshots deliberately precede deltas: a dropped update cannot corrupt the next scene.
This proves a message path and local view rendering, not Gaussian reconstruction or arbitrary-game compatibility.

The client renders its latest valid scene using its current local camera/head pose.
No network response is awaited inside the render loop. Head pose is not needed to produce snapshots.
Remote controller actions still incur network and server delay.

## Proposed wire format

UTF-8 JSON messages over an ordered WebSocket connection for the initial experiment.
For a remotely accessed headset use HTTPS/WSS with a trusted certificate; localhost exceptions do not extend to a LAN IP.
WebSocket is a prototype transport, not a claim about the best production transport.

A complete snapshot:

```json
{
  "version": 1,
  "type": "snapshot",
  "session": "server-start-unique-id",
  "sequence": 42,
  "serverTimeMs": 1400,
  "lastAppliedInput": 7,
  "objects": [
    {
      "id": "cube",
      "position": [0, 1.2, -3],
      "rotation": [0, 0, 0, 1],
      "scale": [1, 1, 1]
    }
  ]
}
```

Coordinates: right-handed, metres, +Y up, forward -Z; quaternion order x,y,z,w.
serverTimeMs is monotonic elapsed time within the server session, not a Unix timestamp.
sequence starts at zero and increases once per published snapshot.
lastAppliedInput is the highest input ID applied for this connection, or null before any.
Only one connection/client is supported initially; multi-client acknowledgment needs a separate design.
Object IDs are unique within a snapshot; objects absent from a complete snapshot are removed.

A client input:

```json
{
  "version": 1,
  "type": "input",
  "session": "server-start-unique-id",
  "inputId": 8,
  "action": "toggle-motion"
}
```

Accept only the enumerated action. Apply each inputId at most once per connection.
Send at most one pending action from the initial client; wait for acknowledgment or show timeout.
On reconnect discard pending actions, reset input numbering and never replay an unacknowledged action automatically.
The client measures action-to-visible-snapshot response on its own monotonic clock when lastAppliedInput acknowledges it.
This is application response time, not controller hardware-to-photon latency.

## Validation and reconnect behavior

- Reject unknown versions/types, non-finite numbers, invalid transforms, duplicate object IDs and snapshots exceeding 100 objects or 64 KiB. Quaternion norm must be within 0.001 of one; scale must be positive.
- For the active session discard sequence values less than or equal to the last accepted value.
- On connection establishment accept the first valid full snapshot as a fresh baseline; a new server session resets snapshot sequence tracking.
- Close/reopen the connection on an unexpected mid-connection session change. Accept that new session only as a fresh connection baseline.
- Show a stale indicator after 500 ms without an accepted snapshot; keep local view rendering responsive. Label frozen objects as stale.
- On disconnect retain the last scene with a clear disconnected label and disable server actions.
- Reconnect with bounded exponential backoff (0.5, 1, 2, 4, then 8 seconds) until explicitly stopped. Request/receive a complete snapshot immediately after reconnect.
- Bound delayed snapshot queues and discard superseded snapshots rather than accumulating playback lag.

## Delay experiment

Inject application-level delay on scene snapshots after receive/parse and before application.
Choose 0, 50 or 100 ms base delay, optional seeded uniform +/-10 ms jitter, and seeded 5% snapshot drops.
Record seed, settings and delivered/dropped counts. Delays cannot be negative.
These are simulated scene-delivery conditions; TCP loss, congestion and real WAN latency are not reproduced.
Do not delay camera/head pose, local controller visuals or rendering callbacks.

## Measurements

For each condition record 60 seconds after 5 seconds warm-up, plus hardware, runtime/browser,
display refresh rate and commit. Report sample count and p50/p95/p99 frame intervals, payload bytes/sec,
snapshot receive-to-apply delay, time since last applied snapshot and action response time.
All differences in the first measurement pass must use one client's monotonic clock.
Do not subtract serverTimeMs from client time to claim one-way network latency: the clocks are not synchronized.
True world-state age needs a later clock-offset/uncertainty design; report it as unmeasured initially.
Count UTF-8 payload bytes separately from protocol/network overhead.
Do not infer measured motion-to-photon latency or comfort from frame intervals.

## Acceptance scenarios for implementation

| Scenario | Expected observable result |
| --- | --- |
| Receive sequence 10, 12, 11 in the delay simulator | Apply 10 then 12; reject 11 |
| Drop 30% of complete snapshots | Next delivered snapshot restores complete scene |
| Disconnect and restart server | Show disconnect, establish new session, recover without old queued data |
| Disconnect after action but before acknowledgment | No automatic replay; UI reports unknown outcome |
| Repeat the same action ID on one connection | Exactly one simulation change |
| Pause snapshots for 1 second | Stale label appears; local camera remains responsive |
| Malformed transform / oversized payload | Reject safely; no invalid scene application |
| Inject each delay condition | Report scene-delivery delay separately from rendering measurements |

These are planned checks, not passing test results.

## Community preparation and licensing

ALVR provides a relevant existing streaming baseline. Its [contribution rules](https://github.com/alvr-org/ALVR/blob/master/CONTRIBUTING.md)
require contributors to own their decisions and discuss development without AI copy-pasted responses.
No automated development message has been sent there.

A question suitable for a community discussion channel that permits it (not posted):

> We are scoping a small pose-independent VR experiment: full simple-scene snapshots at 30 Hz,
> with headset views rendered locally and separately measured scene-update and action latency.
> Which practical failure case should we validate first: stale dynamic occluders, controller/world mismatch,
> or headset scene-rendering cost? Existing measurements or prior experiments would help.
> Scope and checklist: https://github.com/PolBarreiro/pose-independent-cloud-vr/issues/1.
> This is a proposal-stage project; we have no verified headset results yet.

Before publishing implementation with a chosen license or accepting external code, Pol must select a separate code license.
Recommendation for the small prototype: MIT for straightforward reuse, while leaving proposal documents under CC BY-NC-ND 4.0.
Apache-2.0 is an alternative if an explicit patent grant is preferred. No license is being applied by this recommendation.

## Progress log — 14 October 2026

- Read current README and issue 1; no issue comments were present.
- Related Gmail search returned the original NVIDIA message and October 13 follow-up only; no incoming project reply was found.
- Inspected a fresh repository checkout; no AGENTS.md or CONTRIBUTING instructions were present in that checkout.
- Defined snapshot/input contract, reconnect semantics, bounded delay simulation and measurement constraints.
- Reviewed ALVR contribution policy; no third-party outreach sent today.
- Next: implement snapshot validation/recovery locally and test the acceptance scenarios; decide code license before publishing implementation.
