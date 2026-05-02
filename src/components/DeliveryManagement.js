import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import PageContainer from "./ui/PageContainer";
import { formatOrderStatus, normalizeOrderStatus } from "../access";
import { API_BASE_URL } from "../config";
import { useOrderStore } from "../store/orderStore";

const CURRENCY = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR"
});

const createAssignDraft = () => ({
  partnerName: "",
  partnerPhone: "",
  etaMinutes: "",
  notes: ""
});

export default function DeliveryManagement() {
  const { orders: sharedOrders, setOrders, updateOrderStatus } = useOrderStore();
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingOrderId, setSavingOrderId] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/delivery`);
      const nextOrders = Array.isArray(res.data) ? res.data : [];
      setOrders(nextOrders);
      setDrafts((prev) =>
        nextOrders.reduce((acc, order) => {
          acc[order._id] = prev[order._id] || {
            partnerName: order.delivery?.partnerName || "",
            partnerPhone: order.delivery?.partnerPhone || "",
            etaMinutes: String(order.delivery?.etaMinutes || ""),
            notes: order.delivery?.notes || ""
          };
          return acc;
        }, {})
      );
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to load delivery orders");
    } finally {
      setLoading(false);
    }
  }, [setOrders]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 8000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const orders = useMemo(
    () =>
      sharedOrders.map((order) => ({
        ...order,
        _id: String(order._id || order.id || order.orderId || ""),
        status: normalizeOrderStatus(order.status),
        totalAmount: Number(order.totalAmount || order.grandTotal || order.total || 0),
        customerName: order.customerName || order.customer?.name || "",
        customerPhone: order.customerPhone || order.customer?.phone || "",
        items: Array.isArray(order.items)
          ? order.items.map((item) => ({
              ...item,
              quantity: item.quantity ?? item.qty ?? 1
            }))
          : []
      })),
    [sharedOrders]
  );

  const filteredOrders = useMemo(() => {
    if (statusFilter === "ALL") {
      return orders;
    }
    return orders.filter((order) => normalizeOrderStatus(order.status) === statusFilter);
  }, [orders, statusFilter]);

  const updateDraft = (orderId, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || createAssignDraft()),
        [key]: value
      }
    }));
  };

  const assignOrder = async (order) => {
    const draft = drafts[order._id] || createAssignDraft();
    if (!String(draft.partnerName || "").trim()) {
      alert("Delivery partner name is required.");
      return;
    }

    try {
      setSavingOrderId(order._id);
      await axios.put(`${API_BASE_URL}/api/delivery/${order._id}/assign`, {
        partnerName: draft.partnerName,
        partnerPhone: draft.partnerPhone,
        etaMinutes: Number(draft.etaMinutes || 0),
        notes: draft.notes
      });
      await loadOrders();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to assign order");
    } finally {
      setSavingOrderId("");
    }
  };

  const markDelivered = async (orderId) => {
    try {
      setSavingOrderId(orderId);
      await axios.put(`${API_BASE_URL}/api/delivery/${orderId}/complete`);
      updateOrderStatus(orderId, "completed");
      await loadOrders();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to mark order delivered");
    } finally {
      setSavingOrderId("");
    }
  };

  const stats = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        const status = normalizeOrderStatus(order.status);
        if (status === "READY") acc.ready += 1;
        if (status === "DELIVERED") acc.completed += 1;
        return acc;
      },
      { ready: 0, outForDelivery: 0, completed: 0 }
    );
  }, [orders]);

  return (
    <PageContainer>
      <div style={header}>
        <div>
          <h2 style={title}>Delivery Management</h2>
          <p style={subtitle}>Assign riders, track dispatch, and close delivered orders.</p>
        </div>
        <div style={statsWrap}>
          <StatCard label="Ready" value={stats.ready} />
          <StatCard label="Delivered" value={stats.completed} />
        </div>
      </div>

      <div style={filterRow}>
        <label style={filterLabel}>
          Status
          <select
            style={filterSelect}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All</option>
            <option value="READY">Ready</option>
            <option value="DELIVERED">Delivered</option>
          </select>
        </label>
      </div>

      {loading ? <p style={hint}>Loading delivery queue...</p> : null}
      {!filteredOrders.length ? (
        <p style={hint}>No orders available for this status.</p>
      ) : (
        <div style={grid}>
          {filteredOrders.map((order) => {
            const status = normalizeOrderStatus(order.status);
            const draft = drafts[order._id] || createAssignDraft();
            const isSaving = savingOrderId === order._id;

            return (
              <article key={order._id} style={card}>
                <div style={cardHeader}>
                  <div>
                    <div style={orderId}>Order #{String(order._id).slice(-6).toUpperCase()}</div>
                    <div style={metaText}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
                    </div>
                  </div>
                  <div style={statusPill}>{formatOrderStatus(status)}</div>
                </div>

                <div style={metaBlock}>
                  <span>Total: {CURRENCY.format(order.totalAmount || 0)}</span>
                  <span>
                    Customer:{" "}
                    {(order.customerName || order.customerPhone)
                      ? `${order.customerName || "Customer"} (${order.customerPhone || "NA"})`
                      : "Walk-in"}
                  </span>
                </div>

                <div style={itemsWrap}>
                  {(order.items || []).map((item, index) => (
                    <div key={`${order._id}-${index}`} style={itemRow}>
                      <span>{item.displayName || item.name}</span>
                      <span>x{item.quantity}</span>
                    </div>
                  ))}
                </div>

                {status === "READY" ? (
                  <div style={assignBlock}>
                    <div style={assignGrid}>
                      <input
                        placeholder="Rider name"
                        value={draft.partnerName}
                        onChange={(event) =>
                          updateDraft(order._id, "partnerName", event.target.value)
                        }
                        style={input}
                      />
                      <input
                        placeholder="Rider phone"
                        value={draft.partnerPhone}
                        onChange={(event) =>
                          updateDraft(order._id, "partnerPhone", event.target.value)
                        }
                        style={input}
                      />
                      <input
                        type="number"
                        placeholder="ETA mins"
                        value={draft.etaMinutes}
                        onChange={(event) =>
                          updateDraft(order._id, "etaMinutes", event.target.value)
                        }
                        style={input}
                      />
                    </div>
                    <input
                      placeholder="Delivery notes"
                      value={draft.notes}
                      onChange={(event) => updateDraft(order._id, "notes", event.target.value)}
                      style={input}
                    />

                    <div style={actions}>
                      <button
                        style={assignBtn}
                        onClick={() => assignOrder(order)}
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Assign / Update Rider"}
                      </button>
                      <button
                        style={completeBtn}
                        onClick={() => markDelivered(order._id)}
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Mark Delivered"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={statCard}>
      <div style={statLabel}>{label}</div>
      <div style={statValue}>{value}</div>
    </div>
  );
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 12
};

const title = {
  margin: 0,
  color: "#f3f6fc",
  fontSize: 30
};

const subtitle = {
  margin: "6px 0 0",
  color: "#96a0b8",
  fontSize: 14
};

const statsWrap = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(120px, 1fr))",
  gap: 10,
  width: "min(460px, 100%)"
};

const statCard = {
  border: "1px solid #2c3242",
  borderRadius: 12,
  background: "#121621",
  padding: 12
};

const statLabel = {
  color: "#95a0b8",
  fontSize: 12
};

const statValue = {
  marginTop: 4,
  color: "#f3f6fc",
  fontWeight: 800,
  fontSize: 20
};

const filterRow = {
  marginBottom: 12
};

const filterLabel = {
  display: "inline-grid",
  gap: 6,
  color: "#95a0b8",
  fontSize: 12
};

const filterSelect = {
  height: 36,
  minWidth: 180,
  borderRadius: 10,
  border: "1px solid #343949",
  background: "#111520",
  color: "#edf1fa",
  padding: "0 10px"
};

const hint = {
  margin: 0,
  color: "#99a4bc"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 12
};

const card = {
  border: "1px solid #2b3040",
  borderRadius: 14,
  background: "#141925",
  padding: 12,
  display: "grid",
  gap: 10
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "flex-start"
};

const orderId = {
  color: "#f2f5fb",
  fontSize: 15,
  fontWeight: 800
};

const metaText = {
  color: "#92a0bc",
  fontSize: 12,
  marginTop: 4
};

const statusPill = {
  borderRadius: 999,
  border: "1px solid rgba(244,201,58,0.35)",
  color: "#f4c93a",
  background: "rgba(244,201,58,0.12)",
  padding: "5px 10px",
  fontSize: 11,
  fontWeight: 800
};

const metaBlock = {
  display: "grid",
  gap: 4,
  color: "#c8d0e2",
  fontSize: 13
};

const itemsWrap = {
  display: "grid",
  gap: 6
};

const itemRow = {
  border: "1px solid #2b3143",
  borderRadius: 8,
  padding: "7px 10px",
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  color: "#ecf1fa",
  fontSize: 13
};

const assignBlock = {
  borderTop: "1px solid #2d3343",
  paddingTop: 10,
  display: "grid",
  gap: 8
};

const assignGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8
};

const input = {
  height: 34,
  borderRadius: 8,
  border: "1px solid #343b4f",
  background: "#0f131e",
  color: "#eef3fb",
  padding: "0 10px",
  outline: 0,
  minWidth: 0
};

const actions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
};

const assignBtn = {
  height: 34,
  border: 0,
  borderRadius: 8,
  background: "#3e89ff",
  color: "#f5f8ff",
  fontWeight: 700,
  padding: "0 12px",
  cursor: "pointer"
};

const completeBtn = {
  height: 34,
  border: 0,
  borderRadius: 8,
  background: "#38c98f",
  color: "#103124",
  fontWeight: 800,
  padding: "0 12px",
  cursor: "pointer"
};
