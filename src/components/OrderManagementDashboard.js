import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import API_URL from "../config/api";
import { cloudKitchenTheme } from "../theme";

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "custom", label: "Custom" }
];

const CHANNEL_OPTIONS = [
  { value: "ALL", label: "All Channels" },
  { value: "DIRECT", label: "Direct" },
  { value: "WEBSITE", label: "Website" },
  { value: "SWIGGY", label: "Swiggy" },
  { value: "ZOMATO", label: "Zomato" },
  { value: "MAGICPIN", label: "Magicpin" },
  { value: "OTHER_APP", label: "Other App" },
  { value: "WALK_IN", label: "Walk-in" }
];

const ORDER_TYPE_OPTIONS = [
  { value: "ALL", label: "All Types" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "TAKEAWAY", label: "Takeaway" },
  { value: "DINE_IN", label: "Dine-in" }
];

const ORDER_STATUS_OPTIONS = ["NEW", "PREPARING", "READY", "DISPATCHED", "CANCELLED"];
const LOCKED_ORDER_STATUSES = new Set(["DISPATCHED", "DELIVERED", "COMPLETED", "DONE", "CANCELLED"]);

const KPI_CONFIG = [
  {
    key: "totalOrders",
    label: "Total Orders",
    formatter: (value) => formatCount(value)
  },
  {
    key: "totalRevenue",
    label: "Total Revenue",
    formatter: (value) => formatCurrency(value)
  },
  {
    key: "avgOrderValue",
    label: "Avg Order Value",
    formatter: (value) => formatCurrency(value)
  },
  {
    key: "avgPrepTime",
    label: "Avg Prep Time",
    formatter: (value) => `${roundNumber(value, 1)}m`
  },
  {
    key: "cancellationRate",
    label: "Cancellation Rate",
    formatter: (value) => `${roundNumber(value, 1)}%`
  },
  {
    key: "onTimeDelivery",
    label: "On-time Delivery",
    formatter: (value) => `${roundNumber(value, 1)}%`
  }
];

const PIPELINE_STAGES = [
  { key: "received", label: "Received", color: "#2563EB" },
  { key: "confirmed", label: "Confirmed", color: "#4F46E5" },
  { key: "preparing", label: "Preparing", color: "#EA580C" },
  { key: "ready", label: "Ready", color: "#16A34A" },
  { key: "dispatched", label: "Dispatched", color: "#0EA5E9" },
  { key: "completed", label: "Completed", color: "#0F766E" },
  { key: "cancelled", label: "Cancelled", color: "#DC2626" }
];

const INSIGHT_SECTIONS = [
  { key: "highDemandItems", title: "High demand items" },
  { key: "delayAlerts", title: "Delay alerts" },
  { key: "revenueOpportunities", title: "Revenue opportunities" },
  { key: "inventoryAlerts", title: "Inventory alerts" },
  { key: "smartSuggestions", title: "Smart suggestions" }
];

const DEFAULT_KPIS = {
  totalOrders: 0,
  totalRevenue: 0,
  avgOrderValue: 0,
  avgPrepTime: 0,
  cancellationRate: 0,
  onTimeDelivery: 0
};

const DEFAULT_PIPELINE = {
  received: 0,
  confirmed: 0,
  preparing: 0,
  ready: 0,
  dispatched: 0,
  completed: 0,
  cancelled: 0
};

const DEFAULT_KITCHEN = {
  new: 0,
  preparing: 0,
  ready: 0,
  delayed: 0,
  liveOrders: []
};

const DEFAULT_AI_INSIGHTS = {
  highDemandItems: [],
  delayAlerts: [],
  revenueOpportunities: [],
  inventoryAlerts: [],
  smartSuggestions: []
};

const DEFAULT_FILTERS = {
  range: "today",
  from: "",
  to: "",
  channel: "ALL",
  orderType: "ALL"
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const countFormatter = new Intl.NumberFormat("en-IN");

const getTodayIso = () => new Date().toISOString().slice(0, 10);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundNumber = (value, digits = 2) => Number(toNumber(value).toFixed(digits));

const formatCurrency = (value) => currencyFormatter.format(toNumber(value));
const formatCount = (value) => countFormatter.format(Math.round(toNumber(value)));

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const formatStatus = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return "Unknown";
  }

  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatElapsedTime = (value) => {
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) {
    return "-";
  }

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 60000));
  return `${elapsedMinutes}m`;
};

const getStatusTone = (status = "") => {
  const normalized = String(status || "").trim().toUpperCase();
  if (["NEW"].includes(normalized)) {
    return { color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" };
  }
  if (["PREPARING"].includes(normalized)) {
    return { color: "#9A3412", bg: "#FFF7ED", border: "#FDBA74" };
  }
  if (["READY"].includes(normalized)) {
    return { color: "#166534", bg: "#ECFDF5", border: "#BBF7D0" };
  }
  if (["DISPATCHED", "DELIVERED", "COMPLETED", "DONE"].includes(normalized)) {
    return { color: "#0F766E", bg: "#F0FDFA", border: "#99F6E4" };
  }
  if (["CANCELLED"].includes(normalized)) {
    return { color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" };
  }
  return { color: "#374151", bg: "#F3F4F6", border: "#E5E7EB" };
};

const emptySummary = {
  range: {
    key: "today",
    label: "Today",
    from: "",
    to: ""
  },
  filters: {
    channel: "ALL",
    orderType: "ALL"
  },
  kpis: DEFAULT_KPIS,
  pipelineCounts: DEFAULT_PIPELINE,
  kitchenStats: DEFAULT_KITCHEN,
  salesTrend: [],
  topItems: [],
  lowItems: [],
  orderList: [],
  aiInsights: DEFAULT_AI_INSIGHTS
};

export default function OrderManagementDashboard() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");

  const backendOrders = useMemo(
    () =>
      (summary.orderList || []).map((order) => ({
        id: order.id,
        orderId: order.orderId,
        customer: order.customer || "Guest",
        subtotal: toNumber(order.subtotal ?? order.amount),
        tax: toNumber(order.tax ?? order.gst),
        total: toNumber(order.total ?? order.amount),
        status: order.status,
        dateTime: order.dateTime,
        channel: order.channel,
        orderType: order.orderType,
        itemsLabel: order.itemsLabel || `${toNumber(order.itemCount)} items`,
        amount: toNumber(order.amount ?? order.total),
        time: order.time || formatElapsedTime(order.dateTime),
        items: Array.isArray(order.items)
          ? order.items.map((item) => ({
              name: item.name,
              quantity: Math.max(1, toNumber(item.qty || item.quantity))
            }))
          : [],
        statusTimeline: Array.isArray(order.statusTimeline) ? order.statusTimeline : []
      })),
    [summary.orderList]
  );

  const dashboardOrders = backendOrders;

  const liveKitchenOrders = useMemo(
    () =>
      (Array.isArray(summary.kitchenStats?.liveOrders) ? summary.kitchenStats.liveOrders : []).map(
        (order) => ({
          ...order,
          timeElapsed: order.timeElapsed || formatElapsedTime(order.dateTime),
          itemsLabel: order.itemsLabel || `${Array.isArray(order.items) ? order.items.length : 0} items`
        })
      ),
    [summary.kitchenStats?.liveOrders]
  );

  const kitchenOverview = useMemo(
    () => ({
      new: toNumber(summary.kitchenStats?.new),
      preparing: toNumber(summary.kitchenStats?.preparing),
      ready: toNumber(summary.kitchenStats?.ready),
      delayed: toNumber(summary.kitchenStats?.delayed)
    }),
    [summary.kitchenStats]
  );

  const selectedOrder = useMemo(
    () => dashboardOrders.find((order) => order.id === selectedOrderId) || null,
    [dashboardOrders, selectedOrderId]
  );

  useEffect(() => {
    if (!selectedOrderId) {
      return;
    }

    const exists = dashboardOrders.some((order) => order.id === selectedOrderId);
    if (!exists) {
      setSelectedOrderId("");
    }
  }, [dashboardOrders, selectedOrderId]);

  const loadSummary = useCallback(async (signal) => {
    if (filters.range === "custom" && (!filters.from || !filters.to)) {
      return;
    }

    if (
      filters.range === "custom" &&
      filters.from &&
      filters.to &&
      new Date(filters.from) > new Date(filters.to)
    ) {
      setError("From date cannot be after To date.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params = {
        range: filters.range,
        channel: filters.channel,
        orderType: filters.orderType
      };

      if (filters.range === "custom") {
        params.from = filters.from;
        params.to = filters.to;
      }

      const response = await axios.get(`${API_URL}/api/orders/analytics-summary`, {
        params,
        signal
      });

      const payload = response.data || {};
      setSummary({
        ...emptySummary,
        ...payload,
        kpis: { ...DEFAULT_KPIS, ...(payload.kpis || {}) },
        pipelineCounts: { ...DEFAULT_PIPELINE, ...(payload.pipelineCounts || {}) },
        kitchenStats: { ...DEFAULT_KITCHEN, ...(payload.kitchenStats || {}) },
        aiInsights: { ...DEFAULT_AI_INSIGHTS, ...(payload.aiInsights || {}) }
      });
    } catch (requestError) {
      if (requestError.name === "CanceledError" || requestError.code === "ERR_CANCELED") {
        return;
      }

      console.error(requestError);
      setError(requestError.response?.data?.message || "Unable to load order management dashboard.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();

    loadSummary(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadSummary]);

  const handleStatusChange = async (order, nextStatus) => {
    if (!order?.id || !nextStatus || nextStatus === order.status) {
      return;
    }

    try {
      setUpdatingOrderId(order.id);
      setError("");
      if (nextStatus === "CANCELLED") {
        await axios.put(`${API_URL}/api/orders/${order.id}/cancel`);
      } else {
        await axios.patch(`${API_URL}/api/orders/${order.id}/status`, { status: nextStatus });
      }
      await loadSummary();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update order.");
    } finally {
      setUpdatingOrderId("");
    }
  };

  const handleCancelOrder = async (order) => {
    if (!order?.id) {
      return;
    }

    try {
      setUpdatingOrderId(order.id);
      setError("");
      await axios.put(`${API_URL}/api/orders/${order.id}/cancel`);
      await loadSummary();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to cancel order.");
    } finally {
      setUpdatingOrderId("");
    }
  };

  const pipelineMax = useMemo(() => {
    return PIPELINE_STAGES.reduce(
      (max, stage) => Math.max(max, toNumber(summary.pipelineCounts[stage.key])),
      1
    );
  }, [summary.pipelineCounts]);

  return (
    <div style={page}>
      <header style={hero}>
        <div>
          <h1 style={title}>Order Management</h1>
          <p style={subtitle}>Unified dashboard for orders, kitchen flow, trends, and AI insights</p>
        </div>

        <div style={filterRow}>
          <label style={controlLabel}>
            Date Range
            <select
              value={filters.range}
              onChange={(event) => {
                const nextRange = event.target.value;
                if (nextRange === "custom") {
                  const today = getTodayIso();
                  setFilters((current) => ({
                    ...current,
                    range: "custom",
                    from: current.from || today,
                    to: current.to || today
                  }));
                  return;
                }

                setFilters((current) => ({
                  ...current,
                  range: nextRange,
                  from: "",
                  to: ""
                }));
              }}
              style={select}
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {filters.range === "custom" ? (
            <>
              <label style={controlLabel}>
                From
                <input
                  type="date"
                  value={filters.from}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      from: event.target.value
                    }))
                  }
                  style={dateInput}
                />
              </label>

              <label style={controlLabel}>
                To
                <input
                  type="date"
                  value={filters.to}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      to: event.target.value
                    }))
                  }
                  style={dateInput}
                />
              </label>
            </>
          ) : null}

          <label style={controlLabel}>
            Channel
            <select
              value={filters.channel}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  channel: event.target.value
                }))
              }
              style={select}
            >
              {CHANNEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={controlLabel}>
            Order Type
            <select
              value={filters.orderType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  orderType: event.target.value
                }))
              }
              style={select}
            >
              {ORDER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {error ? <div style={errorBanner}>{error}</div> : null}

      {loading ? (
        <section style={loadingWrap}>Loading order dashboard...</section>
      ) : (
        <>
          <section style={section}>
            <SectionTitle title="KPI Cards" />
            <div style={kpiGrid}>
              {KPI_CONFIG.map((kpi) => (
                <article key={kpi.key} style={kpiCard}>
                  <div style={kpiLabel}>{kpi.label}</div>
                  <div style={kpiValue}>{kpi.formatter(summary.kpis[kpi.key])}</div>
                </article>
              ))}
            </div>
          </section>

          <section style={section}>
            <SectionTitle title="Order Pipeline Funnel" />
            <div style={funnelGrid}>
              {PIPELINE_STAGES.map((stage) => {
                const count = toNumber(summary.pipelineCounts[stage.key]);
                const width = Math.max(8, Math.round((count / pipelineMax) * 100));

                return (
                  <article key={stage.key} style={funnelCard}>
                    <div style={funnelHeader}>
                      <div style={funnelLabel}>{stage.label}</div>
                      <div style={funnelValue}>{formatCount(count)}</div>
                    </div>
                    <div style={funnelTrack}>
                      <div
                        style={{
                          ...funnelBar,
                          width: `${width}%`,
                          background: stage.color
                        }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section style={section}>
            <SectionTitle title="Live Kitchen Overview" />
            <div style={kitchenStatsGrid}>
              <OverviewCard label="New" value={kitchenOverview.new} tone="#1D4ED8" />
              <OverviewCard label="Preparing" value={kitchenOverview.preparing} tone="#EA580C" />
              <OverviewCard label="Ready" value={kitchenOverview.ready} tone="#16A34A" />
              <OverviewCard label="Delayed" value={kitchenOverview.delayed} tone="#DC2626" />
            </div>

            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Order ID</th>
                    <th style={th}>Items</th>
                    <th style={th}>Time Elapsed</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {liveKitchenOrders.length ? (
                    liveKitchenOrders.map((order) => (
                      <tr key={order.id} style={tr}>
                        <td style={td}>{order.orderId}</td>
                        <td style={td}>{order.itemsLabel || "-"}</td>
                        <td style={td}>{order.timeElapsed}</td>
                        <td style={td}>
                          <StatusBadge status={order.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={emptyCell}>
                        No active kitchen orders in this filter window.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section style={section}>
            <SectionTitle title="Sales Trend" />
            <div style={chartCard}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={summary.salesTrend}>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} />
                  <YAxis
                    yAxisId="orders"
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="revenue"
                    orientation="right"
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    tickFormatter={(value) => `₹${Math.round(toNumber(value) / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "Revenue" ? formatCurrency(value) : formatCount(value)
                    }
                  />
                  <Legend />
                  <Line
                    yAxisId="orders"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section style={section}>
            <SectionTitle title="Top / Low Items" />
            <div style={itemColumns}>
              <div style={itemPanel}>
                <div style={itemPanelTitle}>Top Selling Items</div>
                <ItemList items={summary.topItems} emptyText="No item sales available." />
              </div>
              <div style={itemPanel}>
                <div style={itemPanelTitle}>Low Performing Items</div>
                <ItemList items={summary.lowItems} emptyText="No low performing items detected." />
              </div>
            </div>
          </section>

          <section style={section}>
            <SectionTitle title="Order Table" />
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Order ID</th>
                    <th style={th}>Customer</th>
                    <th style={th}>Subtotal</th>
                    <th style={th}>Tax</th>
                    <th style={th}>Total</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardOrders.length ? (
                    dashboardOrders.map((order) => (
                      <tr
                        key={order.id}
                        style={clickableRow}
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <td style={td}>{order.orderId}</td>
                        <td style={td}>{order.customer}</td>
                        <td style={td}>{formatCurrency(order.subtotal)}</td>
                        <td style={td}>{formatCurrency(order.tax)}</td>
                        <td style={td}>{formatCurrency(order.total)}</td>
                        <td style={td}>
                          <StatusBadge status={order.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={emptyCell}>
                        No orders in this filter window.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section style={section}>
            <SectionTitle title="AI Insights Panel" />
            <div style={insightsGrid}>
              {INSIGHT_SECTIONS.map((sectionItem) => {
                const rows = Array.isArray(summary.aiInsights[sectionItem.key])
                  ? summary.aiInsights[sectionItem.key]
                  : [];

                return (
                  <article key={sectionItem.key} style={insightCard}>
                    <h3 style={insightTitle}>{sectionItem.title}</h3>
                    <ul style={insightList}>
                      {rows.length ? (
                        rows.map((row, index) => <li key={`${sectionItem.key}-${index}`}>{row}</li>)
                      ) : (
                        <li>No insights yet</li>
                      )}
                    </ul>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      {selectedOrder ? (
        <div style={drawerBackdrop} onClick={() => setSelectedOrderId("")}>
          <aside style={drawer} onClick={(event) => event.stopPropagation()}>
            <div style={drawerHeader}>
              <div>
                <h2 style={drawerTitle}>Order {selectedOrder.orderId}</h2>
                <p style={drawerSubtitle}>{formatDateTime(selectedOrder.dateTime)}</p>
              </div>
              <button type="button" style={closeButton} onClick={() => setSelectedOrderId("")}>
                Close
              </button>
            </div>

            <div style={drawerActions}>
              <label style={drawerActionLabel}>
                Edit Status
                <select
                  value={selectedOrder.status}
                  disabled={updatingOrderId === selectedOrder.id || LOCKED_ORDER_STATUSES.has(selectedOrder.status)}
                  onChange={(event) => handleStatusChange(selectedOrder, event.target.value)}
                  style={drawerSelect}
                >
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                style={{
                  ...cancelButton,
                  ...(updatingOrderId === selectedOrder.id ||
                  LOCKED_ORDER_STATUSES.has(selectedOrder.status)
                    ? disabledButton
                    : null)
                }}
                disabled={updatingOrderId === selectedOrder.id || LOCKED_ORDER_STATUSES.has(selectedOrder.status)}
                onClick={() => handleCancelOrder(selectedOrder)}
              >
                {updatingOrderId === selectedOrder.id ? "Updating..." : "Cancel Order"}
              </button>
            </div>

            <div style={detailGrid}>
              <Detail label="Customer" value={selectedOrder.customer} />
              <Detail label="Channel" value={formatStatus(selectedOrder.channel)} />
              <Detail label="Order Type" value={formatStatus(selectedOrder.orderType)} />
              <Detail
                label="Subtotal"
                value={formatCurrency(toNumber(selectedOrder.subtotal, selectedOrder.amount))}
              />
              <Detail
                label="Tax"
                value={formatCurrency(toNumber(selectedOrder.tax ?? selectedOrder.gst, 0))}
              />
              <Detail label="Total" value={formatCurrency(selectedOrder.amount)} />
              <Detail label="Status" value={formatStatus(selectedOrder.status)} />
              <Detail label="Elapsed" value={selectedOrder.time} />
            </div>

            <div style={drawerSection}>
              <div style={drawerSectionTitle}>Items</div>
              <div style={drawerItemList}>
                {selectedOrder.items.length ? (
                  selectedOrder.items.map((item, index) => (
                    <div key={`${item.name}-${index}`} style={drawerItemRow}>
                      <span>{item.name}</span>
                      <strong>x{toNumber(item.quantity)}</strong>
                    </div>
                  ))
                ) : (
                  <div style={drawerEmpty}>No items available</div>
                )}
              </div>
            </div>

            <div style={drawerSection}>
              <div style={drawerSectionTitle}>Timeline</div>
              <div style={timeline}>
                {selectedOrder.statusTimeline.length ? (
                  selectedOrder.statusTimeline.map((entry, index) => (
                    <div key={`${entry.status}-${entry.changedAt}-${index}`} style={timelineRow}>
                      <span style={timelineDot} />
                      <div>
                        <div style={timelineStatus}>{formatStatus(entry.status)}</div>
                        <div style={timelineTime}>
                          {entry.changedAt ? formatDateTime(entry.changedAt) : "-"}
                        </div>
                        {entry.note ? <div style={timelineNote}>{entry.note}</div> : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={drawerEmpty}>No timeline entries found.</div>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function SectionTitle({ title }) {
  return <h2 style={sectionTitle}>{title}</h2>;
}

function OverviewCard({ label, value, tone }) {
  return (
    <article style={overviewCard}>
      <div style={overviewLabel}>{label}</div>
      <div style={{ ...overviewValue, color: tone }}>{formatCount(value)}</div>
    </article>
  );
}

function ItemList({ items = [], emptyText }) {
  if (!items.length) {
    return <div style={itemEmpty}>{emptyText}</div>;
  }

  return (
    <div style={itemRows}>
      {items.map((item, index) => (
        <div key={`${item.name}-${index}`} style={itemRow}>
          <div>
            <div style={itemName}>{item.name}</div>
            <div style={itemMeta}>{formatCount(item.quantity)} sold</div>
          </div>
          <div style={itemRevenue}>{formatCurrency(item.revenue)}</div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const tone = getStatusTone(status);

  return (
    <span
      style={{
        ...statusBadge,
        color: tone.color,
        background: tone.bg,
        borderColor: tone.border
      }}
    >
      {formatStatus(status)}
    </span>
  );
}

function Detail({ label, value }) {
  return (
    <div style={detailCard}>
      <div style={detailLabel}>{label}</div>
      <div style={detailValue}>{value}</div>
    </div>
  );
}

const page = {
  display: "grid",
  gap: 18,
  color: cloudKitchenTheme.textPrimary
};

const hero = {
  display: "grid",
  gap: 14,
  border: "1px solid #E5E7EB",
  borderRadius: 16,
  background: "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 52%, #ECFEFF 100%)",
  padding: "16px 18px"
};

const title = {
  margin: 0,
  fontSize: 30,
  lineHeight: 1.1,
  color: "#0F172A",
  fontWeight: 800
};

const subtitle = {
  margin: "6px 0 0",
  color: "#475569",
  fontSize: 14
};

const filterRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap"
};

const controlLabel = {
  display: "grid",
  gap: 6,
  color: "#334155",
  fontSize: 12,
  fontWeight: 700
};

const select = {
  height: 38,
  borderRadius: 10,
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  padding: "0 12px",
  color: "#0F172A",
  fontSize: 13,
  fontWeight: 600
};

const dateInput = {
  ...select,
  minWidth: 140
};

const section = {
  display: "grid",
  gap: 12
};

const sectionTitle = {
  margin: 0,
  fontSize: 18,
  color: "#0F172A"
};

const kpiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
  gap: 10
};

const kpiCard = {
  border: "1px solid #E2E8F0",
  borderRadius: 14,
  background: "#FFFFFF",
  padding: "14px 16px",
  boxShadow: cloudKitchenTheme.shadow
};

const kpiLabel = {
  color: "#64748B",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.2
};

const kpiValue = {
  marginTop: 8,
  color: "#0F172A",
  fontSize: 24,
  fontWeight: 800
};

const funnelGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
  gap: 10
};

const funnelCard = {
  border: "1px solid #E2E8F0",
  borderRadius: 14,
  background: "#FFFFFF",
  padding: 12
};

const funnelHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 10
};

const funnelLabel = {
  fontSize: 13,
  color: "#334155",
  fontWeight: 700
};

const funnelValue = {
  fontSize: 14,
  color: "#0F172A",
  fontWeight: 800
};

const funnelTrack = {
  width: "100%",
  height: 9,
  borderRadius: 999,
  overflow: "hidden",
  background: "#E2E8F0"
};

const funnelBar = {
  height: "100%",
  borderRadius: 999
};

const kitchenStatsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
  gap: 10
};

const overviewCard = {
  border: "1px solid #E2E8F0",
  borderRadius: 14,
  background: "#FFFFFF",
  padding: 12
};

const overviewLabel = {
  color: "#64748B",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase"
};

const overviewValue = {
  marginTop: 8,
  fontSize: 24,
  fontWeight: 800
};

const chartCard = {
  border: "1px solid #E2E8F0",
  borderRadius: 16,
  background: "#FFFFFF",
  padding: 12
};

const itemColumns = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: 12
};

const itemPanel = {
  border: "1px solid #E2E8F0",
  borderRadius: 14,
  background: "#FFFFFF",
  padding: 12
};

const itemPanelTitle = {
  color: "#0F172A",
  fontSize: 14,
  fontWeight: 800,
  marginBottom: 10
};

const itemRows = {
  display: "grid",
  gap: 8
};

const itemRow = {
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  padding: "10px 12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12
};

const itemName = {
  color: "#0F172A",
  fontSize: 13,
  fontWeight: 700
};

const itemMeta = {
  marginTop: 3,
  color: "#64748B",
  fontSize: 12
};

const itemRevenue = {
  color: "#0F172A",
  fontSize: 13,
  fontWeight: 700
};

const itemEmpty = {
  color: "#64748B",
  fontSize: 13,
  padding: "8px 0"
};

const tableWrap = {
  border: "1px solid #E2E8F0",
  borderRadius: 14,
  background: "#FFFFFF",
  overflowX: "auto"
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 980
};

const th = {
  textAlign: "left",
  padding: "12px 14px",
  color: "#64748B",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.3,
  borderBottom: "1px solid #E2E8F0"
};

const td = {
  padding: "11px 14px",
  color: "#0F172A",
  fontSize: 13,
  borderBottom: "1px solid #F1F5F9",
  verticalAlign: "top"
};

const tr = {
  background: "#FFFFFF"
};

const clickableRow = {
  ...tr,
  cursor: "pointer"
};

const emptyCell = {
  padding: "18px 14px",
  color: "#64748B",
  fontSize: 13
};

const statusBadge = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid transparent",
  borderRadius: 999,
  padding: "3px 9px",
  fontSize: 11,
  fontWeight: 700
};

const insightsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: 10
};

const insightCard = {
  border: "1px solid #E2E8F0",
  borderRadius: 14,
  background: "#FFFFFF",
  padding: 12
};

const insightTitle = {
  margin: 0,
  color: "#0F172A",
  fontSize: 14,
  fontWeight: 800
};

const insightList = {
  margin: "10px 0 0",
  paddingLeft: 16,
  color: "#334155",
  fontSize: 13,
  display: "grid",
  gap: 6
};

const loadingWrap = {
  border: "1px solid #E2E8F0",
  borderRadius: 14,
  background: "#FFFFFF",
  padding: 16,
  color: "#475569",
  fontWeight: 600
};

const errorBanner = {
  border: "1px solid #FECACA",
  borderRadius: 12,
  background: "#FEF2F2",
  color: "#991B1B",
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 600
};

const drawerBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.35)",
  display: "flex",
  justifyContent: "flex-end",
  zIndex: 40
};

const drawer = {
  width: "min(480px, 100%)",
  height: "100%",
  background: "#FFFFFF",
  padding: "16px 14px",
  overflowY: "auto",
  display: "grid",
  gap: 14
};

const drawerHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10
};

const drawerTitle = {
  margin: 0,
  color: "#0F172A",
  fontSize: 22
};

const drawerSubtitle = {
  margin: "6px 0 0",
  color: "#64748B",
  fontSize: 13
};

const closeButton = {
  height: 34,
  borderRadius: 8,
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#0F172A",
  padding: "0 12px",
  fontWeight: 700,
  cursor: "pointer"
};

const drawerActions = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "end",
  padding: "12px 0",
  borderBottom: "1px solid #E2E8F0"
};

const drawerActionLabel = {
  display: "grid",
  gap: 6,
  minWidth: 180,
  color: "#334155",
  fontSize: 12,
  fontWeight: 700
};

const drawerSelect = {
  height: 38,
  borderRadius: 8,
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#0F172A",
  padding: "0 10px",
  fontWeight: 700
};

const cancelButton = {
  height: 38,
  borderRadius: 8,
  border: "1px solid #FCA5A5",
  background: "#FEF2F2",
  color: "#991B1B",
  padding: "0 14px",
  fontWeight: 800,
  cursor: "pointer"
};

const disabledButton = {
  opacity: 0.55,
  cursor: "not-allowed"
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8
};

const detailCard = {
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  background: "#FFFFFF",
  padding: "8px 10px"
};

const detailLabel = {
  color: "#64748B",
  fontSize: 11,
  textTransform: "uppercase",
  fontWeight: 700
};

const detailValue = {
  marginTop: 6,
  color: "#0F172A",
  fontSize: 13,
  fontWeight: 700
};

const drawerSection = {
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  background: "#FFFFFF",
  padding: 10
};

const drawerSectionTitle = {
  color: "#0F172A",
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 8
};

const drawerItemList = {
  display: "grid",
  gap: 6
};

const drawerItemRow = {
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  padding: "8px 10px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  color: "#0F172A",
  fontSize: 13
};

const drawerEmpty = {
  color: "#64748B",
  fontSize: 13
};

const timeline = {
  display: "grid",
  gap: 8
};

const timelineRow = {
  display: "grid",
  gridTemplateColumns: "12px 1fr",
  gap: 8
};

const timelineDot = {
  width: 10,
  height: 10,
  borderRadius: 999,
  background: "#2563EB",
  marginTop: 4
};

const timelineStatus = {
  color: "#0F172A",
  fontSize: 13,
  fontWeight: 700
};

const timelineTime = {
  marginTop: 2,
  color: "#64748B",
  fontSize: 12
};

const timelineNote = {
  marginTop: 2,
  color: "#334155",
  fontSize: 12
};
