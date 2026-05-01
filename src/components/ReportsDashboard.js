import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PageContainer from "./ui/PageContainer";
import {
  ORDER_STATUS_FILTER_OPTIONS,
  formatOrderStatus,
  normalizeOrderStatus,
  isCompletedOrderStatus,
  getOrderStatusTone
} from "../access";
import { API_BASE_URL } from "../config";
import { useOrderStore } from "../store/orderStore";

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const RANGE_OPTIONS = [
  { label: "Today", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 }
];

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readMetric = (value, fallbackValue) => {
  if (value === null || value === undefined) {
    return fallbackValue;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

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

const getDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDay = (value) => {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const getRangeLabel = (rangeFilter) => {
  if (rangeFilter.type === "custom") {
    return `${rangeFilter.from} to ${rangeFilter.to}`;
  }

  if (rangeFilter.days === 1) {
    return "Today";
  }

  return `Last ${rangeFilter.days} days`;
};

const getRangeDates = (rangeFilter) => {
  if (rangeFilter.type === "custom") {
    return {
      from: startOfDay(rangeFilter.from),
      to: endOfDay(rangeFilter.to)
    };
  }

  const to = endOfDay(new Date());
  const from = startOfDay(to);
  from.setDate(from.getDate() - rangeFilter.days + 1);

  return { from, to };
};

const aggregateItems = (orders) => {
  const itemMap = {};

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const name = item.name || "Unknown Item";
      if (!itemMap[name]) {
        itemMap[name] = {
          name,
          quantity: 0,
          revenue: 0
        };
      }

      const quantity = toNumber(item.quantity);
      const price = toNumber(item.price);
      itemMap[name].quantity += quantity;
      itemMap[name].revenue += quantity * price;
    });
  });

  return Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);
};

const aggregateDayWiseSales = (orders) => {
  const map = {};

  orders.forEach((order) => {
    const key = getDateKey(order.createdAt);
    if (!key) {
      return;
    }

    if (!map[key]) {
      map[key] = {
        date: key,
        orders: 0,
        revenue: 0
      };
    }

    map[key].orders += 1;
    map[key].revenue += toNumber(order.totalAmount);
  });

  return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
};

const aggregateItemDayWise = (orders) => {
  const dayMap = {};

  orders.forEach((order) => {
    const key = getDateKey(order.createdAt);
    if (!key) {
      return;
    }

    if (!dayMap[key]) {
      dayMap[key] = {};
    }

    (order.items || []).forEach((item) => {
      const name = item.name || "Unknown Item";

      if (!dayMap[key][name]) {
        dayMap[key][name] = {
          quantity: 0,
          revenue: 0
        };
      }

      const quantity = toNumber(item.quantity);
      const price = toNumber(item.price);
      dayMap[key][name].quantity += quantity;
      dayMap[key][name].revenue += quantity * price;
    });
  });

  return dayMap;
};

export function OrderAnalyticsV2() {
  const [rangeFilter, setRangeFilter] = useState({
    type: "days",
    days: 30,
    from: "",
    to: ""
  });
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [status, setStatus] = useState("ALL");

  const [dashboard, setDashboard] = useState(null);
  const orders = useOrderStore((state) => state.orders);
  const setOrders = useOrderStore((state) => state.setOrders);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedDay, setSelectedDay] = useState("");

  useEffect(() => {
    console.log("Orders:", orders);
  }, [orders]);

  useEffect(() => {
    const controller = new AbortController();

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const params = { status };

        if (rangeFilter.type === "custom") {
          params.from = rangeFilter.from;
          params.to = rangeFilter.to;
        } else {
          params.days = rangeFilter.days;
        }

        const [dashboardRes, ordersRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/reports/dashboard`, {
            params,
            signal: controller.signal
          }),
          axios.get(`${API_BASE_URL}/api/orders`, {
            signal: controller.signal
          })
        ]);

        setDashboard(dashboardRes.data || null);
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
          return;
        }

        console.error(err);
        alert(err.response?.data?.message || "Unable to load analytics");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();

    return () => {
      controller.abort();
    };
  }, [rangeFilter, setOrders, status]);

  const rangeDates = useMemo(() => getRangeDates(rangeFilter), [rangeFilter]);
  const rangeLabel = useMemo(() => getRangeLabel(rangeFilter), [rangeFilter]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const createdAt = new Date(order.createdAt);
        if (Number.isNaN(createdAt.getTime())) {
          return false;
        }

        if (createdAt < rangeDates.from || createdAt > rangeDates.to) {
          return false;
        }

        if (status !== "ALL" && normalizeOrderStatus(order.status) !== status) {
          return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, rangeDates, status]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId("");
      return;
    }

    const exists = filteredOrders.some((order) => order._id === selectedOrderId);
    if (!exists) {
      setSelectedOrderId(filteredOrders[0]._id);
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder = useMemo(() => {
    return filteredOrders.find((order) => order._id === selectedOrderId) || null;
  }, [filteredOrders, selectedOrderId]);

  const itemWiseTotals = useMemo(() => aggregateItems(filteredOrders), [filteredOrders]);
  const dayWiseSales = useMemo(() => aggregateDayWiseSales(filteredOrders), [filteredOrders]);
  const itemDayWiseMap = useMemo(() => aggregateItemDayWise(filteredOrders), [filteredOrders]);

  const dayOptions = useMemo(() => {
    return Object.keys(itemDayWiseMap).sort((a, b) => b.localeCompare(a));
  }, [itemDayWiseMap]);

  useEffect(() => {
    if (!dayOptions.length) {
      setSelectedDay("");
      return;
    }

    if (!dayOptions.includes(selectedDay)) {
      setSelectedDay(dayOptions[0]);
    }
  }, [dayOptions, selectedDay]);

  const selectedDayItems = useMemo(() => {
    if (!selectedDay || !itemDayWiseMap[selectedDay]) {
      return [];
    }

    return Object.entries(itemDayWiseMap[selectedDay])
      .map(([name, values]) => ({
        name,
        quantity: values.quantity,
        revenue: values.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [selectedDay, itemDayWiseMap]);

  const fallbackTotalOrders = filteredOrders.length;
  const fallbackTotalRevenue = filteredOrders.reduce(
    (sum, order) => sum + toNumber(order.totalAmount),
    0
  );
  const fallbackCompletedOrders = filteredOrders.filter(
    (order) => isCompletedOrderStatus(order.status)
  ).length;
  const fallbackActiveOrders = filteredOrders.filter(
    (order) => !isCompletedOrderStatus(order.status)
  ).length;
  const fallbackAvgBill = fallbackTotalOrders
    ? fallbackTotalRevenue / fallbackTotalOrders
    : 0;

  const cards = dashboard?.cards || {};
  const totalRevenue = readMetric(cards.totalRevenue, fallbackTotalRevenue);
  const totalOrders = readMetric(cards.totalOrders, fallbackTotalOrders);
  const avgOrderValue = readMetric(cards.avgOrderValue, fallbackAvgBill);
  const completedOrders = readMetric(cards.completedOrders, fallbackCompletedOrders);
  const activeOrders = readMetric(
    cards.activeOrders,
    readMetric(cards.pendingOrders, fallbackActiveOrders)
  );
  const statusLabel = formatOrderStatus(status);

  const applyQuickRange = (days) => {
    setRangeFilter({
      type: "days",
      days,
      from: "",
      to: ""
    });
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) {
      alert("Please select both From and To dates");
      return;
    }

    if (new Date(customFrom) > new Date(customTo)) {
      alert("From date must be before To date");
      return;
    }

    setRangeFilter({
      type: "custom",
      days: 0,
      from: customFrom,
      to: customTo
    });
  };

  return (
    <PageContainer>
      <section style={pageHeader}>
        <div>
          <h2 style={pageTitle}>Sales and Orders Analytics</h2>
          <p style={pageSub}>
            Track revenue, order count, bill details, item-wise sales, and day-wise trends.
          </p>
        </div>

        <div style={chip}>{rangeLabel}</div>
      </section>

      <section style={filtersWrap}>
        <div style={filterRow}>
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.days}
              onClick={() => applyQuickRange(option.days)}
              style={{
                ...filterButton,
                ...(rangeFilter.type === "days" && rangeFilter.days === option.days
                  ? filterButtonActive
                  : {})
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div style={filterRow}>
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
          <button onClick={applyCustomRange} style={primaryButton}>
            Apply Range
          </button>
        </div>

        <div style={filterRow}>
          <span style={filterLabel}>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={dateInput}>
            {ORDER_STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div style={chip}>{statusLabel}</div>
        </div>
      </section>

      {loading ? <p style={loadingText}>Loading analytics...</p> : null}

      <section style={cardGrid}>
        <MetricCard
          title="Total Revenue"
          value={INR_FORMATTER.format(totalRevenue)}
          subtitle="Selected period sales"
        />
        <MetricCard
          title="Total Orders"
          value={String(totalOrders)}
          subtitle="Orders in selected period"
        />
        <MetricCard
          title="Average Bill Amount"
          value={INR_FORMATTER.format(avgOrderValue)}
          subtitle="Average order value"
        />
        <MetricCard
          title="Completed / Active"
          value={`${completedOrders} / ${activeOrders}`}
          subtitle="Order workflow split"
        />
      </section>

      <section style={splitGrid}>
        <div style={panel}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Customer Orders</h3>
            <span style={panelMeta}>{filteredOrders.length} orders</span>
          </div>

          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Order</th>
                  <th style={th}>Date</th>
                  <th style={th}>Status</th>
                  <th style={th}>Bill Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order._id}
                    onClick={() => setSelectedOrderId(order._id)}
                    style={{
                      ...trClickable,
                      ...tr,
                      ...(selectedOrderId === order._id ? trActive : {})
                    }}
                  >
                    <td style={td}>#{order._id?.slice(-6)?.toUpperCase() || "-"}</td>
                    <td style={td}>{formatDateTime(order.createdAt)}</td>
                    <td style={td}>
                      <span style={{ ...statusPill, ...getOrderStatusTone(order.status) }}>
                        {formatOrderStatus(order.status)}
                      </span>
                    </td>
                    <td style={td}>{INR_FORMATTER.format(toNumber(order.totalAmount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!filteredOrders.length ? (
            <p style={emptyText}>No orders found for current filters.</p>
          ) : null}
        </div>

        <div style={panel}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Full Bill</h3>
            <span style={panelMeta}>
              {selectedOrder ? `Order #${selectedOrder._id.slice(-6).toUpperCase()}` : "-"}
            </span>
          </div>

          {selectedOrder ? (
            <>
              <div style={billMeta}>
                <div>
                  <div style={billMetaLabel}>Created</div>
                  <div style={billMetaValue}>{formatDateTime(selectedOrder.createdAt)}</div>
                </div>
                <div>
                  <div style={billMetaLabel}>Status</div>
                  <div style={billMetaValue}>{formatOrderStatus(selectedOrder.status)}</div>
                </div>
              </div>

              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Item</th>
                      <th style={th}>Qty</th>
                      <th style={th}>Rate</th>
                      <th style={th}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((item, index) => {
                      const quantity = toNumber(item.quantity);
                      const price = toNumber(item.price);
                      const lineAmount = quantity * price;

                      return (
                        <tr key={`${selectedOrder._id}-${item.name}-${index}`} style={tr}>
                          <td style={td}>{item.name || "-"}</td>
                          <td style={td}>{quantity}</td>
                          <td style={td}>{INR_FORMATTER.format(price)}</td>
                          <td style={td}>{INR_FORMATTER.format(lineAmount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={billTotalBox}>
                <span style={billTotalLabel}>Bill Total</span>
                <span style={billTotalValue}>
                  {INR_FORMATTER.format(toNumber(selectedOrder.totalAmount))}
                </span>
              </div>
            </>
          ) : (
            <p style={emptyText}>Select an order to view full bill details.</p>
          )}
        </div>
      </section>

      <section style={splitGrid}>
        <div style={panel}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Day-wise Sales</h3>
            <span style={panelMeta}>Time period pricing view</span>
          </div>

          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Orders</th>
                  <th style={th}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {dayWiseSales.map((row) => (
                  <tr key={row.date} style={tr}>
                    <td style={td}>{formatDay(row.date)}</td>
                    <td style={td}>{row.orders}</td>
                    <td style={td}>{INR_FORMATTER.format(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!dayWiseSales.length ? (
            <p style={emptyText}>No day-wise sales data for selected filters.</p>
          ) : null}
        </div>

        <div style={panel}>
          <div style={panelHeader}>
            <h3 style={panelTitle}>Item-wise Sales</h3>
            <span style={panelMeta}>Selected period totals</span>
          </div>

          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Item</th>
                  <th style={th}>Quantity</th>
                  <th style={th}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {itemWiseTotals.map((item) => (
                  <tr key={item.name} style={tr}>
                    <td style={td}>{item.name}</td>
                    <td style={td}>{item.quantity}</td>
                    <td style={td}>{INR_FORMATTER.format(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!itemWiseTotals.length ? (
            <p style={emptyText}>No item-wise sales data for selected filters.</p>
          ) : null}
        </div>
      </section>

      <section style={panel}>
        <div style={panelHeader}>
          <h3 style={panelTitle}>Item-wise by Day</h3>
          <div style={filterRow}>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              style={dateInput}
            >
              {dayOptions.map((day) => (
                <option key={day} value={day}>
                  {formatDay(day)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Item</th>
                <th style={th}>Quantity</th>
                <th style={th}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {selectedDayItems.map((item) => (
                <tr key={`${selectedDay}-${item.name}`} style={tr}>
                  <td style={td}>{item.name}</td>
                  <td style={td}>{item.quantity}</td>
                  <td style={td}>{INR_FORMATTER.format(item.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!selectedDayItems.length ? (
          <p style={emptyText}>No item data available for the selected day.</p>
        ) : null}
      </section>
    </PageContainer>
  );
}

export default function ReportsDashboard({ businessType = "" }) {
  const isCloudKitchen = String(businessType || "").trim().toUpperCase() === "CLOUD_KITCHEN";

  if (!isCloudKitchen) {
    return <OrderAnalyticsV2 />;
  }

  return (
    <PageContainer>
      <section style={pageHeader}>
        <div>
          <h2 style={pageTitle}>Reports</h2>
          <p style={pageSub}>Financial reports for your cloud kitchen.</p>
        </div>
      </section>

      <section style={cardGrid}>
        <div style={metricCard}>
          <div style={metricTitle}>Financial Reports</div>
          <div style={metricValue}>Sales</div>
          <div style={metricSub}>Revenue, billing, and payment summaries.</div>
        </div>
      </section>
    </PageContainer>
  );
}

function MetricCard({ title, value, subtitle }) {
  return (
    <div style={metricCard}>
      <div style={metricTitle}>{title}</div>
      <div style={metricValue}>{value}</div>
      <div style={metricSub}>{subtitle}</div>
    </div>
  );
}

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 16
};

const pageTitle = {
  margin: 0,
  color: "#f7f8fb",
  fontSize: 28,
  fontWeight: 800
};

const pageSub = {
  margin: "6px 0 0",
  color: "#9ea7bc",
  fontSize: 14
};

const chip = {
  background: "rgba(244, 201, 58, 0.18)",
  color: "#f4c93a",
  border: "1px solid rgba(244, 201, 58, 0.35)",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 700
};

const filtersWrap = {
  border: "1px solid #2a2d38",
  background: "#151821",
  borderRadius: 14,
  padding: 12,
  marginBottom: 16,
  display: "grid",
  gap: 10
};

const filterRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center"
};

const filterLabel = {
  color: "#9ea7bc",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.3,
  textTransform: "uppercase"
};

const filterButton = {
  height: 34,
  border: "1px solid #353949",
  background: "#202431",
  color: "#d8def0",
  borderRadius: 8,
  padding: "0 12px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600
};

const filterButtonActive = {
  background: "#f4c93a",
  color: "#17181f",
  borderColor: "#f4c93a"
};

const dateInput = {
  height: 34,
  border: "1px solid #343949",
  borderRadius: 8,
  padding: "0 10px",
  background: "#10131b",
  color: "#edf0f8",
  minWidth: 160
};

const primaryButton = {
  height: 34,
  border: 0,
  borderRadius: 8,
  padding: "0 12px",
  background: "#38c98f",
  color: "#102317",
  fontWeight: 700,
  cursor: "pointer"
};

const loadingText = {
  color: "#9aa6c5",
  margin: "0 0 12px"
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginBottom: 16
};

const metricCard = {
  border: "1px solid #2c3040",
  background: "#171a24",
  borderRadius: 12,
  padding: 14,
  boxShadow: "0 10px 24px rgba(0,0,0,0.25)"
};

const metricTitle = {
  color: "#9ca7bf",
  fontSize: 13,
  marginBottom: 8
};

const metricValue = {
  color: "#f2f5fc",
  fontSize: 24,
  fontWeight: 800,
  marginBottom: 6
};

const metricSub = {
  color: "#7f88a0",
  fontSize: 12
};

const splitGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: 12,
  marginBottom: 12
};

const panel = {
  border: "1px solid #2a2d38",
  background: "#151821",
  borderRadius: 14,
  padding: 12
};

const panelHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 10
};

const panelTitle = {
  margin: 0,
  color: "#f4f6fc",
  fontSize: 17
};

const panelMeta = {
  color: "#9ca7c0",
  fontSize: 12
};

const tableWrap = {
  width: "100%",
  overflowX: "auto"
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 420
};

const th = {
  textAlign: "left",
  color: "#9ca7c0",
  fontSize: 12,
  fontWeight: 700,
  borderBottom: "1px solid #303548",
  padding: "10px 8px"
};

const td = {
  color: "#ecf0fb",
  fontSize: 13,
  borderBottom: "1px solid #252937",
  padding: "10px 8px",
  verticalAlign: "top"
};

const tr = {
  cursor: "default"
};

const trActive = {
  background: "rgba(62, 199, 143, 0.12)"
};

const trClickable = {
  cursor: "pointer"
};

const statusPill = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  minWidth: 84,
  height: 24,
  fontSize: 11,
  fontWeight: 700,
  border: "1px solid transparent"
};

const emptyText = {
  margin: "10px 0 0",
  color: "#9ca7bf",
  fontSize: 13
};

const billMeta = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(120px, 1fr))",
  gap: 10,
  marginBottom: 10
};

const billMetaLabel = {
  color: "#91a0bf",
  fontSize: 11,
  marginBottom: 4
};

const billMetaValue = {
  color: "#f1f4fc",
  fontSize: 13,
  fontWeight: 600
};

const billTotalBox = {
  marginTop: 10,
  borderTop: "1px solid #2e3343",
  paddingTop: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between"
};

const billTotalLabel = {
  color: "#a3afc6",
  fontSize: 13,
  fontWeight: 700
};

const billTotalValue = {
  color: "#3ddf9b",
  fontSize: 18,
  fontWeight: 800
};
