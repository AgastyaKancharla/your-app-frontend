import { motion } from "framer-motion";

import { normalizeOrderStatus } from "../../access";
import { cloudKitchenTheme } from "../../theme";
import OrderCard from "./OrderCard";
import { STATUS_TONES } from "./statusTheme";

const COLUMNS = [
  {
    key: "NEW",
    title: "New",
    subtitle: "Incoming tickets",
    tone: "info"
  },
  {
    key: "PREPARING",
    title: "In Prep",
    subtitle: "Kitchen is working",
    tone: "warning"
  },
  {
    key: "READY",
    title: "Ready",
    subtitle: "Waiting handoff",
    tone: "success"
  },
  {
    key: "DISPATCHED",
    title: "Dispatched",
    subtitle: "Out for delivery",
    tone: "info"
  }
];

const groupOrdersByStatus = (orders = []) => {
  const grouped = {
    NEW: [],
    PREPARING: [],
    READY: [],
    DISPATCHED: []
  };

  orders.forEach((order) => {
    const status = normalizeOrderStatus(order?.status, "NEW");
    if (grouped[status]) {
      grouped[status].push(order);
    }
  });

  return grouped;
};

export default function LiveOrderBoard({
  orders = [],
  now = Date.now(),
  updatingOrderId = "",
  highlightedOrderIds = {},
  delayThresholdMinutes = 15,
  onAdvanceStatus
}) {
  const groupedOrders = groupOrdersByStatus(Array.isArray(orders) ? orders : []);

  return (
    <section style={panel}>
      <div style={header}>
        <div>
          <div style={title}>Live Order Board</div>
          <div style={subtitle}>Kanban view for order movement from intake to dispatch</div>
        </div>
        <div style={countPill}>{orders.length} active</div>
      </div>

      {!orders.length ? (
        <div style={emptyState}>No active orders in the queue.</div>
      ) : (
        <div style={boardGrid}>
          {COLUMNS.map((column) => {
            const columnTone = STATUS_TONES[column.tone] || STATUS_TONES.info;
            const items = groupedOrders[column.key] || [];

            return (
              <motion.div
                key={column.key}
                layout
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{
                  ...columnCard,
                  borderColor: columnTone.border
                }}
              >
                <div style={columnHeader}>
                  <div>
                    <div style={columnTitle}>{column.title}</div>
                    <div style={columnSubtitle}>{column.subtitle}</div>
                  </div>
                  <div
                    style={{
                      ...columnCount,
                      color: columnTone.text,
                      background: columnTone.background,
                      borderColor: columnTone.border
                    }}
                  >
                    {items.length}
                  </div>
                </div>

                <div style={columnContent}>
                  {!items.length ? (
                    <div style={emptyColumnText}>No orders</div>
                  ) : (
                    items.map((order) => (
                      <OrderCard
                        key={order._id}
                        order={order}
                        now={now}
                        delayThresholdMinutes={delayThresholdMinutes}
                        updatingOrderId={updatingOrderId}
                        highlightedOrderIds={highlightedOrderIds}
                        onAdvanceStatus={onAdvanceStatus}
                      />
                    ))
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const panel = {
  background: cloudKitchenTheme.card,
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 18,
  padding: 12,
  boxShadow: cloudKitchenTheme.shadow,
  minWidth: 0
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 14
};

const title = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 18,
  fontWeight: 800
};

const subtitle = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  marginTop: 4
};

const countPill = {
  height: 30,
  borderRadius: 999,
  padding: "0 11px",
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: cloudKitchenTheme.panelSoft,
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  fontWeight: 700,
  display: "inline-grid",
  placeItems: "center"
};

const boardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: 10
};

const columnCard = {
  borderRadius: 14,
  border: "1px solid",
  background: cloudKitchenTheme.panelSoft,
  padding: 12,
  display: "grid",
  gap: 10,
  alignContent: "start",
  minHeight: 180,
  minWidth: 0
};

const columnHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 8
};

const columnTitle = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 13,
  fontWeight: 800
};

const columnSubtitle = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11,
  marginTop: 3
};

const columnCount = {
  minWidth: 26,
  height: 24,
  borderRadius: 999,
  border: "1px solid",
  padding: "0 8px",
  display: "inline-grid",
  placeItems: "center",
  fontSize: 11,
  fontWeight: 800
};

const columnContent = {
  display: "grid",
  gap: 10,
  alignContent: "start"
};

const emptyState = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 14
};

const emptyColumnText = {
  borderRadius: 12,
  border: `1px dashed ${cloudKitchenTheme.border}`,
  padding: "12px",
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  textAlign: "center"
};
