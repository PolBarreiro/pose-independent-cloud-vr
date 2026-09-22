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

## Author

Pol Barreiro Font, polbarreirofont@gmail.com. First published 22 September 2026.

## License

© 2026 Pol Barreiro Font. Licensed under [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International](https://creativecommons.org/licenses/by-nc-nd/4.0/) (CC BY-NC-ND 4.0). See [LICENSE](LICENSE).

You may share this work with attribution, for non-commercial purposes, without modifications. For commercial use or any other permission, contact the author.
