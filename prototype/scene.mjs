// SPDX-License-Identifier: MIT
// Single-client authority, with caller-supplied monotonic time for reproducible tests.
export class SceneAuthority {
  #session;
  #generation = 0;
  #connected = false;
  #lastInput = null;
  #sequence = 0;
  #time = 0;
  #phase = 0;
  #moving = true;

  constructor(session) {
    if (typeof session !== 'string' || !session.length) throw new Error('Session required');
    this.#session = session;
  }

  #advance(nowMs) {
    if (!Number.isFinite(nowMs) || nowMs < this.#time) throw new Error('Invalid monotonic time');
    if (this.#moving) this.#phase = (this.#phase + (nowMs - this.#time) / 1000) % (2 * Math.PI);
    this.#time = nowMs;
  }

  connect() {
    this.#connected = true;
    this.#lastInput = null;
    return ++this.#generation;
  }

  disconnect(generation) {
    if (generation === this.#generation) this.#connected = false;
  }

  input(text, generation, nowMs) {
    if (!this.#connected || generation !== this.#generation) return 'inactive';
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > 1024) throw new Error('Invalid input size');
    const i = JSON.parse(text);
    if (!i || i.version !== 1 || i.type !== 'input' || i.session !== this.#session ||
        !Number.isSafeInteger(i.inputId) || i.inputId < 0 || i.action !== 'toggle-motion') throw new Error('Invalid input');
    if (this.#lastInput !== null && i.inputId <= this.#lastInput) return 'duplicate';
    this.#advance(nowMs);
    this.#moving = !this.#moving;
    this.#lastInput = i.inputId;
    return 'applied';
  }

  snapshot(generation, nowMs) {
    if (!this.#connected || generation !== this.#generation) throw new Error('Inactive connection');
    this.#advance(nowMs);
    return JSON.stringify({
      version: 1, type: 'snapshot', session: this.#session,
      sequence: this.#sequence++, serverTimeMs: this.#time,
      lastAppliedInput: this.#lastInput,
      objects: [{ id: 'cube', position: [Math.sin(this.#phase), 1.2, -3],
        rotation: [0, 0, 0, 1], scale: [1, 1, 1] }],
    });
  }
}
