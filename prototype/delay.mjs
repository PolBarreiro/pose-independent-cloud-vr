// SPDX-License-Identifier: MIT
// Application-level scene delivery simulation, not TCP loss or WAN emulation.
export class SnapshotDelay {
  #queue = [];
  #state;
  #options;
  #lastTime = 0;
  #counts = { received: 0, dropped: 0, superseded: 0, delivered: 0 };

  constructor({ delayMs = 0, jitterMs = 0, dropRate = 0, seed = 1, capacity = 16 } = {}) {
    if (![delayMs, jitterMs, dropRate].every(Number.isFinite) || delayMs < 0 || jitterMs < 0 ||
        dropRate < 0 || dropRate > 1 || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff ||
        !Number.isInteger(capacity) || capacity < 1 || capacity > 1024) throw new Error('Invalid delay settings');
    this.#options = { delayMs, jitterMs, dropRate, capacity };
    this.#state = seed;
  }

  #random() {
    this.#state = (Math.imul(1664525, this.#state) + 1013904223) >>> 0;
    return this.#state / 4294967296;
  }

  #time(now) {
    if (!Number.isFinite(now) || now < this.#lastTime) throw new Error('Invalid monotonic time');
    this.#lastTime = now;
  }

  enqueue(text, now) {
    this.#time(now);
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > 65536) throw new Error('Invalid snapshot size');
    this.#counts.received++;
    if (this.#random() < this.#options.dropRate) { this.#counts.dropped++; return; }
    const delay = Math.max(0, this.#options.delayMs + (2 * this.#random() - 1) * this.#options.jitterMs);
    if (this.#queue.length === this.#options.capacity) { this.#queue.shift(); this.#counts.superseded++; }
    this.#queue.push({ text, receivedAt: now, dueAt: now + delay });
  }

  drain(now) {
    this.#time(now);
    const due = this.#queue.filter(item => item.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt);
    this.#queue = this.#queue.filter(item => item.dueAt > now);
    this.#counts.delivered += due.length;
    return due.map(item => ({ text: item.text, deliveryDelayMs: now - item.receivedAt }));
  }

  // Reset queued data at transport disconnect. Do not replay the old connection.
  clear() { this.#counts.superseded += this.#queue.length; this.#queue = []; }
  stats() { return { ...this.#counts, queued: this.#queue.length }; }
}
