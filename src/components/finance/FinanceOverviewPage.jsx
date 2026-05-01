import { useMemo, useState } from "react";

import CashFlowPage from "../../pages/finance/cashflow";
import FoodCostPage from "../../pages/finance/cogs";
import FinanceDashboardPage from "../../pages/finance/dashboard";
import ExpensesPage from "../../pages/finance/expenses";
import ProfitLossPage from "../../pages/finance/pnl";
import RevenuePage from "../../pages/finance/revenue";

const FINANCE_SECTIONS = [
  {
    key: "dashboard",
    label: "Dashboard",
    Component: FinanceDashboardPage
  },
  {
    key: "revenue",
    label: "Revenue",
    Component: RevenuePage
  },
  {
    key: "cogs",
    label: "Food Cost",
    Component: FoodCostPage
  },
  {
    key: "expenses",
    label: "Expenses",
    Component: ExpensesPage
  },
  {
    key: "pnl",
    label: "Profit & Loss",
    Component: ProfitLossPage
  },
  {
    key: "cashflow",
    label: "Cash Flow",
    Component: CashFlowPage
  }
];

export default function FinanceOverviewPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const ActiveComponent = useMemo(
    () =>
      FINANCE_SECTIONS.find((section) => section.key === activeTab)?.Component ||
      FinanceDashboardPage,
    [activeTab]
  );

  const openSection = (sectionKey) => {
    setActiveTab(sectionKey);
  };

  return (
    <div className="flex h-full min-h-full w-full flex-col bg-slate-100">
      <div className="w-full p-6 pb-0">
        <nav className="w-full flex gap-2 overflow-x-auto pb-2">
          {FINANCE_SECTIONS.map((section) => {
            const isActive = section.key === activeTab;

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => openSection(section.key)}
                className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-bold transition ${
                  isActive
                    ? "bg-black text-white border-black"
                    : "bg-white hover:bg-gray-100 border-slate-200 text-slate-700"
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>
      <ActiveComponent />
    </div>
  );
}
