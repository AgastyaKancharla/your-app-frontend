import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { normalizeIncomingOrder, normalizeOrderStatus } from "./orderActions";

const ORDER_STORE_STORAGE_KEY = "cloud_kitchen_orders_v1";

const OrderStoreContext = createContext(null);

const sortOrders = (orders = []) =>
  [...orders].sort(
    (left, right) =>
      new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
  );

const upsertOrderList = (orders = [], incomingOrder) => {
  const normalizedOrder = normalizeIncomingOrder(incomingOrder);
  const existingIndex = orders.findIndex(
    (order) => order.id === normalizedOrder.id || order.orderId === normalizedOrder.orderId
  );

  if (existingIndex === -1) {
    return sortOrders([normalizedOrder, ...orders]);
  }

  const nextOrders = [...orders];
  nextOrders[existingIndex] = {
    ...nextOrders[existingIndex],
    ...normalizedOrder
  };
  return sortOrders(nextOrders);
};

export function OrderStoreProvider({ children }) {
  const [orders, setOrdersState] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setHydrated(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(ORDER_STORE_STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }

      const parsedOrders = JSON.parse(raw);
      if (Array.isArray(parsedOrders)) {
        const normalized = parsedOrders.map(normalizeIncomingOrder);
        setOrdersState(sortOrders(normalized));
      }
    } catch {
      setOrdersState([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ORDER_STORE_STORAGE_KEY, JSON.stringify(orders));
  }, [orders, hydrated]);

  const setOrders = useCallback((nextOrders) => {
    setOrdersState(() => {
      const source = Array.isArray(nextOrders) ? nextOrders : [];
      const normalized = source.map(normalizeIncomingOrder);

      return sortOrders(
        normalized.filter(
          (order, index, current) =>
            current.findIndex(
              (candidate) => candidate.id === order.id || candidate.orderId === order.orderId
            ) === index
        )
      );
    });
  }, []);

  const addOrder = useCallback((order) => {
    setOrdersState((current) => upsertOrderList(current, order));
  }, []);

  const upsertOrder = useCallback((order) => {
    setOrdersState((current) => upsertOrderList(current, order));
  }, []);

  const updateOrderStatus = useCallback((id, status) => {
    const normalizedStatus = normalizeOrderStatus(status);

    setOrdersState((current) =>
      sortOrders(
        current.map((order) =>
          order.id === id || order.orderId === id
            ? {
                ...order,
                status: normalizedStatus
              }
            : order
        )
      )
    );
  }, []);

  const clearOrders = useCallback(() => {
    setOrdersState([]);
  }, []);

  const value = useMemo(
    () => ({
      orders,
      hydrated,
      setOrders,
      addOrder,
      upsertOrder,
      updateOrderStatus,
      clearOrders
    }),
    [addOrder, clearOrders, hydrated, orders, setOrders, upsertOrder, updateOrderStatus]
  );

  return <OrderStoreContext.Provider value={value}>{children}</OrderStoreContext.Provider>;
}

export const useOrderStore = (selector) => {
  const context = useContext(OrderStoreContext);
  if (!context) {
    throw new Error("useOrderStore must be used inside OrderStoreProvider.");
  }

  return typeof selector === "function" ? selector(context) : context;
};
