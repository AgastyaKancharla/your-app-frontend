import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PageContainer from "../ui/PageContainer";
import { useOrderStore } from "../../store/orderStore";
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_FILTER_OPTIONS,
  formatOrderStatus,
  normalizeOrderStatus
} from "../../access";
import { API_BASE_URL } from "../../config";

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const RANGE_FILTER_OPTIONS = [
  { label: "Today", value: "1" },
  { label: "Last 7 Days", value: "7" },
  { label: "Last 30 Days", value: "30" },
  { label: "Last 90 Days", value: "90" },
  { label: "Custom Range", value: "custom" }
];

const CHART_DAY_OPTIONS = [7, 14, 30, 60, 90];

const itemImageFallback = {
  biryani:
    "https://images.unsplash.com/photo-1563379091339-03246963d7d3?auto=format&fit=crop&w=1000&q=80",
  chicken:
    "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1000&q=80",
  pizza:
    "https://images.unsplash.com/photo-1601924582975-7e6ec3de6a17?auto=format&fit=crop&w=1000&q=80",
  burger:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80",
  salad:
    "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=1000&q=80",
  default:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80"
};

const pickImageForItem = (name) => {
  const key = Object.keys(itemImageFallback).find(
    (k) => k !== "default" && name.toLowerCase().includes(k)
  );

  return itemImageFallback[key || "default"];
};

const getDayDiffInclusive = (from, to) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return 1;
  }

  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(0, 0, 0, 0);

  return Math.max(1, Math.floor((toDate - fromDate) / (24 * 60 * 60 * 1000)) + 1);
};

export default function Home({ user, onNavigate }) {
  const orders = useOrderStore((state) => state.orders);
  const [selectedRangeOption, setSelectedRangeOption] = useState("30");
  const [rangeFilter, setRangeFilter] = useState({
    type: "days",
    days: 30,
    from: "",
    to: ""
  });
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [status, setStatus] = useState("ALL");
  const [metric, setMetric] = useState("orders");
  const [chartDays, setChartDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    console.log("Orders:", orders);
  }, [orders]);

  const selectedRangeDays = useMemo(() => {
    if (rangeFilter.type === "custom") {
      return getDayDiffInclusive(rangeFilter.from, rangeFilter.to);
    }

    return rangeFilter.days;
  }, [rangeFilter]);

  const chartRangeOptions = useMemo(() => {
    const options = CHART_DAY_OPTIONS.filter((value) => value <= selectedRangeDays);

    if (!options.length) {
      return [selectedRangeDays];
    }

    if (!options.includes(selectedRangeDays)) {
      options.push(selectedRangeDays);
    }

    return Array.from(new Set(options)).sort((a, b) => a - b);
  }, [selectedRangeDays]);

  useEffect(() => {
    if (!chartRangeOptions.includes(chartDays)) {
      setChartDays(chartRangeOptions[chartRangeOptions.length - 1]);
    }
  }, [chartDays, chartRangeOptions]);

  useEffect(() => {
    const controller = new AbortController();

    const loadDashboard = async () => {
      try {
        setLoading(true);
        const params = {
          status,
          chartDays
        };

        if (rangeFilter.type === "custom") {
          params.from = rangeFilter.from;
          params.to = rangeFilter.to;
        } else {
          params.days = rangeFilter.days;
        }

        const dashboardRes = await axios.get(`${API_BASE_URL}/api/reports/dashboard`, {
          params,
          signal: controller.signal
        });

        setDashboard(dashboardRes.data);
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
          return;
        }

        console.error(err);
        alert(err.response?.data?.message || "Unable to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      controller.abort();
    };
  }, [rangeFilter, status, chartDays]);

  const applyQuickRange = (daysValue) => {
    setSelectedRangeOption(String(daysValue));
    setRangeFilter({
      type: "days",
      days: daysValue,
      from: "",
      to: ""
    });

    if (chartDays > daysValue) {
      setChartDays(daysValue);
    }
  };

  const handleRangeOptionChange = (event) => {
    const value = String(event.target.value || "");
    setSelectedRangeOption(value);

    if (value === "custom") {
      return;
    }

    applyQuickRange(Number(value));
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) {
      alert("Please select both From and To dates");
      return;
    }

    const fromDate = new Date(customFrom);
    const toDate = new Date(customTo);

    if (fromDate > toDate) {
      alert("From date must be before To date");
      return;
    }

    const diffDays = getDayDiffInclusive(customFrom, customTo);

    setRangeFilter({
      type: "custom",
      days: diffDays,
      from: customFrom,
      to: customTo
    });
    setSelectedRangeOption("custom");

    if (chartDays > diffDays) {
      setChartDays(diffDays);
    }
  };

  const rangePrefix =
    rangeFilter.type === "custom"
      ? "Selected Range"
      : rangeFilter.days === 1
        ? "Today's"
        : `${rangeFilter.days}-Day`;
  const statusLabel = formatOrderStatus(status);
  const dashboardSnapshot = useMemo(() => {
    const normalizedOrders = orders.map((order) => ({
      ...order,
      _id: order._id || order.id || order.orderId,
      totalAmount: Number(order.totalAmount || order.grandTotal || order.total || 0),
      status: normalizeOrderStatus(order.status),
      items: Array.isArray(order.items)
        ? order.items.map((item) => ({
            ...item,
            quantity: item.quantity ?? item.qty ?? 1
          }))
        : []
    }));
    const completedOrders = normalizedOrders.filter((order) =>
      ["DELIVERED", "DISPATCHED"].includes(order.status)
    );
    const active = normalizedOrders.filter(
      (order) => !["DELIVERED", "DISPATCHED", "CANCELLED"].includes(order.status)
    );
    const totalRevenue = normalizedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    return {
      cards: {
        totalRevenue,
        totalOrders: normalizedOrders.length,
        completedOrders: completedOrders.length,
        avgOrderValue: normalizedOrders.length ? totalRevenue / normalizedOrders.length : 0,
        lowStockCount: dashboard?.cards?.lowStockCount || 0
      },
      salesBreakdown: {
        completed: completedOrders.length,
        active: active.length
      },
      kitchenStatus: {
        newOrders: active.filter((order) => order.status === "NEW").length,
        preparing: active.filter((order) => order.status === "PREPARING").length,
        ready: active.filter((order) => order.status === "READY").length,
        delivered: completedOrders.length,
        avgPrepMinutes: dashboard?.kitchenStatus?.avgPrepMinutes || 0
      },
      activeOrders: active.slice(0, 6)
    };
  }, [dashboard?.cards?.lowStockCount, dashboard?.kitchenStatus?.avgPrepMinutes, orders]);

  const cards = useMemo(() => {
    const c = orders.length ? dashboardSnapshot.cards : dashboard?.cards || {};

    return [
      {
        title: `${rangePrefix} Revenue`,
        value: INR_FORMATTER.format(c.totalRevenue || 0),
        subtitle: "Total Sales",
        color: "#38c98f",
        icon: "₹"
      },
      {
        title: `${rangePrefix} Orders`,
        value: (c.totalOrders || 0).toString(),
        subtitle: `${statusLabel} view`,
        color: "#b67de5",
        icon: "◍"
      },
      {
        title: "Completed Orders",
        value: (c.completedOrders || 0).toString(),
        subtitle: "Served",
        color: "#6d7ff5",
        icon: "✓"
      },
      {
        title: "Avg. Order Value",
        value: INR_FORMATTER.format(c.avgOrderValue || 0),
        subtitle: `Low Stock: ${c.lowStockCount || 0}`,
        color: "#f98569",
        icon: "↗"
      }
    ];
  }, [dashboard, dashboardSnapshot.cards, orders.length, rangePrefix, statusLabel]);

  const salesBreakdown = orders.length
    ? dashboardSnapshot.salesBreakdown
    : dashboard?.salesBreakdown || { completed: 0, active: 0 };
  const totalForDonut = salesBreakdown.completed + salesBreakdown.active;
  const completedPct = totalForDonut
    ? Math.round((salesBreakdown.completed / totalForDonut) * 100)
    : 0;
  const activePct = totalForDonut ? 100 - completedPct : 0;

  const topItems = dashboard?.topItems || [];
  const series = dashboard?.series || [];
  const kitchenStatus = orders.length
    ? dashboardSnapshot.kitchenStatus
    : dashboard?.kitchenStatus || {};
  const activeOrders = orders.length ? dashboardSnapshot.activeOrders : [];
  const pipelineRows = [
    { status: "NEW", value: kitchenStatus.newOrders || 0 },
    { status: "PREPARING", value: kitchenStatus.preparing || 0 },
    { status: "READY", value: kitchenStatus.ready || 0 },
    { status: "DELIVERED", value: kitchenStatus.delivered || 0 }
  ];
  const quickActions = [
    { label: "Add Order", page: "POS" },
    { label: "Add Menu Item", page: "MENU_MANAGEMENT" },
    { label: "View Kitchen", page: "KITCHEN" },
    { label: "Inventory", page: "INVENTORY" }
  ];
  const maxSeriesValue = Math.max(
    1,
    ...series.map((s) => (metric === "orders" ? s.orders : s.revenue))
  );

  const activeRangeLabel =
    rangeFilter.type === "custom"
      ? `${rangeFilter.from} to ${rangeFilter.to}`
      : rangeFilter.days === 1
        ? "Today"
        : `Last ${rangeFilter.days} days`;

  const chartRange = dashboard?.chartRange;
  const chartSubtitle = chartRange?.days
    ? `Last ${chartRange.days} day${chartRange.days > 1 ? "s" : ""}`
    : "Order trend";

  return (
    <PageContainer>
      <div style={toolbar}>
        <div>
          <h2 style={toolbarTitle}>Dashboard Overview</h2>
          <p style={toolbarMeta}>
            {user?.name
              ? `${user.name}, here is your live business snapshot.`
              : "Live business snapshot"}
          </p>
        </div>

        <div style={toolbarControls}>
          <div style={compactControlRow}>
            <label style={controlGroup}>
              <span style={controlLabel}>Range</span>
              <select
                style={controlSelect}
                value={selectedRangeOption}
                onChange={handleRangeOptionChange}
              >
                {RANGE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={controlGroup}>
              <span style={controlLabel}>Status</span>
              <select
                style={controlSelect}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {ORDER_STATUS_FILTER_OPTIONS.map((value) => (
                  <option key={value.value} value={value.value}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedRangeOption === "custom" ? (
            <div style={dateRangeRow}>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={dateInput}
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={dateInput}
              />
              <button onClick={applyCustomRange} style={applyBtn}>
                Apply Range
              </button>
            </div>
          ) : null}

          <div style={toolbarMetaChip}>
            Showing {activeRangeLabel} · {statusLabel}
          </div>
        </div>
      </div>

      {loading ? <p style={{ color: "#9ea5b8" }}>Loading dashboard...</p> : null}

      <div style={quickActionGrid}>
        {quickActions.map((action) => (
          <button
            key={action.label}
            style={quickActionBtn}
            onClick={() => onNavigate?.(action.page)}
          >
            {action.label}
          </button>
        ))}
      </div>

      <div style={statGrid}>
        {[cards[0], cards[1], cards[3]].filter(Boolean).map((card) => (
          <div key={card.title} style={{ ...statCard, background: card.color }}>
            <div style={statIcon}>{card.icon}</div>
            <div>
              <div style={statValue}>{card.value}</div>
              <div style={statTitle}>{card.title}</div>
              <div style={statSubtitle}>{card.subtitle}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={opsGrid}>
        <section style={panel}>
          <div style={panelHeader}>
            <div>
              <h3 style={panelTitle}>Order Management</h3>
              <div style={panelSub}>Live status distribution</div>
            </div>
            <div style={chip}>{kitchenStatus.longestWaitMinutes || 0}m max wait</div>
          </div>
          <div style={pipelineList}>
            {pipelineRows.map((row) => (
              <div key={row.status} style={pipelineRow}>
                <span>{formatOrderStatus(row.status)}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section style={panel}>
          <div style={panelHeader}>
            <div>
              <h3 style={panelTitle}>Live Kitchen</h3>
              <div style={panelSub}>Active orders and timers</div>
            </div>
            <div style={chip}>{kitchenStatus.avgPrepMinutes || 0}m avg prep</div>
          </div>
          {!activeOrders.length ? (
            <p style={{ color: "#9ea5b8", margin: 0 }}>No active kitchen orders.</p>
          ) : (
            <div style={liveOrderList}>
              {activeOrders.map((order) => {
                const ageMinutes = Math.max(
                  0,
                  Math.floor((Date.now() - new Date(order.createdAt || Date.now()).getTime()) / 60000)
                );
                return (
                  <div key={order._id} style={liveOrderRow}>
                    <div>
                      <strong>#{String(order._id).slice(-6).toUpperCase()}</strong>
                      <div style={panelSub}>
                        {(order.items || []).map((item) => `${item.name} x${item.quantity}`).join(", ")}
                      </div>
                    </div>
                    <span style={liveStatus}>
                      {formatOrderStatus(order.status)} · {ageMinutes}m
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div style={statusFlowStrip}>
        {ORDER_STATUS_FLOW.map((statusName) => (
          <span key={statusName} style={statusFlowPill}>{formatOrderStatus(statusName)}</span>
        ))}
      </div>

      <div style={insightGrid}>
        <section style={panel}>
          <div style={panelHeader}>
            <div>
              <h3 style={panelTitle}>Sales Details</h3>
              <div style={panelSub}>Order status split</div>
            </div>
            <div style={chip}>{statusLabel}</div>
          </div>

          <div style={salesWrap}>
            <div style={donutWrap}>
              <div
                style={{
                  ...donut,
                  background: `conic-gradient(#52d494 0deg ${completedPct * 3.6}deg, #ff8a6a ${completedPct * 3.6}deg 360deg)`
                }}
              />
              <div style={donutCenter}>{completedPct}%</div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={legendItem}>
                <span style={{ ...legendDot, background: "#52d494" }} />
                <span style={legendLabel}>Completed</span>
                <span style={legendValue}>{salesBreakdown.completed}</span>
              </div>
              <div style={legendItem}>
                <span style={{ ...legendDot, background: "#ff8a6a" }} />
                <span style={legendLabel}>Active</span>
                <span style={legendValue}>{salesBreakdown.active}</span>
              </div>
              <div style={legendItem}>
                <span style={{ ...legendDot, background: "#7685ff" }} />
                <span style={legendLabel}>Active %</span>
                <span style={legendValue}>{activePct}%</span>
              </div>
            </div>
          </div>
        </section>

        <section style={panel}>
          <div style={panelHeader}>
            <div>
              <h3 style={panelTitle}>Order Chart</h3>
              <div style={panelSub}>{chartSubtitle}</div>
            </div>
            <div style={chartControls}>
              <select
                style={dropdown}
                value={chartDays}
                onChange={(e) => setChartDays(Number(e.target.value))}
              >
                {chartRangeOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}D
                  </option>
                ))}
              </select>

              <select
                style={dropdown}
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
              >
                <option value="orders">Orders</option>
                <option value="revenue">Revenue</option>
              </select>
            </div>
          </div>

          {series.length === 0 ? (
            <p style={{ color: "#9ea5b8", margin: 0 }}>No chart data for selected range.</p>
          ) : (
            <div style={barChartRow}>
              {series.map((bar) => {
                const value = metric === "orders" ? bar.orders : bar.revenue;
                const barHeight = Math.max(36, Math.round((value / maxSeriesValue) * 200));

                return (
                  <div key={bar.date || bar.label} style={barCol}>
                    <div
                      style={{
                        ...barTrack,
                        height: `${barHeight}px`,
                        background:
                          value === maxSeriesValue
                            ? "linear-gradient(180deg, #f9db66, #f4c93a)"
                            : "#3a3d48"
                      }}
                    >
                      <span style={barLabelValue}>
                        {metric === "orders" ? value : INR_FORMATTER.format(value)}
                      </span>
                    </div>
                    <div style={barDay}>{bar.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section style={{ ...panel, marginTop: 14 }}>
        <div style={panelHeader}>
          <h3 style={panelTitle}>Trending Orders</h3>
          <div style={panelSub}>Top selling items</div>
        </div>

        {topItems.length === 0 ? (
          <p style={{ color: "#9ea5b8", margin: 0 }}>No orders in selected range.</p>
        ) : (
          <div style={trendingGrid}>
            {topItems.slice(0, 3).map((item) => (
              <article key={item.name} style={foodCard}>
                <img
                  src={pickImageForItem(item.name)}
                  alt={item.name}
                  style={foodImage}
                />
                <div style={foodMeta}>
                  <span>{item.name}</span>
                  <span style={foodPrice}>{INR_FORMATTER.format(item.revenue || 0)}</span>
                </div>
                <div style={foodQty}>Qty Sold: {item.quantity}</div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}

const toolbar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
  flexWrap: "wrap"
};

const toolbarTitle = {
  margin: 0,
  color: "#f4f6fa"
};

const toolbarMeta = {
  margin: "4px 0 0",
  color: "#949caf",
  fontSize: 13
};

const toolbarControls = {
  display: "grid",
  gap: 8,
  width: "min(560px, 100%)"
};

const compactControlRow = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
  flexWrap: "wrap"
};

const controlGroup = {
  display: "grid",
  gap: 4,
  minWidth: 160,
  flex: "1 1 180px"
};

const controlLabel = {
  color: "#8f98af",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.3
};

const controlSelect = {
  height: 36,
  border: "1px solid #343744",
  borderRadius: 10,
  background: "#1f222b",
  color: "#c3c9d7",
  padding: "0 12px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600
};

const dateRangeRow = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap"
};

const dateInput = {
  height: 32,
  border: "1px solid #343744",
  borderRadius: 8,
  background: "#1f222b",
  color: "#c3c9d7",
  padding: "0 10px"
};

const applyBtn = {
  height: 32,
  border: "1px solid #f4c93a",
  borderRadius: 8,
  background: "#f4c93a",
  color: "#17181d",
  fontWeight: 700,
  padding: "0 12px",
  cursor: "pointer"
};

const toolbarMetaChip = {
  justifySelf: "end",
  color: "#96a0b6",
  fontSize: 12
};

const quickActionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
  marginBottom: 14
};

const quickActionBtn = {
  minHeight: 54,
  border: "1px solid rgba(132, 247, 255, 0.28)",
  borderRadius: 12,
  background: "linear-gradient(135deg, rgba(27, 34, 48, 0.88), rgba(12, 18, 29, 0.88))",
  boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
  color: "#ecfbff",
  fontWeight: 800,
  cursor: "pointer"
};

const statGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginBottom: 14
};

const opsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 14,
  marginBottom: 14
};

const pipelineList = {
  display: "grid",
  gap: 10,
  marginTop: 12
};

const pipelineRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid #2d3445",
  borderRadius: 10,
  background: "rgba(255,255,255,0.03)",
  color: "#e8edf8",
  padding: "12px 14px"
};

const liveOrderList = {
  display: "grid",
  gap: 10
};

const liveOrderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  border: "1px solid #2d3445",
  borderRadius: 10,
  background: "rgba(255,255,255,0.03)",
  color: "#e8edf8",
  padding: "10px 12px"
};

const liveStatus = {
  color: "#84f7ff",
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap"
};

const statusFlowStrip = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  margin: "0 0 14px"
};

const statusFlowPill = {
  border: "1px solid #30384d",
  borderRadius: 999,
  color: "#aeb9cf",
  background: "rgba(255,255,255,0.03)",
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 800
};


const statCard = {
  borderRadius: 10,
  padding: "14px 14px",
  display: "flex",
  gap: 10,
  color: "#101116"
};

const statIcon = {
  height: 30,
  width: 30,
  borderRadius: 8,
  background: "rgba(16,17,22,0.2)",
  display: "grid",
  placeItems: "center",
  fontSize: 12,
  fontWeight: 800,
  marginTop: 3
};

const statValue = {
  fontWeight: 800,
  fontSize: 16
};

const statTitle = {
  fontSize: 12,
  fontWeight: 700,
  marginTop: 2
};

const statSubtitle = {
  fontSize: 11,
  opacity: 0.7,
  marginTop: 2
};

const insightGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 14
};

const panel = {
  background: "#1a1c23",
  border: "1px solid #2a2d38",
  borderRadius: 12,
  padding: 14
};

const panelHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
  gap: 10
};

const panelTitle = {
  margin: 0,
  color: "#f4f6fa",
  fontSize: 22,
  fontWeight: 700
};

const panelSub = {
  color: "#949caf",
  fontSize: 13,
  marginTop: 4
};

const chip = {
  color: "#f4c93a",
  fontWeight: 700,
  fontSize: 12,
  border: "1px solid #3b3f4e",
  borderRadius: 999,
  padding: "6px 10px"
};

const dropdown = {
  height: 34,
  border: "1px solid #343744",
  borderRadius: 8,
  background: "#1f222b",
  color: "#c3c9d7",
  padding: "0 10px",
  cursor: "pointer"
};

const chartControls = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
};

const salesWrap = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap"
};

const donutWrap = {
  position: "relative",
  width: 160,
  height: 160
};

const donut = {
  width: "100%",
  height: "100%",
  borderRadius: "50%"
};

const donutCenter = {
  position: "absolute",
  inset: 30,
  borderRadius: "50%",
  background: "#1a1c23",
  border: "1px solid #2f3240",
  display: "grid",
  placeItems: "center",
  color: "#f4f6fa",
  fontSize: 24,
  fontWeight: 800
};

const legendItem = {
  display: "grid",
  gridTemplateColumns: "14px 1fr auto",
  alignItems: "center",
  gap: 8,
  marginBottom: 12
};

const legendDot = {
  width: 10,
  height: 10,
  borderRadius: 3
};

const legendLabel = {
  color: "#a0a8bb",
  fontSize: 14
};

const legendValue = {
  color: "#e4e8f1",
  fontWeight: 700,
  fontSize: 13
};

const barChartRow = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 10,
  height: 240,
  paddingTop: 20,
  overflowX: "auto"
};

const barCol = {
  minWidth: 36,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end"
};

const barTrack = {
  width: 18,
  borderRadius: 8,
  position: "relative",
  minHeight: 36
};

const barDay = {
  marginTop: 10,
  color: "#98a0b2",
  fontSize: 12,
  whiteSpace: "nowrap"
};

const barLabelValue = {
  position: "absolute",
  top: -22,
  left: "50%",
  transform: "translateX(-50%)",
  color: "#f4f6fa",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap"
};

const trendingGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12
};

const foodCard = {
  background: "#111217",
  borderRadius: 10,
  overflow: "hidden",
  border: "1px solid #2b2e39"
};

const foodImage = {
  width: "100%",
  height: 128,
  objectFit: "cover"
};

const foodMeta = {
  color: "#f3f5fb",
  display: "flex",
  justifyContent: "space-between",
  fontSize: 13,
  padding: "10px 10px 8px"
};

const foodPrice = {
  color: "#f4c93a",
  fontWeight: 700
};

const foodQty = {
  color: "#a5acc0",
  fontSize: 12,
  padding: "0 10px 10px"
};
