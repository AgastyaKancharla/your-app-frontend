import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PageContainer from "./ui/PageContainer";
import { API_BASE_URL } from "../config";

const createCampaignForm = () => ({
  channel: "WHATSAPP",
  title: "",
  message: "",
  couponCode: ""
});

const createCouponForm = () => ({
  code: "",
  title: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minOrderValue: "",
  expiresAt: ""
});

const createAutomationForm = () => ({
  name: "",
  triggerType: "INACTIVE_30_DAYS",
  channel: "WHATSAPP",
  messageTemplate: "",
  couponCode: ""
});

const MARKETING_DRAFT_STORAGE_KEY = "wevalue_marketing_campaign_draft";

export default function MarketingTools() {
  const [overview, setOverview] = useState({
    campaigns: [],
    coupons: [],
    automations: [],
    loyaltyLeaders: [],
    referralLeaders: [],
    segmentCounts: {
      totalCustomers: 0,
      whatsappAudience: 0,
      smsAudience: 0,
      repeatCustomers: 0,
      highValueCustomers: 0,
      inactive30Days: 0,
      active30Days: 0
    }
  });
  const [campaignForm, setCampaignForm] = useState(createCampaignForm());
  const [couponForm, setCouponForm] = useState(createCouponForm());
  const [automationForm, setAutomationForm] = useState(createAutomationForm());
  const [loading, setLoading] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [savingAutomation, setSavingAutomation] = useState(false);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/marketing/overview`);
      setOverview(res.data || {});
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to load marketing tools");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(MARKETING_DRAFT_STORAGE_KEY);
      if (!rawDraft) {
        return;
      }

      const parsed = JSON.parse(rawDraft);
      if (!parsed || typeof parsed !== "object") {
        return;
      }

      setCampaignForm((prev) => ({
        ...prev,
        channel: String(parsed.channel || prev.channel || "WHATSAPP").toUpperCase(),
        title: String(parsed.title || prev.title || ""),
        message: String(parsed.message || prev.message || ""),
        couponCode: String(parsed.couponCode || prev.couponCode || "")
      }));
      window.localStorage.removeItem(MARKETING_DRAFT_STORAGE_KEY);
      alert("Campaign draft loaded from Customer CRM.");
    } catch (err) {
      console.error(err);
    }
  }, []);

  const campaignAudienceSummary = useMemo(() => {
    if (overview.segmentCounts) {
      return overview.segmentCounts;
    }

    const whatsappAudience = overview.loyaltyLeaders?.filter(
      (customer) => customer.marketingPreferences?.whatsapp !== false
    ).length || 0;
    const smsAudience = overview.loyaltyLeaders?.filter(
      (customer) => customer.marketingPreferences?.sms !== false
    ).length || 0;

    return {
      totalCustomers: overview.loyaltyLeaders?.length || 0,
      whatsappAudience,
      smsAudience,
      repeatCustomers: 0,
      highValueCustomers: 0,
      inactive30Days: 0,
      active30Days: 0
    };
  }, [overview.loyaltyLeaders, overview.segmentCounts]);

  const createCampaign = async () => {
    if (!campaignForm.title.trim() || !campaignForm.message.trim()) {
      alert("Campaign title and message are required");
      return;
    }

    try {
      setSavingCampaign(true);
      await axios.post(`${API_BASE_URL}/api/marketing/campaigns`, {
        channel: campaignForm.channel,
        title: campaignForm.title.trim(),
        message: campaignForm.message.trim(),
        couponCode: campaignForm.couponCode.trim().toUpperCase()
      });
      setCampaignForm(createCampaignForm());
      await loadOverview();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to create campaign");
    } finally {
      setSavingCampaign(false);
    }
  };

  const createCoupon = async () => {
    if (!couponForm.code.trim()) {
      alert("Coupon code is required");
      return;
    }

    try {
      setSavingCoupon(true);
      await axios.post(`${API_BASE_URL}/api/marketing/coupons`, {
        code: couponForm.code.trim().toUpperCase(),
        title: couponForm.title.trim(),
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue || 0),
        minOrderValue: Number(couponForm.minOrderValue || 0),
        expiresAt: couponForm.expiresAt || null
      });
      setCouponForm(createCouponForm());
      await loadOverview();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to create coupon");
    } finally {
      setSavingCoupon(false);
    }
  };

  const createAutomation = async () => {
    if (!automationForm.name.trim() || !automationForm.messageTemplate.trim()) {
      alert("Automation name and template are required");
      return;
    }

    try {
      setSavingAutomation(true);
      await axios.post(`${API_BASE_URL}/api/marketing/automations`, {
        name: automationForm.name.trim(),
        triggerType: automationForm.triggerType,
        channel: automationForm.channel,
        messageTemplate: automationForm.messageTemplate.trim(),
        couponCode: automationForm.couponCode.trim().toUpperCase()
      });
      setAutomationForm(createAutomationForm());
      await loadOverview();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to create automation rule");
    } finally {
      setSavingAutomation(false);
    }
  };

  const toggleAutomation = async (automationId, isActive) => {
    try {
      await axios.put(`${API_BASE_URL}/api/marketing/automations/${automationId}/toggle`, {
        isActive
      });
      await loadOverview();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to update automation rule");
    }
  };

  return (
    <PageContainer>
      <div style={header}>
        <div>
          <h2 style={title}>Marketing Tools</h2>
          <p style={subtitle}>
            Run WhatsApp and SMS campaigns, manage coupon codes, and track referral and loyalty growth.
          </p>
        </div>
        {loading ? <span style={hint}>Loading marketing data...</span> : null}
      </div>

      <div style={grid}>
        <section style={panel}>
          <h3 style={panelTitle}>Broadcast Campaigns</h3>
          <div style={formGrid}>
            <select
              value={campaignForm.channel}
              onChange={(event) =>
                setCampaignForm((prev) => ({ ...prev, channel: event.target.value }))
              }
              style={input}
            >
              <option value="WHATSAPP">WhatsApp Broadcast</option>
              <option value="SMS">SMS Campaign</option>
            </select>
            <input
              value={campaignForm.title}
              onChange={(event) =>
                setCampaignForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Campaign Title"
              style={input}
            />
            <input
              value={campaignForm.couponCode}
              onChange={(event) =>
                setCampaignForm((prev) => ({ ...prev, couponCode: event.target.value }))
              }
              placeholder="Optional Coupon Code"
              style={input}
            />
          </div>
          <textarea
            value={campaignForm.message}
            onChange={(event) =>
              setCampaignForm((prev) => ({ ...prev, message: event.target.value }))
            }
            placeholder="Write the campaign message for your customers"
            style={textarea}
          />
          <div style={metaRow}>
            <span style={metaChip}>Total Customers: {campaignAudienceSummary.totalCustomers}</span>
            <span style={metaChip}>
              WhatsApp Audience: {campaignAudienceSummary.whatsappAudience}
            </span>
            <span style={metaChip}>SMS Audience: {campaignAudienceSummary.smsAudience}</span>
            <span style={metaChip}>Repeat: {campaignAudienceSummary.repeatCustomers}</span>
            <span style={metaChip}>High Value: {campaignAudienceSummary.highValueCustomers}</span>
            <span style={metaChip}>Inactive 30d: {campaignAudienceSummary.inactive30Days}</span>
          </div>
          <button style={saveBtn} onClick={createCampaign} disabled={savingCampaign}>
            {savingCampaign ? "Saving..." : "Create Campaign"}
          </button>

          <div style={listBlock}>
            {(overview.campaigns || []).map((campaign) => (
              <div key={campaign._id} style={listItem}>
                <div>
                  <div style={itemTitle}>
                    {campaign.channel} • {campaign.title}
                  </div>
                  <div style={itemMeta}>
                    Audience: {campaign.audienceCount || 0}
                    {campaign.couponCode ? ` • Coupon: ${campaign.couponCode}` : ""}
                  </div>
                </div>
                <div style={itemDate}>{new Date(campaign.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={panel}>
          <h3 style={panelTitle}>Coupon Codes</h3>
          <div style={formGrid}>
            <input
              value={couponForm.code}
              onChange={(event) => setCouponForm((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="WELCOME10"
              style={input}
            />
            <input
              value={couponForm.title}
              onChange={(event) => setCouponForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Coupon Title"
              style={input}
            />
            <select
              value={couponForm.discountType}
              onChange={(event) =>
                setCouponForm((prev) => ({ ...prev, discountType: event.target.value }))
              }
              style={input}
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FLAT">Flat</option>
            </select>
            <input
              type="number"
              value={couponForm.discountValue}
              onChange={(event) =>
                setCouponForm((prev) => ({ ...prev, discountValue: event.target.value }))
              }
              placeholder="Discount Value"
              style={input}
            />
            <input
              type="number"
              value={couponForm.minOrderValue}
              onChange={(event) =>
                setCouponForm((prev) => ({ ...prev, minOrderValue: event.target.value }))
              }
              placeholder="Minimum Order Value"
              style={input}
            />
            <input
              type="date"
              value={couponForm.expiresAt}
              onChange={(event) =>
                setCouponForm((prev) => ({ ...prev, expiresAt: event.target.value }))
              }
              style={input}
            />
          </div>
          <button style={saveBtn} onClick={createCoupon} disabled={savingCoupon}>
            {savingCoupon ? "Saving..." : "Save Coupon"}
          </button>

          <div style={listBlock}>
            {(overview.coupons || []).map((coupon) => (
              <div key={coupon._id} style={listItem}>
                <div>
                  <div style={itemTitle}>{coupon.code}</div>
                  <div style={itemMeta}>
                    {coupon.discountType === "FLAT" ? "Flat" : "Percent"} {coupon.discountValue}
                    {coupon.minOrderValue ? ` • Min order ${coupon.minOrderValue}` : ""}
                    {coupon.usageCount ? ` • Used ${coupon.usageCount} times` : ""}
                  </div>
                </div>
                <div style={itemDate}>
                  {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "No expiry"}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div style={grid}>
        <section style={panel}>
          <h3 style={panelTitle}>Marketing Automation</h3>
          <div style={formGrid}>
            <input
              value={automationForm.name}
              onChange={(event) =>
                setAutomationForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Rule name"
              style={input}
            />
            <select
              value={automationForm.triggerType}
              onChange={(event) =>
                setAutomationForm((prev) => ({ ...prev, triggerType: event.target.value }))
              }
              style={input}
            >
              <option value="INACTIVE_30_DAYS">Inactive for 30 days</option>
              <option value="FIRST_ORDER">After first order</option>
              <option value="LOYALTY_MILESTONE">Loyalty milestone</option>
              <option value="MANUAL_SEGMENT">Manual segment</option>
            </select>
            <select
              value={automationForm.channel}
              onChange={(event) =>
                setAutomationForm((prev) => ({ ...prev, channel: event.target.value }))
              }
              style={input}
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
            </select>
            <input
              value={automationForm.couponCode}
              onChange={(event) =>
                setAutomationForm((prev) => ({ ...prev, couponCode: event.target.value }))
              }
              placeholder="Optional coupon"
              style={input}
            />
          </div>
          <textarea
            value={automationForm.messageTemplate}
            onChange={(event) =>
              setAutomationForm((prev) => ({ ...prev, messageTemplate: event.target.value }))
            }
            placeholder="Automation message template"
            style={textarea}
          />
          <button style={saveBtn} onClick={createAutomation} disabled={savingAutomation}>
            {savingAutomation ? "Saving..." : "Create Automation Rule"}
          </button>

          <div style={listBlock}>
            {(overview.automations || []).map((rule) => (
              <div key={rule._id} style={listItem}>
                <div>
                  <div style={itemTitle}>
                    {rule.name} • {rule.channel}
                  </div>
                  <div style={itemMeta}>
                    Trigger: {rule.triggerType}
                    {rule.couponCode ? ` • Coupon: ${rule.couponCode}` : ""}
                  </div>
                </div>
                <button
                  style={rule.isActive === false ? toggleBtnOff : toggleBtnOn}
                  onClick={() => toggleAutomation(rule._id, rule.isActive === false)}
                >
                  {rule.isActive === false ? "Enable" : "Disable"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section style={panel}>
          <h3 style={panelTitle}>Referral Program</h3>
          <div style={leaderboard}>
            {(overview.referralLeaders || []).slice(0, 6).map((customer) => (
              <div key={customer._id || customer.id} style={leaderCard}>
                <strong style={leaderName}>{customer.name || customer.phone}</strong>
                <span style={leaderMeta}>Code: {customer.referralCode || "-"}</span>
                <span style={leaderMeta}>Referrals: {customer.totalReferrals || 0}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={panel}>
          <h3 style={panelTitle}>Loyalty Points</h3>
          <div style={leaderboard}>
            {(overview.loyaltyLeaders || []).slice(0, 6).map((customer) => (
              <div key={customer._id || customer.id} style={leaderCard}>
                <strong style={leaderName}>{customer.name || customer.phone}</strong>
                <span style={leaderMeta}>{customer.phone}</span>
                <span style={leaderMeta}>Points: {customer.loyaltyPoints || 0}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 16
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

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 14,
  marginBottom: 14
};

const panel = {
  border: "1px solid #2a2d38",
  background: "#151821",
  borderRadius: 16,
  padding: 16,
  display: "grid",
  gap: 12
};

const panelTitle = {
  margin: 0,
  color: "#eef2fb",
  fontSize: 18
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10
};

const input = {
  height: 40,
  borderRadius: 10,
  border: "1px solid #343949",
  background: "#0f1218",
  color: "#ecf1fa",
  padding: "0 12px",
  outline: 0
};

const textarea = {
  minHeight: 110,
  borderRadius: 10,
  border: "1px solid #343949",
  background: "#0f1218",
  color: "#ecf1fa",
  padding: "10px 12px",
  outline: 0,
  resize: "vertical"
};

const metaRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8
};

const metaChip = {
  borderRadius: 999,
  border: "1px solid rgba(244,201,58,0.35)",
  background: "rgba(244,201,58,0.12)",
  color: "#f4c93a",
  fontSize: 12,
  fontWeight: 800,
  padding: "7px 10px"
};

const saveBtn = {
  height: 40,
  border: 0,
  borderRadius: 10,
  background: "#38c98f",
  color: "#102519",
  fontWeight: 800,
  cursor: "pointer",
  padding: "0 14px"
};

const listBlock = {
  display: "grid",
  gap: 10
};

const listItem = {
  border: "1px solid #2f3547",
  borderRadius: 12,
  background: "#10141d",
  padding: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start"
};

const itemTitle = {
  color: "#eef2fb",
  fontWeight: 700,
  fontSize: 14
};

const itemMeta = {
  color: "#96a0b8",
  fontSize: 12,
  marginTop: 4
};

const itemDate = {
  color: "#f4c93a",
  fontSize: 12,
  fontWeight: 700,
  textAlign: "right"
};

const leaderboard = {
  display: "grid",
  gap: 10
};

const leaderCard = {
  border: "1px solid #2f3547",
  borderRadius: 12,
  background: "#10141d",
  padding: 12,
  display: "grid",
  gap: 6
};

const leaderName = {
  color: "#eef2fb",
  fontSize: 15
};

const leaderMeta = {
  color: "#96a0b8",
  fontSize: 13
};

const hint = {
  color: "#99a4bc",
  fontSize: 13
};

const toggleBtnOn = {
  height: 30,
  borderRadius: 8,
  border: "1px solid rgba(255,145,145,0.45)",
  background: "rgba(172,72,72,0.16)",
  color: "#ffb7b7",
  fontWeight: 700,
  cursor: "pointer",
  padding: "0 10px"
};

const toggleBtnOff = {
  height: 30,
  borderRadius: 8,
  border: "1px solid rgba(88,209,158,0.45)",
  background: "rgba(88,209,158,0.16)",
  color: "#8ff4ca",
  fontWeight: 700,
  cursor: "pointer",
  padding: "0 10px"
};
