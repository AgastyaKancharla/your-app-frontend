import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatCurrency, formatNumber } from "../api";
import { EmptyPanel, InsightCard, SectionCard } from "../components/CrmPrimitives";

export default function MarketingAnalyticsPage({ analytics, campaigns = [] }) {
  const performance = analytics?.performance || [];
  const bestCampaign = analytics?.bestCampaign || null;
  const recommendations = analytics?.recommendations || [];

  return (
    <div className="space-y-5">
      <SectionCard title="Campaign Performance" description="Recent sends across open activity and revenue contribution.">
        {!performance.length ? (
          <EmptyPanel
            title="No campaign performance yet"
            description="Create the first campaign to see delivery, engagement, and revenue trend lines."
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performance}>
                  <CartesianGrid stroke="#efe5ff" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#7d74a1", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#7d74a1", fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sent" stroke="#7c3aed" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="opened" stroke="#c084fc" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance}>
                  <CartesianGrid stroke="#efe5ff" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#7d74a1", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#7d74a1", fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="#7c3aed" radius={[14, 14, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Best Campaign" description="Top performer by revenue contribution.">
          {bestCampaign ? (
            <div className="rounded-[28px] bg-[linear-gradient(135deg,_#7c3aed,_#a855f7_70%,_#c084fc)] p-6 text-white shadow-crm">
              <div className="text-xs uppercase tracking-[0.24em] text-white/75">Top performer</div>
              <div className="mt-3 font-display text-3xl font-bold">{bestCampaign.name}</div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/70">Revenue</div>
                  <div className="mt-2 text-xl font-bold">{formatCurrency(bestCampaign.revenue)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/70">CTR</div>
                  <div className="mt-2 text-xl font-bold">{bestCampaign.ctr}%</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/70">Campaigns Live</div>
                  <div className="mt-2 text-xl font-bold">{formatNumber(campaigns.length)}</div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyPanel
              title="No best campaign yet"
              description="As soon as a campaign is created, this panel will highlight the strongest performer."
            />
          )}
        </SectionCard>

        <SectionCard title="Best Sending Time" description="Derived from customer ordering behavior across the CRM.">
          <div className="grid gap-4">
            <InsightCard
              title="Best Time"
              value={analytics?.bestSendingTime || "Dinner"}
              description="The strongest window to launch a new campaign."
              tone="mint"
            />
            {recommendations.map((recommendation, index) => (
              <InsightCard
                key={recommendation}
                title={`AI Recommendation ${index + 1}`}
                value={recommendation}
                description="Behavior-driven recommendation pulled from CRM analytics."
                tone={index === 1 ? "amber" : index === 2 ? "rose" : "violet"}
              />
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
