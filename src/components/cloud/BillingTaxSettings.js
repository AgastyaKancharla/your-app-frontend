import { useMemo } from "react";

import { useSettingsStore } from "../../store/settingsStore";
import { calculateBill } from "../../utils/calculateBill";
import { cloudKitchenTheme } from "../../theme";

const SAMPLE_BILL_ITEMS = [
  { id: "preview-1", name: "Paneer Bowl", qty: 1, price: 240, gst: 5 },
  { id: "preview-2", name: "Cold Coffee", qty: 2, price: 120, gst: 12 }
];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatCurrency = (value = 0) => currencyFormatter.format(Number(value || 0));

export default function BillingTaxSettings() {
  const { taxConfig, updateTaxConfig, resetTaxConfig } = useSettingsStore();

  const preview = useMemo(
    () => calculateBill(SAMPLE_BILL_ITEMS, taxConfig),
    [taxConfig]
  );

  return (
    <div style={page}>
      <header style={hero}>
        <div>
          <h1 style={title}>Billing & Tax Settings</h1>
          <p style={subtitle}>
            Centralize GST behavior for POS and order creation across this cloud kitchen workspace.
          </p>
        </div>
        <button type="button" style={secondaryButton} onClick={resetTaxConfig}>
          Reset Defaults
        </button>
      </header>

      <section style={card}>
        <div style={cardHeader}>
          <h2 style={cardTitle}>Tax Configuration</h2>
          <span style={metaTag}>{taxConfig.taxMode.toUpperCase()}</span>
        </div>

        <div style={row}>
          <div>
            <div style={fieldTitle}>Enable Tax</div>
            <div style={fieldHint}>Turn GST billing on or off for POS checkout.</div>
          </div>
          <ToggleSwitch
            checked={taxConfig.taxMode !== "disabled"}
            onChange={(enabled) =>
              updateTaxConfig({
                taxMode: enabled ? "exclusive" : "disabled"
              })
            }
          />
        </div>

        <div style={grid}>
          <label style={field}>
            <span style={fieldTitle}>Tax Type</span>
            <select
              value={taxConfig.taxMode}
              onChange={(event) => updateTaxConfig({ taxMode: event.target.value })}
              style={selectInput}
              disabled={taxConfig.taxMode === "disabled"}
            >
              {taxConfig.taxMode === "disabled" ? (
                <option value="disabled">Tax Disabled</option>
              ) : null}
              <option value="exclusive">GST Exclusive</option>
              <option value="inclusive">GST Inclusive</option>
            </select>
          </label>

          <label style={field}>
            <span style={fieldTitle}>Default GST (%)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={taxConfig.defaultTaxRate}
              onChange={(event) =>
                updateTaxConfig({ defaultTaxRate: Number(event.target.value || 0) })
              }
              style={textInput}
              disabled={taxConfig.taxMode === "disabled"}
            />
          </label>
        </div>

        <label style={field}>
          <span style={fieldTitle}>Tax Label</span>
          <input
            type="text"
            value={taxConfig.taxName}
            onChange={(event) => updateTaxConfig({ taxName: event.target.value })}
            style={textInput}
            placeholder="GST"
          />
        </label>

        <div style={divider} />

        <div style={row}>
          <div>
            <div style={fieldTitle}>Item-Level Tax</div>
            <div style={fieldHint}>Use per-item GST if available; fallback to default rate.</div>
          </div>
          <ToggleSwitch
            checked={taxConfig.itemLevelTax}
            onChange={(checked) => updateTaxConfig({ itemLevelTax: checked })}
          />
        </div>

        <div style={row}>
          <div>
            <div style={fieldTitle}>Show Tax Breakdown</div>
            <div style={fieldHint}>Display tax line separately in POS billing summary.</div>
          </div>
          <ToggleSwitch
            checked={taxConfig.showTaxBreakdown}
            onChange={(checked) => updateTaxConfig({ showTaxBreakdown: checked })}
          />
        </div>

        <div style={row}>
          <div>
            <div style={fieldTitle}>Round Off Total</div>
            <div style={fieldHint}>Round final bill total to the nearest rupee.</div>
          </div>
          <ToggleSwitch
            checked={taxConfig.roundOff}
            onChange={(checked) => updateTaxConfig({ roundOff: checked })}
          />
        </div>
      </section>

      <section style={card}>
        <div style={cardHeader}>
          <h2 style={cardTitle}>Preview</h2>
          <span style={fieldHint}>Sample bill simulation</span>
        </div>

        <div style={previewItems}>
          {SAMPLE_BILL_ITEMS.map((item) => (
            <div key={item.id} style={previewRow}>
              <span>{item.name}</span>
              <span>
                {item.qty} x {formatCurrency(item.price)}
              </span>
            </div>
          ))}
        </div>

        <div style={divider} />

        <div style={summaryRow}>
          <span>Subtotal</span>
          <strong>{formatCurrency(preview.subtotal)}</strong>
        </div>
        {taxConfig.taxMode !== "disabled" ? (
          <div style={summaryRow}>
            <span>{taxConfig.taxName}</span>
            <strong>{formatCurrency(preview.tax)}</strong>
          </div>
        ) : null}
        <div style={totalRow}>
          <span>Total</span>
          <strong>{formatCurrency(preview.total)}</strong>
        </div>
      </section>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      style={{
        ...toggle,
        ...(checked ? toggleOn : null)
      }}
      onClick={() => onChange(!checked)}
    >
      <span
        style={{
          ...toggleDot,
          transform: checked ? "translateX(18px)" : "translateX(0)"
        }}
      />
    </button>
  );
}

const page = {
  display: "grid",
  gap: 16,
  color: cloudKitchenTheme.textPrimary
};

const hero = {
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 16,
  background: "linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 55%, #ECFEFF 100%)",
  padding: "16px 18px",
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
  flexWrap: "wrap"
};

const title = {
  margin: 0,
  fontSize: 30,
  lineHeight: 1.1,
  color: "#0F172A",
  fontWeight: 800
};

const subtitle = {
  margin: "6px 0 0",
  color: "#475569",
  fontSize: 14
};

const secondaryButton = {
  height: 38,
  borderRadius: 10,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  color: "#0F172A",
  padding: "0 12px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer"
};

const card = {
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 16,
  background: "#FFFFFF",
  boxShadow: cloudKitchenTheme.shadow,
  padding: 16,
  display: "grid",
  gap: 14
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap"
};

const cardTitle = {
  margin: 0,
  fontSize: 18,
  color: "#111827",
  fontWeight: 800
};

const metaTag = {
  borderRadius: 999,
  border: "1px solid #C7D2FE",
  background: "#EEF2FF",
  color: "#3730A3",
  padding: "4px 9px",
  fontSize: 11,
  fontWeight: 800
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: 12
};

const field = {
  display: "grid",
  gap: 6
};

const fieldTitle = {
  color: "#334155",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.2
};

const fieldHint = {
  color: "#64748B",
  fontSize: 12
};

const textInput = {
  height: 40,
  borderRadius: 10,
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#0F172A",
  padding: "0 12px",
  fontSize: 14
};

const selectInput = {
  ...textInput,
  cursor: "pointer"
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center"
};

const divider = {
  height: 1,
  background: "#E2E8F0"
};

const toggle = {
  width: 44,
  height: 26,
  borderRadius: 999,
  border: "1px solid #CBD5E1",
  background: "#E2E8F0",
  padding: 2,
  display: "inline-flex",
  alignItems: "center",
  cursor: "pointer",
  transition: "background 150ms ease, border-color 150ms ease"
};

const toggleOn = {
  background: "#0F172A",
  borderColor: "#0F172A"
};

const toggleDot = {
  width: 20,
  height: 20,
  borderRadius: "50%",
  background: "#FFFFFF",
  transition: "transform 150ms ease"
};

const previewItems = {
  display: "grid",
  gap: 8
};

const previewRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 13,
  color: "#334155"
};

const summaryRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  color: "#0F172A",
  fontSize: 14
};

const totalRow = {
  ...summaryRow,
  borderTop: "1px solid #E2E8F0",
  paddingTop: 10,
  fontSize: 16,
  fontWeight: 800
};
