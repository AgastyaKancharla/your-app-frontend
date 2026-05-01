import { useSyncExternalStore } from "react";

const INVENTORY_STORE_STORAGE_KEY = "cloud_kitchen_inventory_rows_v1";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getRowId = (row = {}) => String(row._id || row.id || row.name || "").trim();

const normalizeRow = (row = {}) => ({
  ...row,
  _id: getRowId(row),
  stock: Math.max(0, toNumber(row.stock ?? row.quantity ?? row.qty, 0))
});

const readRows = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(INVENTORY_STORE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeRow) : [];
  } catch {
    return [];
  }
};

const writeRows = (rows = []) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(INVENTORY_STORE_STORAGE_KEY, JSON.stringify(rows));
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

    if (Array.isArray(state.rows)) {
      writeRows(state.rows);
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

export const useInventoryStore = createStore((set) => ({
  rows: readRows(),

  setRows: (rows) =>
    set({
      rows: Array.isArray(rows) ? rows.map(normalizeRow) : []
    }),

  reduceStock: (itemId, quantity = 1) =>
    set((state) => {
      const targetId = String(itemId || "").trim();
      if (!targetId) {
        return {};
      }

      return {
        rows: state.rows.map((row) => {
          const rowId = getRowId(row);
          const rowName = String(row.name || "").trim();
          if (rowId !== targetId && rowName !== targetId) {
            return row;
          }

          return {
            ...row,
            stock: Math.max(0, toNumber(row.stock) - Math.max(0, toNumber(quantity, 1)))
          };
        })
      };
    })
}));
