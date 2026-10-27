// SPDX-License-Identifier: MIT
const summary = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = p => sorted.length ? sorted[Math.ceil(p * sorted.length) - 1] : null;
  return { samples: sorted.length, p50: rank(.5), p95: rank(.95), p99: rank(.99) };
};
export class SceneMetrics {
  #capacity;
  #frames = [];
  #delivery = [];
  #response = [];
  #lastFrame = null;
  #bytes = 0;
  #snapshots = 0;
  constructor(capacity = 6000) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) throw new Error('Invalid capacity');
    this.#capacity = capacity;
  }
  #sample(list, value) {
    if (!Number.isFinite(value) || value < 0) throw new Error('Invalid measurement');
    if (list.length === this.#capacity) list.shift();
    list.push(value);
  }
  frame(now) {
    if (!Number.isFinite(now) || now < 0 || (this.#lastFrame !== null && now < this.#lastFrame)) throw new Error('Invalid frame time');
    if (this.#lastFrame !== null) this.#sample(this.#frames, now - this.#lastFrame);
    this.#lastFrame = now;
  }
  received(text) {
    this.#bytes += new TextEncoder().encode(text).length;
    this.#snapshots++;
  }
  applied(delayMs) { this.#sample(this.#delivery, delayMs); }
  response(responseMs) { this.#sample(this.#response, responseMs); }
  report(elapsedMs) {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error('Invalid elapsed time');
    return { frameIntervalMs: summary(this.#frames), receiveToApplyMs: summary(this.#delivery),
      actionResponseMs: summary(this.#response), receivedSnapshots: this.#snapshots,
      payloadBytes: this.#bytes, payloadBytesPerSecond: elapsedMs > 0 ? this.#bytes * 1000 / elapsedMs : null,
      hardwareMotionToPhotonMs: null, worldStateAgeMs: null };
  }
}
