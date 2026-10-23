// SPDX-License-Identifier: MIT
export class InputTracker {
  #session = null;
  #nextId = 0;
  #pending = null;
  #unknown = false;
  #lastTime = 0;
  #timeout;

  constructor(timeoutMs = 2000) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid timeout');
    this.#timeout = timeoutMs;
  }

  #time(now) {
    if (!Number.isFinite(now) || now < this.#lastTime) throw new Error('Invalid monotonic time');
    this.#lastTime = now;
  }

  // Call only after a new connection's first validated snapshot establishes its session.
  connect(session, now) {
    if (typeof session !== 'string' || !session.length) throw new Error('Session required');
    this.#time(now);
    this.#session = session;
    this.#nextId = 0;
    this.#pending = null;
    this.#unknown = false;
  }

  disconnect(now) {
    this.#time(now);
    if (this.#pending) this.#unknown = true;
    this.#pending = null;
    this.#session = null;
  }

  send(now) {
    this.#time(now);
    if (!this.#session || this.#pending || this.#unknown) throw new Error('Input unavailable');
    if (!Number.isSafeInteger(this.#nextId)) throw new Error('Input ID exhausted');
    const inputId = this.#nextId++;
    this.#pending = { inputId, sentAt: now };
    return JSON.stringify({ version: 1, type: 'input', session: this.#session, inputId, action: 'toggle-motion' });
  }

  // Call only for a validated snapshot actually accepted/applied by SnapshotReceiver.
  acknowledge(snapshot, now) {
    this.#time(now);
    if (!this.#pending || snapshot.session !== this.#session || snapshot.lastAppliedInput !== this.#pending.inputId) return null;
    const responseMs = now - this.#pending.sentAt;
    this.#pending = null;
    this.#unknown = false;
    return responseMs;
  }

  status(now) {
    this.#time(now);
    if (this.#pending && now - this.#pending.sentAt >= this.#timeout) this.#unknown = true;
    return { connected: this.#session !== null, pending: this.#pending !== null,
      outcomeUnknown: this.#unknown, canSend: this.#session !== null && !this.#pending && !this.#unknown };
  }
}
