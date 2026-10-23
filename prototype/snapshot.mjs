// SPDX-License-Identifier: MIT
const encoder = new TextEncoder();
const integer = n => Number.isSafeInteger(n) && n >= 0;
const vector = (v, size) => Array.isArray(v) && v.length === size && v.every(Number.isFinite);

export function parseSnapshot(text) {
  if (typeof text !== 'string' || encoder.encode(text).length > 65536) {
    throw new Error('Snapshot must be UTF-8 JSON of at most 64 KiB');
  }
  const s = JSON.parse(text);
  if (!s || s.version !== 1 || s.type !== 'snapshot' ||
      typeof s.session !== 'string' || !s.session.length ||
      !integer(s.sequence) || !Number.isFinite(s.serverTimeMs) || s.serverTimeMs < 0 ||
      !(s.lastAppliedInput === null || integer(s.lastAppliedInput)) ||
      !Array.isArray(s.objects) || s.objects.length > 100) throw new Error('Invalid snapshot');
  const ids = new Set();
  for (const o of s.objects) {
    if (!o || typeof o.id !== 'string' || !o.id.length || ids.has(o.id) ||
        !vector(o.position, 3) || !vector(o.rotation, 4) ||
        !vector(o.scale, 3) || !o.scale.every(n => n > 0) ||
        Math.abs(Math.hypot(...o.rotation) - 1) > 0.001) throw new Error('Invalid object');
    ids.add(o.id);
  }
  return s;
}

// A transport must retain this generation token with every queued callback.
// Old socket callbacks cannot overwrite a newly connected session's scene.
export class SnapshotReceiver {
  #generation = 0;
  #connected = false;
  #session = null;
  #sequence = -1;
  #scene = null;
  #lastAppliedAt = null;

  connect() {
    this.#generation++;
    this.#connected = true;
    this.#session = null;
    this.#sequence = -1;
    this.#lastAppliedAt = null;
    return this.#generation;
  }

  disconnect(generation) {
    if (generation === this.#generation) this.#connected = false;
  }

  receive(text, generation, nowMs) {
    if (!this.#connected || generation !== this.#generation) return 'inactive';
    if (!Number.isFinite(nowMs) || nowMs < 0 ||
        (this.#lastAppliedAt !== null && nowMs < this.#lastAppliedAt)) throw new Error('Invalid monotonic time');
    const s = parseSnapshot(text);
    if (this.#session !== null && s.session !== this.#session) {
      this.#connected = false;
      return 'reconnect-required';
    }
    if (s.sequence <= this.#sequence) return 'superseded';
    this.#session = s.session;
    this.#sequence = s.sequence;
    this.#scene = s;
    this.#lastAppliedAt = nowMs;
    return 'applied';
  }

  view(nowMs) {
    if (!Number.isFinite(nowMs) || nowMs < 0 ||
        (this.#lastAppliedAt !== null && nowMs < this.#lastAppliedAt)) throw new Error('Invalid monotonic time');
    return {
      scene: structuredClone(this.#scene),
      connected: this.#connected,
      stale: this.#lastAppliedAt === null || nowMs - this.#lastAppliedAt >= 500,
      awaitingSnapshot: this.#lastAppliedAt === null,
    };
  }
}
