// ══════════════════════════════════════════════════════════
// bus.ts — Typed event emitter (旧版 bus.js TS 化)
// ══════════════════════════════════════════════════════════
import type { BusEvents } from '../types';

type Handler<K extends keyof BusEvents> = (data: BusEvents[K]) => void;
// 内部存储用 unknown handler, 调用时类型由 emit 保证
type AnyHandler = (data: unknown) => void;

class TypedBus {
  private _listeners: Partial<Record<keyof BusEvents, AnyHandler[]>> = {};

  on<K extends keyof BusEvents>(event: K, handler: Handler<K>): () => void {
    let list = this._listeners[event];
    if (!list) { list = []; this._listeners[event] = list; }
    list.push(handler as AnyHandler);
    return () => this.off(event, handler);
  }

  off<K extends keyof BusEvents>(event: K, handler: Handler<K>): void {
    const list = this._listeners[event];
    if (!list) return;
    const i = list.indexOf(handler as AnyHandler);
    if (i >= 0) list.splice(i, 1);
  }

  once<K extends keyof BusEvents>(event: K, handler: Handler<K>): () => void {
    const wrapper: Handler<K> = (data) => {
      this.off(event, wrapper);
      handler(data);
    };
    return this.on(event, wrapper);
  }

  emit<K extends keyof BusEvents>(event: K, data: BusEvents[K]): void {
    const list = this._listeners[event];
    if (!list || !list.length) return;
    // 快照避免 handler off/on 期间塌方
    const snapshot = list.slice();
    for (const h of snapshot) {
      try { h(data); }
      catch (err) { console.error(`[bus] handler error on '${String(event)}':`, err); }
    }
  }

  clear(): void { this._listeners = {}; }

  _count(): number {
    let n = 0;
    for (const k in this._listeners) n += this._listeners[k as keyof BusEvents]?.length ?? 0;
    return n;
  }
}

export const bus = new TypedBus();
