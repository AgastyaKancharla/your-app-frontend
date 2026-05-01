import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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

import { fetchCrmAnalytics, formatCompactNumber, formatCurrency } from "../api";
import { CRM_PAGE_KEYS } from "../routes";
import {
  CrmPageShell,
  ErrorPanel,
  InsightCard,
  LoadingPanel,
  MetricCard,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  crmChartPalette
} from "../components/CrmPrimitives";

const DEFAULT_ANALYTICS = {
  customerOverview: {
    metrics: {
      totalCustomers: 0,
      activeCustomers: 0,
      newCustomers: 0,
      repeatRate: 0,
      avgOrderValue: 0,
      customerLtv: 0
    },
    charts: {
      ordersVsCustomers: [],
      customerGrowth: [],
      revenueBySegment: [],
      platformDistribution: []
    },
    insights: {
      highRepeatPotential: [],
      atRiskCustomers: 0,
      bestTimeToEngage: "Dinner",
      revenueOpportunities: 0
    }
  }
};

export default function CustomersOverviewPage({ onNavigate }) {
  const [analytics, setAnalytics] = useState(DEFAULT_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchCrmAnalytics();
      setAnalytics(response || DEFAULT_ANALYTICS);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load CRM analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return <LoadingPanel label="Loading customer overview..." />;
  }

  if (error) {
    return (
      <ErrorPanel
        description={error}
        action={<PrimaryButton onClick={loadAnalytics}>Retry</PrimaryButton>}
      />
    );
  }

  const metrics = analytics.customerOverview?.metrics || DEFAULT_ANALYTICS.customerOverview.metrics;
  const charts = analytics.customerOverview?.charts || DEFAULT_ANALYTICS.customerOverview.charts;
  const insights = analytics.customerOverview?.insights || DEFAULT_ANALYTICS.customerOverview.insights;

  return (
    <CrmPageShell
      eyebrow="CRM Customers"
      title="Customer intelligence for a delivery-first brand"
      description="Track customer growth, repeat behavior, and segment-driven revenue in one polished workspace built for cloud kitchen operators."
      actions={
        <>
          <PrimaryButton onClick={() => onNavigate?.(CRM_PAGE_KEYS.MARKETING)}>
            Create Campaign
          </PrimaryButton>
          <SecondaryButton onClick={() => onNavigate?.(CRM_PAGE_KEYS.CUSTOMERS_LIST)}>
            Add Customer
          </SecondaryButton>
          <SecondaryButton onClick={() => onNavigate?.(CRM_PAGE_KEYS.CUSTOMERS_LIST)}>
            Import Customers
          </SecondaryButton>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Total Customers" value={formatCompactNumber(metrics.totalCustomers)} helper="Current customer base" />
        <MetricCard label="Active Customers" value={formatCompactNumber(metrics.activeCustomers)} helper="Ordered in the last 7 days" accent="mint" />
        <MetricCard label="New Customers" value={formatCompactNumber(metrics.newCustomers)} helper="Joined in the last 30 days" accent="sky" />
        <MetricCard label="Repeat Rate" value={`${metrics.repeatRate}%`} helper="Repeat orders / total orders" accent="amber" />
        <MetricCard label="Avg Order Value" value={formatCurrency(metrics.avgOrderValue)} helper="Average spend per order" />
        <MetricCard label="Customer LTV" value={formatCurrency(metrics.customerLtv)} helper="Lifetime revenue per customer" accent="mint" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard title="Orders vs Customers Trend" description="A fresh read on new demand and acquisition momentum.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.ordersVsCustomers}>
                <CartesianGrid stroke="#efe5ff" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#7d74a1", fontSize: 12 }} />
                <YAxis tick={{ fill: "#7d74a1", fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#7c3aed" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="customers" stroke="#c084fc" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="AI Insights" description="Rules-based signals surfaced from live CRM data.">
          <div className="grid gap-4">
            <InsightCard
              title="High Repeat Potential"
              value={insights.highRepeatPotential.length || 0}
              description={
                insights.highRepeatPotential.length
                  ? insights.highRepeatPotential.join(", ")
                  : "No high-potential customers detected yet."
              }
            />
            <InsightCard
              title="At Risk Customers"
              value={insights.atRiskCustomers}
              description="Customers slipping past the 7-day re-order window."
              tone="amber"
            />
            <InsightCard
              title="Best Time To Engage"
              value={insights.bestTimeToEngage}
              description="Peak ordering window based on recent customer behavior."
              tone="mint"
            />
            <InsightCard
              title="Revenue Opportunities"
              value={formatCurrency(insights.revenueOpportunities)}
              description="Potential revenue concentrated in high-value customer segments."
              tone="rose"
            />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Customer Growth" description="Daily additions building the long-term CRM base.">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.customerGrowth}>
                <defs>
                  <linearGradient id="crmGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#efe5ff" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#7d74a1", fontSize: 12 }} />
                <YAxis tick={{ fill: "#7d74a1", fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#7c3aed" fill="url(#crmGrowth)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Revenue by Segment" description="See where repeat and premium behavior are driving value.">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.revenueBySegment}>
                <CartesianGrid stroke="#efe5ff" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#7d74a1", fontSize: 12 }} />
                <YAxis tick={{ fill: "#7d74a1", fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="revenue" radius={[14, 14, 4, 4]}>
                  {charts.revenueBySegment.map((entry, index) => (
                    <Cell key={entry.name} fill={crmChartPalette[index % crmChartPalette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Platform Distribution" description="Where customer orders are being acquired today.">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.platformDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={72}
                  outerRadius={104}
                  paddingAngle={4}
                >
                  {charts.platformDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={crmChartPalette[index % crmChartPalette.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Quick Actions" description="Fast paths for the most common CRM workflows.">
          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => onNavigate?.(CRM_PAGE_KEYS.MARKETING)}
              className="rounded-3xl border border-[#eadcf9] bg-[#faf6ff] px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-[#cfb6fb]"
            >
              <div className="font-display text-lg font-bold text-[#171226]">Launch a campaign</div>
              <div className="mt-1 text-sm text-[#6f678a]">Build a WhatsApp or SMS campaign with audience targeting.</div>
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.(CRM_PAGE_KEYS.CUSTOMERS_LIST)}
              className="rounded-3xl border border-[#eadcf9] bg-[#faf6ff] px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-[#cfb6fb]"
            >
              <div className="font-display text-lg font-bold text-[#171226]">Add a customer</div>
              <div className="mt-1 text-sm text-[#6f678a]">Create a fresh profile and enrich contact intelligence.</div>
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.(CRM_PAGE_KEYS.CUSTOMERS_LIST)}
              className="rounded-3xl border border-[#eadcf9] bg-[#faf6ff] px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-[#cfb6fb]"
            >
              <div className="font-display text-lg font-bold text-[#171226]">Import customers</div>
              <div className="mt-1 text-sm text-[#6f678a]">Upload a CSV and sync an existing customer base instantly.</div>
            </button>
          </div>
        </SectionCard>
      </div>
    </CrmPageShell>
  );
}
