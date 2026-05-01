import { normalizeTaxConfig } from "../store/settingsStore";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundToPaise = (value) => Number(toNumber(value).toFixed(2));

const resolveTaxRate = (item, taxConfig) => {
  if (taxConfig.itemLevelTax) {
    const itemRate = toNumber(item?.gst ?? item?.taxRate ?? item?.tax, Number.NaN);
    if (Number.isFinite(itemRate) && itemRate >= 0) {
      return itemRate;
    }
  }

  return Math.max(0, toNumber(taxConfig.defaultTaxRate, 0));
};

export function calculateBill(cartItems = [], taxConfigInput = {}) {
  const taxConfig = normalizeTaxConfig(taxConfigInput);
  const items = Array.isArray(cartItems) ? cartItems : [];

  let subtotal = 0;
  let tax = 0;

  items.forEach((item) => {
    const qty = Math.max(0, toNumber(item?.qty ?? item?.quantity, 0));
    const price = Math.max(0, toNumber(item?.price ?? item?.unitPrice, 0));
    const itemTotal = qty * price;

    if (!itemTotal) {
      return;
    }

    const rate = resolveTaxRate(item, taxConfig);

    if (taxConfig.taxMode === "inclusive") {
      if (rate <= 0) {
        subtotal += itemTotal;
        return;
      }

      const base = itemTotal / (1 + rate / 100);
      subtotal += base;
      tax += itemTotal - base;
      return;
    }

    if (taxConfig.taxMode === "exclusive") {
      subtotal += itemTotal;
      tax += (itemTotal * rate) / 100;
      return;
    }

    subtotal += itemTotal;
  });

  let total = subtotal + tax;

  if (taxConfig.roundOff) {
    total = Math.round(total);
  }

  return {
    subtotal: roundToPaise(subtotal),
    tax: roundToPaise(tax),
    total: roundToPaise(total)
  };
}
