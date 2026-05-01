import { useSyncExternalStore } from "react";
import { v4 as uuid } from "uuid";

const EXPENSE_STORE_STORAGE_KEY = "cloud_kitchen_expenses_v1";

const toAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const normalizeExpense = (expense = {}) => ({
  id: String(expense.id || uuid()),
  category: String(expense.category || "").trim(),
  amount: toAmount(expense.amount),
  date: expense.date || new Date().toISOString(),
  note: String(expense.note || ""),
  isRecurring: Boolean(expense.isRecurring)
});

const readStoredExpenses = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(EXPENSE_STORE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed.map(normalizeExpense) : [];
  } catch {
    return [];
  }
};

const writeStoredExpenses = (expenses = []) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(EXPENSE_STORE_STORAGE_KEY, JSON.stringify(expenses));
};

const create = (initializer) => {
  let state;
  const listeners = new Set();

  const set = (updater) => {
    const partial = typeof updater === "function" ? updater(state) : updater;
    state = {
      ...state,
      ...(partial || {})
    };

    if (Array.isArray(state.expenses)) {
      writeStoredExpenses(state.expenses);
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

export const useExpenseStore = create((set) => ({
  expenses: readStoredExpenses(),

  addExpense: (data) =>
    set((state) => ({
      expenses: [
        normalizeExpense({
          id: uuid(),
          category: data.category,
          amount: Number(data.amount),
          date: data.date || new Date(),
          note: data.note || "",
          isRecurring: data.isRecurring || false
        }),
        ...state.expenses
      ]
    })),

  removeExpense: (id) =>
    set((state) => ({
      expenses: state.expenses.filter((expense) => expense.id !== id)
    }))
}));
