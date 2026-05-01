import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createCrmCampaign,
  fetchCrmAnalytics,
  fetchCrmCampaigns,
  formatCurrency,
  formatNumber
} from "../api";
import {
  CrmPageShell,
  EmptyPanel,
  ErrorPanel,
  FormField,
  Input,
  LoadingPanel,
  MetricCard,
  PrimaryButton,
  SectionCard,
  Select,
  TextArea
} from "../components/CrmPrimitives";
import MarketingAnalyticsPage from "./analytics.page";

const DEFAULT_ANALYTICS = {
  metrics: {
    campaigns: 0,
    messagesSent: 0,
    delivered: 0,
    openRate: 0,
    clickRate: 0,
    conversions: 0,
    revenue: 0
  },
  performance: [],
  bestCampaign: null,
  bestSendingTime: "Dinner",
  recommendations: []
};

const DEFAULT_FORM = {
  name: "",
  type: "PROMO",
  audience: "ALL",
  channel: "WHATSAPP",
  message: "",
  scheduledFor: ""
};

export default function CampaignsPage() {
  const [analytics, setAnalytics] = useState(DEFAULT_ANALYTICS);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const loadMarketingWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [analyticsResponse, campaignsResponse] = await Promise.all([
        fetchCrmAnalytics(),
        fetchCrmCampaigns()
      ]);

      setAnalytics(analyticsResponse?.marketingOverview || DEFAULT_ANALYTICS);
      setCampaigns(campaignsResponse || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load CRM marketing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMarketingWorkspace();
  }, [loadMarketingWorkspace]);

  const handleCreateCampaign = async () => {
    setSaving(true);
    setError("");

    try {
      await createCrmCampaign(form);
      setForm(DEFAULT_FORM);
      await loadMarketingWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create campaign.");
    } finally {
      setSaving(false);
    }
  };

  const metricCards = useMemo(
    () => [
      { label: "Campaigns", value: formatNumber(analytics.metrics.campaigns), helper: "Active CRM sends" },
      { label: "Messages Sent", value: formatNumber(analytics.metrics.messagesSent), helper: "Audience touched", accent: "violet" },
      { label: "Delivered", value: formatNumber(analytics.metrics.delivered), helper: "Successful deliveries", accent: "mint" },
      { label: "Open Rate", value: `${analytics.metrics.openRate}%`, helper: "Opened / delivered", accent: "amber" },
      { label: "Click Rate", value: `${analytics.metrics.clickRate}%`, helper: "Clicks / opens", accent: "sky" },
      { label: "Conversions", value: formatNumber(analytics.metrics.conversions), helper: "Orders attributed", accent: "violet" },
      { label: "Revenue", value: formatCurrency(analytics.metrics.revenue), helper: "Campaign-attributed sales", accent: "mint" }
    ],
    [analytics.metrics]
  );

  if (loading) {
    return <LoadingPanel label="Loading marketing dashboard..." />;
  }

  return (
    <CrmPageShell
      eyebrow="CRM Marketing"
      title="Campaign builder and revenue attribution"
      description="Plan messages, target customer segments, and monitor the performance impact of every CRM campaign from one premium dashboard."
      actions={<PrimaryButton onClick={handleCreateCampaign}>{saving ? "Saving..." : "Launch Campaign"}</PrimaryButton>}
    >
      {error ? (
        <ErrorPanel
          description={error}
          action={<PrimaryButton onClick={loadMarketingWorkspace}>Retry</PrimaryButton>}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {metricCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            helper={card.helper}
            accent={card.accent}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Campaign Builder" description="Configure audience, channel, message, and launch timing from a single operator panel.">
          <div className="space-y-4">
            <FormField label="Campaign Name">
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Weekend dinner revival" />
            </FormField>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Audience">
                <Select value={form.audience} onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))}>
                  <option value="ALL">All Customers</option>
                  <option value="HIGH_VALUE">High Value</option>
                  <option value="FREQUENT">Frequent</option>
                  <option value="AT_RISK">At Risk</option>
                  <option value="LOST">Lost</option>
                  <option value="DIRECT">Direct</option>
                  <option value="SWIGGY">Swiggy</option>
                  <option value="ZOMATO">Zomato</option>
                </Select>
              </FormField>
              <FormField label="Channel">
                <Select value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="SMS">SMS</option>
                </Select>
              </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Campaign Type">
                <Select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                  <option value="PROMO">Promo</option>
                  <option value="RE_ENGAGEMENT">Re-engagement</option>
                  <option value="LOYALTY">Loyalty</option>
                  <option value="CROSS_SELL">Cross-sell</option>
                </Select>
              </FormField>
              <FormField label="Schedule">
                <Input type="datetime-local" value={form.scheduledFor} onChange={(event) => setForm((current) => ({ ...current, scheduledFor: event.target.value }))} />
              </FormField>
            </div>
            <FormField label="Message">
              <TextArea
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                placeholder="Dinner rush starts at 7 PM. Come back today for a personalised combo offer and faster delivery."
              />
            </FormField>
            <PrimaryButton onClick={handleCreateCampaign} disabled={saving}>
              {saving ? "Creating..." : "Create Campaign"}
            </PrimaryButton>
          </div>
        </SectionCard>

        <MarketingAnalyticsPage analytics={analytics} campaigns={campaigns} />
      </div>

      <SectionCard title="Campaign Table" description="Delivery metrics, engagement, and attributed revenue across every CRM campaign.">
        {!campaigns.length ? (
          <EmptyPanel
            title="No campaigns created yet"
            description="Build your first campaign from the builder panel to start measuring engagement and revenue."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-[#8f84ac]">
                  <th className="px-4 py-2">Campaign</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Channel</th>
                  <th className="px-4 py-2">Audience</th>
                  <th className="px-4 py-2">Sent</th>
                  <th className="px-4 py-2">Delivered</th>
                  <th className="px-4 py-2">Open %</th>
                  <th className="px-4 py-2">CTR</th>
                  <th className="px-4 py-2">Orders</th>
                  <th className="px-4 py-2">Revenue</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="bg-[#fbf8ff]">
                    <td className="rounded-l-3xl px-4 py-4">
                      <div className="font-semibold text-[#171226]">{campaign.name}</div>
                      <div className="mt-1 text-xs text-[#8f84ac]">
                        {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString("en-IN") : "Draft"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#47386f]">{campaign.type}</td>
                    <td className="px-4 py-4 text-sm text-[#47386f]">{campaign.channel}</td>
                    <td className="px-4 py-4 text-sm text-[#47386f]">{campaign.audience}</td>
                    <td className="px-4 py-4 text-sm text-[#47386f]">{formatNumber(campaign.sent)}</td>
                    <td className="px-4 py-4 text-sm text-[#47386f]">{formatNumber(campaign.delivered)}</td>
                    <td className="px-4 py-4 text-sm text-[#47386f]">{campaign.openRate}%</td>
                    <td className="px-4 py-4 text-sm text-[#47386f]">{campaign.ctr}%</td>
                    <td className="px-4 py-4 text-sm text-[#47386f]">{formatNumber(campaign.orders)}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-[#171226]">{formatCurrency(campaign.revenue)}</td>
                    <td className="rounded-r-3xl px-4 py-4">
                      <span className="inline-flex rounded-full bg-[#f3ebff] px-3 py-1 text-xs font-semibold text-[#6b21a8]">
                        {campaign.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </CrmPageShell>
  );
}
