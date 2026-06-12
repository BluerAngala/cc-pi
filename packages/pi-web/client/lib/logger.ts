import { useSyncExternalStore } from "react";
import debug from "debug";

// ─── Debug namespaces ───────────────────────────────────
// Enable in browser console:
//   localStorage.debug = 'pi:*'     (all pi logs)
//   localStorage.debug = 'pi:chat,pi:tool'  (specific)

export const chatLog = debug("pi:chat");
export const toolLog = debug("pi:tool");
export const netLog = debug("pi:net");
export const modelLog = debug("pi:model");

// ─── Ring buffer ─────────────────────────────────────────

export interface LogEntry {
  id: number;
  time: number;
  type: string;
  label: string;
  detail?: string;
}

const MAX = 500;
const buffer: LogEntry[] = [];
let idCounter = 0;
let startTime = 0;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  for (const fn of listeners) fn();
}

export function logEntry(type: string, label: string, detail?: string) {
  const elapsed = startTime > 0 ? Date.now() - startTime : 0;
  buffer.push({ id: ++idCounter, time: elapsed, type, label, detail });
  if (buffer.length > MAX) buffer.shift();
  notify();
}

export function resetBuffer() {
  buffer.length = 0;
  idCounter = 0;
  startTime = Date.now();
  notify();
}

export function setStartTime() {
  startTime = Date.now();
}

// ─── React hook (zero-unnecessary-render) ─────────────────

export function useLogBuffer() {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => buffer,
    () => buffer,
  );
}

export function useLogVersion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => version,
    () => version,
  );
}
