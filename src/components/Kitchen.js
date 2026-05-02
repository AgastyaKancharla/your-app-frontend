import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import API_URL from "../config/api";
import { useActivityStore } from "../store/activityStore";
import { useAuthStore } from "../store/authStore";
import { useOrderStore } from "../store/orderStore";
import { cloudKitchenTheme } from "../theme";
import { hasPermission } from "../utils/permissionEngine";
import {
  CLOUD_KITCHEN_STATUS_FLOW,
  STATUS_ACTIONS,
  connectOrdersSocket,
  formatCurrency,
  formatTimer,
  getPrepProgress,
  getStatusLabel,
  normalizeCloudOrderStatus
} from "./cloud/cloudKitchenUtils";

const ACTIVE_TENANT_STORAGE_KEY = "restaurant_crm_active_tenant_id";

const DEMO_ORDERS = [
  {
    _id: "demo-kot-new",
    __isDemo: true,
    invoiceNumber: "INV-DEMO-1001",
    status: "NEW",
    createdAt: new Date(Date.now() - 4 * 60000).toISOString(),
    expectedPrepTimeMinutes: 14,
    customerName: "Guest",
    paymentMode: "UPI",
    orderType: "DELIVERY",
    totalAmount: 598,
    items: [
      { name: "Paneer Tikka Rice Bowl", displayName: "Paneer Tikka Rice Bowl (Regular)", quantity: 1 },
      { name: "Cold Coffee", displayName: "Cold Coffee (Medium)", quantity: 1 }
    ],
    statusTimeline: [{ status: "NEW", changedAt: new Date(Date.now() - 4 * 60000).toISOString() }]
  },
  {
    _id: "demo-kot-preparing",
    __isDemo: true,
    invoiceNumber: "INV-DEMO-1002",
    status: "PREPARING",
    createdAt: new Date(Date.now() - 17 * 60000).toISOString(),
    expectedPrepTimeMinutes: 16,
    customerName: "Guest",
    paymentMode: "CARD",
    orderType: "TAKEAWAY",
    totalAmount: 463,
    items: [
      { name: "Butter Chicken Meal", displayName: "Butter Chicken Meal (Classic)", quantity: 1 },
      { name: "Butter Naan", quantity: 2 }
    ],
    statusTimeline: [
      { status: "NEW", changedAt: new Date(Date.now() - 17 * 60000).toISOString() },
      { status: "PREPARING", changedAt: new Date(Date.now() - 13 * 60000).toISOString() }
    ]
  },
  {
    _id: "demo-kot-ready",
    __isDemo: true,
    invoiceNumber: "INV-DEMO-1003",
    status: "READY",
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    readyAt: new Date(Date.now() - 2 * 60000).toISOString(),
    expectedPrepTimeMinutes: 12,
    customerName: "Guest",
    paymentMode: "CASH",
    orderType: "DELIVERY",
    totalAmount: 412,
    items: [{ name: "Smash Burger Combo", displayName: "Smash Burger Combo", quantity: 1 }],
    statusTimeline: [
      { status: "NEW", changedAt: new Date(Date.now() - 10 * 60000).toISOString() },
      { status: "PREPARING", changedAt: new Date(Date.now() - 8 * 60000).toISOString() },
      { status: "READY", changedAt: new Date(Date.now() - 2 * 60000).toISOString() }
    ]
  }
];

const statusPriority = CLOUD_KITCHEN_STATUS_FLOW.reduce((acc, status, index) => {
  acc[status] = index;
  return acc;
}, {});

const normalizeItems = (items = []) =>
  Array.isArray(items)
    ? items.map((item, index) => ({
        id: `${item?.menuItemId || item?.name || "item"}-${index}`,
        name: String(item?.displayName || item?.name || "Item").trim(),
        quantity: Math.max(1, Number(item?.quantity ?? item?.qty ?? 1)),
        variant: item?.variant?.name || item?.variantName || "",
        addOns: Array.isArray(item?.addOns)
          ? item.addOns
          : Array.isArray(item?.addons)
            ? item.addons
            : []
      }))
    : [];

const normalizeOrder = (order = {}) => ({
  ...order,
  _id: String(order._id || order.id || ""),
  invoiceNumber: order.invoiceNumber || order.orderId || order._id || order.id || "",
  status: normalizeCloudOrderStatus(order.status, "NEW"),
  createdAt: order.createdAt || new Date().toISOString(),
  readyAt: order.readyAt || "",
  completedAt: order.completedAt || "",
  expectedPrepTimeMinutes: Math.max(1, Number(order.expectedPrepTimeMinutes || 15)),
  totalAmount: Number(order.totalAmount || order.grandTotal || order.total || 0),
  paymentMode: String(order.paymentMode || order.paymentMethod || "CASH").toUpperCase(),
  orderType: String(order.orderType || order.serviceType || "DELIVERY").toUpperCase(),
  customerName: order.customerName || order.customer?.name || "Guest",
  items: normalizeItems(order.items),
  statusTimeline: Array.isArray(order.statusTimeline)
    ? order.statusTimeline.map((entry) => ({
        ...entry,
        status: normalizeCloudOrderStatus(entry?.status, "NEW"),
        changedAt: entry?.changedAt || order.createdAt || new Date().toISOString()
      }))
    : []
});

const sortOrders = (orders = []) =>
  [...orders].sort((left, right) => {
    const leftStatus = statusPriority[normalizeCloudOrderStatus(left.status, "NEW")] ?? 99;
    const rightStatus = statusPriority[normalizeCloudOrderStatus(right.status, "NEW")] ?? 99;

    if (leftStatus !== rightStatus) {
      return leftStatus - rightStatus;
    }

    return new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
  });

const formatOrderId = (order = {}) =>
  String(order.invoiceNumber || order._id || "ORDER").slice(-8).toUpperCase();

const getAgeLabel = (order, now) => {
  const createdAt = new Date(order.createdAt || now).getTime();
  const elapsedMinutes = Math.max(0, (now - createdAt) / 60000);
  return formatTimer(elapsedMinutes);
};

const getTimeline = (order = {}) => {
  const timeline = Array.isArray(order.statusTimeline) ? order.statusTimeline : [];

  if (timeline.length) {
    return [...timeline].sort(
      (left, right) =>
        new Date(left.changedAt || 0).getTime() - new Date(right.changedAt || 0).getTime()
    );
  }

  return [
    {
      status: order.status || "NEW",
      changedAt: order.createdAt || new Date().toISOString()
    }
  ];
};

const getCompletedAt = (order = {}, now = Date.now()) => {
  const status = normalizeCloudOrderStatus(order.status, "NEW");
  if (!["READY", "DISPATCHED"].includes(status)) {
    return now;
  }

  const timestamp = new Date(order.readyAt || order.completedAt || now).getTime();
  return Number.isFinite(timestamp) ? timestamp : now;
};

function useIsNarrow() {
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1180 : false
  );

  useEffect(() => {
    const sync = () => {
      setIsNarrow(window.innerWidth < 1180);
    };

    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return isNarrow;
}

export default function Kitchen() {
  const isNarrow = useIsNarrow();
  const {
    orders,
    setOrders,
    upsertOrder,
    updateOrderStatus
  } = useOrderStore();
  const [loading, setLoading] = useState(true);
  const [apiMessage, setApiMessage] = useState("");
  const [error, setError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const user = useAuthStore((state) => state.user);
  const rolePermissions = useAuthStore((state) => state.rolePermissions);
  const addLog = useActivityStore((state) => state.addLog);
  const canUpdateOrders = hasPermission(user, "orders.update", rolePermissions);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    console.log("Orders:", orders);
  }, [orders]);

  const kitchenOrders = useMemo(() => {
    const sourceOrders = orders.length ? orders : DEMO_ORDERS;
    return sortOrders(
      sourceOrders.map(normalizeOrder).filter((order) => order.status !== "CANCELLED")
    );
  }, [orders]);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/orders`, {
        params: {
          businessType: "CLOUD_KITCHEN"
        }
      });
      const nextOrders = Array.isArray(response.data)
        ? response.data.map(normalizeOrder).filter((order) => order.status !== "CANCELLED")
        : [];

      if (nextOrders.length) {
        setOrders(nextOrders);
        setApiMessage("");
      } else {
        setOrders(DEMO_ORDERS);
        setApiMessage("Sample KOT data is shown because the API returned no orders.");
      }
      setError("");
    } catch (requestError) {
      setOrders(DEMO_ORDERS);
      setApiMessage(
        requestError.response?.data?.message || "Sample KOT data is shown while the API is unavailable."
      );
    } finally {
      setLoading(false);
    }
  }, [setOrders]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const tenantId = window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY) || "";
    const socket = connectOrdersSocket(tenantId);

    if (!socket) {
      return undefined;
    }

    const handleSocketOrder = (payload) => {
      const nextOrder = normalizeOrder(payload);
      if (nextOrder.status === "CANCELLED") {
        setOrders(orders.filter((order) => normalizeOrder(order)._id !== nextOrder._id));
        return;
      }

      upsertOrder(nextOrder);
      setSelectedOrderId((current) => current || nextOrder._id);
    };

    socket.on("order:new", handleSocketOrder);
    socket.on("order:update", handleSocketOrder);

    return () => {
      socket.off("order:new", handleSocketOrder);
      socket.off("order:update", handleSocketOrder);
      socket.disconnect();
    };
  }, [orders, setOrders, upsertOrder]);

  useEffect(() => {
    if (selectedOrderId && kitchenOrders.some((order) => order._id === selectedOrderId)) {
      return;
    }

    const firstActive =
      kitchenOrders.find((order) => normalizeCloudOrderStatus(order.status) !== "DISPATCHED") || kitchenOrders[0];
    setSelectedOrderId(firstActive?._id || "");
  }, [kitchenOrders, selectedOrderId]);

  const columns = useMemo(() => {
    return CLOUD_KITCHEN_STATUS_FLOW.reduce((acc, status) => {
      acc[status] = sortOrders(
        kitchenOrders.filter((order) => normalizeCloudOrderStatus(order.status, "NEW") === status)
      );
      return acc;
    }, {});
  }, [kitchenOrders]);

  const selectedOrder = useMemo(
    () => kitchenOrders.find((order) => order._id === selectedOrderId) || null,
    [kitchenOrders, selectedOrderId]
  );

  const metrics = useMemo(() => {
    const activeOrders = kitchenOrders.filter(
      (order) => !["DISPATCHED", "CANCELLED"].includes(normalizeCloudOrderStatus(order.status))
    );
    const delayedOrders = activeOrders.filter((order) => getPrepProgress(order, now).delayed);
    const prepSamples = kitchenOrders.length ? kitchenOrders : activeOrders;
    const prepMinutes = prepSamples.map((order) => {
      const start = new Date(order.createdAt || now).getTime();
      const end = getCompletedAt(order, now);
      return Math.max(0, (end - start) / 60000);
    });
    const avgPrepTime = prepMinutes.length
      ? prepMinutes.reduce((sum, value) => sum + value, 0) / prepMinutes.length
      : 0;
    const onTimeOrders = prepSamples.filter((order) => {
      const progress = getPrepProgress(order, getCompletedAt(order, now));
      return !progress.delayed;
    });
    const onTimePercentage = prepSamples.length
      ? Math.round((onTimeOrders.length / prepSamples.length) * 100)
      : 100;

    return {
      activeOrders: activeOrders.length,
      delayedOrders: delayedOrders.length,
      avgPrepTime,
      onTimePercentage
    };
  }, [now, kitchenOrders]);

  const handleUpdateOrderStatus = async (order, nextStatus) => {
    if (!canUpdateOrders) {
      setError("You do not have permission to update orders.");
      return;
    }

    if (!order?._id || !nextStatus) {
      return;
    }

    const normalizedNextStatus = normalizeCloudOrderStatus(nextStatus, "");
    if (!normalizedNextStatus) {
      return;
    }

    if (order.__isDemo) {
      const changedAt = new Date().toISOString();
      upsertOrder({
        ...order,
        status: normalizedNextStatus,
        readyAt: normalizedNextStatus === "READY" ? changedAt : order.readyAt,
        completedAt: normalizedNextStatus === "DISPATCHED" ? changedAt : order.completedAt,
        statusTimeline: [
          ...getTimeline(order),
          {
            status: normalizedNextStatus,
            changedAt
          }
        ]
      });
      addLog({
        userId: user?.id || user?._id || "",
        userName: user?.name || "User",
        action: "Order updated",
        module: "Kitchen",
        metadata: { orderId: order.invoiceNumber || order._id, status: normalizedNextStatus }
      });
      return;
    }

    try {
      setUpdatingOrderId(order._id);
      setError("");
      const response = await axios.patch(`${API_URL}/api/orders/${order._id}/status`, {
        status: normalizedNextStatus
      });
      const updatedOrder = normalizeOrder(response.data || order);
      upsertOrder(updatedOrder);
      updateOrderStatus(updatedOrder._id, normalizedNextStatus);
      addLog({
        userId: user?.id || user?._id || "",
        userName: user?.name || "User",
        action: "Order updated",
        module: "Kitchen",
        metadata: { orderId: updatedOrder.invoiceNumber || updatedOrder._id, status: normalizedNextStatus }
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update order status.");
    } finally {
      setUpdatingOrderId("");
    }
  };

  const handleCancelOrder = async (order) => {
    if (!canUpdateOrders) {
      setError("You do not have permission to update orders.");
      return;
    }

    if (!order?._id) {
      return;
    }

    try {
      setUpdatingOrderId(order._id);
      setError("");
      if (order.__isDemo) {
        setOrders(orders.filter((item) => normalizeOrder(item)._id !== order._id));
        return;
      }

      await axios.put(`${API_URL}/api/orders/${order._id}/cancel`);
      setOrders(orders.filter((item) => normalizeOrder(item)._id !== order._id));
      addLog({
        userId: user?.id || user?._id || "",
        userName: user?.name || "User",
        action: "Order cancelled",
        module: "Kitchen",
        metadata: { orderId: order.invoiceNumber || order._id }
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to cancel order.");
    } finally {
      setUpdatingOrderId("");
    }
  };

  const boardStyle = {
    ...board,
    gridTemplateColumns: isNarrow ? "1fr" : "minmax(0, 1fr) 360px"
  };

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <h1 style={title}>Kitchen Orders</h1>
          <p style={subtitle}>KOT workflow</p>
        </div>
        <button type="button" style={refreshButton} onClick={loadOrders} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {apiMessage ? <div style={infoBanner}>{apiMessage}</div> : null}
      {error ? <div style={errorBanner}>{error}</div> : null}

      <section style={metricsGrid}>
        <MetricCard label="Active Orders" value={metrics.activeOrders} />
        <MetricCard label="Delayed Orders" value={metrics.delayedOrders} tone={metrics.delayedOrders ? "danger" : ""} />
        <MetricCard label="Avg Prep Time" value={`${Math.round(metrics.avgPrepTime)}m`} />
        <MetricCard label="On-time %" value={`${metrics.onTimePercentage}%`} tone={metrics.onTimePercentage < 80 ? "warning" : "success"} />
      </section>

      <div style={boardStyle}>
        <section style={kanban}>
          {CLOUD_KITCHEN_STATUS_FLOW.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              orders={columns[status] || []}
              now={now}
              selectedOrderId={selectedOrderId}
              updatingOrderId={updatingOrderId}
              canUpdateOrders={canUpdateOrders}
              onSelect={setSelectedOrderId}
              onUpdateStatus={handleUpdateOrderStatus}
              onCancelOrder={handleCancelOrder}
            />
          ))}
        </section>

        <OrderDetails order={selectedOrder} now={now} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone = "" }) {
  const toneStyle =
    tone === "danger" ? metricDanger : tone === "warning" ? metricWarning : tone === "success" ? metricSuccess : null;

  return (
    <div style={{ ...metricCard, ...toneStyle }}>
      <div style={metricLabel}>{label}</div>
      <div style={metricValue}>{value}</div>
    </div>
  );
}

function KanbanColumn({
  status,
  orders,
  now,
  selectedOrderId,
  updatingOrderId,
  canUpdateOrders,
  onSelect,
  onUpdateStatus,
  onCancelOrder
}) {
  return (
    <section style={column}>
      <div style={columnHeader}>
        <div>
          <h2 style={columnTitle}>{getStatusLabel(status)}</h2>
          <p style={columnSubtitle}>{orders.length} orders</p>
        </div>
        <span style={columnCount}>{orders.length}</span>
      </div>

      <div style={columnBody}>
        {orders.length ? (
          orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              now={now}
              selected={selectedOrderId === order._id}
              updating={updatingOrderId === order._id}
              canUpdateOrders={canUpdateOrders}
              onSelect={() => onSelect(order._id)}
              onUpdateStatus={onUpdateStatus}
              onCancelOrder={onCancelOrder}
            />
          ))
        ) : (
          <div style={emptyColumn}>No orders</div>
        )}
      </div>
    </section>
  );
}

function OrderCard({ order, now, selected, updating, canUpdateOrders, onSelect, onUpdateStatus, onCancelOrder }) {
  const status = normalizeCloudOrderStatus(order.status, "NEW");
  const action = STATUS_ACTIONS[status];
  const progress = getPrepProgress(order, now);
  const progressStyle = progress.delayed ? progressDanger : progressNormal;
  const canCancel = canUpdateOrders && !["DISPATCHED", "CANCELLED"].includes(status);

  return (
    <article
      style={{
        ...orderCard,
        ...(selected ? selectedOrderCard : null)
      }}
      onClick={onSelect}
    >
      <div style={cardTop}>
        <div>
          <h3 style={orderTitle}>#{formatOrderId(order)}</h3>
          <p style={orderMeta}>{order.orderType.replace(/_/g, " ")}</p>
        </div>
        <span style={{ ...statusBadge, ...getStatusBadgeStyle(status) }}>{getStatusLabel(status)}</span>
      </div>

      <div style={timerRow}>
        <span>{getAgeLabel(order, now)}</span>
        <strong>{progress.delayed ? "Delayed" : `${Math.round(progress.elapsed)}m`}</strong>
      </div>

      <div style={progressTrack}>
        <div
          style={{
            ...progressBar,
            ...progressStyle,
            width: `${progress.percentage}%`
          }}
        />
      </div>

      <div style={itemList}>
        {order.items.slice(0, 4).map((item) => (
          <div key={item.id} style={itemRow}>
            <span>{item.name}</span>
            <strong>x{item.quantity}</strong>
          </div>
        ))}
        {order.items.length > 4 ? (
          <div style={moreItems}>+{order.items.length - 4} more items</div>
        ) : null}
      </div>

      {action && canUpdateOrders ? (
        <div style={cardActions}>
          <button
            type="button"
            style={{
              ...actionButton,
              ...(updating ? disabledButton : null)
            }}
            disabled={updating}
            onClick={(event) => {
              event.stopPropagation();
              onUpdateStatus(order, action.nextStatus);
            }}
          >
            {updating ? "Updating..." : action.label}
          </button>
          {canCancel ? (
            <button
              type="button"
              style={{
                ...cancelButton,
                ...(updating ? disabledButton : null)
              }}
              disabled={updating}
              onClick={(event) => {
                event.stopPropagation();
                onCancelOrder(order);
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      ) : !action ? (
        <div style={completedText}>Workflow complete</div>
      ) : null}
    </article>
  );
}

function OrderDetails({ order, now }) {
  if (!order) {
    return (
      <aside style={detailsPanel}>
        <div style={detailsEmpty}>Select an order to view details.</div>
      </aside>
    );
  }

  const progress = getPrepProgress(order, now);
  const timeline = getTimeline(order);

  return (
    <aside style={detailsPanel}>
      <div style={detailsHeader}>
        <div>
          <h2 style={detailsTitle}>#{formatOrderId(order)}</h2>
          <p style={detailsSubtitle}>{getStatusLabel(order.status)}</p>
        </div>
        <span style={{ ...statusBadge, ...getStatusBadgeStyle(order.status) }}>
          {getStatusLabel(order.status)}
        </span>
      </div>

      <div style={detailGrid}>
        <Detail label="Customer" value={order.customerName || "Guest"} />
        <Detail label="Payment" value={order.paymentMode} />
        <Detail label="Order Type" value={order.orderType} />
        <Detail label="Total" value={formatCurrency(order.totalAmount)} />
        <Detail label="Time Since" value={getAgeLabel(order, now)} />
        <Detail label="Prep Target" value={`${order.expectedPrepTimeMinutes}m`} />
      </div>

      <div style={detailsSection}>
        <div style={detailsSectionTitle}>Prep Progress</div>
        <div style={progressTrack}>
          <div
            style={{
              ...progressBar,
              ...(progress.delayed ? progressDanger : progressNormal),
              width: `${progress.percentage}%`
            }}
          />
        </div>
        <div style={progressMeta}>
          <span>{Math.round(progress.elapsed)}m elapsed</span>
          <span>{progress.percentage}%</span>
        </div>
      </div>

      <div style={detailsSection}>
        <div style={detailsSectionTitle}>Items</div>
        <div style={detailsItems}>
          {order.items.map((item) => (
            <div key={item.id} style={detailItemRow}>
              <div>
                <strong>{item.name}</strong>
                {item.addOns.length ? (
                  <span>{item.addOns.map((addOn) => addOn.name).join(", ")}</span>
                ) : null}
              </div>
              <strong>x{item.quantity}</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={detailsSection}>
        <div style={detailsSectionTitle}>Timeline</div>
        <div style={timelineList}>
          {timeline.map((entry, index) => (
            <div key={`${entry.status}-${entry.changedAt}-${index}`} style={timelineRow}>
              <span style={timelineDot} />
              <div>
                <strong>{getStatusLabel(entry.status)}</strong>
                <span>
                  {new Date(entry.changedAt || order.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Detail({ label, value }) {
  return (
    <div style={detailCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const getStatusBadgeStyle = (status) => {
  const normalized = normalizeCloudOrderStatus(status, "NEW");

  if (normalized === "PREPARING") {
    return {
      background: "#FFFBEB",
      borderColor: "#FDE68A",
      color: "#92400E"
    };
  }

  if (normalized === "READY") {
    return {
      background: "#ECFDF5",
      borderColor: "#BBF7D0",
      color: "#166534"
    };
  }

  if (normalized === "DISPATCHED") {
    return {
      background: "#F3F4F6",
      borderColor: "#E5E7EB",
      color: "#374151"
    };
  }

  return {
    background: "#EFF6FF",
    borderColor: "#BFDBFE",
    color: "#1D4ED8"
  };
};

const page = {
  display: "grid",
  gap: 18,
  color: cloudKitchenTheme.textPrimary,
  background: "#FFFFFF"
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap"
};

const title = {
  margin: 0,
  fontSize: 30,
  lineHeight: 1.15,
  fontWeight: 800,
  letterSpacing: 0
};

const subtitle = {
  margin: "6px 0 0",
  color: cloudKitchenTheme.textSecondary,
  fontSize: 14
};

const refreshButton = {
  height: 40,
  borderRadius: 8,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  color: "#111111",
  padding: "0 14px",
  fontWeight: 800,
  cursor: "pointer"
};

const metricsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12
};

const metricCard = {
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 8,
  background: "#FFFFFF",
  padding: 14,
  boxShadow: cloudKitchenTheme.shadow
};

const metricLabel = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0
};

const metricValue = {
  marginTop: 8,
  color: "#111111",
  fontSize: 26,
  fontWeight: 800
};

const metricDanger = {
  borderColor: "#FECACA",
  background: "#FEF2F2"
};

const metricWarning = {
  borderColor: "#FDE68A",
  background: "#FFFBEB"
};

const metricSuccess = {
  borderColor: "#BBF7D0",
  background: "#ECFDF5"
};

const board = {
  display: "grid",
  gap: 16,
  alignItems: "start"
};

const kanban = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(240px, 1fr))",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 4
};

const column = {
  minWidth: 240,
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 8,
  background: "#F9FAFB",
  padding: 10,
  display: "grid",
  gap: 10,
  alignSelf: "stretch"
};

const columnHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10
};

const columnTitle = {
  margin: 0,
  fontSize: 15,
  fontWeight: 800
};

const columnSubtitle = {
  margin: "4px 0 0",
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12
};

const columnCount = {
  minWidth: 30,
  height: 30,
  borderRadius: 8,
  background: "#111111",
  color: "#FFFFFF",
  display: "grid",
  placeItems: "center",
  fontSize: 12,
  fontWeight: 800
};

const columnBody = {
  display: "grid",
  gap: 10,
  alignContent: "start"
};

const emptyColumn = {
  minHeight: 100,
  display: "grid",
  placeItems: "center",
  border: `1px dashed ${cloudKitchenTheme.border}`,
  borderRadius: 8,
  color: cloudKitchenTheme.textSecondary,
  fontSize: 13
};

const orderCard = {
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 8,
  background: "#FFFFFF",
  padding: 12,
  display: "grid",
  gap: 10,
  cursor: "pointer"
};

const selectedOrderCard = {
  borderColor: "#111111",
  boxShadow: "0 0 0 2px rgba(17, 17, 17, 0.08)"
};

const cardTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start"
};

const orderTitle = {
  margin: 0,
  color: "#111111",
  fontSize: 14,
  fontWeight: 800
};

const orderMeta = {
  margin: "4px 0 0",
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11,
  textTransform: "capitalize"
};

const statusBadge = {
  borderRadius: 8,
  border: "1px solid transparent",
  padding: "6px 8px",
  fontSize: 11,
  fontWeight: 800,
  whiteSpace: "nowrap"
};

const timerRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12
};

const progressTrack = {
  height: 7,
  borderRadius: 999,
  background: "#E5E7EB",
  overflow: "hidden"
};

const progressBar = {
  height: "100%",
  borderRadius: 999
};

const progressNormal = {
  background: "#111111"
};

const progressDanger = {
  background: "#EF4444"
};

const itemList = {
  display: "grid",
  gap: 7
};

const itemRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  color: "#111111",
  fontSize: 13
};

const moreItems = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  fontWeight: 700
};

const actionButton = {
  minHeight: 38,
  borderRadius: 8,
  border: 0,
  background: "#111111",
  color: "#FFFFFF",
  fontWeight: 800,
  cursor: "pointer"
};

const cardActions = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 8,
  alignItems: "center"
};

const cancelButton = {
  minHeight: 38,
  borderRadius: 8,
  border: "1px solid #FCA5A5",
  background: "#FEF2F2",
  color: "#991B1B",
  padding: "0 12px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer"
};

const disabledButton = {
  opacity: 0.5,
  cursor: "not-allowed"
};

const completedText = {
  minHeight: 38,
  borderRadius: 8,
  background: "#F3F4F6",
  color: "#374151",
  display: "grid",
  placeItems: "center",
  fontSize: 12,
  fontWeight: 800
};

const detailsPanel = {
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 8,
  background: "#FFFFFF",
  boxShadow: cloudKitchenTheme.shadow,
  padding: 16,
  display: "grid",
  gap: 16,
  position: "sticky",
  top: 12
};

const detailsEmpty = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 14,
  minHeight: 220,
  display: "grid",
  placeItems: "center",
  textAlign: "center"
};

const detailsHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start"
};

const detailsTitle = {
  margin: 0,
  fontSize: 22,
  fontWeight: 800
};

const detailsSubtitle = {
  margin: "5px 0 0",
  color: cloudKitchenTheme.textSecondary,
  fontSize: 13
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10
};

const detailCard = {
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 8,
  padding: 10,
  display: "grid",
  gap: 6
};

const detailsSection = {
  display: "grid",
  gap: 10
};

const detailsSectionTitle = {
  color: "#111111",
  fontSize: 13,
  fontWeight: 800
};

const progressMeta = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  fontWeight: 700
};

const detailsItems = {
  display: "grid",
  gap: 8
};

const detailItemRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  borderRadius: 8,
  background: "#F9FAFB",
  padding: 10,
  fontSize: 13
};

const timelineList = {
  display: "grid",
  gap: 10
};

const timelineRow = {
  display: "grid",
  gridTemplateColumns: "14px minmax(0, 1fr)",
  gap: 9,
  alignItems: "start",
  color: "#111111",
  fontSize: 13
};

const timelineDot = {
  width: 10,
  height: 10,
  borderRadius: 999,
  background: "#111111",
  marginTop: 4
};

const infoBanner = {
  borderRadius: 8,
  padding: "10px 12px",
  background: "#F9FAFB",
  border: `1px solid ${cloudKitchenTheme.border}`,
  color: cloudKitchenTheme.textSecondary,
  fontSize: 13
};

const errorBanner = {
  borderRadius: 8,
  padding: "10px 12px",
  background: "#FEF2F2",
  border: "1px solid #FECACA",
  color: "#991B1B",
  fontSize: 13
};
