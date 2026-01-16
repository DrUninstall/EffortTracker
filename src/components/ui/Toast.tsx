'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Undo2 } from 'lucide-react';
import styles from './Toast.module.css';

// ============================================
// Toast Data Types
// ============================================
type ToastType = 'success' | 'info';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================
// Observer Pattern Store (Context-Free API)
// ============================================
type Subscriber = (toasts: ToastData[]) => void;

let toasts: ToastData[] = [];
const subscribers = new Set<Subscriber>();
let toastId = 0;

function generateId() {
  return `toast-${++toastId}`;
}

function notify() {
  subscribers.forEach((sub) => sub([...toasts]));
}

function addToast(
  type: ToastType,
  message: string,
  action?: ToastData['action'],
  duration = 4000
): string {
  const id = generateId();
  toasts = [...toasts, { id, type, message, action }];
  notify();

  if (duration > 0) {
    scheduleRemoval(id, duration);
  }

  return id;
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

// Timer management with visibility pause
const timers = new Map<
  string,
  { timeout: ReturnType<typeof setTimeout>; remaining: number; start: number }
>();

function scheduleRemoval(id: string, duration: number) {
  const start = Date.now();
  const timeout = setTimeout(() => {
    timers.delete(id);
    removeToast(id);
  }, duration);
  timers.set(id, { timeout, remaining: duration, start });
}

function pauseAllTimers() {
  timers.forEach((timer) => {
    clearTimeout(timer.timeout);
    const elapsed = Date.now() - timer.start;
    timer.remaining = Math.max(0, timer.remaining - elapsed);
  });
}

function resumeAllTimers() {
  timers.forEach((timer, id) => {
    if (timer.remaining > 0) {
      timer.start = Date.now();
      timer.timeout = setTimeout(() => {
        timers.delete(id);
        removeToast(id);
      }, timer.remaining);
    }
  });
}

// Set up visibility change listener once
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseAllTimers();
    } else {
      resumeAllTimers();
    }
  });
}

// ============================================
// Public Toast API
// ============================================
export const toast = {
  success: (message: string, action?: ToastData['action'], duration?: number) =>
    addToast('success', message, action, duration),
  info: (message: string, action?: ToastData['action'], duration?: number) =>
    addToast('info', message, action, duration),
  dismiss: (id: string) => removeToast(id),
};

// ============================================
// Hook API (for convenience)
// ============================================
export function useToast() {
  return toast;
}

// ============================================
// Toast Component
// ============================================
function ToastItem({
  data,
  onRemove,
}: {
  data: ToastData;
  onRemove: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [removing, setRemoving] = useState(false);
  const toastRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    startX: number;
    currentX: number;
    startTime: number;
  } | null>(null);

  useEffect(() => {
    // Trigger enter animation on next frame
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const handleRemove = useCallback(() => {
    setRemoving(true);
    setTimeout(() => onRemove(data.id), 200);
  }, [data.id, onRemove]);

  // Swipe-to-dismiss handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = toastRef.current;
    if (!el) return;

    el.setPointerCapture(e.pointerId);
    dragState.current = {
      startX: e.clientX,
      currentX: 0,
      startTime: Date.now(),
    };
    el.style.transition = 'none';
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current || !toastRef.current) return;

    const deltaX = e.clientX - dragState.current.startX;
    dragState.current.currentX = deltaX;
    toastRef.current.style.transform = `translateX(${deltaX}px)`;
    toastRef.current.style.opacity = `${1 - Math.abs(deltaX) / 200}`;
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current || !toastRef.current) return;

      const el = toastRef.current;
      el.releasePointerCapture(e.pointerId);
      el.style.transition = '';

      const deltaX = dragState.current.currentX;
      const elapsed = Date.now() - dragState.current.startTime;
      const velocity = Math.abs(deltaX) / elapsed;

      // Dismiss if velocity is high or dragged far enough
      if (velocity > 0.5 || Math.abs(deltaX) > 100) {
        const direction = deltaX > 0 ? 1 : -1;
        el.style.transform = `translateX(${direction * 300}px)`;
        el.style.opacity = '0';
        handleRemove();
      } else {
        // Snap back
        el.style.transform = '';
        el.style.opacity = '';
      }

      dragState.current = null;
    },
    [handleRemove]
  );

  const handleActionClick = useCallback(() => {
    if (data.action) {
      data.action.onClick();
      handleRemove();
    }
  }, [data.action, handleRemove]);

  return (
    <div
      ref={toastRef}
      className={styles.toast}
      data-mounted={mounted}
      data-removing={removing}
      role="alert"
      aria-live="polite"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {data.type === 'success' && (
        <div className={styles.iconSuccess}>
          <Check size={14} />
        </div>
      )}
      <span className={styles.message}>{data.message}</span>
      {data.action && (
        <button className={styles.action} onClick={handleActionClick}>
          <Undo2 size={14} />
          {data.action.label}
        </button>
      )}
    </div>
  );
}

// ============================================
// Toaster Container
// ============================================
export function Toaster() {
  const [toastList, setToastList] = useState<ToastData[]>([]);

  useEffect(() => {
    const handleChange = (newToasts: ToastData[]) => {
      setToastList(newToasts);
    };
    subscribers.add(handleChange);
    setToastList([...toasts]);

    return () => {
      subscribers.delete(handleChange);
    };
  }, []);

  const handleRemove = useCallback((id: string) => {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer.timeout);
      timers.delete(id);
    }
    removeToast(id);
  }, []);

  if (toastList.length === 0) return null;

  return (
    <div className={styles.container}>
      {toastList.map((t) => (
        <ToastItem key={t.id} data={t} onRemove={handleRemove} />
      ))}
    </div>
  );
}
