import { useSyncExternalStore } from 'react';

/**
 * A first-party toast system. Replaces @backpackapp-io/react-native-toast so
 * toasts read from our own design tokens, honour reduced-motion + haptics, and
 * can carry an action button — none of which the library exposed.
 *
 * This module is the imperative store: `notify.*` enqueues, the ToastHost
 * subscribes. Kept framework-free (no React imports beyond the store hook) so
 * it can be called from contexts, watchers, and plain functions alike.
 */

export type ToastVariant = 'success' | 'error' | 'info' | 'loading';

export type ToastAction = {
  label: string;
  onPress: () => void;
};

export type ToastOptions = {
  /** Stable id — a repeat call with the same id updates in place, never stacks. */
  id?: string;
  /** ms visible; `Infinity` pins it until dismissed by id. Defaults per variant. */
  duration?: number;
  action?: ToastAction;
};

export type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  action?: ToastAction;
  /** Monotonic sequence so the newest sorts to the bottom deterministically. */
  seq: number;
};

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 2600,
  info: 2600,
  error: 4000,
  loading: Infinity,
};

/** At most this many visible at once; the oldest is dropped when exceeded. */
const MAX_VISIBLE = 3;

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => toasts;

const randomId = () => `t${Date.now().toString(36)}${(seq).toString(36)}`;

const upsert = (message: string, variant: ToastVariant, options?: ToastOptions): string => {
  const id = options?.id ?? randomId();
  const duration = options?.duration ?? DEFAULT_DURATION[variant];
  const existing = toasts.find(t => t.id === id);
  const next: Toast = {
    id,
    message,
    variant,
    duration,
    action: options?.action,
    seq: existing ? existing.seq : ++seq,
  };
  toasts = existing
    ? toasts.map(t => (t.id === id ? next : t))
    : [...toasts, next];
  // Enforce the visible cap by dropping the oldest.
  if (toasts.length > MAX_VISIBLE) {
    toasts = [...toasts].sort((a, b) => a.seq - b.seq).slice(toasts.length - MAX_VISIBLE);
  }
  emit();
  return id;
};

const dismiss = (id: string) => {
  const before = toasts.length;
  toasts = toasts.filter(t => t.id !== id);
  if (toasts.length !== before) emit();
};

const dismissAll = () => {
  if (toasts.length === 0) return;
  toasts = [];
  emit();
};

export const notify = {
  success: (message: string, options?: ToastOptions) => upsert(message, 'success', options),
  error: (message: string, options?: ToastOptions) => upsert(message, 'error', options),
  info: (message: string, options?: ToastOptions) => upsert(message, 'info', options),
  loading: (message: string, options?: ToastOptions) => upsert(message, 'loading', options),
  dismiss,
  dismissAll,
};

/** ToastHost subscribes here for the current, seq-sorted list. */
export const useToasts = (): Toast[] => {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [...list].sort((a, b) => a.seq - b.seq);
};

/** Plain snapshot getter (seq-sorted) for tests and non-React callers. */
export const getToasts = (): Toast[] => [...toasts].sort((a, b) => a.seq - b.seq);

/** Test-only reset. */
export const __resetToasts = () => {
  toasts = [];
  seq = 0;
};
