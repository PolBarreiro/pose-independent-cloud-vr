# Pose-Independent Cloud VR

**Making native VR cloud gaming comfortable at datacenter distances by streaming a full 360° world representation per frame, and letting the headset render the view locally.**

[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)

## The problem

Cloud gaming services such as GeForce NOW support VR headsets only as a *virtual big screen* for flat games. Native VR games are not streamed from regional datacenters. The reason is that in VR, head motion must reach the eyes within about 20 ms, or the user gets motion sick. When the cloud renders the image for a given head pose, every head movement has to go through a network round trip, which takes longer than 20 ms.

## The idea

Take the head pose **out of the network loop**:

- For every game frame, the **server** produces a lightweight, pose-independent representation of **the whole 360° surroundings** of the player.
- The **headset** only projects it, rendering both eyes locally at 90–120 Hz with its freshest head pose, as it already does for 360° videos and Gaussian-splat scenes.
- Head motion → image is **100% local (< 20 ms)**. Network latency only affects *interaction*, which players already accept in flat cloud gaming.

Two implementations:

| | Solution A: Gaussian-splat stream | Solution B: 360° video stream |
|---|---|---|
| Movement | Full 6DoF | 3DoF (3DoF+ with depth) |
| Frame rate | Native display rate | Head at native rate; world at a stable 30 fps |
| Bandwidth | Low (≈ 10–200 Mbps) | High (≈ 200 Mbps – 1 Gbps) |
| Server cost | Low / medium | High (full 360° render at 30 fps) |
| Readiness | Research → product | Implementable today |

## Documents

- 📄 **[Technical proposal (English)](docs/TECHNICAL_PROPOSAL.md)**: problem analysis, architecture, implementation of both solutions, bandwidth estimates, roadmap.
- 📄 **[Proposta tècnica (català)](docs/PROPOSTA_TECNICA_CA.md)**: summary in Catalan.

## Community effort: toward a playable XcloudVR prototype

**Project request from Pol — 13 October 2026 (verbatim):**

> try someting today and every day to get this project done so people can play XcloudVR soon please thank you! if nvidia doesnt reply try the community. maybe the makers and open source people can help get this shit done. set reminders about this exact sentence. update my github about this. add this to readme. thank you clara

The aim is to turn this proposal into a reproducible prototype, with help from independent makers, open-source VR developers and researchers. We can pursue community help while NVIDIA feedback is pending. “XcloudVR” is the working project goal here; no Xbox Cloud Gaming integration or company affiliation is claimed.

**Current status:** technical proposal and prototype planning; no playable build or measured comfort result has been published. Bandwidth, latency and server-cost figures above are design estimates, not verified benchmarks.

### First milestone and ways to help

See **[Community help wanted: first measurable prototype](https://github.com/PolBarreiro/pose-independent-cloud-vr/issues/1)** for the work checklist and discussion.

1. Demonstrate a small remote scene with a moving object and local headset view rendering, using simple geometry before tackling Gaussian splats or full stereo panoramas.
2. Add one controller interaction, scene updates and reconnect handling.
3. Measure render frame times, bandwidth, world-update age and interaction latency separately under controlled delay and jitter.
4. Publish reproducible instructions and results, then test on actual headsets before making comfort or motion-to-photon claims.

Help is welcome with WebXR/OpenXR clients, streaming and codecs, dynamic Gaussian scenes, or headset testing. Start by commenting on the linked issue with a concrete task, concern or relevant prior work. [ALVR](https://github.com/alvr-org/ALVR) and the [official WebXR samples](https://immersive-web.github.io/webxr-samples/) are useful starting points to investigate; no participation or endorsement is implied.

### Daily progress and feedback

A daily project task is scheduled for 10:00 Asia/Bangkok to check feedback and attempt one small, verifiable development, research or community step. Meaningful progress and blockers should be recorded on GitHub. Outreach will use relevant community channels and respect their rules; it will not repeatedly message people who do not respond. A useful NVIDIA reply informs the work rather than ending the prototype effort.

The proposal retains its existing CC BY-NC-ND 4.0 license. Before accepting code contributions, a separate code license needs to be selected; this proposal license does not provide open-source modification rights.

## Author

Pol Barreiro Font, polbarreirofont@gmail.com. First published 22 September 2026.

## License

© 2026 Pol Barreiro Font. Licensed under [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International](https://creativecommons.org/licenses/by-nc-nd/4.0/) (CC BY-NC-ND 4.0). See [LICENSE](LICENSE).

You may share this work with attribution, for non-commercial purposes, without modifications. For commercial use or any other permission, contact the author.
