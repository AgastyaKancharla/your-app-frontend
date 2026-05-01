const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toAmount = (value) => Math.max(0, toNumber(value));

const getOrderAmount = (order = {}) =>
  toAmount(order.total ?? order.amount ?? order.grandTotal ?? order.netAmount ?? order.subtotal);

const getItemQuantity = (item = {}) => toAmount(item.qty ?? item.quantity);

const getItemCostPrice = (item = {}) =>
  toAmount(
    item.cost_price ??
      item.costPrice ??
      item.unitCost ??
      item.recipeCost ??
      item.purchasePrice ??
      item.cost
  );

const getItemRevenue = (item = {}) => {
  const quantity = getItemQuantity(item);
  return toAmount(
    item.total ?? item.lineTotal ?? item.amount ?? item.subtotal ?? toAmount(item.price ?? item.unitPrice) * quantity
  );
};

const formatLabel = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
};

const getOrderChannel = (order = {}) =>
  formatLabel(
    order.channel ||
      order.salesChannel ||
      order.orderChannel ||
      order.source ||
      order.platform ||
      order.aggregator ||
      "Direct"
  );

const getOrderReference = (order = {}, index = 0) =>
  String(order.orderId || order.invoiceNumber || order.id || `Order ${index + 1}`);

const getPaymentBucket = (order = {}) => {
  const value = String(
    order.paymentMethod || order.paymentMode || order.payment || order.tender || ""
  ).toLowerCase();

  if (!value) {
    return "Cash";
  }

  if (value.includes("upi")) {
    return "UPI";
  }

  if (value.includes("cash")) {
    return "Cash";
  }

  return "Online";
};

const getPendingPayoutAmount = (order = {}) => {
  const explicitAmount =
    order.pendingPayoutAmount ?? order.payoutDue ?? order.settlementDue ?? order.amountDue;
  const parsedExplicit = toAmount(explicitAmount);
  if (parsedExplicit > 0) {
    return parsedExplicit;
  }

  const status = String(
    order.payoutStatus || order.settlementStatus || order.paymentSettlementStatus || ""
  ).toLowerCase();

  return status.includes("pending") ? getOrderAmount(order) : 0;
};

const parseDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const isSameDay = (left, right) =>
  left &&
  right &&
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const isSameMonth = (left, right) =>
  left &&
  right &&
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth();

const asPercent = (part, total) => (total ? (part / total) * 100 : 0);

const buildExpenseBreakdown = (expenses = [], totalExpenses = 0) => {
  const grouped = new Map();

  expenses.forEach((expense) => {
    const category = formatLabel(expense.category || "Uncategorized");
    const current = grouped.get(category) || {
      category,
      amount: 0,
      count: 0,
      percent: 0
    };

    current.amount += toAmount(expense.amount);
    current.count += 1;
    grouped.set(category, current);
  });

  return [...grouped.values()]
    .map((entry) => ({
      ...entry,
      percent: asPercent(entry.amount, totalExpenses)
    }))
    .sort((left, right) => right.amount - left.amount);
};

const buildChannelBreakdown = (orders = [], grossSales = 0) => {
  const grouped = new Map();

  orders.forEach((order) => {
    const channel = getOrderChannel(order);
    const amount = getOrderAmount(order);
    const current = grouped.get(channel) || {
      channel,
      amount: 0,
      orders: 0,
      aov: 0,
      percent: 0
    };

    current.amount += amount;
    current.orders += 1;
    grouped.set(channel, current);
  });

  return [...grouped.values()]
    .map((entry) => ({
      ...entry,
      aov: entry.orders ? entry.amount / entry.orders : 0,
      percent: asPercent(entry.amount, grossSales)
    }))
    .sort((left, right) => right.amount - left.amount);
};

const buildItemPerformance = (orders = []) => {
  const grouped = new Map();

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const name = String(item.name || "Item").trim() || "Item";
      const key = String(item.id || item.itemId || item.sku || name).trim();
      const quantity = getItemQuantity(item);
      const revenue = getItemRevenue(item);
      const cost = getItemCostPrice(item) * quantity;
      const current = grouped.get(key) || {
        id: key,
        name,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        marginPercent: 0
      };

      current.quantity += quantity;
      current.revenue += revenue;
      current.cost += cost;
      current.profit = current.revenue - current.cost;
      current.marginPercent = asPercent(current.profit, current.revenue);
      grouped.set(key, current);
    });
  });

  return [...grouped.values()].sort((left, right) => right.revenue - left.revenue);
};

const buildCashFlow = (orders = []) => {
  const cashFlow = {
    cash: 0,
    upi: 0,
    online: 0,
    pendingPayouts: 0,
    entries: []
  };

  orders.forEach((order, index) => {
    const amount = getOrderAmount(order);
    const bucket = getPaymentBucket(order);
    const pendingPayout = getPendingPayoutAmount(order);

    if (bucket === "Cash") {
      cashFlow.cash += amount;
    } else if (bucket === "UPI") {
      cashFlow.upi += amount;
    } else {
      cashFlow.online += amount;
    }

    cashFlow.pendingPayouts += pendingPayout;
    cashFlow.entries.push({
      id: String(order.id || order.orderId || index),
      order: getOrderReference(order, index),
      paymentMethod: bucket,
      amount,
      pendingPayout,
      channel: getOrderChannel(order)
    });
  });

  return cashFlow;
};

const buildExpenseTotals = (expenses = []) => {
  const today = new Date();
  let dailyExpenseTotal = 0;
  let monthlyExpenseTotal = 0;

  expenses.forEach((expense) => {
    const expenseDate = parseDate(expense.date);
    const amount = toAmount(expense.amount);

    if (isSameDay(expenseDate, today)) {
      dailyExpenseTotal += amount;
    }

    if (isSameMonth(expenseDate, today)) {
      monthlyExpenseTotal += amount;
    }
  });

  return {
    dailyExpenseTotal,
    monthlyExpenseTotal
  };
};

export function calculateFinance(orders = [], expenses = []) {
  let grossSales = 0;
  let cogs = 0;
  let orderCount = orders.length;

  orders.forEach((order) => {
    grossSales += getOrderAmount(order);

    (order.items || []).forEach((item) => {
      cogs += getItemCostPrice(item) * getItemQuantity(item);
    });
  });

  const totalExpenses = expenses.reduce((sum, expense) => sum + toAmount(expense.amount), 0);
  const aov = orderCount ? grossSales / orderCount : 0;
  const foodCostPercent = grossSales ? (cogs / grossSales) * 100 : 0;
  const grossProfit = grossSales - cogs;
  const netProfit = grossSales - (cogs + totalExpenses);
  const profitMarginPercent = grossSales ? (netProfit / grossSales) * 100 : 0;
  const expenseBreakdown = buildExpenseBreakdown(expenses, totalExpenses);
  const channelBreakdown = buildChannelBreakdown(orders, grossSales);
  const itemPerformance = buildItemPerformance(orders);
  const cashFlow = buildCashFlow(orders);
  const expenseTotals = buildExpenseTotals(expenses);
  const alerts = [];

  if (foodCostPercent > 60) {
    alerts.push("⚠️ Food cost too high");
  }

  if (netProfit < 0) {
    alerts.push("⚠️ Business running in loss");
  }

  return {
    grossSales,
    cogs,
    totalExpenses,
    netProfit,
    orderCount,
    aov,
    foodCostPercent,
    grossProfit,
    profitMarginPercent,
    expenseBreakdown,
    channelBreakdown,
    itemPerformance,
    topItems: itemPerformance.slice(0, 5),
    lowMarginItems: [...itemPerformance]
      .filter((item) => item.revenue > 0)
      .sort((left, right) => left.marginPercent - right.marginPercent)
      .slice(0, 5),
    revenueOrders: orders.map((order, index) => ({
      id: String(order.id || order.orderId || index),
      order: getOrderReference(order, index),
      channel: getOrderChannel(order),
      amount: getOrderAmount(order),
      paymentMethod: getPaymentBucket(order)
    })),
    cashFlow,
    alerts,
    ...expenseTotals
  };
}
