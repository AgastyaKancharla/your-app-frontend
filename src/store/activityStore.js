import { useSyncExternalStore } from "react";

const ACTIVITY_STORAGE_KEY = "wevalue_activity_logs_v1";
const MAX_LOGS = 300;

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `activity-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const readLogs = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLogs = (logs = []) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
};

const createStore = (initializer) => {
  let state;
  const listeners = new Set();

  const set = (updater) => {
    const partial = typeof updater === "function" ? updater(state) : updater;
    state = {
      ...state,
      ...(partial || {})
    };

    if (partial?.logs) {
      writeLogs(state.logs);
    }

    listeners.forEach((listener) => listener());
  };

  const get = () => state;
  state = initializer(set, get);

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const useStore = (selector = (nextState) => nextState) =>
    useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state)
    );

  useStore.getState = get;
  useStore.setState = set;

  return useStore;
};

export const useActivityStore = createStore((set) => ({
  logs: readLogs(),

  addLog: (log) =>
    set((state) => ({
      logs: [
        {
          id: log.id || createId(),
          userId: log.userId || "",
          userName: log.userName || "System",
          action: log.action || "",
          module: log.module || "",
          metadata: log.metadata || {},
          timestamp: log.timestamp || new Date().toISOString()
        },
        ...state.logs
      ].slice(0, MAX_LOGS)
    })),

  clearLogs: () => set({ logs: [] })
}));

export const addActivityLog = (log) => useActivityStore.getState().addLog(log);
