import { motion } from "framer-motion";

import { normalizeOrderStatus } from "../../access";
import { cloudKitchenTheme } from "../../theme";
import { STATUS_TONES, toStatusTone } from "./statusTheme";

const STATUS_META = {
  NEW: { label: "New", tone: "info" },
  PREPARING: { label: "In Prep", tone: "warning" },
  READY: { label: "Ready", tone: "success" },
  DISPATCHED: { label: "Dispatched", tone: "info" }
};

const STATUS_ACTIONS = {
  NEW: { label: "Accept", nextStatus: "PREPARING" },
  PREPARING: { label: "Mark Ready", nextStatus: "READY" },
  READY: { label: "Dispatch", nextStatus: "DISPATCHED" }
};

const formatLiveTimer = (elapsedMinutes) => {
  const totalSeconds = Math.max(0, Math.floor(Number(elapsedMinutes || 0) * 60));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const getOrderAgeMinutes = (order, now = Date.now()) => {
  const createdAt = new Date(order?.createdAt || now).getTime();
  if (!Number.isFinite(createdAt)) {
    return 0;
  }
  return Math.max(0, (now - createdAt) / 60000);
};

const getItemCount = (items = []) =>
  items.reduce((total, item) => total + Number(item?.quantity || 0), 0);

export default function OrderCard({
  order,
  now,
  delayThresholdMinutes = 15,
  updatingOrderId = "",
  highlightedOrderIds = {},
  onAdvanceStatus
}) {
  const status = normalizeOrderStatus(order?.status, "NEW");
  const statusMeta = STATUS_META[status] || STATUS_META.NEW;
  const statusTone = STATUS_TONES[toStatusTone(statusMeta.tone)] || STATUS_TONES.info;
  const action = STATUS_ACTIONS[status];
  const elapsedMinutes = getOrderAgeMinutes(order, now);
  const isDelayed = elapsedMinutes >= Number(delayThresholdMinutes || 15);
  const isUpdating = updatingOrderId === order?._id;
  const isHighlighted = Boolean(highlightedOrderIds[order?._id]);
  const itemCount = getItemCount(order?.items || []);
  const displayedItems = Array.isArray(order?.items) ? order.items.slice(0, 2) : [];
  const extraItems = Math.max(0, (order?.items || []).length - displayedItems.length);
  const orderId = String(order?.invoiceNumber || order?._id || "").slice(-8).toUpperCase();
  const platform = (order?.orderChannel || order?.serviceType || "DIRECT").replace(/_/g, " ");

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        borderColor: isDelayed ? STATUS_TONES.critical.border : cloudKitchenTheme.border,
        backgroundColor: isHighlighted ? cloudKitchenTheme.warningSoft : cloudKitchenTheme.card
      }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={card}
    >
      <div style={topRow}>
        <div style={idBlock}>
          <div style={orderIdText}>#{orderId || "----"}</div>
          <div style={platformText}>{platform}</div>
        </div>
        <div
          style={{
            ...statusBadge,
            color: statusTone.text,
            background: statusTone.background,
            borderColor: statusTone.border
          }}
        >
          {statusMeta.label}
        </div>
      </div>

      <div style={metaRow}>
        <div style={elapsedText}>Elapsed {formatLiveTimer(elapsedMinutes)}</div>
        <div style={countText}>{itemCount} items</div>
      </div>

      {isDelayed ? (
        <div style={delayBadge} className="cloud-kitchen-soft-pulse">
          Critical delay
        </div>
      ) : null}

      {displayedItems.length ? (
        <div style={itemsList}>
          {displayedItems.map((item) => (
            <div key={`${order?._id}-${item.name}`} style={itemRow}>
              <span style={itemName}>{item.name}</span>
              <span style={itemQty}>x{Number(item.quantity || 0)}</span>
            </div>
          ))}
          {extraItems > 0 ? <div style={extraItemsText}>+{extraItems} more</div> : null}
        </div>
      ) : null}

      <div style={footer}>
        <div style={metaFootText}>
          <span>{Number(order?.totalAmount || 0).toLocaleString("en-IN")} total</span>
          <span>{order?.customerName || "Walk-in"}</span>
        </div>
        {action ? (
          <motion.button
            type="button"
            onClick={() => onAdvanceStatus?.(order, action.nextStatus)}
            disabled={isUpdating}
            whileTap={isUpdating ? undefined : { scale: 0.98 }}
            style={{
              ...actionButton,
              ...(isDelayed ? actionButtonCritical : null)
            }}
          >
            {isUpdating ? "Updating..." : action.label}
          </motion.button>
        ) : null}
      </div>
    </motion.article>
  );
}

const card = {
  borderRadius: 15,
  border: `1px solid ${cloudKitchenTheme.border}`,
  padding: 13,
  display: "grid",
  gap: 10,
  boxShadow: "0 8px 20px rgba(15,23,42,0.04)"
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start"
};

const idBlock = {
  minWidth: 0
};

const orderIdText = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 13,
  fontWeight: 800
};

const platformText = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11,
  marginTop: 4,
  textTransform: "capitalize"
};

const statusBadge = {
  borderRadius: 999,
  border: "1px solid",
  padding: "5px 9px",
  fontSize: 11,
  fontWeight: 800
};

const metaRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8
};

const elapsedText = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 12,
  fontWeight: 700
};

const countText = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11,
  fontWeight: 700
};

const delayBadge = {
  borderRadius: 10,
  border: `1px solid ${STATUS_TONES.critical.border}`,
  background: STATUS_TONES.critical.background,
  color: STATUS_TONES.critical.text,
  padding: "7px 9px",
  fontSize: 11,
  fontWeight: 800
};

const itemsList = {
  display: "grid",
  gap: 6
};

const itemRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center"
};

const itemName = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 12,
  fontWeight: 700
};

const itemQty = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11,
  fontWeight: 700
};

const extraItemsText = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11,
  fontWeight: 700
};

const footer = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap"
};

const metaFootText = {
  display: "grid",
  gap: 3,
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11
};

const actionButton = {
  height: 34,
  borderRadius: 10,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: cloudKitchenTheme.accent,
  color: "#FFFFFF",
  padding: "0 11px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer"
};

const actionButtonCritical = {
  background: STATUS_TONES.critical.text
};
