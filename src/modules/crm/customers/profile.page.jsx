import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { fetchCrmCustomer, formatCurrency, formatDate, formatDateTime, formatNumber } from "../api";
import { CRM_PAGE_KEYS } from "../routes";
import {
  Badge,
  CrmPageShell,
  EmptyPanel,
  ErrorPanel,
  InsightCard,
  LoadingPanel,
  MetricCard,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  crmChartPalette
} from "../components/CrmPrimitives";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "orders", label: "Orders" },
  { key: "engagement", label: "Engagement" }
];

const badgeTone = (value = "") => {
  if (value === "High Value") return "violet";
  if (value === "Frequent" || value === "Active") return "mint";
  if (value === "At Risk") return "amber";
  if (value === "Inactive" || value === "Lost") return "rose";
  return "neutral";
};

export default function CustomerProfilePage({ customerId, onNavigate }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const loadCustomer = useCallback(async () => {
    if (!customerId) {
      setError("Customer route is missing an id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetchCrmCustomer(customerId);
      setCustomer(response);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load customer profile.");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const summaryCards = useMemo(() => {
    if (!customer) {
      return [];
    }

    return [
      { label: "Segment", value: customer.segment, helper: "Current value tier", accent: "violet" },
      { label: "Status", value: customer.status, helper: "Risk classification", accent: "amber" },
      { label: "Repeat Rate", value: `${customer.repeatRate}%`, helper: "Repeat orders / total orders", accent: "mint" },
      { label: "Frequency", value: customer.orderFrequency, helper: "Order cadence", accent: "sky" },
      { label: "Preferred Time", value: customer.preferredTime, helper: "Peak ordering window", accent: "violet" },
      { label: "Favorite Category", value: customer.favoriteCategory, helper: "Top ordering pattern", accent: "mint" }
    ];
  }, [customer]);

  if (loading) {
    return <LoadingPanel label="Loading customer profile..." />;
  }

  if (error) {
    return (
      <ErrorPanel
        description={error}
        action={
          <div className="flex gap-3">
            <PrimaryButton onClick={loadCustomer}>Retry</PrimaryButton>
            <SecondaryButton onClick={() => onNavigate?.(CRM_PAGE_KEYS.CUSTOMERS_LIST)}>
              Back to list
            </SecondaryButton>
          </div>
        }
      />
    );
  }

  if (!customer) {
    return (
      <EmptyPanel
        title="Customer not found"
        description="The requested CRM profile is unavailable for this workspace."
      />
    );
  }

  return (
    <CrmPageShell
      eyebrow="Customer Profile"
      title={customer.name}
      description="A full customer-level view combining order behavior, engagement signals, and AI-generated next actions."
      actions={
        <>
          <SecondaryButton onClick={() => onNavigate?.(CRM_PAGE_KEYS.CUSTOMERS_LIST)}>
            Back To List
          </SecondaryButton>
          <PrimaryButton onClick={() => onNavigate?.(CRM_PAGE_KEYS.MARKETING)}>
            Create Campaign
          </PrimaryButton>
        </>
      }
    >
      <SectionCard>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#eadcf9] font-display text-xl font-bold text-[#6f3cc3]">
              {customer.avatar}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 font-display text-3xl font-bold text-[#171226]">{customer.name}</h2>
                {customer.tags.map((tag) => (
                  <Badge key={tag} tone={badgeTone(tag)}>
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-5 text-sm text-[#6f678a]">
                <span>{customer.phone || "No phone linked"}</span>
                <span>{customer.email || "No email linked"}</span>
                <span>{customer.customerCode}</span>
                <span>Joined {formatDate(customer.joinedAt)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:w-[360px]">
            <div className="rounded-3xl bg-[#faf6ff] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#8f84ac]">Total Spend</div>
              <div className="mt-2 font-display text-2xl font-bold text-[#171226]">
                {formatCurrency(customer.totalSpend)}
              </div>
            </div>
            <div className="rounded-3xl bg-[#faf6ff] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#8f84ac]">Orders</div>
              <div className="mt-2 font-display text-2xl font-bold text-[#171226]">
                {formatNumber(customer.totalOrders)}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            helper={card.helper}
            accent={card.accent}
          />
        ))}
      </div>

      <SectionCard>
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "border border-[#7c3aed] bg-[#7c3aed] text-white"
                  : "border border-[#dbc8fb] bg-white text-[#5f4b8b]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {activeTab === "overview" ? (
        <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <div className="space-y-5">
            <SectionCard title="Spending Trend" description="Recent order revenue and purchasing cadence.">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={customer.spendingTrend}>
                    <CartesianGrid stroke="#efe5ff" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#7d74a1", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#7d74a1", fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Order Timeline" description="Latest order events in chronological order.">
              {!customer.orderTimeline.length ? (
                <EmptyPanel title="No orders yet" description="As orders arrive, the customer timeline will populate here." />
              ) : (
                <div className="space-y-4">
                  {customer.orderTimeline.map((event) => (
                    <div key={event.id} className="rounded-3xl border border-[#eadcf9] bg-[#faf8ff] p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-semibold text-[#171226]">{event.orderNumber}</div>
                          <div className="mt-1 text-sm text-[#6f678a]">{event.items.join(", ") || "No items captured"}</div>
                        </div>
                        <div className="text-sm text-[#6f678a]">
                          {formatDateTime(event.createdAt)} • {event.platform} • {formatCurrency(event.total)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Favorite Items" description="Products that show up most often in this customer’s basket.">
              {!customer.favoriteItems.length ? (
                <EmptyPanel title="No favorite items yet" description="Favorite item trends will show after repeat ordering starts." />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {customer.favoriteItems.map((item) => (
                    <div key={item.name} className="rounded-3xl bg-[#faf6ff] p-4">
                      <div className="font-semibold text-[#171226]">{item.name}</div>
                      <div className="mt-1 text-sm text-[#6f678a]">{item.orderCount} units ordered</div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-5">
            <SectionCard title="Orders by Time" description="Best ordering window for this customer.">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={customer.ordersByTime}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={68}
                      outerRadius={102}
                      paddingAngle={4}
                    >
                      {customer.ordersByTime.map((entry, index) => (
                        <Cell key={entry.name} fill={crmChartPalette[index % crmChartPalette.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="AI Insights" description="Rules-based recommendations from live customer behavior.">
              <div className="grid gap-4">
                <InsightCard
                  title="Next Best Action"
                  value={customer.insights.nextBestAction}
                  description="Recommended next move to improve retention or basket size."
                />
                <InsightCard
                  title="Order Prediction"
                  value={customer.insights.orderPrediction}
                  description="Projected purchase behavior based on recent ordering cadence."
                  tone="mint"
                />
                <InsightCard
                  title="Churn Risk"
                  value={customer.insights.churnRisk}
                  description="Risk score driven by recency and repeat behavior."
                  tone="amber"
                />
                <InsightCard
                  title="Recommended Items"
                  value={customer.insights.recommendedItems.join(", ") || "No recommendation"}
                  description="High-affinity products to include in the next campaign."
                  tone="rose"
                />
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {activeTab === "orders" ? (
        <SectionCard title="Order History" description="A full log of purchases linked to this customer.">
          {!customer.orderHistory.length ? (
            <EmptyPanel title="No order history" description="This customer has not been linked to an order yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-[#8f84ac]">
                    <th className="px-4 py-2">Order</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Items</th>
                    <th className="px-4 py-2">Platform</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orderHistory.map((order) => (
                    <tr key={order.id} className="bg-[#fbf8ff]">
                      <td className="rounded-l-3xl px-4 py-4 font-semibold text-[#171226]">{order.invoiceNumber}</td>
                      <td className="px-4 py-4 text-sm text-[#6f678a]">{formatDateTime(order.createdAt)}</td>
                      <td className="px-4 py-4 text-sm text-[#47386f]">
                        {order.items.map((item) => `${item.name} x${item.quantity}`).join(", ")}
                      </td>
                      <td className="px-4 py-4"><Badge tone={badgeTone(order.platform)}>{order.platform}</Badge></td>
                      <td className="px-4 py-4"><Badge tone={badgeTone(order.status)}>{order.status}</Badge></td>
                      <td className="rounded-r-3xl px-4 py-4 text-sm font-semibold text-[#171226]">
                        {formatCurrency(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}

      {activeTab === "engagement" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <SectionCard title="Engagement Summary" description="Messaging performance and conversion readiness for this customer.">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard label="Messages Sent" value={formatNumber(customer.engagement.messagesSent)} helper="Business messages delivered" />
              <MetricCard label="Offers Redeemed" value={formatNumber(customer.engagement.offersRedeemed)} helper="Orders with a coupon or offer" accent="amber" />
              <MetricCard label="Response Rate" value={`${customer.engagement.responseRate}%`} helper="Customer replies / outbound messages" accent="mint" />
            </div>
            <div className="mt-5 rounded-3xl bg-[#faf6ff] p-5 text-sm leading-6 text-[#6f678a]">
              Last message touchpoint: <span className="font-semibold text-[#171226]">{formatDateTime(customer.engagement.lastMessageAt)}</span>
            </div>
          </SectionCard>

          <SectionCard title="Personalized Offers" description="Campaign hooks matched to this customer’s behavior.">
            <div className="grid gap-3">
              {customer.insights.personalizedOffers.map((offer) => (
                <div key={offer} className="rounded-3xl border border-[#eadcf9] bg-[#faf8ff] px-4 py-4 text-sm font-semibold text-[#47386f]">
                  {offer}
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <PrimaryButton onClick={() => onNavigate?.(CRM_PAGE_KEYS.MARKETING)}>
                Send Campaign
              </PrimaryButton>
              <SecondaryButton onClick={() => setActiveTab("overview")}>
                Back To Overview
              </SecondaryButton>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </CrmPageShell>
  );
}
