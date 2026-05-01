import PageContainer from "./ui/PageContainer";
import { UI_CONFIG } from "../config/uiConfig";

const PLAN_META = {
  STARTER: {
    color: "#7bb3ff",
    price: "INR 999 / month",
    subtitle: "Best for small cloud kitchens.",
    features: [
      "Orders",
      "Menu",
      "Dashboard",
      "Basic analytics",
      "3 staff accounts"
    ]
  },
  GROWTH: {
    color: "#58cf9e",
    price: "INR 2,499 / month",
    subtitle: "Built for fast-growing operations.",
    features: [
      "Inventory",
      "Customer CRM",
      "Staff management",
      "Marketing tools",
      "WhatsApp campaigns"
    ]
  },
  PRO: {
    color: "#f4c93a",
    price: "INR 4,999 / month",
    subtitle: "Scale with delivery and integrations.",
    features: [
      "Multi-branch",
      "Delivery management",
      "Advanced analytics",
      "API integrations",
      "Unlimited staff"
    ]
  },
  ENTERPRISE: {
    color: "#ff9d72",
    price: "INR 9,999+ / month",
    subtitle: "For franchise and enterprise operators.",
    features: [
      "Franchise management",
      "AI demand prediction",
      "White label",
      "Dedicated onboarding",
      "Priority support"
    ]
  }
};

const LEGACY_PLAN_MAP = {
  FREE: "STARTER",
  BASIC: "GROWTH"
};

const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const getExpiryStatus = (expiryValue) => {
  if (!expiryValue) {
    return { label: "No expiry date", tone: "neutral", daysLeft: null };
  }

  const expiry = new Date(expiryValue);
  if (Number.isNaN(expiry.getTime())) {
    return { label: "Invalid expiry date", tone: "danger", daysLeft: null };
  }

  const now = new Date();
  const msLeft = expiry.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { label: "Expired", tone: "danger", daysLeft };
  if (daysLeft <= 7) return { label: "Expiring soon", tone: "warning", daysLeft };
  return { label: "Active", tone: "success", daysLeft };
};

export default function SubscriptionStatus({ restaurant }) {
  if (UI_CONFIG.DEV_MODE_UNLOCK_ALL) {
    return null;
  }

  const rawPlan = String(restaurant?.subscriptionPlan || "STARTER").toUpperCase();
  const plan = LEGACY_PLAN_MAP[rawPlan] || rawPlan;
  const planMeta = PLAN_META[plan] || PLAN_META.STARTER;
  const expiryDate = restaurant?.subscriptionExpiry || null;
  const accountStatus = String(restaurant?.status || "ACTIVE").toUpperCase();
  const expiryStatus = getExpiryStatus(expiryDate);
  const statusColor =
    expiryStatus.tone === "danger"
      ? "#ff7676"
      : expiryStatus.tone === "warning"
        ? "#f4c93a"
        : expiryStatus.tone === "success"
          ? "#38c98f"
          : "#95a1bc";

  return (
    <PageContainer>
      <div style={header}>
        <h2 style={title}>Subscription Plans</h2>
        <p style={subtitle}>
          Starter, Growth, Pro, and Enterprise pricing model with restaurant-first feature bundles.
        </p>
      </div>

      <section style={summaryGrid}>
        <div style={summaryCard}>
          <div style={label}>Current Plan</div>
          <div style={{ ...value, color: planMeta.color }}>{plan}</div>
          <div style={metaText}>{planMeta.price}</div>
        </div>
        <div style={summaryCard}>
          <div style={label}>Account Status</div>
          <div style={value}>{accountStatus}</div>
        </div>
        <div style={summaryCard}>
          <div style={label}>Plan Expiry</div>
          <div style={value}>{formatDate(expiryDate)}</div>
        </div>
        <div style={summaryCard}>
          <div style={label}>Validity</div>
          <div style={{ ...value, color: statusColor }}>{expiryStatus.label}</div>
          {typeof expiryStatus.daysLeft === "number" && expiryStatus.daysLeft >= 0 ? (
            <div style={metaText}>{expiryStatus.daysLeft} day(s) remaining</div>
          ) : null}
        </div>
      </section>

      <section style={tierGrid}>
        {Object.entries(PLAN_META).map(([code, info]) => (
          <article key={code} style={tierCard}>
            <div style={{ ...tierCode, color: info.color }}>{code}</div>
            <div style={tierPrice}>{info.price}</div>
            <div style={tierSubtitle}>{info.subtitle}</div>
            <div style={features}>
              {info.features.map((feature) => (
                <div key={`${code}-${feature}`} style={featureRow}>
                  <span style={{ ...dot, color: info.color }}>●</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </PageContainer>
  );
}

const header = {
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

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 10,
  marginBottom: 12
};

const summaryCard = {
  border: "1px solid #2b3040",
  background: "#11151f",
  borderRadius: 12,
  padding: "12px 14px"
};

const label = {
  color: "#95a0b8",
  fontSize: 12
};

const value = {
  marginTop: 6,
  color: "#f3f6fc",
  fontSize: 24,
  fontWeight: 700
};

const metaText = {
  marginTop: 4,
  color: "#97a2bd",
  fontSize: 12
};

const tierGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12
};

const tierCard = {
  border: "1px solid #2a2f40",
  background: "#151a24",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 8
};

const tierCode = {
  fontWeight: 800,
  fontSize: 18
};

const tierPrice = {
  color: "#f2f5fb",
  fontWeight: 800,
  fontSize: 16
};

const tierSubtitle = {
  color: "#96a0b8",
  fontSize: 13
};

const features = {
  marginTop: 4,
  display: "grid",
  gap: 6
};

const featureRow = {
  color: "#e4e9f5",
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  gap: 8
};

const dot = {
  fontSize: 9
};
