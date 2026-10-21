// SPDX-License-Identifier: MIT
const edges = [[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];
// Initial simple-geometry viewer: identity rotation only, matching SceneAuthority.
export function drawScene(ctx, scene, width, height, yaw = 0) {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#7ee7ff'; ctx.lineWidth = 2;
  for (const object of scene?.objects ?? []) {
    const points = Array.from({ length: 8 }, (_, n) => {
      const x = object.position[0] + ((n & 1) ? .5 : -.5) * object.scale[0];
      const y = object.position[1] - 1.2 + ((n & 2) ? .5 : -.5) * object.scale[1];
      const z = object.position[2] + ((n & 4) ? .5 : -.5) * object.scale[2];
      const vx = x * Math.cos(yaw) - z * Math.sin(yaw);
      const depth = -(x * Math.sin(yaw) + z * Math.cos(yaw));
      return depth > .1 ? [width / 2 + vx / depth * height, height / 2 - y / depth * height] : null;
    });
    ctx.beginPath();
    for (const [a,b] of edges) if (points[a] && points[b]) {
      ctx.moveTo(...points[a]); ctx.lineTo(...points[b]);
    }
    ctx.stroke();
  }
}
