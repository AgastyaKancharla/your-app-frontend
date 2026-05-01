import { cloudKitchenTheme } from "../../theme";
import { STATUS_GLYPHS, STATUS_TONES, toStatusTone } from "./statusTheme";

export default function AIInsights({ insights = [] }) {
  const visibleInsights = Array.isArray(insights) ? insights.slice(0, 4) : [];

  if (!visibleInsights.length) {
    return null;
  }

  return (
    <section style={panel}>
      <div style={header}>
        <div style={title}>AI Insights</div>
        <div style={subtitle}>Suggestions inferred from live kitchen signals</div>
      </div>

      <div style={list}>
        {visibleInsights.map((insight, index) => {
          const status = toStatusTone(insight?.type || "info");
          const tone = STATUS_TONES[status] || STATUS_TONES.info;

          return (
            <article
              key={`${insight?.type || "info"}-${index}`}
              style={{
                ...item,
                borderColor: tone.border,
                background: tone.background
              }}
            >
              <div style={itemTop}>
                <span
                  style={{
                    ...icon,
                    color: tone.text,
                    borderColor: tone.border
                  }}
                >
                  {STATUS_GLYPHS[status]}
                </span>
                <span style={{ ...typeLabel, color: tone.text }}>{String(status).toUpperCase()}</span>
              </div>
              <div style={message}>{insight?.message || "Insight unavailable"}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const panel = {
  background: cloudKitchenTheme.card,
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 20,
  padding: 16,
  boxShadow: cloudKitchenTheme.shadow
};

const header = {
  marginBottom: 12
};

const title = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 15,
  fontWeight: 800
};

const subtitle = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  marginTop: 4
};

const list = {
  display: "grid",
  gap: 8
};

const item = {
  borderRadius: 12,
  border: "1px solid",
  padding: 11,
  display: "grid",
  gap: 8
};

const itemTop = {
  display: "flex",
  alignItems: "center",
  gap: 8
};

const icon = {
  width: 21,
  height: 21,
  borderRadius: 999,
  border: "1px solid",
  background: "#FFFFFF",
  display: "inline-grid",
  placeItems: "center",
  fontSize: 10,
  fontWeight: 800
};

const typeLabel = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.07em"
};

const message = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 12,
  lineHeight: 1.45
};
