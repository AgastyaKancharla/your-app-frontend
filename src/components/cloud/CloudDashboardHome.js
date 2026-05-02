import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { io } from "socket.io-client";

import { normalizeOrderStatus } from "../../access";
import API_URL from "../../config/api";
import { useAuthStore } from "../../store/authStore";
import { useOrderStore } from "../../store/orderStore";
import { cloudKitchenTheme } from "../../theme";
import { hasPermission } from "../../utils/permissionEngine";
import AIInsights from "../command-center/AIInsights";
import AlertsPanel from "../command-center/AlertsPanel";
import CommandCenterLayout from "../command-center/CommandCenterLayout";
import CommandStrip from "../command-center/CommandStrip";
import InventoryAlerts from "../command-center/InventoryAlerts";
import LiveOrderBoard from "../command-center/LiveOrderBoard";
import PerformancePanel from "../command-center/PerformancePanel";
import QuickActions from "../command-center/QuickActions";
import ThroughputChart from "../command-center/ThroughputChart";
import WastagePanel from "../command-center/WastagePanel";
import DashboardSkeleton from "./DashboardSkeleton";
import ToastStack from "./ToastStack";

const socketOrigin = API_URL;

const ACTIVE_ORDER_STATUSES = new Set(["NEW", "PREPARING", "READY"]);
const DEFAULT_DELAY_THRESHOLD_MINUTES = 15;

const buildRangeParams = (dateRange) => {
  if (dateRange?.key === "custom") {
    return {
      range: "custom",
      from: dateRange.from,
      to: dateRange.to
    };
  }

  return {
    range: dateRange?.key || "today"
  };
};

const average = (values = []) => {
  if (!Array.isArray(values) || !values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
};

const calculateKitchenLoad = ({ activeOrders = 0, delayedOrders = 0, avgPrepTime = 0 } = {}) => {
  const queueScore = Math.min(100, (Number(activeOrders || 0) / 12) * 100);
  const delayedScore = Math.min(36, Number(delayedOrders || 0) * 12);
  const prepScore =
    Number(avgPrepTime || 0) >= 28
      ? 18
      : Number(avgPrepTime || 0) >= 20
        ? 12
        : Number(avgPrepTime || 0) >= 14
          ? 6
          : 0;

  return Math.round(Math.min(100, queueScore * 0.65 + delayedScore + prepScore));
};

const formatKitchenLoadLabel = (value = 0) => {
  const numeric = Number(value || 0);
  if (numeric >= 85) {
    return "Critical";
  }
  if (numeric >= 65) {
    return "High";
  }
  if (numeric >= 40) {
    return "Moderate";
  }
  return "Stable";
};

const formatRunway = (daysToEmpty) => {
  const numeric = Number(daysToEmpty);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "running low";
  }

  const hours = numeric * 24;
  if (hours < 1) {
    return "< 1 hour left";
  }
  if (hours < 24) {
    return `${Math.ceil(hours)} hr left`;
  }
  return `${Math.ceil(numeric)} day left`;
};

const getOrderAgeMinutes = (order, now = Date.now()) => {
  const createdAt = new Date(order?.createdAt || now).getTime();
  if (!Number.isFinite(createdAt)) {
    return 0;
  }

  return Math.max(0, (now - createdAt) / 60000);
};

const normalizeLiveOrder = (order = {}) => ({
  ...order,
  _id: String(order._id || order.id || order.orderId || ""),
  invoiceNumber: order.invoiceNumber || order.orderId || order._id || order.id || "",
  status: normalizeOrderStatus(order.status, "NEW"),
  totalAmount: Number(order.totalAmount || order.grandTotal || order.total || 0),
  customerName: order.customerName || order.customer?.name || "Walk-in",
  orderChannel: order.orderChannel || order.serviceType || "DIRECT",
  createdAt: order.createdAt || new Date().toISOString(),
  items: Array.isArray(order.items)
    ? order.items.map((item) => ({
        name: item.displayName || item.name || "Item",
        quantity: Number(item.quantity ?? item.qty ?? 0)
      }))
    : []
});

const isActiveOrder = (order) => ACTIVE_ORDER_STATUSES.has(normalizeOrderStatus(order?.status, ""));

const sortOrders = (orders = []) => {
  const statusPriority = {
    READY: 0,
    PREPARING: 1,
    NEW: 2
  };

  return [...orders].sort((left, right) => {
    const leftStatus = normalizeOrderStatus(left.status, "NEW");
    const rightStatus = normalizeOrderStatus(right.status, "NEW");
    const leftPriority = statusPriority[leftStatus] ?? 99;
    const rightPriority = statusPriority[rightStatus] ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
  });
};

const getToastMessageForStatus = (status) => {
  if (status === "PREPARING") {
    return "Order accepted";
  }
  if (status === "READY") {
    return "Order marked ready";
  }
  if (status === "DISPATCHED") {
    return "Order dispatched";
  }
  return "Order updated";
};

const buildActionDescription = (count, emptyLabel, activeLabel) => {
  if (!count) {
    return emptyLabel;
  }

  return `${count} ${activeLabel}`;
};

const toSeverity = (value = "info") => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "danger" || normalized === "critical" || normalized === "error") {
    return "critical";
  }
  if (normalized === "warning" || normalized === "warn") {
    return "warning";
  }
  if (normalized === "success" || normalized === "ok") {
    return "success";
  }
  return "info";
};

const deriveStockSeverity = (item = {}) => {
  const daysToEmpty = Number(item.daysToEmpty);
  const quantity = Number(item.quantity || 0);

  if (quantity <= 0 || (Number.isFinite(daysToEmpty) && daysToEmpty <= 1)) {
    return "critical";
  }
  if (Number.isFinite(daysToEmpty) && daysToEmpty <= 2) {
    return "warning";
  }
  return "info";
};

const formatSeriesTrend = (series = []) => {
  if (!Array.isArray(series) || series.length < 2) {
    return "";
  }

  const latest = Number(series[series.length - 1]?.orders || 0);
  const previous = Number(series[series.length - 2]?.orders || 0);
  const delta = latest - previous;

  if (delta > 0) {
    return `+${delta} throughput vs previous`;
  }
  if (delta < 0) {
    return `${delta} throughput vs previous`;
  }
  return "Throughput unchanged";
};

export default function CloudDashboardHome({
  tenantId,
  dateRange,
  onDateRangeChange,
  onNavigate,
  onNotificationCountChange,
  allowedPages = [],
  userRole = ""
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [throughput, setThroughput] = useState([]);
  const [wastage, setWastage] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [insights, setInsights] = useState([]);
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [lastUpdatedAt, setLastUpdatedAt] = useState(Date.now());
  const authUser = useAuthStore((state) => state.user);
  const rolePermissions = useAuthStore((state) => state.rolePermissions);
  const sharedOrders = useOrderStore((state) => state.orders);
  const [highlightedOrderIds, setHighlightedOrderIds] = useState({});
  const [toasts, setToasts] = useState([]);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState("");
  const [menuLoading, setMenuLoading] = useState(false);
  const [pausingItem, setPausingItem] = useState(false);

  const loadRequestRef = useRef(0);
  const refreshTimeoutRef = useRef(null);
  const liveOrdersRef = useRef([]);
  const metricsRef = useRef(null);
  const toastTimeoutsRef = useRef({});
  const highlightTimeoutsRef = useRef({});

  useEffect(() => {
    liveOrdersRef.current = liveOrders;
  }, [liveOrders]);

  useEffect(() => {
    console.log("Orders:", sharedOrders);
  }, [sharedOrders]);

  useEffect(() => {
    const sharedActiveOrders = sharedOrders.map(normalizeLiveOrder).filter(isActiveOrder);
    if (!sharedActiveOrders.length) {
      return;
    }

    setLiveOrders((current) => {
      const merged = new Map(current.map((order) => [order._id, order]));
      sharedActiveOrders.forEach((order) => merged.set(order._id, order));
      return sortOrders([...merged.values()]);
    });
  }, [sharedOrders]);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const toastTimeouts = toastTimeoutsRef.current;
    const highlightTimeouts = highlightTimeoutsRef.current;

    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      Object.values(toastTimeouts).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      Object.values(highlightTimeouts).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  const pushToast = useCallback((message, tone = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, tone }]);

    toastTimeoutsRef.current[id] = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      delete toastTimeoutsRef.current[id];
    }, 2400);
  }, []);

  const highlightOrder = useCallback((orderId) => {
    if (!orderId) {
      return;
    }

    setHighlightedOrderIds((prev) => ({
      ...prev,
      [orderId]: true
    }));

    if (highlightTimeoutsRef.current[orderId]) {
      window.clearTimeout(highlightTimeoutsRef.current[orderId]);
    }

    highlightTimeoutsRef.current[orderId] = window.setTimeout(() => {
      setHighlightedOrderIds((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      delete highlightTimeoutsRef.current[orderId];
    }, 2200);
  }, []);

  const loadDashboard = useCallback(
    async ({ background = false } = {}) => {
      const requestId = loadRequestRef.current + 1;
      loadRequestRef.current = requestId;

      const hasExistingData = Boolean(metricsRef.current) || liveOrdersRef.current.length > 0;

      if (background || hasExistingData) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const params = buildRangeParams(dateRange);
        const results = await Promise.allSettled([
          axios.get(`${API_URL}/api/dashboard/metrics`, { params }),
          axios.get(`${API_URL}/api/reports/sales`, { params }),
          axios.get(`${API_URL}/api/reports/wastage`, { params }),
          axios.get(`${API_URL}/api/orders/active`),
          axios.get(`${API_URL}/api/inventory/overview`),
          axios.get(`${API_URL}/api/insights`)
        ]);

        if (loadRequestRef.current !== requestId) {
          return;
        }

        const [metricsResult, throughputResult, wastageResult, ordersResult, inventoryResult, insightsResult] =
          results;

        const criticalErrors = [metricsResult, ordersResult]
          .filter((result) => result.status === "rejected")
          .map((result) => result.reason?.response?.data?.message || "Unable to load dashboard data")
          .filter(Boolean);

        setError(criticalErrors[0] || "");

        if (metricsResult.status === "fulfilled") {
          setMetrics(metricsResult.value.data || null);
        }

        if (throughputResult.status === "fulfilled") {
          setThroughput(
            Array.isArray(throughputResult.value.data?.series)
              ? throughputResult.value.data.series
              : []
          );
        }

        if (wastageResult.status === "fulfilled") {
          setWastage(
            Array.isArray(wastageResult.value.data?.series)
              ? wastageResult.value.data.series
              : []
          );
        }

        if (ordersResult.status === "fulfilled") {
          const nextOrders = Array.isArray(ordersResult.value.data)
            ? ordersResult.value.data.map(normalizeLiveOrder).filter(isActiveOrder)
            : [];
          setLiveOrders(sortOrders(nextOrders));
        }

        if (inventoryResult.status === "fulfilled") {
          setLowStockItems(
            Array.isArray(inventoryResult.value.data?.lowStock)
              ? inventoryResult.value.data.lowStock
              : []
          );
        }

        if (insightsResult.status === "fulfilled") {
          setInsights(Array.isArray(insightsResult.value.data) ? insightsResult.value.data : []);
        }

        setLastUpdatedAt(Date.now());
      } catch (err) {
        if (loadRequestRef.current === requestId) {
          setError(err.response?.data?.message || "Unable to load cloud dashboard");
        }
      } finally {
        if (loadRequestRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [dateRange]
  );

  const scheduleBackgroundRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = window.setTimeout(() => {
      loadDashboard({ background: true });
    }, 320);
  }, [loadDashboard]);

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    loadDashboard();
  }, [loadDashboard, tenantId]);

  const updateUI = useCallback(
    (payload) => {
      const nextOrder = normalizeLiveOrder(payload);
      const exists = liveOrdersRef.current.some((order) => order._id === nextOrder._id);

      setLiveOrders((prev) => {
        const withoutCurrent = prev.filter((order) => order._id !== nextOrder._id);
        const nextOrders = isActiveOrder(nextOrder)
          ? sortOrders([...withoutCurrent, nextOrder])
          : sortOrders(withoutCurrent);
        return nextOrders;
      });

      if (isActiveOrder(nextOrder)) {
        highlightOrder(nextOrder._id);
      }

      if (!exists && normalizeOrderStatus(nextOrder.status, "NEW") === "NEW") {
        pushToast(
          `New order #${String(nextOrder.invoiceNumber || nextOrder._id).slice(-6).toUpperCase()} received`
        );
      }

      setLastUpdatedAt(Date.now());
      scheduleBackgroundRefresh();
    },
    [highlightOrder, pushToast, scheduleBackgroundRefresh]
  );

  useEffect(() => {
    if (!tenantId || !socketOrigin) {
      return undefined;
    }

    const socket = io(`${socketOrigin}/orders`, {
      transports: ["websocket"],
      auth: {
        tenantId
      }
    });

    socket.on("order:new", updateUI);
    socket.on("order:update", updateUI);
    socket.on("inventory:update", scheduleBackgroundRefresh);

    return () => {
      socket.off("order:new", updateUI);
      socket.off("order:update", updateUI);
      socket.off("inventory:update", scheduleBackgroundRefresh);
      socket.disconnect();
    };
  }, [scheduleBackgroundRefresh, tenantId, updateUI]);

  const canCreateOrders = allowedPages.includes("POS");
  const canViewOrderManagement = allowedPages.includes("ORDER_MANAGEMENT");
  const canViewInventory = allowedPages.includes("INVENTORY");
  const canManageMenu = allowedPages.includes("MENU_MANAGEMENT");
  const canOperateKitchen = hasPermission(
    authUser || { role: userRole },
    "orders.update",
    rolePermissions
  );
  const delayThresholdMinutes = Number(metrics?.delayThresholdMinutes || DEFAULT_DELAY_THRESHOLD_MINUTES);

  const queueSnapshot = useMemo(() => {
    const activeOrders = liveOrders.length;
    const orderAges = liveOrders.map((order) => getOrderAgeMinutes(order, clock));
    const delayedOrders = orderAges.filter((minutes) => minutes >= delayThresholdMinutes).length;
    const avgPrepTimeMinutes = Number(
      (orderAges.length ? average(orderAges) : Number(metrics?.avgPrepTimeMinutes || 0)).toFixed(1)
    );
    const kitchenLoad = calculateKitchenLoad({
      activeOrders,
      delayedOrders,
      avgPrepTime: avgPrepTimeMinutes
    });

    return {
      activeOrders,
      delayedOrders,
      avgPrepTimeMinutes,
      kitchenLoad,
      kitchenLoadLabel: formatKitchenLoadLabel(kitchenLoad),
      lowStockCount: lowStockItems.length || Number(metrics?.lowStockCount || 0),
      rejectedOrders: Number(metrics?.rejectedOrders || 0),
      delayThresholdMinutes
    };
  }, [clock, delayThresholdMinutes, liveOrders, lowStockItems.length, metrics?.avgPrepTimeMinutes, metrics?.lowStockCount, metrics?.rejectedOrders]);

  const queuedOrdersByStatus = useMemo(() => {
    return liveOrders.reduce(
      (acc, order) => {
        const status = normalizeOrderStatus(order.status, "NEW");
        acc[status] = [...(acc[status] || []), order];
        return acc;
      },
      { NEW: [], PREPARING: [], READY: [], DISPATCHED: [] }
    );
  }, [liveOrders]);

  const topAlerts = useMemo(() => {
    const seen = new Set();
    const alerts = [];

    const pushAlert = (alert) => {
      if (!alert?.message || seen.has(alert.message)) {
        return;
      }
      seen.add(alert.message);
      alerts.push(alert);
    };

    if (queueSnapshot.delayedOrders > 0) {
      pushAlert({
        id: "delayed-orders",
        severity: "critical",
        message: `${queueSnapshot.delayedOrders} delayed order${queueSnapshot.delayedOrders === 1 ? "" : "s"} need attention`,
        context: `Orders beyond ${queueSnapshot.delayThresholdMinutes} min SLA`,
        ctaKey: "orders"
      });
    }

    lowStockItems.slice(0, 2).forEach((item) => {
      pushAlert({
        id: `stock-${item._id || item.name}`,
        severity: deriveStockSeverity(item),
        message: `${item.name} stock low (${formatRunway(item.daysToEmpty)})`,
        context: `${Number(item.quantity || 0).toLocaleString("en-IN")} ${item.unit || "units"} left`,
        ctaKey: "inventory"
      });
    });

    (metrics?.operationalAlerts || []).forEach((alert, index) => {
      pushAlert({
        id: `metric-alert-${index}`,
        severity: toSeverity(alert.type),
        message: alert.message,
        context: alert.context || ""
      });
    });

    insights.slice(0, 2).forEach((insight, index) => {
      pushAlert({
        id: `insight-${index}`,
        severity: toSeverity(insight.type),
        message: insight.message
      });
    });

    return alerts.slice(0, 4);
  }, [
    insights,
    lowStockItems,
    metrics?.operationalAlerts,
    queueSnapshot.delayThresholdMinutes,
    queueSnapshot.delayedOrders
  ]);

  useEffect(() => {
    onNotificationCountChange?.(
      Math.min(99, queueSnapshot.delayedOrders + queueSnapshot.lowStockCount + topAlerts.length)
    );
  }, [onNotificationCountChange, queueSnapshot.delayedOrders, queueSnapshot.lowStockCount, topAlerts.length]);

  const updateOrderStatus = useCallback(
    async (order, nextStatus) => {
      if (!order?._id || !nextStatus) {
        return;
      }

      try {
        setUpdatingOrderId(order._id);
        setLiveOrders((prev) => {
          const nextOrders = prev
            .map((item) =>
              item._id === order._id
                ? {
                    ...item,
                    status: nextStatus
                  }
                : item
            )
            .filter(isActiveOrder);
          return sortOrders(nextOrders);
        });

        await axios.put(`${API_URL}/api/orders/${order._id}/status`, { status: nextStatus });
        pushToast(getToastMessageForStatus(nextStatus));
        scheduleBackgroundRefresh();
      } catch (err) {
        console.error(err);
        pushToast(err.response?.data?.message || "Unable to update order", "danger");
        loadDashboard({ background: true });
      } finally {
        setUpdatingOrderId("");
      }
    },
    [loadDashboard, pushToast, scheduleBackgroundRefresh]
  );

  const openPauseModal = useCallback(async () => {
    if (!canManageMenu) {
      return;
    }

    try {
      setMenuLoading(true);
      if (!menuItems.length) {
        const response = await axios.get(`${API_URL}/api/menu`);
        const nextItems = Array.isArray(response.data) ? response.data : [];
        setMenuItems(nextItems);
        const firstAvailable = nextItems.find((item) => item.isAvailable !== false);
        setSelectedMenuItemId(firstAvailable?._id || "");
      }
      setIsPauseModalOpen(true);
    } catch (err) {
      console.error(err);
      pushToast(err.response?.data?.message || "Unable to load menu items", "danger");
    } finally {
      setMenuLoading(false);
    }
  }, [canManageMenu, menuItems.length, pushToast]);

  const pauseSelectedItem = useCallback(async () => {
    const selectedItem = menuItems.find((item) => item._id === selectedMenuItemId);
    if (!selectedItem) {
      return;
    }

    try {
      setPausingItem(true);
      await axios.put(`${API_URL}/api/menu/${selectedItem._id}`, {
        ...selectedItem,
        isAvailable: false
      });
      setMenuItems((prev) =>
        prev.map((item) =>
          item._id === selectedItem._id
            ? {
                ...item,
                isAvailable: false
              }
            : item
        )
      );
      setIsPauseModalOpen(false);
      pushToast(`${selectedItem.name} paused`, "warning");
    } catch (err) {
      console.error(err);
      pushToast(err.response?.data?.message || "Unable to pause item", "danger");
    } finally {
      setPausingItem(false);
    }
  }, [menuItems, pushToast, selectedMenuItemId]);

  const handleQuickAction = useCallback(
    async (actionKey) => {
      if (actionKey === "add-order") {
        onNavigate?.("POS");
        return;
      }

      if (actionKey === "view-order-management") {
        onNavigate?.("ORDER_MANAGEMENT");
        return;
      }

      if (actionKey === "pause-item") {
        openPauseModal();
        return;
      }

      const actionOrder =
        actionKey === "accept-order"
          ? queuedOrdersByStatus.NEW[0]
          : actionKey === "mark-ready"
            ? queuedOrdersByStatus.PREPARING[0]
            : queuedOrdersByStatus.READY[0];
      const nextStatus =
        actionKey === "accept-order"
          ? "PREPARING"
          : actionKey === "mark-ready"
            ? "READY"
            : "DISPATCHED";

      if (actionOrder) {
        await updateOrderStatus(actionOrder, nextStatus);
      }
    },
    [onNavigate, openPauseModal, queuedOrdersByStatus.NEW, queuedOrdersByStatus.PREPARING, queuedOrdersByStatus.READY, updateOrderStatus]
  );

  const quickActions = useMemo(() => {
    const pausedItems = menuItems.filter((item) => item.isAvailable === false).length;

    return [
      {
        key: "accept-order",
        icon: "AC",
        label: "Accept Order",
        badge: queuedOrdersByStatus.NEW.length ? `${queuedOrdersByStatus.NEW.length}` : "",
        description: buildActionDescription(
          queuedOrdersByStatus.NEW.length,
          "No new orders waiting",
          "new orders waiting"
        ),
        status: queuedOrdersByStatus.NEW.length ? "info" : "success",
        disabled: !canOperateKitchen || queuedOrdersByStatus.NEW.length === 0
      },
      {
        key: "mark-ready",
        icon: "PR",
        label: "Mark Ready",
        badge: queuedOrdersByStatus.PREPARING.length ? `${queuedOrdersByStatus.PREPARING.length}` : "",
        description: buildActionDescription(
          queuedOrdersByStatus.PREPARING.length,
          "No active prep tickets",
          "orders in prep"
        ),
        status: queuedOrdersByStatus.PREPARING.length ? "warning" : "success",
        disabled: !canOperateKitchen || queuedOrdersByStatus.PREPARING.length === 0
      },
      {
        key: "dispatch",
        icon: "DP",
        label: "Dispatch",
        badge: queuedOrdersByStatus.READY.length ? `${queuedOrdersByStatus.READY.length}` : "",
        description: buildActionDescription(
          queuedOrdersByStatus.READY.length,
          "No orders ready to hand off",
          "orders ready to dispatch"
        ),
        status: queuedOrdersByStatus.READY.length ? "success" : "info",
        disabled: !canOperateKitchen || queuedOrdersByStatus.READY.length === 0
      },
      {
        key: "pause-item",
        icon: "PA",
        label: "Pause Item",
        description: canManageMenu ? "Temporarily stop a menu item" : "Menu access required",
        disabled: !canManageMenu || menuLoading,
        status: queueSnapshot.lowStockCount > 0 ? "warning" : "info",
        isToggle: canManageMenu,
        toggled: pausedItems > 0,
        toggleOnLabel: "Paused",
        toggleOffLabel: "Live"
      },
      {
        key: "add-order",
        icon: "PO",
        label: "Add Order",
        description: canCreateOrders ? "Jump straight into POS" : "POS access required",
        status: "info",
        disabled: !canCreateOrders
      },
      {
        key: "view-order-management",
        icon: "OM",
        label: "Order Management",
        description: canViewOrderManagement ? "Open unified order dashboard" : "Order access required",
        status: "info",
        disabled: !canViewOrderManagement
      }
    ];
  }, [canCreateOrders, canManageMenu, canOperateKitchen, canViewOrderManagement, menuItems, menuLoading, queueSnapshot.lowStockCount, queuedOrdersByStatus.NEW.length, queuedOrdersByStatus.PREPARING.length, queuedOrdersByStatus.READY.length]);

  const alertsForPanel = useMemo(() => {
    return topAlerts.map((alert) => {
      const hasOrdersCta = alert.ctaKey === "orders" && canViewOrderManagement;
      const hasInventoryCta = alert.ctaKey === "inventory" && canViewInventory;

      return {
        ...alert,
        ctaLabel: hasOrdersCta
          ? "View Orders"
          : hasInventoryCta
            ? "Open Inventory"
            : "",
        onCta: hasOrdersCta
          ? () => onNavigate?.("ORDER_MANAGEMENT")
          : hasInventoryCta
            ? () => onNavigate?.("INVENTORY")
            : undefined
      };
    });
  }, [canViewInventory, canViewOrderManagement, onNavigate, topAlerts]);

  const throughputTrend = useMemo(() => formatSeriesTrend(throughput), [throughput]);
  const rangeLabel = metrics?.range?.label || "Today";

  const commandStripMetrics = useMemo(() => {
    return [
      {
        key: "total-orders",
        icon: "TO",
        label: "Total Orders",
        value: Number(metrics?.totalOrders || 0),
        formatter: (value) => Math.round(Number(value || 0)).toLocaleString("en-IN"),
        context: rangeLabel,
        trend: metrics?.avgOrderValue
          ? `Avg order ${new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0
            }).format(Number(metrics.avgOrderValue || 0))}`
          : "",
        trendStatus: "info",
        status: "info",
        onClick: canViewOrderManagement ? () => onNavigate?.("ORDER_MANAGEMENT") : undefined
      },
      {
        key: "total-revenue",
        icon: "TR",
        label: "Total Revenue",
        value: Number(metrics?.totalRevenue || 0),
        formatter: (value) =>
          new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
          }).format(Number(value || 0)),
        context: rangeLabel,
        trend: Number(metrics?.todayRevenue || 0)
          ? `Today ${new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0
            }).format(Number(metrics.todayRevenue || 0))}`
          : "",
        trendStatus: "success",
        status: "success"
      },
      {
        key: "active-orders",
        icon: "AQ",
        label: "Active Queue",
        value: queueSnapshot.activeOrders,
        formatter: (value) => Math.round(Number(value || 0)).toLocaleString("en-IN"),
        context: `${queuedOrdersByStatus.NEW.length} new | ${queuedOrdersByStatus.PREPARING.length} in prep`,
        trend: throughputTrend,
        trendStatus: throughputTrend.includes("-") ? "warning" : throughputTrend ? "success" : "info",
        status: queueSnapshot.activeOrders > 0 ? "info" : "success",
        onClick: canViewOrderManagement ? () => onNavigate?.("ORDER_MANAGEMENT") : undefined
      },
      {
        key: "delayed-orders",
        icon: "DL",
        label: "Delayed Orders",
        value: queueSnapshot.delayedOrders,
        formatter: (value) => Math.round(Number(value || 0)).toLocaleString("en-IN"),
        context: `Threshold ${queueSnapshot.delayThresholdMinutes} min`,
        trend: queueSnapshot.delayedOrders
          ? `${queueSnapshot.delayedOrders} need intervention`
          : "All active orders are on track",
        trendStatus: queueSnapshot.delayedOrders ? "critical" : "success",
        status: queueSnapshot.delayedOrders ? "critical" : "success",
        onClick: canViewOrderManagement ? () => onNavigate?.("ORDER_MANAGEMENT") : undefined
      },
      {
        key: "ready-handoff",
        icon: "RD",
        label: "Ready To Dispatch",
        value: queuedOrdersByStatus.READY.length,
        formatter: (value) => Math.round(Number(value || 0)).toLocaleString("en-IN"),
        context: queuedOrdersByStatus.READY.length
          ? "Orders waiting courier handoff"
          : "No ready orders pending",
        trend: queuedOrdersByStatus.READY.length
          ? `${queuedOrdersByStatus.READY.length} tickets at handoff`
          : "",
        trendStatus: queuedOrdersByStatus.READY.length ? "success" : "info",
        status: queuedOrdersByStatus.READY.length ? "success" : "info",
        onClick: canViewOrderManagement ? () => onNavigate?.("ORDER_MANAGEMENT") : undefined
      },
      {
        key: "low-stock",
        icon: "ST",
        label: "Low Stock Items",
        value: queueSnapshot.lowStockCount,
        formatter: (value) => Math.round(Number(value || 0)).toLocaleString("en-IN"),
        context: queueSnapshot.lowStockCount ? "Inventory attention required" : "No low-stock blockers",
        trend: queueSnapshot.lowStockCount ? `${queueSnapshot.lowStockCount} items nearing depletion` : "",
        trendStatus: queueSnapshot.lowStockCount ? "warning" : "success",
        status: queueSnapshot.lowStockCount ? "warning" : "success",
        onClick: canViewInventory ? () => onNavigate?.("INVENTORY") : undefined
      }
    ];
  }, [canViewInventory, canViewOrderManagement, metrics?.avgOrderValue, metrics?.todayRevenue, metrics?.totalOrders, metrics?.totalRevenue, onNavigate, queueSnapshot.activeOrders, queueSnapshot.delayThresholdMinutes, queueSnapshot.delayedOrders, queueSnapshot.lowStockCount, queuedOrdersByStatus.NEW.length, queuedOrdersByStatus.PREPARING.length, queuedOrdersByStatus.READY.length, rangeLabel, throughputTrend]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <ToastStack toasts={toasts} />

      <CommandCenterLayout
        commandStrip={
          <CommandStrip
            metrics={commandStripMetrics}
            lastUpdatedAt={lastUpdatedAt}
            refreshing={refreshing}
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />
        }
        quickActions={<QuickActions actions={quickActions} onAction={handleQuickAction} />}
        alertsPanel={<AlertsPanel alerts={alertsForPanel} />}
        liveOrderBoard={
          <>
            {error ? <div style={errorBanner}>{error}</div> : null}
            <LiveOrderBoard
              orders={liveOrders}
              now={clock}
              updatingOrderId={updatingOrderId}
              highlightedOrderIds={highlightedOrderIds}
              delayThresholdMinutes={delayThresholdMinutes}
              onAdvanceStatus={(order, nextStatus) => updateOrderStatus(order, nextStatus)}
            />
          </>
        }
        performancePanel={
          <PerformancePanel summary={queueSnapshot} rangeLabel={rangeLabel} />
        }
        inventoryAlerts={<InventoryAlerts items={lowStockItems} />}
        throughputChart={<ThroughputChart series={throughput} />}
        wastagePanel={<WastagePanel series={wastage} />}
        aiInsights={<AIInsights insights={insights} />}
      />

      <AnimatePresence>
        {isPauseModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={modalBackdrop}
            onClick={() => setIsPauseModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={modalCard}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={modalTitle}>Pause Menu Item</div>
              <div style={modalSubtitle}>
                Temporarily stop an item from being ordered while the kitchen catches up.
              </div>

              <div style={formGrid}>
                <select
                  value={selectedMenuItemId}
                  onChange={(event) => setSelectedMenuItemId(event.target.value)}
                  style={input}
                >
                  <option value="">Select item</option>
                  {menuItems
                    .filter((item) => item.isAvailable !== false)
                    .map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </div>

              <div style={modalActions}>
                <button
                  type="button"
                  style={secondaryButton}
                  onClick={() => setIsPauseModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={primaryButton}
                  onClick={pauseSelectedItem}
                  disabled={!selectedMenuItemId || pausingItem}
                >
                  {pausingItem ? "Pausing..." : "Pause Item"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

const errorBanner = {
  borderRadius: 16,
  padding: 14,
  border: "1px solid rgba(239,68,68,0.18)",
  background: cloudKitchenTheme.dangerSoft,
  color: "#991b1b",
  fontSize: 13,
  fontWeight: 600
};

const modalBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.16)",
  display: "grid",
  placeItems: "center",
  padding: 16,
  zIndex: 30
};

const modalCard = {
  width: "min(420px, 100%)",
  borderRadius: 22,
  background: "#FFFFFF",
  border: `1px solid ${cloudKitchenTheme.border}`,
  padding: 22,
  boxShadow: cloudKitchenTheme.shadow
};

const modalTitle = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 18,
  fontWeight: 800
};

const modalSubtitle = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 13,
  lineHeight: 1.5,
  marginTop: 6
};

const formGrid = {
  display: "grid",
  gap: 12,
  marginTop: 18
};

const input = {
  height: 46,
  borderRadius: 12,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  padding: "0 14px",
  color: cloudKitchenTheme.textPrimary
};

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 18
};

const secondaryButton = {
  height: 42,
  borderRadius: 12,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  padding: "0 14px",
  color: cloudKitchenTheme.textPrimary,
  fontWeight: 700,
  cursor: "pointer"
};

const primaryButton = {
  height: 42,
  borderRadius: 12,
  border: 0,
  background: cloudKitchenTheme.accent,
  padding: "0 14px",
  color: "#FFFFFF",
  fontWeight: 700,
  cursor: "pointer"
};
