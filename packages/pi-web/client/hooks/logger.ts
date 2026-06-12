import { useEffect, useRef, useState } from "react";

// ─── Log types ───

export interface LogEntry {
  id: number;
  time: number;      // ms since start
  type: string;
  label: string;
  detail?: string;
}

// ─── Ring buffer (global, shared across all consumers) ───

const MAX_LOGS = 500;
const ring: LogEntry[] = [];
let idCounter = 0;
let startTime = 0;

const subscribers = new Set<() => void>();

function notify() {
  for (const fn of subscribers) {
    try { fn(); } catch { /* noop */ }
  }
}

export function log(type: string, label: string, detail?: string) {
  const elapsed = startTime > 0 ? Date.now() - startTime : 0;
  const entry: LogEntry = { id: ++idCounter, time: elapsed, type, label, detail };
  ring.push(entry);
  if (ring.length > MAX_LOGS) ring.shift();
  notify();
}

export function resetLogs() {
  ring.length = 0;
  idCounter = 0;
  startTime = Date.now();
  notify();
}

export function setLogStartTime() {
  startTime = Date.now();
}

// ─── React hook to consume logs ───

export function useLogs() {
  const [, tick] = useState(0);
  const lastCount = useRef(0);

  useEffect(() => {
    const onUpdate = () => {
      if (ring.length !== lastCount.current) {
        lastCount.current = ring.length;
        tick((n) => n + 1);
      }
    };
    subscribers.add(onUpdate);
    return () => { subscribers.delete(onUpdate); };
  }, []);

  return ring; // returns the same array reference, entries are mutated in place
}
